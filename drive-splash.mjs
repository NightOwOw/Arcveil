// drive-splash.mjs — verify splash appears then main window opens
import { _electron as electron } from 'playwright-core';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const SHOTS = path.join(DIR, 'screenshots');
fs.mkdirSync(SHOTS, { recursive: true });

const bin = path.join(DIR, 'node_modules/electron/dist/electron.exe');
const app = await electron.launch({ executablePath: bin, args: [DIR] });

// 0.5s — splash should be showing
await new Promise(r => setTimeout(r, 500));
const windows0 = app.windows();
console.log('windows at 0.5s:', windows0.length);
for (const w of windows0) console.log(' ', w.url());

// Screenshot the splash window
const splash = windows0.find(w => w.url().includes('splash.html'));
if (splash) {
  await splash.screenshot({ path: path.join(SHOTS, 'splash-visible.png'), scale: 'css' });
  console.log('Splash screenshot taken');
} else {
  console.log('No splash window found');
}

// 3s — splash should be gone, main window open
await new Promise(r => setTimeout(r, 3000));
const windows3 = app.windows();
console.log('windows at 3.5s:', windows3.length);
for (const w of windows3) console.log(' ', w.url());

const main = windows3.find(w => w.url().includes('index.html'));
if (main) {
  await main.screenshot({ path: path.join(SHOTS, 'after-splash.png'), scale: 'css' });
  const status = await main.evaluate(() => document.getElementById('sb-save-txt')?.textContent);
  console.log('Main window status:', status);
} else {
  console.log('No main window found');
}

await app.close();
