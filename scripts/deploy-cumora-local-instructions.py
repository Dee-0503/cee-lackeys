"""Install reviewed role files into BYOA homes and patch explicit prompt injection.
Run as server administrator with the project-scoped release directory as argv[1].
No credentials, sandbox settings, agent sessions or shared CODEX_HOME are changed.
"""
import hashlib,json,os,pwd,sys,difflib
from pathlib import Path
release=Path(sys.argv[1]).resolve()
if release != Path('/home/cee/apps/cumora-pilot/agent-config/20260920.2'): raise SystemExit('Unexpected release')
config=release/'config/agents'
m=json.loads((config/'manifest.json').read_text())
if m['version']!='2026-09-20.2' or len(m['agents'])!=9:raise SystemExit('Wrong config')
root=Path('/home/cee/data/codex-pilot/.cumora/agents')
uid=pwd.getpwnam('codex-pilot').pw_uid;gid=pwd.getpwnam('codex-pilot').pw_gid
source=Path('/home/cee/apps/cumora-byoa-pilot/server/src/agents/computer/daemon.ts')
before=source.read_bytes();h=hashlib.sha256(before).hexdigest()
expected='bfa42a85dafe6d738bc699e8b0fb37c23cbfbf27795ce4d658d86f0551c66b85'
if h!=expected:raise SystemExit('BYOA source changed; review before patching')
needle='''    return (
      `You are a Cumora teammate — a first-class member of this team with your own voice. ` +'''
replacement='''    // cee-lackeys: BYOA does not use the server buildSystemPrompt path.
    // Secure Codex may skip AGENTS.md; pass the operator's UI role explicitly.
    const roleInstructions = this.agent.systemPrompt?.trim()
    return (
      (roleInstructions ? `## Operator-configured role instructions\\n${roleInstructions}\\n\\n` : '') +
      `You are a Cumora teammate — a first-class member of this team with your own voice. ` +'''
s=before.decode()
if s.count(needle)!=1:raise SystemExit('Prompt patch target not unique')
after=s.replace(needle,replacement).encode()
entries=[]
for a in m['agents']:
 aid=a['existing_id'];base=root/aid
 if not base.is_dir() or base.is_symlink():raise SystemExit('Unsafe agent home')
 for p in a['files']:
  target=base/(p.replace('skills/','.agents/skills/',1) if p.startswith('skills/') else p)
  for parent in [target,*target.parents]:
   if parent==root:break
   if parent.is_symlink():raise SystemExit('Symlink refused')
  if target.exists():raise SystemExit(f'New local path already exists: {aid}/{p}; inspect first')
  body=(config/a['key']/p).read_bytes();entries.append((target,body))
backup=release/'byoa-instructions-preimage.json'
if backup.exists():raise SystemExit('Backup already exists; do not replay')
backup.write_text(json.dumps({'source':str(source),'source_sha256':h,'local_files_absent':[str(p) for p,_ in entries]},indent=2)+'\n');backup.chmod(0o600)
(release/'daemon.before.ts').write_bytes(before);(release/'daemon.before.ts').chmod(0o600)
(release/'cumora-role-prompt.patch').write_text(''.join(difflib.unified_diff(s.splitlines(True),after.decode().splitlines(True),fromfile='daemon.ts.before',tofile='daemon.ts.after')))
installed=[]
try:
 for target,body in entries:
  missing=[];parent=target.parent
  while not parent.exists():missing.append(parent);parent=parent.parent
  for p in reversed(missing):p.mkdir(mode=0o700);os.chown(p,uid,gid)
  with target.open('xb') as f:f.write(body)
  os.chmod(target,0o600);os.chown(target,uid,gid);installed.append(target)
 source.write_bytes(after)
except BaseException:
 source.write_bytes(before)
 for target in installed:target.unlink()
 raise
print(json.dumps({'patched':True,'before':h,'after':hashlib.sha256(after).hexdigest(),'localFiles':len(entries),'sandboxChanged':False,'sessionsDeleted':False}))
