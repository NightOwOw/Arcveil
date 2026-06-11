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

// 1. Apply Light theme from settings
await main.evaluate(() => document.querySelector('[data-view="settings"]')?.click());
await new Promise(r => setTimeout(r, 1500));
const themeCards = await main.evaluate(() => {
  const cards = document.querySelectorAll('.theme-card');
  return [...cards].map(c => ({tid: c.dataset?.tid, name: c.querySelector('.theme-card-name')?.textContent}));
});
console.log('Theme cards:', themeCards.slice(0,5));
// Apply light theme
await main.evaluate(() => {
  const btn = [...document.querySelectorAll('.theme-apply-btn')].find(b => b.dataset.tid === 'light');
  btn?.click();
});
await new Promise(r => setTimeout(r, 800));
await main.screenshot({ path: path.join(SHOTS, 'r01-light.png'), clip: {x:0,y:0,width:640,height:400} });

// 2. Apply Neon theme
await main.evaluate(() => {
  const btn = [...document.querySelectorAll('.theme-apply-btn')].find(b => b.dataset.tid === 'neon');
  btn?.click();
});
await new Promise(r => setTimeout(r, 800));
await main.screenshot({ path: path.join(SHOTS, 'r02-neon.png'), clip: {x:0,y:0,width:640,height:400} });

// 3. Characters view
await main.evaluate(() => document.querySelector('[data-view="characters"]')?.click());
await new Promise(r => setTimeout(r, 1500));
await main.screenshot({ path: path.join(SHOTS, 'r03-chars.png'), clip: {x:0,y:0,width:640,height:400} });

// 4. Profile via canvas click
await main.evaluate(() => document.querySelector('[data-view="canvas"]')?.click());
await new Promise(r => setTimeout(r, 1000));
await main.keyboard.press('n');
await new Promise(r => setTimeout(r, 600));
const profileBefore = await main.evaluate(() => document.getElementById('right-panel')?.innerHTML?.slice(0,100));
await main.evaluate(() => { const node = document.querySelector('.node'); node?.dispatchEvent(new MouseEvent('dblclick',{bubbles:true})); });
await new Promise(r => setTimeout(r, 1200));
await main.screenshot({ path: path.join(SHOTS, 'r04-profile.png'), clip: {x:0,y:0,width:640,height:400} });

// 5. Settings > Appearance tab typography
await main.evaluate(() => document.querySelector('[data-view="settings"]')?.click());
await new Promise(r => setTimeout(r, 1200));
// Scroll down to typography in settings
await main.evaluate(() => document.querySelector('.settings-scroll')?.scrollTo(0,500));
await new Promise(r => setTimeout(r, 300));
await main.screenshot({ path: path.join(SHOTS, 'r05-settings-typo.png'), clip: {x:0,y:0,width:640,height:400} });

// 6. Check if saving works
await main.evaluate(() => document.querySelector('[data-view="dashboard"]')?.click());
await new Promise(r => setTimeout(r, 800));
const saved = await main.evaluate(() => {
  const el = document.getElementById('sb-save-txt');
  return el?.textContent;
});
console.log('Save indicator:', saved);

console.log('\nErrors:', errors.length);
errors.forEach(e => console.log(' ', e));
await app.close().catch(()=>{});
