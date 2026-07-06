import {spawn} from 'node:child_process';

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function run(label, command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env: {...process.env, ...options.env},
      shell: false,
      stdio: 'inherit',
    });

    child.on('error', (error) => {
      reject(new Error(`${label} failed to start: ${error.message}`));
    });

    child.on('exit', (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${label} failed${signal ? ` with signal ${signal}` : ` with exit code ${code}`}`));
    });
  });
}

async function runParallel(steps) {
  await Promise.all(steps.map((step) => run(step.label, step.command, step.args, step.options)));
}

await runParallel([
  {label: 'css assets', command: npmCommand, args: ['run', 'make:css']},
  {label: 'static json', command: npmCommand, args: ['run', 'make:json']},
]);

await runParallel([
  {label: 'server build', command: npmCommand, args: ['run', 'build:server']},
  {label: 'card rendering data', command: npmCommand, args: ['run', 'make:cards']},
]);

await run('client assets', npmCommand, ['run', 'build:client:assets']);
