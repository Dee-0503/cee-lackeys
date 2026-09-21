// Deployment wrapper; does not change Cumora source or log secret values.
import { readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
const operation = process.argv[2];
if (!['migrate', 'server:start'].includes(operation)) process.exit(2);
const secret = (name) => {
  try {
    const value = readFileSync(`/run/secrets/${name}`, 'utf8').trim();
    if (!value) throw new Error();
    return value;
  } catch {
    console.error(`Configuration missing: secret file ${name}`);
    process.exit(2);
  }
};
const env = { ...process.env };
for (const name of ['OPENAI_BASE_URL', 'OPENAI_MODEL', 'OPENAI_MODEL_SUPPORT']) {
  if (!env[name]?.trim()) {
    console.error(`Configuration missing: ${name}`);
    process.exit(2);
  }
}
env.OPENAI_API_KEY = secret('openai_api_key');
env.AGENT_RUNTIME_SECRET = secret('agent_runtime_secret');
env.DATABASE_URL = `postgresql://cumora:${encodeURIComponent(secret('postgres_password'))}@postgres:5432/cumora`;
if (operation === 'server:start') {
  if (env.PILOT_CALENDAR_POLICY !== 'allow-synthetic-tests') {
    console.error('Configuration pending: calendar policy requires explicit approval');
    process.exit(2);
  }
  if (!env.GITHUB_CLIENT_ID) {
    console.error('Configuration missing: GITHUB_CLIENT_ID');
    process.exit(2);
  }
  env.GITHUB_CLIENT_SECRET = secret('github_client_secret');
}
const child = spawn('npm', ['run', operation], { env, stdio: 'inherit' });
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => child.kill(signal));
child.on('error', () => { console.error('Runtime could not be started'); process.exit(1); });
child.on('exit', code => process.exit(code ?? 1));
