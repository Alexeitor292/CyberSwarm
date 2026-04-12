import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const serverEntry = path.join(repoRoot, 'server', 'index.mjs');

const ENV_FILE = '.env';

const parseEnvLine = (line) => {
  const trimmed = String(line || '').trim();
  if (!trimmed || trimmed.startsWith('#')) return null;

  const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
  if (!match) return null;

  const key = match[1];
  let value = match[2] || '';

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  return { key, value: value.replace(/\\n/g, '\n') };
};

const loadFileEnv = (filePath) => {
  if (!existsSync(filePath)) return {};

  const raw = readFileSync(filePath, 'utf8');
  const lines = raw.split(/\r?\n/);
  const result = {};

  for (const line of lines) {
    const parsed = parseEnvLine(line);
    if (!parsed) continue;
    result[parsed.key] = parsed.value;
  }

  return result;
};

const fileEnv = loadFileEnv(path.join(repoRoot, ENV_FILE));

const mergedEnv = {
  ...process.env,
  ...fileEnv,
};

const child = spawn(process.execPath, [serverEntry], {
  cwd: repoRoot,
  env: mergedEnv,
  stdio: 'inherit',
  windowsHide: false,
});

child.on('error', (error) => {
  console.error(`[dev:api] Failed to start API server: ${error.message}`);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
