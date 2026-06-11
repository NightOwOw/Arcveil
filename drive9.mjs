import { _electron as electron } from 'playwright-core';
import path from 'path';

const APP_DIR = 'D:/Comm/OC Creator/arcveil';
const electronBin = path.join(APP_DIR, 'node_modules/electron/dist/electron.exe');
const SHOTS = path.join(APP_DIR, 'screenshots');

const app = await electron.launch({ executablePath: electronBin, args: [APP_DIR], timeout: 30000 });
await new Promise(r => setTimeout(r, 5000));
const wins = app.windows();
const main = wins.find(w => w.url().includes('index.html')) ?? wins[0];
const errors = [];
main.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
main.on('pageerror', err => errors.push(err.message));

async function shot(name) {
  await main.screenshot({ path: path.join(SHOTS, name + '.png'), scale: 'css' });
  console.log(name + '.png');
}

// Characters empty state
await main.evaluate(() => document.querySelector('[data-view="characters"]')?.click());
await new Promise(r => setTimeout(r, 1200));
await shot('v-characters');

// Open profile via dblclick on canvas node
await main.evaluate(() => document.querySelector('[data-view="canvas"]')?.click());
await new Promise(r => setTimeout(r, 800));
await main.keyboard.press('n');
await new Promise(r => setTimeout(r, 600));
await main.evaluate(() => document.querySelector('.node')?.dispatchEvent(new MouseEvent('dblclick',{bubbles:true})));
await new Promise(r => setTimeout(r, 1200));
await shot('v-profile');

// Settings
await main.evaluate(() => document.querySelector('[data-view="settings"]')?.click());
await new Promise(r => setTimeout(r, 1800));
await shot('v-settings');

// Settings assistant tab
await main.evaluate(() => [...document.querySelectorAll('.settings-nav-item')].find(e => e.textContent.includes('Assistant'))?.click());
await new Promise(r => setTimeout(r, 800));
await shot('v-settings-asst');

// About
await main.evaluate(() => document.querySelector('[data-view="about"]')?.click());
await new Promise(r => setTimeout(r, 1200));
await shot('v-about');

// Lore
await main.evaluate(() => document.querySelector('[data-view="lore"]')?.click());
await new Promise(r => setTimeout(r, 1000));
await shot('v-lore');

// Story - Beat Sheet tab
await main.evaluate(() => document.querySelector('[data-view="story"]')?.click());
await new Promise(r => setTimeout(r, 1000));
await main.evaluate(() => [...document.querySelectorAll('[class*="tab"], .tl-tab, .st-tab')].find(e => e.textContent.includes('Beat'))?.click());
await new Promise(r => setTimeout(r, 800));
await shot('v-story-beats');

// Save  
await main.keyboard.press('Control+s');
await new Promise(r => setTimeout(r, 2000));
const sv = await main.evaluate(() => document.getElementById('sb-save-txt')?.textContent);
console.log('save:', sv);

console.log('errors:', errors.length, errors.slice(0,5));
await app.close().catch(()=>{});
