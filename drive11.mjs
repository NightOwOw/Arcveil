// drive11.mjs — diagnostic: check for errors and basic rendering
import { _electron as electron } from 'playwright-core';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)));
const SHOTS = path.join(DIR, 'screenshots');
fs.mkdirSync(SHOTS, { recursive: true });

const electronBin = path.join(DIR, 'node_modules/electron/dist/electron.exe');

const errors = [];
const app = await electron.launch({
  executablePath: electronBin,
  args: [DIR],
});

const main = await app.firstWindow();
main.on('pageerror', e => errors.push('PAGE ERROR: ' + e.message));
main.on('console', msg => { if (msg.type() === 'error') errors.push('CONSOLE ERROR: ' + msg.text()); });

await main.waitForLoadState('domcontentloaded');
await new Promise(r => setTimeout(r, 5000));  // longer wait

const statusTxt = await main.evaluate(() => document.getElementById('sb-save-txt')?.textContent);
const viewDash = await main.evaluate(() => document.getElementById('view-dashboard') !== null);
const nodeCount = await main.evaluate(() => document.querySelectorAll('.node').length);

console.log('sb-save-txt:', statusTxt);
console.log('view-dashboard exists:', viewDash);
console.log('canvas nodes (before nav):', nodeCount);

// Navigate to canvas
await main.evaluate(() => document.querySelector('[data-view="canvas"]')?.click());
await new Promise(r => setTimeout(r, 800));
const canvasNodes2 = await main.evaluate(() => document.querySelectorAll('.node').length);
console.log('canvas nodes (after nav):', canvasNodes2);

await main.screenshot({ path: path.join(SHOTS, 'd11-canvas.png'), scale: 'css' });

console.log('errors:', errors.length);
errors.forEach(e => console.log(' ', e));

await app.close();
