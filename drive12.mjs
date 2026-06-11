// drive12.mjs — find correct window, verify demo content, dirty marking
import { _electron as electron } from 'playwright-core';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)));
const SHOTS = path.join(DIR, 'screenshots');
fs.mkdirSync(SHOTS, { recursive: true });

const electronBin = path.join(DIR, 'node_modules/electron/dist/electron.exe');

const app = await electron.launch({ executablePath: electronBin, args: [DIR] });

// Wait for windows to open
await new Promise(r => setTimeout(r, 4000));

// Find the main index.html window
let main = null;
for (const w of app.windows()) {
  const url = w.url();
  console.log('window:', url);
  if (url.includes('index.html') || url.endsWith('/')) main = w;
}
if (!main) {
  main = await app.firstWindow();
  console.log('fallback to firstWindow:', main.url());
}

const errors = [];
main.on('pageerror', e => errors.push('PAGE:' + e.message));
main.on('console', msg => { if (msg.type() === 'error') errors.push('CON:' + msg.text()); });

await new Promise(r => setTimeout(r, 1000));

const ss = n => main.screenshot({ path: path.join(SHOTS, n + '.png'), scale: 'css' });

const statusTxt = await main.evaluate(() => document.getElementById('sb-save-txt')?.textContent);
console.log('save status:', statusTxt);

// Navigate to canvas
await main.evaluate(() => document.querySelector('[data-view="canvas"]')?.click());
await new Promise(r => setTimeout(r, 600));

const canvasNodes = await main.evaluate(() => document.querySelectorAll('.node').length);
console.log('canvas nodes after nav:', canvasNodes);
await ss('d12-canvas');

// Navigate to lore and add a location
await main.evaluate(() => document.querySelector('[data-view="lore"]')?.click());
await new Promise(r => setTimeout(r, 500));
await main.evaluate(() => document.getElementById('add-loc')?.click());
await new Promise(r => setTimeout(r, 300));

const saveStatus2 = await main.evaluate(() => document.getElementById('sb-save-txt')?.textContent);
console.log('save status after adding location:', saveStatus2);
await ss('d12-lore');

// Navigate to writing, create doc, type
await main.evaluate(() => document.querySelector('[data-view="writing"]')?.click());
await new Promise(r => setTimeout(r, 400));
await main.evaluate(() => document.getElementById('w-create-first')?.click() || document.getElementById('w-new-doc')?.click());
await new Promise(r => setTimeout(r, 400));
await main.evaluate(() => document.getElementById('w-body')?.focus());
await main.keyboard.type('Once upon a time', { delay: 20 });
await new Promise(r => setTimeout(r, 200));
const wc = await main.evaluate(() => document.getElementById('w-wc')?.textContent);
const saveStatus3 = await main.evaluate(() => document.getElementById('sb-save-txt')?.textContent);
console.log('word count:', wc, '| save status:', saveStatus3);
await ss('d12-writing');

console.log('errors:', errors.length, errors.slice(0,5));
await app.close();
