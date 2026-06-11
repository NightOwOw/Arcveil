import { _electron as electron } from 'playwright-core';
import path from 'path';
import fs from 'fs';

const APP_DIR = 'D:/Comm/OC Creator/arcveil';
const electronBin = path.join(APP_DIR, 'node_modules/electron/dist/electron.exe');
const SHOTS = 'D:/Comm/OC Creator/arcveil/screenshots';
fs.mkdirSync(SHOTS, { recursive: true });

const app = await electron.launch({
  executablePath: electronBin,
  args: [APP_DIR],
  timeout: 30000,
});

await new Promise(r => setTimeout(r, 6000));
const wins = app.windows();
const main = wins.find(w => w.url().includes('index.html')) ?? wins[0];
console.log('main url:', main.url());

// Collect all errors
const errors = [];
main.on('console', msg => { if (['error','warning'].includes(msg.type())) errors.push(msg.type()+': '+msg.text()); });
main.on('pageerror', err => errors.push('PAGEERROR: '+err.message));

await main.screenshot({ path: path.join(SHOTS, '01-launch.png') });
console.log('shot: 01-launch.png');

// Click each nav item and screenshot
const navItems = ['dashboard','characters','writing','world','story','lore','settings','about'];
for (const nav of navItems) {
  const clicked = await main.evaluate((n) => {
    const el = document.querySelector(`[data-view="${n}"]`) 
            || document.querySelector(`[data-nav="${n}"]`)
            || document.querySelector(`[href="#${n}"]`)
            || [...document.querySelectorAll('.nav-item, .sb-nav-btn, [class*="nav"]')].find(e => e.textContent.toLowerCase().includes(n));
    if (el) { el.click(); return true; }
    return false;
  }, nav);
  await new Promise(r => setTimeout(r, 1000));
  await main.screenshot({ path: path.join(SHOTS, `02-${nav}.png`) });
  console.log(`shot: 02-${nav}.png (clicked: ${clicked})`);
}

await new Promise(r => setTimeout(r, 2000));
console.log('\nErrors:', errors.length);
errors.slice(0,20).forEach(e => console.log(e));

await app.close().catch(()=>{});
