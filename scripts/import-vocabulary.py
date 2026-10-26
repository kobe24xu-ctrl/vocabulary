#!/usr/bin/env python3
"""Import a private, prepared vocabulary JSON into the existing master bank.

Preview is the default. --apply inserts missing terms; existing rows are preserved.
Credentials come from environment settings, never command arguments or logs.
"""
import argparse
from collections import Counter
import importlib.util
import json
from pathlib import Path
import unicodedata
import uuid

ROOT = Path(__file__).resolve().parent.parent
PROGRAMS = {'UNSW 新南预科', 'NCUK 国际预科', 'UOW 沃隆港预科', '通用示例'}
SUBJECTS = {'Mathematics', 'English', 'Economics', 'Accounting', 'Computer Science',
            'Academic English', 'Language Learning', 'Business', 'Physics', 'Chemistry'}


def normalized(value):
    return unicodedata.normalize('NFKC', value).strip().casefold()


def key(word):
    return (word['program'], word['subject'], normalized(word.get('canonicalTerm', word['term'])))


def load_words(path):
    words = json.loads(path.read_text())
    if not isinstance(words, list) or not 1 <= len(words) <= 10000:
        raise ValueError('Expected 1–10000 vocabulary records.')
    keys = set()
    for word in words:
        if word.get('program') not in PROGRAMS or word.get('subject') not in SUBJECTS:
            raise ValueError('Unsupported program or subject.')
        for field, limit in [('term', 150), ('translation', 150), ('sentence', 2000),
                             ('sentenceZh', 2000), ('source', 200)]:
            value = word.get(field)
            if not isinstance(value, str) or not value.strip() or len(value) > limit:
                raise ValueError('Invalid field: ' + field)
        for field, limit, length in [('aliases', 20, 150), ('enAliases', 20, 150), ('groups', 30, 100)]:
            values = word.setdefault(field, [])
            if not isinstance(values, list) or len(values) > limit or any(
                    not isinstance(v, str) or not v.strip() or len(v) > length for v in values):
                raise ValueError('Invalid list: ' + field)
        if word['term'].casefold() not in word['sentence'].casefold() or word['translation'] not in word['sentenceZh']:
            raise ValueError('Context must contain its target vocabulary.')
        if key(word) in keys:
            raise ValueError('Duplicate vocabulary in import.')
        keys.add(key(word))
    return words


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('file', type=Path)
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    words = load_words(args.file)
    spec = importlib.util.spec_from_file_location('cf_deploy', ROOT / 'scripts/deploy-cloudflare.py')
    cf = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(cf)
    config = json.loads((ROOT / 'cloudflare/wrangler.deploy.json').read_text())
    if config['account_id'] != cf.ACCOUNT:
        raise RuntimeError('Account differs from the existing deployment.')
    endpoint = '/accounts/' + cf.ACCOUNT + '/d1/database/' + config['d1_databases'][0]['database_id'] + '/query'

    def query(sql, *params):
        result = cf.api(endpoint, 'POST', {'sql': sql, 'params': list(params)})
        if not result or not result[0].get('success', True):
            raise RuntimeError('D1 operation failed.')
        return result[0]['results']

    masters = query("SELECT id FROM users WHERE role='teacher' AND demo=0")
    if len(masters) != 1:
        raise RuntimeError('Exactly one existing master account is required.')
    owner = masters[0]['id']
    existing = query('SELECT id,content FROM words WHERE owner_id=?', owner)
    occupied = set()
    for row in existing:
        word = json.loads(row['content'])
        occupied.add(key(word))
        occupied.add((word['program'], word['subject'], normalized(word['term'])))
    additions = []
    for word in words:
        if key(word) in occupied or (word['program'],word['subject'],normalized(word['term'])) in occupied:
            continue
        word['id'] = str(uuid.uuid5(uuid.NAMESPACE_URL, owner + '|' + '|'.join(key(word))))
        additions.append([word['id'], owner, json.dumps(word, ensure_ascii=False)])
    print(json.dumps({'prepared': len(words), 'new': len(additions),
                      'preserved': len(words) - len(additions),
                      'subjects': dict(Counter(w['subject'] for w in words)),
                      'apply': args.apply}, ensure_ascii=False))
    if not args.apply:
        return
    for start in range(0, len(additions), 50):
        query("INSERT INTO words(id,owner_id,content) SELECT json_extract(value,'$[0]'),json_extract(value,'$[1]'),json_extract(value,'$[2]') FROM json_each(?) WHERE true ON CONFLICT(id) DO NOTHING",
              json.dumps(additions[start:start + 50], ensure_ascii=False))
    counts = query("SELECT json_extract(content,'$.program') AS program,json_extract(content,'$.subject') AS subject,count(*) AS words FROM words WHERE owner_id=? GROUP BY program,subject ORDER BY program,subject", owner)
    print(json.dumps({'bankCounts': counts}, ensure_ascii=False))


if __name__ == '__main__':
    main()
