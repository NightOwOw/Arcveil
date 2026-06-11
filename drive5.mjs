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

// 1. Characters view
await main.evaluate(() => document.querySelector('[data-view="characters"]')?.click());
await new Promise(r => setTimeout(r, 1500));
await main.screenshot({ path: path.join(SHOTS, '20-characters.png') });
console.log('Characters view shot taken');

// 2. Create character via toolbar button  
await main.evaluate(() => {
  const btn = [...document.querySelectorAll('button')].find(b => b.textContent?.includes('New Character') || b.id === 'tb-new-char');
  btn?.click();
});
await new Promise(r => setTimeout(r, 1500));
await main.screenshot({ path: path.join(SHOTS, '21-new-char.png') });

// 3. Canvas: add a node and click it
await main.evaluate(() => document.querySelector('[data-view="canvas"]')?.click());
await new Promise(r => setTimeout(r, 1500));
// Use N key to add node
await main.keyboard.press('n');
await new Promise(r => setTimeout(r, 1000));

// Click the node
const nodeEl = await main.evaluate(() => {
  const node = document.querySelector('.node');
  if (node) { node.click(); return node.dataset?.id; }
  return null;
});
console.log('Node clicked:', nodeEl);
await new Promise(r => setTimeout(r, 1000));
await main.screenshot({ path: path.join(SHOTS, '22-node-selected.png') });

// 4. Open profile by double clicking
await main.evaluate(() => {
  const node = document.querySelector('.node');
  if (node) {
    const e = new MouseEvent('dblclick', { bubbles: true });
    node.dispatchEvent(e);
  }
});
await new Promise(r => setTimeout(r, 1500));
await main.screenshot({ path: path.join(SHOTS, '23-profile.png') });

// 5. Settings - click Assistant tab
await main.evaluate(() => document.querySelector('[data-view="settings"]')?.click());
await new Promise(r => setTimeout(r, 1500));
await main.evaluate(() => {
  const btn = [...document.querySelectorAll('.settings-nav-item')].find(b => b.textContent.includes('Assistant'));
  btn?.click();
});
await new Promise(r => setTimeout(r, 1000));
await main.screenshot({ path: path.join(SHOTS, '24-settings-assistant.png') });

// 6. Story structure - add event
await main.evaluate(() => document.querySelector('[data-view="story"]')?.click());
await new Promise(r => setTimeout(r, 1500));
await main.evaluate(() => {
  const btn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Add Event'));
  btn?.click();
});
await new Promise(r => setTimeout(r, 1000));
await main.screenshot({ path: path.join(SHOTS, '25-story-event.png') });

// 7. Theme switch test
await main.evaluate(() => document.querySelector('[data-view="settings"]')?.click());
await new Promise(r => setTimeout(r, 1500));
await main.evaluate(() => {
  const applyBtns = document.querySelectorAll('.theme-apply-btn');
  // Click the second theme (light)
  if (applyBtns[1]) applyBtns[1].click();
});
await new Promise(r => setTimeout(r, 800));
await main.screenshot({ path: path.join(SHOTS, '26-light-theme.png') });

console.log('\nErrors:', errors.length);
errors.forEach(e => console.log(' ', e));
await app.close().catch(()=>{});
