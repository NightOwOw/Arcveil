import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)));
const electronBin = path.join(DIR, 'node_modules/electron/dist/electron.exe');

console.log('electron bin:', electronBin);

// Try running without remote-debugging-port first to see if it launches at all
const child = spawn(electronBin, [DIR], {
  stdio: ['ignore', 'pipe', 'pipe'],
  windowsHide: false,
});

child.stdout.on('data', d => process.stdout.write('[OUT] ' + d));
child.stderr.on('data', d => process.stderr.write('[ERR] ' + d));
child.on('exit', (code, sig) => console.log('EXIT code:', code, 'signal:', sig));
child.on('error', e => console.error('SPAWN ERROR:', e));

console.log('Spawned PID:', child.pid);
await new Promise(r => setTimeout(r, 6000));
console.log('Killing...');
child.kill();
