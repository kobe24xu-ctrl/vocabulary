#!/usr/bin/env python3
"""Patch prepared POS metadata on existing words; preview unless --apply.

Only grammar fields change. Concurrent edits to a word's text are detected.
Prepared data/backups stay in ignored data/. Credentials are never logged.
"""
import argparse, importlib.util, json
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
FIELDS={'partOfSpeech','partOfSpeechNote','grammarMethod','grammarVersion','sourcePartOfSpeech'}

def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('file',type=Path);p.add_argument('--apply',action='store_true');args=p.parse_args()
    rows=json.loads(args.file.read_text());assert isinstance(rows,list) and rows
    for row in rows:
        if set(row['changes'])-FIELDS:raise ValueError('Unexpected grammar fields.')
        if not row['changes'].get('partOfSpeech') or not row['changes'].get('partOfSpeechNote'):raise ValueError('POS and usage note are required.')
        if len(row['changes']['partOfSpeech'])>100 or len(row['changes']['partOfSpeechNote'])>300:raise ValueError('Grammar text is too long.')
    s=importlib.util.spec_from_file_location('cf',ROOT/'scripts/deploy-cloudflare.py');cf=importlib.util.module_from_spec(s);s.loader.exec_module(cf)
    conf=json.loads((ROOT/'cloudflare/wrangler.deploy.json').read_text());assert conf['account_id']==cf.ACCOUNT
    db=conf['d1_databases'][0]['database_id'];assert db=='45be7e2c-c5ad-4bfb-84cf-56618e66fa12'
    ep=f'/accounts/{cf.ACCOUNT}/d1/database/{db}/query'
    def query(sql,*params):return cf.api(ep,'POST',{'sql':sql,'params':list(params)})
    owner=query("SELECT id FROM users WHERE role='teacher' AND demo=0")[0]['results'];assert len(owner)==1;owner=owner[0]['id']
    sql="""UPDATE words AS w SET content=json_patch(w.content,json_extract(p.value,'$.changes'))
      FROM json_each(?) AS p WHERE w.owner_id=? AND w.id=json_extract(p.value,'$.id')
      AND json_extract(w.content,'$.term')=json_extract(p.value,'$.term')
      AND json_extract(w.content,'$.translation')=json_extract(p.value,'$.translation')
      AND json_extract(w.content,'$.sentence')=json_extract(p.value,'$.sentence')
      AND (COALESCE(json_extract(w.content,'$.partOfSpeech'),'')<>json_extract(p.value,'$.changes.partOfSpeech')
       OR COALESCE(json_extract(w.content,'$.partOfSpeechNote'),'')<>json_extract(p.value,'$.changes.partOfSpeechNote'))"""
    query('EXPLAIN QUERY PLAN '+sql,json.dumps(rows[:1],ensure_ascii=False),owner)
    print(json.dumps({'prepared':len(rows),'apply':args.apply,'scope':'grammar fields only'},ensure_ascii=False),flush=True)
    if not args.apply:return
    changed=0
    for start in range(0,len(rows),60):
        result=query(sql,json.dumps(rows[start:start+60],ensure_ascii=False,separators=(',',':')),owner)[0]
        changed+=result.get('meta',{}).get('changes',0)
        if start%600==0:print(json.dumps({'processed':min(start+60,len(rows)),'changed':changed}),flush=True)
    check=query("SELECT COUNT(*) AS words,SUM(CASE WHEN LENGTH(COALESCE(json_extract(content,'$.partOfSpeech'),''))=0 OR LENGTH(COALESCE(json_extract(content,'$.partOfSpeechNote'),''))=0 THEN 1 ELSE 0 END) AS missing FROM words WHERE owner_id=?",owner)[0]['results']
    print(json.dumps({'changed':changed,'grammarCoverage':check},ensure_ascii=False),flush=True)
    if check[0]['missing']:raise RuntimeError('Some current word records still need grammar metadata. Resolve concurrent/new words before release.')
if __name__=='__main__':main()
