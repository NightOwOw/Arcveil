import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)));

// Run npm start exactly as the user would
const child = spawn('npm', ['start'], {
  cwd: DIR,
  stdio: 'inherit',
  shell: true,
  windowsHide: false,
});

child.on('error', e => console.error('error:', e));
console.log('PID:', child.pid);
await new Promise(r => setTimeout(r, 8000));
child.kill();
console.log('done');
