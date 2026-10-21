#!/usr/bin/env python3
"""Build/deploy a Pages alternative that reuses the existing Worker and D1.

--build-only prepares the upload without credentials or remote changes.
Deployment requires Account > Cloudflare Pages > Edit on the existing token.
The original Worker and its scheduled finalization stay active.
"""
import argparse
import importlib.util
import json
from pathlib import Path
import re
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / 'dist/pages-site'
SETTINGS = ROOT / 'data/pages-deployment.json'


def build():
    SITE.mkdir(parents=True, exist_ok=True)
    for path in (ROOT / 'public').iterdir():
        if path.is_file():
            shutil.copy2(path, SITE / path.name)
    subprocess.run([
        str(ROOT / 'node_modules/esbuild/bin/esbuild'),
        str(ROOT / 'cloudflare/worker.mjs'), '--bundle', '--format=esm',
        '--platform=neutral', '--target=es2022', '--external:node:*',
        '--outfile=' + str(SITE / '_worker.js'),
    ], cwd=ROOT, check=True)
    (SITE / '_routes.json').write_text(json.dumps({
        'version': 1, 'include': ['/api/*'], 'exclude': []
    }, indent=2) + '\n')
    print('Prepared Pages assets and same-origin API in dist/pages-site.', flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--build-only', action='store_true')
    parser.add_argument('--project', default='lexiclass-classroom')
    args = parser.parse_args()
    if not re.fullmatch(r'[a-z0-9][a-z0-9-]{0,56}[a-z0-9]', args.project):
        raise RuntimeError('Use a valid Pages project name.')
    build()
    if args.build_only:
        return
    spec = importlib.util.spec_from_file_location('cf_deploy', ROOT / 'scripts/deploy-cloudflare.py')
    cf = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(cf)
    config = json.loads((ROOT / 'cloudflare/wrangler.deploy.json').read_text())
    if config['account_id'] != cf.ACCOUNT:
        raise RuntimeError('Account differs from the existing deployment.')
    base = '/accounts/' + cf.ACCOUNT + '/pages/projects'
    # Check Pages authorization before creating or modifying resources.
    try:
        projects = cf.api(base)
    except RuntimeError as error:
        raise RuntimeError(str(error) + ' Add Account > Cloudflare Pages > Edit to the configured API token; retain the existing Workers and D1 permissions.') from None
    if SETTINGS.exists():
        saved = json.loads(SETTINGS.read_text())
        if saved['account_id'] != cf.ACCOUNT:
            raise RuntimeError('Saved Pages deployment belongs to another account.')
        name = saved['name']
        current = next((p for p in projects if p['name'] == name), None)
        if current is None:
            raise RuntimeError('Saved project was not found. Resolve the project selection before deploying.')
        branch = current['production_branch']
    else:
        if any(p['name'] == args.project for p in projects):
            raise RuntimeError('Project name already exists; choose another --project to preserve it.')
        name, branch = args.project, 'main'
        deployment_config = {
            'compatibility_date': config['compatibility_date'],
            'compatibility_flags': config.get('compatibility_flags', []),
            'env_vars': {'ALLOW_DEMO': {'type': 'plain_text', 'value': 'false'}},
            'd1_databases': {'DB': {'id': config['d1_databases'][0]['database_id']}},
        }
        created = cf.api(base, 'POST', {
            'name': name, 'production_branch': branch,
            'deployment_configs': {'production': deployment_config},
        })
        SETTINGS.parent.mkdir(parents=True, exist_ok=True)
        SETTINGS.write_text(json.dumps({
            'account_id': cf.ACCOUNT, 'name': created['name'],
            'subdomain': created['subdomain'],
            'database_id': config['d1_databases'][0]['database_id'],
        }, indent=2) + '\n')
    # Check database and demo settings on every deploy; never create a new D1.
    current = cf.api(base + '/' + name)
    production = current.get('deployment_configs', {}).get('production', {})
    if production.get('d1_databases', {}).get('DB', {}).get('id') != config['d1_databases'][0]['database_id']:
        raise RuntimeError('Pages DB binding differs from the current classroom database.')
    if production.get('env_vars', {}).get('ALLOW_DEMO', {}).get('value') != 'false':
        raise RuntimeError('Disable Pages demo mode before deploying real classroom data.')
    cf.wrangler('pages', 'deploy', str(SITE), '--project-name', name,
                '--branch', branch, '--commit-dirty=true')
    print('Pages deployment completed: https://' + current['subdomain'], flush=True)
    print('Use existing accounts to log in again on this domain. Classroom connectivity remains unverified.', flush=True)


if __name__ == '__main__':
    try:
        main()
    except (RuntimeError, subprocess.CalledProcessError) as error:
        sys.exit(str(error))
