import { _electron as electron } from 'playwright-core';
import path from 'path';

const APP_DIR = 'D:/Comm/OC Creator/arcveil';
const electronBin = path.join(APP_DIR, 'node_modules/electron/dist/electron.exe');
const SHOTS = path.join(APP_DIR, 'screenshots');

const app = await electron.launch({ executablePath: electronBin, args: [APP_DIR], timeout: 30000 });
await new Promise(r => setTimeout(r, 5000));

const wins = app.windows();
const main = wins.find(w => w.url().includes('index.html')) ?? wins[0];

// Resize main window to 800x500
await app.evaluate(({ BrowserWindow }) => {
  BrowserWindow.getAllWindows()[0]?.setSize(800, 500);
}, null);
await new Promise(r => setTimeout(r, 500));

const errors = [];
main.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
main.on('pageerror', err => errors.push(err.message));

async function shot(name) {
  await main.screenshot({ path: path.join(SHOTS, name + '.png') });
  console.log(name + '.png');
}

// Characters empty state
await main.evaluate(() => document.querySelector('[data-view="characters"]')?.click());
await new Promise(r => setTimeout(r, 1200));
await shot('t-characters');

// Add node and open profile
await main.evaluate(() => document.querySelector('[data-view="canvas"]')?.click());
await new Promise(r => setTimeout(r, 800));
await main.keyboard.press('n');
await new Promise(r => setTimeout(r, 600));
await main.evaluate(() => document.querySelector('.node')?.dispatchEvent(new MouseEvent('dblclick', {bubbles:true})));
await new Promise(r => setTimeout(r, 1200));
await shot('t-profile');

// Characters with 1 char
await main.evaluate(() => document.querySelector('[data-view="characters"]')?.click());
await new Promise(r => setTimeout(r, 1000));
await shot('t-chars-has-char');

// Settings
await main.evaluate(() => document.querySelector('[data-view="settings"]')?.click());
await new Promise(r => setTimeout(r, 1500));
await shot('t-settings');

// About  
await main.evaluate(() => document.querySelector('[data-view="about"]')?.click());
await new Promise(r => setTimeout(r, 1200));
await shot('t-about');

// Lore  
await main.evaluate(() => document.querySelector('[data-view="lore"]')?.click());
await new Promise(r => setTimeout(r, 1000));
await shot('t-lore');

// Save test (Ctrl+S)
await main.keyboard.press('Control+s');
await new Promise(r => setTimeout(r, 2500));
const st = await main.evaluate(() => document.getElementById('sb-save-txt')?.textContent);
console.log('save status after Ctrl+S:', st);

console.log('errors:', errors);
await app.close().catch(()=>{});
