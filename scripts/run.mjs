import { spawn } from 'node:child_process';

const mode = process.argv[2] === 'start' ? 'start' : 'dev';
const processes = [
  spawn(process.execPath, ['--env-file-if-exists=.env', 'mini_mart/backend/index.mjs'], {
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: mode === 'start' ? 'production' : 'development' },
  }),
  spawn(
    process.execPath,
    ['node_modules/next/dist/bin/next', mode, 'mini_mart/frontend', '--hostname', '127.0.0.1'],
    { stdio: 'inherit' },
  ),
];

function stop(signal = 'SIGTERM') {
  for (const process of processes) process.kill(signal);
}
process.on('SIGINT', () => stop('SIGINT'));
process.on('SIGTERM', () => stop());
for (const process of processes)
  process.on('exit', (code) => {
    if (code && code !== 0) {
      stop();
      process.exitCode = code;
    }
  });
