import { _electron as electron } from 'playwright-core';
import path from 'path';

const APP_DIR = 'D:/Comm/OC Creator/arcveil';
const electronBin = path.join(APP_DIR, 'node_modules/electron/dist/electron.exe');

const app = await electron.launch({
  executablePath: electronBin,
  args: [APP_DIR],
  timeout: 30000,
});

const errors = [];
await new Promise(r => setTimeout(r, 5000));
const windows = app.windows();
console.log('Windows:', windows.length);
for (const win of windows) {
  console.log('  url:', win.url());
  win.on('console', msg => { if (msg.type() === 'error') errors.push(win.url().split('/').pop() + ' | ' + msg.text()); });
  win.on('pageerror', err => errors.push('PAGE: ' + err.message));
}
await new Promise(r => setTimeout(r, 3000));
console.log('\n=== ERRORS ===');
errors.slice(0,30).forEach(e => console.log(e));
await app.close().catch(()=>{});
