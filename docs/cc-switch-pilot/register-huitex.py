"""Import the isolated Codex config without passing secrets in argv or output."""
import json
import os
import subprocess
import tempfile
from pathlib import Path

os.umask(0o077)
config = Path('/home/cee/data/codex-pilot/config')
control = Path('/home/cee/data/cc-switch-pilot')
cli = '/home/cee/apps/cc-switch-pilot/cc-switch'
payload = {'auth': json.loads((config / 'auth.json').read_text()),
           'config': (config / 'config.toml').read_text()}
with tempfile.NamedTemporaryFile(mode='w', dir=control, suffix='.json') as tmp:
    json.dump(payload, tmp)
    tmp.flush()
    result = subprocess.run([cli, '--app', 'codex', 'provider', 'add', '--id', 'huitex',
                             '--name', 'Huitex', '--config-file', tmp.name],
                            cwd='/tmp', capture_output=True, text=True)
    if result.returncode:
        raise SystemExit('Provider creation failed; output withheld to avoid disclosing credentials')
subprocess.run([cli, '--app', 'codex', 'provider', 'switch', 'huitex'], cwd='/tmp', check=True)
print('Huitex registered; no credentials printed.')
