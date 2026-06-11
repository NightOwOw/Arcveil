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
main.on('pageerror', err => errors.push('PAGEERROR:'+err.message));

const FULL = { clip: {x:0,y:0,width:1200,height:728} };

// Snapshot every view fullwidth
for (const view of ['dashboard','canvas','characters','writing','world','story','lore','settings','about']) {
  await main.evaluate(v => document.querySelector(`[data-view="${v}"]`)?.click(), view);
  await new Promise(r => setTimeout(r, view === 'settings' ? 1500 : 1000));
  await main.screenshot({ path: path.join(SHOTS, `full-${view}.png`), ...FULL });
  console.log(`full-${view}.png`);
}

// More detailed tests
// 1. Add a character and open profile
await main.evaluate(() => document.querySelector('[data-view="canvas"]')?.click());
await new Promise(r => setTimeout(r, 800));
await main.keyboard.press('n');
await new Promise(r => setTimeout(r, 600));
await main.evaluate(() => {
  const node = document.querySelector('.node');
  node?.dispatchEvent(new MouseEvent('dblclick', {bubbles:true}));
});
await new Promise(r => setTimeout(r, 1000));
await main.screenshot({ path: path.join(SHOTS, 'full-profile.png'), ...FULL });
console.log('full-profile.png');

// 2. Check characters view now has 1 char
await main.evaluate(() => document.querySelector('[data-view="characters"]')?.click());
await new Promise(r => setTimeout(r, 1000));
await main.screenshot({ path: path.join(SHOTS, 'full-chars-with-node.png'), ...FULL });
console.log('full-chars-with-node.png');

// 3. Ctrl+S to save
await main.keyboard.press('Control+s');
await new Promise(r => setTimeout(r, 1500));
const saveStatus = await main.evaluate(() => document.getElementById('sb-save-txt')?.textContent);
console.log('Save status:', saveStatus);

console.log('\nErrors:', errors.length);
errors.forEach(e => console.log('  E:', e));
await app.close().catch(()=>{});
