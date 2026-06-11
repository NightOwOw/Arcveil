import { chromium } from 'playwright-core';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)));
const SHOTS = path.join(DIR, 'screenshots', 'live');
fs.mkdirSync(SHOTS, { recursive: true });

const electronBin = path.join(DIR, 'node_modules/electron/dist/electron.exe');

console.log('Launching Electron with remote-debugging-port=9222...');

const child = spawn(electronBin, [
  DIR,
  '--remote-debugging-port=9222',
  '--remote-debugging-address=127.0.0.1',
  '--no-sandbox',
], { stdio: ['ignore', 'pipe', 'pipe'] });

child.stdout.on('data', d => process.stdout.write('[stdout] ' + d));
child.stderr.on('data', d => process.stderr.write('[stderr] ' + d));

// Wait for app to boot
console.log('Waiting 6s for app to boot...');
await new Promise(r => setTimeout(r, 6000));

// Try to connect via CDP
let browser;
try {
  browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  console.log('Connected via CDP!');
} catch (e) {
  console.error('CDP connect failed:', e.message);
  // Try fetching the list endpoint directly
  try {
    const res = await fetch('http://127.0.0.1:9222/json/list');
    const targets = await res.json();
    console.log('CDP targets:', JSON.stringify(targets, null, 2));
    if (targets.length > 0) {
      browser = await chromium.connectOverCDP(targets[0].webSocketDebuggerUrl);
      console.log('Connected via webSocket!');
    }
  } catch (e2) {
    console.error('fetch failed too:', e2.message);
    child.kill();
    process.exit(1);
  }
}

const contexts = browser.contexts();
const pages = contexts.flatMap(c => c.pages());
console.log('Pages:', pages.map(p => p.url()));

let main = pages.find(p => p.url().includes('index.html')) || pages[0];
if (!main) {
  console.error('No main page found');
  child.kill();
  process.exit(1);
}

const ss = async (name) => {
  const p = path.join(SHOTS, name + '.png');
  await main.screenshot({ path: p });
  console.log('screenshot:', name);
};

const nav = async (view, ms = 700) => {
  await main.evaluate(v => {
    const el = document.querySelector(`[data-view="${v}"]`) || document.querySelector(`[data-nav="${v}"]`);
    if (el) el.click();
  }, view);
  await new Promise(r => setTimeout(r, ms));
};

await ss('00-launch');

const views = ['dashboard','canvas','characters','writing','world','story','lore','settings','about'];
for (const v of views) {
  await nav(v);
  await ss('view-' + v);
  console.log('visited:', v);
}

console.log('All views visited. Done.');
await browser.close();
child.kill();
