#!/usr/bin/env python3
"""Preview/apply an additive topic import; merge groups without replacing history."""
import argparse
from collections import Counter
import importlib.util
import json
from pathlib import Path
import uuid

ROOT = Path(__file__).resolve().parent.parent


def module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


def unique(values):
    return list(dict.fromkeys(values))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('file', type=Path)
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    prepared = module('vocab_import', ROOT / 'scripts/import-vocabulary.py')
    words = prepared.load_words(args.file)
    cf = module('cf_deploy', ROOT / 'scripts/deploy-cloudflare.py')
    config = json.loads((ROOT / 'cloudflare/wrangler.deploy.json').read_text())
    if config['account_id'] != cf.ACCOUNT:
        raise RuntimeError('Account does not match the existing classroom.')
    endpoint = '/accounts/' + cf.ACCOUNT + '/d1/database/' + config['d1_databases'][0]['database_id'] + '/query'

    def query(sql, params=()):
        return cf.api(endpoint, 'POST', {'sql': sql, 'params': list(params)})[0]

    owners = query("SELECT id FROM users WHERE role='teacher' AND demo=0")['results']
    if len(owners) != 1:
        raise RuntimeError('Expected exactly one existing master.')
    owner = owners[0]['id']
    existing = query('SELECT id,content FROM words WHERE owner_id=?', [owner])['results']
    index = {prepared.key(json.loads(row['content'])): row for row in existing}
    additions, updates = [], []
    for word in words:
        key = prepared.key(word)
        row = index.get(key)
        if row is None:
            word['id'] = str(uuid.uuid5(uuid.NAMESPACE_URL, owner + '|' + '|'.join(key)))
            additions.append([word['id'], owner, json.dumps(word, ensure_ascii=False)])
            continue
        old = json.loads(row['content'])
        merged = dict(old)
        for field, limit in [('groups', 30), ('aliases', 20), ('enAliases', 20)]:
            merged[field] = unique(old.get(field, []) + word.get(field, []))
            if len(merged[field]) > limit:
                raise RuntimeError('Merged vocabulary exceeds supported ' + field + ' limit.')
        refs = old.get('originalRows', []) + word.get('originalRows', [])
        merged['originalRows'] = [json.loads(v) for v in unique([
            json.dumps(r, sort_keys=True, ensure_ascii=False) for r in refs
        ])]
        # Keep existing wording/examples and ids when a new topic repeats a term.
        if old != merged:
            updates.append([json.dumps(merged, ensure_ascii=False), row['id'], owner, row['content']])
    print(json.dumps({'prepared': len(words), 'additions': len(additions),
                      'topicMerges': len(updates), 'apply': args.apply,
                      'subjects': dict(Counter(w['subject'] for w in words))}, ensure_ascii=False), flush=True)
    if not args.apply:
        return
    for offset in range(0, len(additions), 50):
        query("INSERT INTO words(id,owner_id,content) SELECT json_extract(value,'$[0]'),json_extract(value,'$[1]'),json_extract(value,'$[2]') FROM json_each(?) WHERE true ON CONFLICT(id) DO NOTHING",
              [json.dumps(additions[offset:offset + 50], ensure_ascii=False)])
    for update in updates:
        if query('UPDATE words SET content=? WHERE id=? AND owner_id=? AND content=?', update)['meta']['changes'] != 1:
            raise RuntimeError('Vocabulary changed concurrently; review before retrying.')
    print('Topic import completed; accounts, exams, grades and mistakes were preserved.', flush=True)


if __name__ == '__main__':
    main()
