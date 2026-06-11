// drive10.mjs — verify demo content on fresh start, dashboard, map
import { _electron as electron } from 'playwright-core';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)));
const SHOTS = path.join(DIR, 'screenshots');
fs.mkdirSync(SHOTS, { recursive: true });

const electronBin = path.join(DIR, 'node_modules/electron/dist/electron.exe');

const app = await electron.launch({
  executablePath: electronBin,
  args: [DIR],
  env: { ...process.env, ARCVEIL_TEST: '1' },
});

const main = await app.firstWindow();
await main.waitForLoadState('domcontentloaded');
await new Promise(r => setTimeout(r, 3500));

const ss = async (name) => main.screenshot({
  path: path.join(SHOTS, name + '.png'), scale: 'css'
});

// Check demo nodes loaded
const nodeCount = await main.evaluate(() => window.arcveilState?.nodes?.length ?? -1);
console.log('nodes on startup:', nodeCount);

// Dashboard
await ss('d10-dashboard');

// Navigate to canvas and check for demo nodes
await main.evaluate(() => document.querySelector('[data-view="canvas"]')?.click());
await new Promise(r => setTimeout(r, 600));
await ss('d10-canvas');

const canvasNodes = await main.evaluate(() => document.querySelectorAll('.node').length);
console.log('canvas nodes:', canvasNodes);

// Navigate to World & Maps
await main.evaluate(() => document.querySelector('[data-view="world"]')?.click());
await new Promise(r => setTimeout(r, 600));
await ss('d10-world');

// Navigate to Writing Hub
await main.evaluate(() => document.querySelector('[data-view="writing"]')?.click());
await new Promise(r => setTimeout(r, 600));

// Create a doc and type
await main.evaluate(() => document.getElementById('w-create-first')?.click() || document.getElementById('w-new-doc')?.click());
await new Promise(r => setTimeout(r, 400));
await main.evaluate(() => document.getElementById('w-title-input')?.focus());
await main.keyboard.type('The Beginning', { delay: 20 });
await main.evaluate(() => document.getElementById('w-body')?.focus());
await main.keyboard.type('It was a dark and stormy night.', { delay: 20 });
await new Promise(r => setTimeout(r, 300));
await ss('d10-writing');

const wc = await main.evaluate(() => document.getElementById('w-wc')?.textContent);
console.log('word count:', wc);

// Check status bar
const saveStatus = await main.evaluate(() => document.getElementById('sb-save-txt')?.textContent);
console.log('save status:', saveStatus);

// errors
const errors = [];
main.on('pageerror', e => errors.push(e.message));
main.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
await new Promise(r => setTimeout(r, 500));
console.log('errors:', errors.length, errors.slice(0, 3));

await app.close();
