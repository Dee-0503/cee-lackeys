import {spawn} from 'node:child_process';
const root='/home/cee/apps/cumora-byoa-pilot';
const env={...process.env,
  CODEX_HOME:'/home/cee/data/codex-pilot/config',
  PATH:`${root}/bin:/home/cee/apps/codex-pilot/releases/0.155.1:/usr/bin:/bin`,
  CUMORA_SERVER_URL:'https://lackeys.ceee.cloud',
  CUMORA_ENGINE_MODEL:'gpt-6-astra',
  CUMORA_TRIAGE_MODEL:'gpt-5.6-terra',
  CUMORA_BYOA_MAX_CONCURRENT_BIG_BRAIN:'1',
  CUMORA_BYOA_MAX_CONCURRENT_TRIAGE:'1',
  CUMORA_SUPERVISED:'0',
  CUMORA_VERSION:'0.18.6',
};
delete env.CUMORA_BYOA_ALLOW_UNSANDBOXED;
if(process.argv.includes('--pair-stdin')) {
  const {readFileSync}=await import('node:fs');
  const code=readFileSync(0,'utf8').trim();
  if(!code || code.length>256)process.exit(2);
  Object.assign(process.env,env);
  const {register}=await import(`${root}/node_modules/tsx/dist/esm/api/index.mjs`);
  register();
  const {runComputerDaemon}=await import(`${root}/server/src/agents/computer/daemon.ts`);
  await runComputerDaemon(['--pair',code,'--engine','codex','--server',env.CUMORA_SERVER_URL]);
} else {
const child=spawn(`${root}/bin/node`,[`${root}/node_modules/tsx/dist/cli.mjs`,`${root}/server/src/cli-bin.ts`,'agent','computer',...process.argv.slice(2)],{env,stdio:'inherit',cwd:'/home/cee/data/codex-pilot/workspace'});
for(const sig of ['SIGTERM','SIGINT'])process.on(sig,()=>child.kill(sig));
child.on('exit',code=>process.exit(code??1));
}
