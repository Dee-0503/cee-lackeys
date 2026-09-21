// Restore only this release's role configuration; keep conversations and memories.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const [mode,dir,backupPath]=process.argv.slice(2);
if(!['inspect','apply'].includes(mode)||!dir||!backupPath)throw new Error('Usage: rollback-cumora-agents.mjs inspect|apply CONFIG_DIR PREIMAGE');
const m=JSON.parse(readFileSync(`${dir}/manifest.json`,'utf8'));
const b=JSON.parse(readFileSync(backupPath,'utf8'));
if(b.company!==m.company_id||b.version!==m.version)throw new Error('Backup scope mismatch');
const secret=n=>readFileSync(`/run/secrets/${n}`,'utf8').trim();
const {Pool}=createRequire('/app/package.json')('pg');
const pool=new Pool({connectionString:`postgresql://cumora:${encodeURIComponent(secret('postgres_password'))}@postgres:5432/cumora`,max:1});
const c=await pool.connect();
try{
 await c.query('BEGIN');
 await c.query("SET LOCAL lock_timeout='5s'");
 await c.query('SELECT id FROM companies WHERE id=$1 FOR UPDATE',[m.company_id]);
 const states=[];
 for(const a of m.agents){
  const id=a.existing_id||`lackeys-${a.key}`;
  const p=(await c.query('SELECT * FROM participants WHERE id=$1 AND company_id=$2 FOR UPDATE',[id,m.company_id])).rows[0];
  if(!p||p.departed_at||p.name!==a.name||p.role!==a.role||p.bio!==a.bio||p.system_prompt!==a.system_prompt)throw new Error(`Role drift: ${id}; review before rollback`);
  const files=(await c.query('SELECT path,body FROM agent_workspace WHERE agent_id=$1 AND company_id=$2 ORDER BY path',[id,m.company_id])).rows;
  for(const path of a.files){if(!files.some(f=>f.path===path&&f.body===readFileSync(`${dir}/${a.key}/${path}`,'utf8')))throw new Error(`Workspace drift: ${id}/${path}`);}
  for(const f of (a.remove_files||[]))if(files.some(row=>row.path===f.path))throw new Error(`Removed path recreated: ${id}/${f.path}`);
  states.push({id,prompt:p.system_prompt,files:files.filter(f=>a.files.includes(f.path))});
 }
 for(const previous of (b.snapshot.topics||[])){
  const row=(await c.query('SELECT topic FROM conversations WHERE id=$1 AND company_id=$2 FOR UPDATE',[previous.id,m.company_id])).rows[0];
  const expected=previous.topic.replace('按项目／任务明确上下文，交接保留来源。','按职责协作，交接保留来源，无需按业务项目拆分会话。');
  if(!row||row.topic!==expected)throw new Error('Conversation topic drift; review rollback');
  states.push({conversationId:previous.id,topic:row.topic});
 }
 const h=createHash('sha256').update(JSON.stringify(states)).digest('hex');
 if(mode==='inspect'){
  writeFileSync(`${dir}/rollback-inspection.json`,JSON.stringify({hash:h,company:m.company_id}),{mode:0o600});
  await c.query('ROLLBACK');
  console.log(JSON.stringify({valid:true,restoreExisting:m.agents.filter(a=>a.existing_id).length,offboardNewPreservingHistory:m.agents.filter(a=>!a.existing_id).length,deleteMessages:false,approvalHash:h}));
 }else{
  const approved=JSON.parse(readFileSync(`${dir}/rollback-inspection.json`,'utf8'));
  if(approved.hash!==h||approved.company!==m.company_id)throw new Error('Rollback changed since inspection');
  const busy=await c.query("SELECT id FROM agent_runs WHERE company_id=$1 AND finished_at IS NULL AND updated_at>NOW()-INTERVAL '5 minutes'",[m.company_id]);
  if(busy.rows.length)throw new Error('Active turn; wait before rollback');
  for(const a of m.agents){
   const id=a.existing_id||`lackeys-${a.key}`;
   if(!a.existing_id){await c.query("UPDATE participants SET departed_at=NOW(),status='resting',status_updated_at=NOW() WHERE id=$1 AND company_id=$2",[id,m.company_id]);continue;}
   const old=b.snapshot.participants.find(p=>p.id===id);
   if(!old)throw new Error(`Missing backup identity ${id}`);
   await c.query('UPDATE participants SET name=$2,role=$3,initial=$4,bio=$5,system_prompt=$6 WHERE id=$1 AND company_id=$7',[id,old.name,old.role,old.initial,old.bio,old.system_prompt,m.company_id]);
   for(const path of [...a.files,...(a.remove_files||[]).map(f=>f.path)]){
    const previous=b.snapshot.workspace.find(f=>f.agent_id===id&&f.path===path);
    if(previous)await c.query('INSERT INTO agent_workspace(agent_id,path,body,meta,updated_at,company_id) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(agent_id,path) DO UPDATE SET body=EXCLUDED.body,meta=EXCLUDED.meta,updated_at=EXCLUDED.updated_at WHERE agent_workspace.company_id=EXCLUDED.company_id',[id,path,previous.body,previous.meta,previous.updated_at,m.company_id]);
    else await c.query('DELETE FROM agent_workspace WHERE agent_id=$1 AND path=$2 AND company_id=$3',[id,path,m.company_id]);
   }
  }
  for(const previous of (b.snapshot.topics||[]))await c.query('UPDATE conversations SET topic=$3,updated_at=NOW() WHERE id=$1 AND company_id=$2',[previous.id,m.company_id,previous.topic]);
  await c.query('COMMIT');console.log(JSON.stringify({rolledBack:true,preservedNewAgentHistory:true,restartServerToRefreshCache:true}));
 }
}catch(e){await c.query('ROLLBACK').catch(()=>{});console.error(e.message);process.exitCode=1;}
finally{c.release();await pool.end();}
