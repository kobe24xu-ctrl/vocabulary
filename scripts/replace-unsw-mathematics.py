#!/usr/bin/env python3
"""Replace only the existing master's UNSW maths bank with the prepared 24-week table.

Preview by default. --apply writes one atomic SQLite upsert: new words become
active and superseded words are archived, preserving historical references.
"""
import argparse, collections, datetime, importlib.util, json, unicodedata, uuid
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
PROGRAM='UNSW 新南预科';SUBJECT='Mathematics'
def norm(t):return unicodedata.normalize('NFKC',t).strip().casefold()
def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('file',type=Path);p.add_argument('--apply',action='store_true');args=p.parse_args()
    s=importlib.util.spec_from_file_location('importer',ROOT/'scripts/import-vocabulary.py');imp=importlib.util.module_from_spec(s);s.loader.exec_module(imp)
    bank=imp.load_words(args.file)
    if len(bank)!=582 or any(w['program']!=PROGRAM or w['subject']!=SUBJECT for w in bank):raise ValueError('Expected the 582 UNSW mathematics records from the uploaded workbook.')
    groups=collections.Counter(g for w in bank for g in w['groups'])
    if len(groups)!=24 or any(not w.get('partOfSpeech') or not w.get('partOfSpeechNote') for w in bank):raise ValueError('Expected 24 separate teaching weeks and complete grammar metadata.')
    if collections.Counter(w.get('semester')for w in bank)!={1:300,2:282}:raise ValueError('Semester counts do not match the source workbook.')
    s=importlib.util.spec_from_file_location('cf',ROOT/'scripts/deploy-cloudflare.py');cf=importlib.util.module_from_spec(s);s.loader.exec_module(cf)
    conf=json.loads((ROOT/'cloudflare/wrangler.deploy.json').read_text());assert conf['account_id']==cf.ACCOUNT
    db=conf['d1_databases'][0]['database_id'];assert db=='45be7e2c-c5ad-4bfb-84cf-56618e66fa12'
    ep=f'/accounts/{cf.ACCOUNT}/d1/database/{db}/query'
    def query(sql,*params):return cf.api(ep,'POST',{'sql':sql,'params':list(params)})[0]['results']
    masters=query("SELECT id FROM users WHERE role='teacher' AND demo=0");assert len(masters)==1;owner=masters[0]['id']
    old=query("SELECT id,owner_id,content FROM words WHERE owner_id=? AND json_extract(content,'$.program')=? AND json_extract(content,'$.subject')=?",owner,PROGRAM,SUBJECT)
    byterm={norm(json.loads(r['content'])['term']):r for r in old};changed=[];active=set();reused=0
    for w in bank:
        oldrow=byterm.get(norm(w['term']));wid=oldrow['id'] if oldrow else str(uuid.uuid5(uuid.NAMESPACE_URL,owner+'|unsw-math-weekly|'+norm(w['term'])))
        if oldrow:reused+=1
        w=dict(w,id=wid,archived=False,bankVersion='unsw-math-two-terms-20261106');active.add(wid);changed.append([wid,owner,json.dumps(w,ensure_ascii=False,separators=(',',':'))])
    archived=0
    for r in old:
        if r['id'] in active:continue
        w=json.loads(r['content']);w['archived']=True;w['archivedReason']='已由新南数学两学期按周词表替换';changed.append([r['id'],owner,json.dumps(w,ensure_ascii=False,separators=(',',':'))]);archived+=1
    payload=json.dumps(changed,ensure_ascii=False,separators=(',',':'))
    if len(payload.encode())>1800000:raise RuntimeError('Prepared atomic payload is too large; do not apply in separate destructive steps.')
    print(json.dumps({'prepared':len(bank),'groups':len(groups),'semesterCounts':{1:300,2:282},'reuseIds':reused,'archiveRows':archived,'payloadBytes':len(payload.encode()),'apply':args.apply},ensure_ascii=False),flush=True)
    if not args.apply:return
    backup=ROOT/'data/unsw-weekly-math-import'/('math-before-'+datetime.datetime.now(datetime.UTC).strftime('%Y%m%dT%H%M%S')+'.json');backup.parent.mkdir(parents=True,exist_ok=True);backup.write_text(json.dumps(old,ensure_ascii=False));backup.chmod(0o600)
    sql="INSERT INTO words(id,owner_id,content) SELECT json_extract(value,'$[0]'),json_extract(value,'$[1]'),json_extract(value,'$[2]') FROM json_each(?) WHERE true ON CONFLICT(id) DO UPDATE SET content=excluded.content WHERE words.owner_id=excluded.owner_id"
    query(sql,payload)
    result=query("SELECT COUNT(*) AS words,SUM(CASE WHEN LENGTH(COALESCE(json_extract(content,'$.partOfSpeech'),''))>0 AND LENGTH(COALESCE(json_extract(content,'$.partOfSpeechNote'),''))>0 THEN 1 ELSE 0 END) AS withGrammar FROM words WHERE owner_id=? AND json_extract(content,'$.program')=? AND json_extract(content,'$.subject')=? AND COALESCE(json_extract(content,'$.archived'),0)=0",owner,PROGRAM,SUBJECT)
    if result[0]['words']!=582 or result[0]['withGrammar']!=582:raise RuntimeError('The active bank does not match the prepared workbook. Preserve the backup and investigate.')
    print(json.dumps({'activeBank':result,'backup':str(backup.relative_to(ROOT))},ensure_ascii=False),flush=True)
if __name__=='__main__':main()
