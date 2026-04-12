import { spawn } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const npmExecPath = process.env.npm_execpath;

const runner = npmExecPath
  ? {
      command: process.execPath,
      argsPrefix: [npmExecPath, 'run'],
      label: path.basename(npmExecPath),
    }
  : {
      command: process.platform === 'win32' ? 'npm.cmd' : 'npm',
      argsPrefix: ['run'],
      label: process.platform === 'win32' ? 'npm.cmd' : 'npm',
    };

const children = [];
let isShuttingDown = false;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const stopChild = (child, signal) => {
  if (!child || child.exitCode !== null || child.signalCode) return;

  try {
    child.kill(signal);
  } catch (_error) {
    // Ignore kill errors while shutting down.
  }
};

const shutdown = async (exitCode = 0, reason = '') => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  if (reason) {
    console.log(`\n[dev:all] ${reason}`);
  }

  for (const child of children) {
    stopChild(child, 'SIGTERM');
  }

  await sleep(750);

  for (const child of children) {
    stopChild(child, 'SIGKILL');
  }

  process.exit(exitCode);
};

const startScript = (name, scriptName) => {
  const child = spawn(runner.command, [...runner.argsPrefix, scriptName], {
    cwd: repoRoot,
    env: process.env,
    stdio: 'inherit',
    windowsHide: false,
  });

  children.push(child);

  child.on('error', (error) => {
    console.error(`[dev:all] Failed to start ${name}: ${error.message}`);
    shutdown(1, `Could not start ${name}.`);
  });

  child.on('exit', (code, signal) => {
    if (isShuttingDown) return;

    if (code === 0) {
      shutdown(0, `${name} stopped.`);
      return;
    }

    const exitDetail = signal ? `signal ${signal}` : `code ${code ?? 1}`;
    shutdown(code ?? 1, `${name} exited with ${exitDetail}.`);
  });
};

process.on('SIGINT', () => {
  shutdown(0, 'Stopping local dev servers...');
});

process.on('SIGTERM', () => {
  shutdown(0, 'Stopping local dev servers...');
});

console.log(`[dev:all] Starting API and site dev servers with ${runner.label}...`);

startScript('API server', 'dev:api');
startScript('Vite dev server', 'dev');
