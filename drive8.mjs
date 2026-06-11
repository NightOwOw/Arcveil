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

const SM = { clip: {x:0,y:0,width:900,height:600} };

// Test each view
for (const v of ['dashboard','characters','writing','lore','settings','about']) {
  await main.evaluate(v => document.querySelector(`[data-view="${v}"]`)?.click(), v);
  await new Promise(r => setTimeout(r, v === 'settings' ? 1800 : 1200));
  await main.screenshot({ path: path.join(SHOTS, `sm-${v}.png`), ...SM });
  console.log(`sm-${v}.png`);
}

// Add character, open profile
await main.evaluate(() => document.querySelector('[data-view="canvas"]')?.click());
await new Promise(r => setTimeout(r, 800));
await main.keyboard.press('n');
await new Promise(r => setTimeout(r, 700));
await main.evaluate(() => document.querySelector('.node')?.dispatchEvent(new MouseEvent('dblclick',{bubbles:true})));
await new Promise(r => setTimeout(r, 1200));
await main.screenshot({ path: path.join(SHOTS, 'sm-profile-open.png'), ...SM });
console.log('sm-profile-open.png');

// Now check characters view with 1 character
await main.evaluate(() => document.querySelector('[data-view="characters"]')?.click());
await new Promise(r => setTimeout(r, 1000));
await main.screenshot({ path: path.join(SHOTS, 'sm-chars-1.png'), ...SM });
console.log('sm-chars-1.png');

// Check save dialog
await main.keyboard.press('Control+s');
await new Promise(r => setTimeout(r, 2000));
const st = await main.evaluate(() => document.getElementById('sb-save-txt')?.textContent);
console.log('save status:', st);
await main.screenshot({ path: path.join(SHOTS, 'sm-after-save.png'), ...SM });

console.log('\nAll errors:', errors);
await app.close().catch(()=>{});
