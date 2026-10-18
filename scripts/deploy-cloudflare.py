#!/usr/bin/env python3
"""Deploy a new LexiClass trial using scoped environment credentials; stdlib only."""
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parent.parent
DEPLOY = ROOT / 'cloudflare/wrangler.deploy.json'
ACCOUNT = os.environ.get('CLOUDFLARE_ACCOUNT_ID', '').strip()
TOKEN = os.environ.get('CLOUDFLARE_API_TOKEN', '').strip()
if not ACCOUNT or not TOKEN:
    sys.exit('Missing Cloudflare configuration. Set account ID and network secret in environment settings; never paste credentials into chat.')
if not re.fullmatch(r'[a-fA-F0-9]{32}', ACCOUNT):
    sys.exit('CLOUDFLARE_ACCOUNT_ID must be the 32-character account ID, not an email address.')


def api(path, method='GET', body=None):
    request = urllib.request.Request(
        'https://api.cloudflare.com/client/v4' + path,
        data=json.dumps(body).encode() if body is not None else None,
        headers={'Authorization': 'Bearer ' + TOKEN, 'Content-Type': 'application/json'}, method=method)
    try:
        with urllib.request.urlopen(request, timeout=45) as response:
            result = json.load(response)
    except urllib.error.HTTPError as error:
        try:
            result = json.load(error)
            codes = [str(item.get('code')) for item in result.get('errors', [])]
        except Exception:
            codes = []
        raise RuntimeError(f'Cloudflare HTTP {error.code}; error codes {codes}. No credential values were logged.') from None
    if not result.get('success'):
        raise RuntimeError('Cloudflare operation failed; codes: ' + str([item.get('code') for item in result.get('errors', [])]))
    return result.get('result')


def wrangler(*args):
    runtime = os.environ.copy()
    runtime['WRANGLER_SEND_METRICS'] = 'false'
    # Use the standard config location override inside a writable workspace.
    runtime['XDG_CONFIG_HOME'] = str(ROOT / '.wrangler/cli-config')
    runtime['WRANGLER_LOG_PATH'] = str(ROOT / '.wrangler/deployment.log')
    subprocess.run(['node', str(ROOT / 'node_modules/wrangler/bin/wrangler.js'), *args], cwd=ROOT, env=runtime, check=True)


def main():
    account_path = '/accounts/' + ACCOUNT
    verified = api('/user/tokens/verify')
    if verified.get('status') != 'active':
        raise RuntimeError('Cloudflare token is not active.')
    subdomain = api(account_path + '/workers/subdomain').get('subdomain')
    if not subdomain:
        raise RuntimeError('Enable your free workers.dev subdomain in Cloudflare Workers & Pages first.')
    if DEPLOY.exists():
        config = json.loads(DEPLOY.read_text())
        if config.get('account_id') != ACCOUNT:
            raise RuntimeError('Existing deployment config belongs to a different account. Preserve it before deploying another account.')
    else:
        config = json.loads((ROOT / 'cloudflare/wrangler.jsonc').read_text())
        scripts = api(account_path + '/workers/scripts')
        names = {script['id'] for script in scripts}
        name = config['name']
        if name in names:
            name += '-' + os.urandom(3).hex()
        databases = api(account_path + '/d1/database?per_page=100')
        database_name = name + '-data'
        if any(db.get('name') == database_name for db in databases):
            database_name += '-' + os.urandom(3).hex()
        db = api(account_path + '/d1/database', 'POST', {'name': database_name})
        config['name'] = name
        config['account_id'] = ACCOUNT
        config['d1_databases'][0].update(database_name=database_name, database_id=db['uuid'])
        DEPLOY.write_text(json.dumps(config, ensure_ascii=False, indent=2) + '\n')
        print('Created a new app database; existing account resources were preserved.', flush=True)
    wrangler('d1', 'migrations', 'apply', 'DB', '--remote', '--config', str(DEPLOY))
    wrangler('deploy', '--config', str(DEPLOY))
    print('Deployment command completed: https://' + config['name'] + '.' + subdomain + '.workers.dev', flush=True)
    print('Verify this URL before sharing with students. Mainland China connectivity still needs a test from the classroom network.', flush=True)


if __name__ == '__main__':
    try:
        main()
    except (RuntimeError, subprocess.CalledProcessError) as error:
        sys.exit(str(error))
