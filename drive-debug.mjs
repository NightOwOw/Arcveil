import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)));
const electronBin = path.join(DIR, 'node_modules/electron/dist/electron.exe');

console.log('Launching Electron with --enable-logging...');
const child = spawn(electronBin, [DIR, '--enable-logging', '--remote-debugging-port=9222'], {
  stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env, ELECTRON_ENABLE_LOGGING: '1', ELECTRON_LOG_FILE: path.join(DIR, 'electron-log.txt') }
});

const lines = [];
child.stdout.on('data', d => { const s = d.toString(); lines.push('[OUT] ' + s); process.stdout.write(s); });
child.stderr.on('data', d => { const s = d.toString(); lines.push('[ERR] ' + s); process.stderr.write(s); });

await new Promise(r => setTimeout(r, 8000));

console.log('\n\n=== ALL OUTPUT ===');
lines.forEach(l => console.log(l));
child.kill();
