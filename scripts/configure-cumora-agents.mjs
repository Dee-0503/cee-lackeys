// Run inside the verified Cumora container as its normal app user.
// Uses a project-scoped maintenance transaction; never sends messages or edits credentials.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
const [mode, inputDir] = process.argv.slice(2);
if (!['inspect', 'apply', 'verify'].includes(mode) || !inputDir) throw new Error('Usage: configure-cumora-agents.mjs inspect|apply|verify CONFIG_DIR');
const dir = resolve(inputDir);
const manifest = JSON.parse(readFileSync(`${dir}/manifest.json`, 'utf8'));
if (manifest.schema !== 'lackeys.agent-config.v1' || manifest.agents.length !== 9) throw new Error('Unexpected manifest');
const hash = x => createHash('sha256').update(typeof x === 'string' ? x : JSON.stringify(x)).digest('hex');
const payload = manifest.agents.map(a => ({ ...a, id: a.existing_id || `lackeys-${a.key}`, contents: Object.fromEntries(a.files.map(p => {
  if (!/^(IDENTITY\.md|SOUL\.md|skills\/[A-Za-z0-9_-]+\/[A-Za-z0-9_./-]+)$/.test(p) || p.includes('..')) throw new Error('Unsafe workspace path');
  return [p, readFileSync(`${dir}/${a.key}/${p}`, 'utf8')];
})) }));
const payloadHash = hash(payload);
const secret = n => readFileSync(`/run/secrets/${n}`, 'utf8').trim();
process.env.DATABASE_URL = `postgresql://cumora:${encodeURIComponent(secret('postgres_password'))}@postgres:5432/cumora`;
process.env.AGENT_RUNTIME_SECRET = secret('agent_runtime_secret');
process.env.OPENAI_API_KEY = secret('openai_api_key');
const require = createRequire('/app/package.json');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
const c = await pool.connect();
const company = manifest.company_id;
const ids = payload.map(a => a.id);
const backupPath = `${dir}/preimage.json`;
let committed = false;
try {
  await c.query('BEGIN');
  await c.query('SET LOCAL lock_timeout = \'5s\'');
  await c.query('SET LOCAL statement_timeout = \'30s\'');
  const owner = await c.query(`SELECT c.owner_user_id,u.tier FROM companies c JOIN users u ON u.id=c.owner_user_id WHERE c.id=$1 FOR UPDATE OF c`, [company]);
  if (owner.rows.length !== 1 || owner.rows[0].owner_user_id !== manifest.owner_id) throw new Error('Owner/scope mismatch');
  const capacity = { free: 10, pro: 20, max: 50 }[owner.rows[0].tier || 'free'];
  if (!capacity) throw new Error('Unknown tier');
  const computer = await c.query(`SELECT id,company_id,kind,status,available_engines FROM computers WHERE id=$1 AND company_id=$2 AND revoked_at IS NULL`, [manifest.computer_id, company]);
  if (computer.rows.length !== 1 || !JSON.stringify(computer.rows[0].available_engines).includes('codex')) throw new Error('Paired Codex computer unavailable');
  const all = await c.query(`SELECT id FROM participants WHERE company_id=$1 AND kind='agent' AND departed_at IS NULL ORDER BY id`, [company]);
  const existing = await c.query('SELECT * FROM participants WHERE id=ANY($1::text[]) ORDER BY id FOR UPDATE', [ids]);
  if (existing.rows.some(p => p.company_id !== company || p.kind !== 'agent' || p.departed_at)) throw new Error('Foreign or departed identity');
  for (const a of payload) if (a.existing_id && !existing.rows.some(p => p.id === a.id)) throw new Error(`Missing original identity ${a.id}`);
  const adding = payload.filter(a => !existing.rows.some(p => p.id === a.id));
  if (all.rows.length + adding.length > capacity) throw new Error('Native plan capacity exceeded');
  const workspace = await c.query('SELECT * FROM agent_workspace WHERE company_id=$1 AND agent_id=ANY($2::text[]) ORDER BY agent_id,path', [company, ids]);
  const topics = await c.query(`SELECT id,topic FROM conversations WHERE company_id=$1 AND kind='direct' AND topic LIKE '%按项目／任务明确上下文，交接保留来源。' ORDER BY id`,[company]);
  const snapshot = { participants: existing.rows, workspace: workspace.rows, topics: topics.rows };
  const proposedPaths = payload.flatMap(a => Object.keys(a.contents).map(p => `${a.id}/${p}`));
  const removedPaths = payload.flatMap(a => (a.remove_files||[]).map(f => `${a.id}/${f.path}`));
  for (const a of payload) for (const f of (a.remove_files||[])) {
    if (!['IDENTITY.md','SOUL.md'].includes(f.path)) throw new Error('Unsupported removal');
    const old=workspace.rows.find(r=>r.agent_id===a.id&&r.path===f.path);
    if (mode!=='verify' && (!old || hash(old.body)!==f.sha256)) throw new Error(`Removal drift: ${a.id}/${f.path}`);
    if (mode==='verify' && old) throw new Error(`Removed file remains: ${a.id}/${f.path}`);
  }
  if (mode === 'inspect') {
    // Status and status_updated_at are volatile; bind only configuration and managed files.
    const guard = { participants: existing.rows.map(({status,status_updated_at,...p}) => p), workspace: workspace.rows.filter(r => [...proposedPaths,...removedPaths].includes(`${r.agent_id}/${r.path}`)), topics: topics.rows };
    writeFileSync(`${dir}/inspection.json`, JSON.stringify({payloadHash,guardHash:hash(guard)}, null, 2), {mode:0o600});
    console.log(JSON.stringify({mode,company,create:adding.map(a=>a.id),update:payload.filter(a=>a.existing_id).map(a=>a.id),workspaceFiles:proposedPaths.length,removeWorkspaceFiles:removedPaths.length,activeAfter:all.rows.length+adding.length,capacity,computer:computer.rows[0].status,payloadHash},null,2));
    await c.query('ROLLBACK');
  } else if (mode === 'apply') {
    const inspected = JSON.parse(readFileSync(`${dir}/inspection.json`, 'utf8'));
    const guard = { participants: existing.rows.map(({status,status_updated_at,...p}) => p), workspace: workspace.rows.filter(r => [...proposedPaths,...removedPaths].includes(`${r.agent_id}/${r.path}`)), topics: topics.rows };
    if (inspected.payloadHash !== payloadHash || inspected.guardHash !== hash(guard)) throw new Error('Configuration changed since inspection; re-inspect');
    const busy = await c.query(`SELECT id FROM agent_runs WHERE company_id=$1 AND agent_id=ANY($2::text[]) AND finished_at IS NULL AND updated_at>NOW()-INTERVAL '5 minutes'`, [company,ids]);
    if (busy.rows.length) throw new Error('Agent turn active; apply when idle');
    if (existsSync(backupPath)) throw new Error('Preimage exists; verify existing deployment before rerun');
    writeFileSync(backupPath, JSON.stringify({version:manifest.version,company,payloadHash,snapshot,newAgentIds:adding.map(a=>a.id),managedPaths:proposedPaths},null,2),{mode:0o600});
    for (const a of payload) {
      if (!existing.rows.some(p => p.id === a.id)) {
        await c.query(`INSERT INTO participants (id,kind,name,role,initial,avatar_bg,status,bio,tools,system_prompt,model,fast_model,company_id,computer_id,engine,engine_inherit,creation_request_id) VALUES ($1,'agent',$2,$3,$4,$5,'avail',$6,'["bash"]'::jsonb,$7,NULL,NULL,$8,$9,'codex',true,$10)`, [a.id,a.name,a.role,a.initial,'#DDE8F5',a.bio,a.system_prompt,company,manifest.computer_id,`lackeys-config-${a.key}-${manifest.version}`]);
      } else {
        await c.query(`UPDATE participants SET name=$2,role=$3,initial=$4,bio=$5,system_prompt=$6 WHERE id=$1 AND company_id=$7`, [a.id,a.name,a.role,a.initial,a.bio,a.system_prompt,company]);
      }
      for (const [path,body] of Object.entries(a.contents)) {
        await c.query(`INSERT INTO agent_workspace (agent_id,path,body,company_id,updated_at) VALUES ($1,$2,$3,$4,NOW()) ON CONFLICT (agent_id,path) DO UPDATE SET body=EXCLUDED.body,updated_at=NOW() WHERE agent_workspace.company_id=EXCLUDED.company_id`,[a.id,path,body,company]);
      }
      for (const f of (a.remove_files||[])) await c.query('DELETE FROM agent_workspace WHERE agent_id=$1 AND company_id=$2 AND path=$3',[a.id,company,f.path]);
      const direct = await c.query(`SELECT c.id FROM conversations c WHERE c.company_id=$1 AND c.kind='direct' AND (SELECT count(*) FROM conversation_members m WHERE m.conversation_id=c.id AND m.company_id=$1)=2 AND EXISTS(SELECT 1 FROM conversation_members m WHERE m.conversation_id=c.id AND m.participant_id=$2 AND m.company_id=$1) AND EXISTS(SELECT 1 FROM conversation_members m WHERE m.conversation_id=c.id AND m.participant_id=$3 AND m.company_id=$1)`,[company,manifest.owner_id,a.id]);
      if (!direct.rows.length) {
        const convo=`direct-lackeys-${a.key}`;
        await c.query(`INSERT INTO conversations (id,kind,title,members,company_id,topic) VALUES ($1,'direct',$2,$3::jsonb,$4,$5)`,[convo,a.name,JSON.stringify([manifest.owner_id,a.id]),company,`${a.role}；按职责协作，交接保留来源，无需按业务项目拆分会话。`]);
        await c.query('INSERT INTO conversation_counters (conversation_id,next_sequence) VALUES ($1,1)',[convo]);
      }
    }
    for (const row of topics.rows) {
      const topic=row.topic.replace('按项目／任务明确上下文，交接保留来源。','按职责协作，交接保留来源，无需按业务项目拆分会话。');
      await c.query('UPDATE conversations SET topic=$3,updated_at=NOW() WHERE id=$1 AND company_id=$2 AND topic=$4',[row.id,company,topic,row.topic]);
    }
    await c.query('COMMIT'); committed=true;
    writeFileSync(`${dir}/applied.json`,JSON.stringify({version:manifest.version,payloadHash,agentIds:ids,at:new Date().toISOString()},null,2),{mode:0o600});
    console.log(JSON.stringify({applied:true,agents:9,workspaceFiles:proposedPaths.length,messagesSent:0,payloadHash}));
  } else {
    for (const a of payload) {
      const p=existing.rows.find(p=>p.id===a.id);
      if (!p || p.name!==a.name || p.role!==a.role || p.bio!==a.bio || p.system_prompt!==a.system_prompt || p.computer_id!==manifest.computer_id || p.engine!=='codex') throw new Error(`Participant mismatch: ${a.key}`);
      for (const [path,body] of Object.entries(a.contents)) if (!workspace.rows.some(r=>r.agent_id===a.id&&r.path===path&&r.body===body)) throw new Error(`Workspace mismatch: ${a.key}/${path}`);
      const dm=await c.query(`SELECT c.id FROM conversations c JOIN conversation_members a ON a.conversation_id=c.id AND a.company_id=c.company_id JOIN conversation_members u ON u.conversation_id=c.id AND u.company_id=c.company_id WHERE c.company_id=$1 AND c.kind='direct' AND a.participant_id=$2 AND u.participant_id=$3`,[company,a.id,manifest.owner_id]);
      if (!dm.rows.length) throw new Error(`Missing direct entry: ${a.key}`);
    }
    await c.query('ROLLBACK');
    const {buildSystemPrompt}=await import('/app/server/src/agents/personas.ts');
    const {loadSkillsIndex,parseSkillMd}=await import('/app/server/src/agents/skills.ts');
    const {pool: appPool}=await import('/app/server/src/db/pool.ts');
    const results=[];
    for (const a of payload) {
      const prompt=await buildSystemPrompt(a.id);
      const skills=await loadSkillsIndex(a.id);
      if (!prompt?.includes(a.system_prompt)) throw new Error(`Native persona load failed: ${a.key}`);
      if (!skills.some(s=>s.name==='lackeys-role') || !parseSkillMd(a.contents['skills/lackeys-role/SKILL.md']).frontmatter) throw new Error(`Native skill load failed: ${a.key}`);
      results.push({id:a.id,name:a.name,serverPersonaAssembly:true,serverSkillIndex:true,workspaceFiles:Object.keys(a.contents).length});
    }
    await appPool.end();
    console.log(JSON.stringify({verified:true,agents:results,verificationScope:"server database and helpers; BYOA request loading requires separate probe",messagesSent:0},null,2));
  }
} catch (e) {
  if (!committed) await c.query('ROLLBACK').catch(()=>{});
  // Error messages contain no connection strings or secret values.
  console.error(e.message);process.exitCode=1;
} finally {c.release();await pool.end();}
