import fs from 'node:fs';
const source='/home/cee/apps/cumora-byoa-pilot/server/src/agents/computer/daemon.ts';
const probe=source.replace('daemon.ts','.lackeys-instruction-probe.ts');
const release=process.argv[2]||'/home/cee/apps/cumora-pilot/agent-config/20260920.3';
const manifest=JSON.parse(fs.readFileSync(release+'/config/agents/manifest.json','utf8'));
try{
 fs.writeFileSync(probe,fs.readFileSync(source,'utf8')+'\nexport { AgentRunner as LackeysProbeAgentRunner };\n',{flag:'wx',mode:0o600});
 const {LackeysProbeAgentRunner}=await import(probe);
 const result={};
 for(const a of manifest.agents){
  const receiver=Object.create(LackeysProbeAgentRunner.prototype);
  receiver.agent={id:a.existing_id,name:a.name,role:a.role,systemPrompt:a.system_prompt};
  const standing=receiver.standingPrompt();
  if(!standing.includes(a.system_prompt))throw new Error('Role not injected: '+a.key);
  result[a.key]={rolePrompt:a.system_prompt,standing};
 }
 fs.writeFileSync('/tmp/lackeys-current-standing.json',JSON.stringify(result),{mode:0o600});
 fs.chownSync('/tmp/lackeys-current-standing.json',10002,10002);
 console.log(JSON.stringify({actualDaemonStandingPromptVerified:Object.keys(result).length}));
}finally{if(fs.existsSync(probe))fs.unlinkSync(probe);}
