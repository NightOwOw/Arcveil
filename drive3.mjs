import { _electron as electron } from 'playwright-core';
import path from 'path';
import fs from 'fs';

const APP_DIR = 'D:/Comm/OC Creator/arcveil';
const electronBin = path.join(APP_DIR, 'node_modules/electron/dist/electron.exe');
const SHOTS = path.join(APP_DIR, 'screenshots');

const app = await electron.launch({ executablePath: electronBin, args: [APP_DIR], timeout: 30000 });
await new Promise(r => setTimeout(r, 5000));
const wins = app.windows();
const main = wins.find(w => w.url().includes('index.html')) ?? wins[0];

const errors = [];
main.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
main.on('pageerror', err => errors.push('PAGEERROR: '+err.message));

// 1. Click settings via data-view
await main.evaluate(() => document.querySelector('[data-view="settings"]')?.click());
await new Promise(r => setTimeout(r, 2000));
await main.screenshot({ path: path.join(SHOTS, '03-settings.png') });
const settingsHtml = await main.evaluate(() => document.getElementById('view-settings')?.innerHTML?.slice(0,500));
console.log('Settings HTML:', settingsHtml?.slice(0,200) || '(empty)');

// 2. Click about
await main.evaluate(() => document.querySelector('[data-view="about"]')?.click());
await new Promise(r => setTimeout(r, 2000));
await main.screenshot({ path: path.join(SHOTS, '04-about.png') });
const aboutHtml = await main.evaluate(() => document.getElementById('view-about')?.innerHTML?.slice(0,300));
console.log('About HTML:', aboutHtml?.slice(0,200) || '(empty)');

// 3. Create a new document
await main.evaluate(() => document.querySelector('[data-view="writing"]')?.click());
await new Promise(r => setTimeout(r, 1500));
await main.evaluate(() => {
  const btn = document.getElementById('w-new-doc') || document.getElementById('w-create-first');
  btn?.click();
});
await new Promise(r => setTimeout(r, 1000));
await main.screenshot({ path: path.join(SHOTS, '05-writing-doc.png') });

// 4. Try map generation
await main.evaluate(() => document.querySelector('[data-view="world"]')?.click());
await new Promise(r => setTimeout(r, 1500));
await main.evaluate(() => {
  const btn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Create New Map'));
  btn?.click();
});
await new Promise(r => setTimeout(r, 1500));
await main.screenshot({ path: path.join(SHOTS, '06-map-form.png') });

// 5. Character creation
await main.evaluate(() => document.querySelector('[data-view="characters"]')?.click());
await new Promise(r => setTimeout(r, 1500));
await main.screenshot({ path: path.join(SHOTS, '07-chars.png') });

console.log('\nErrors collected:', errors.length);
errors.forEach(e => console.log('  ', e));
await app.close().catch(()=>{});
