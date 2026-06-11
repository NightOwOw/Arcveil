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

// Click Settings
await main.evaluate(() => document.querySelector('[data-view="settings"]')?.click());
await new Promise(r => setTimeout(r, 2000));
const settingsHtml = await main.evaluate(() => document.getElementById('view-settings')?.innerHTML?.slice(0,300));
console.log('Settings HTML:', settingsHtml ? settingsHtml.slice(0,200) : '(empty)');
await main.screenshot({ path: path.join(SHOTS, '10-settings.png') });

// Click About
await main.evaluate(() => document.querySelector('[data-view="about"]')?.click());
await new Promise(r => setTimeout(r, 2000));
const aboutHtml = await main.evaluate(() => document.getElementById('view-about')?.innerHTML?.slice(0,200));
console.log('About HTML:', aboutHtml ? aboutHtml.slice(0,200) : '(empty)');
await main.screenshot({ path: path.join(SHOTS, '11-about.png') });

// Test map generation
await main.evaluate(() => document.querySelector('[data-view="world"]')?.click());
await new Promise(r => setTimeout(r, 1500));
await main.evaluate(() => { const btn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Create New Map')); btn?.click(); });
await new Promise(r => setTimeout(r, 1000));
// Click Generate
await main.evaluate(() => { const btn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Generate')); btn?.click(); });
await new Promise(r => setTimeout(r, 4000));
await main.screenshot({ path: path.join(SHOTS, '12-map-gen.png') });

// Test character creation 
await main.evaluate(() => document.querySelector('[data-view="canvas"]')?.click());
await new Promise(r => setTimeout(r, 1500));
// Double click to add a node
await main.evaluate(() => {
  const canvas = document.getElementById('view-canvas');
  if (canvas) {
    const e = new MouseEvent('dblclick', { clientX: 600, clientY: 400, bubbles: true });
    canvas.dispatchEvent(e);
  }
});
await new Promise(r => setTimeout(r, 1000));
await main.screenshot({ path: path.join(SHOTS, '13-canvas-node.png') });

console.log('\nErrors:', errors.length);
errors.forEach(e => console.log(' ', e));
await app.close().catch(()=>{});
