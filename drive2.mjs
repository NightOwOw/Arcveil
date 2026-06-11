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

// Inspect the sidebar nav items
const navInfo = await main.evaluate(() => {
  const items = document.querySelectorAll('.sb-nav-item, .nav-item, [data-view], [data-nav]');
  return [...items].map(el => ({
    tag: el.tagName,
    class: el.className.slice(0,60),
    text: el.textContent?.trim().slice(0,40),
    dataView: el.dataset?.view,
    datNav: el.dataset?.nav,
  }));
});
console.log('NAV ITEMS:', JSON.stringify(navInfo, null, 2));

// Try clicking Settings by text
const settingsResult = await main.evaluate(() => {
  const els = [...document.querySelectorAll('*')];
  const settingsEl = els.find(e => e.textContent?.trim() === 'Settings' && (e.tagName === 'BUTTON' || e.tagName === 'LI' || e.tagName === 'DIV' || e.tagName === 'A') && e.children.length < 3);
  if (settingsEl) { settingsEl.click(); return { found: true, tag: settingsEl.tagName, class: settingsEl.className }; }
  return { found: false };
});
console.log('Settings click:', settingsResult);
await new Promise(r => setTimeout(r, 1500));

// Check active view
const activeView = await main.evaluate(() => {
  const active = document.querySelector('.view.active');
  return active ? { id: active.id, firstChild: active.innerHTML?.slice(0,200) } : null;
});
console.log('Active view after settings click:', activeView?.id);
await main.screenshot({ path: path.join(SHOTS, '03-settings-real.png') });

// Also check if settings view has content
const settingsContent = await main.evaluate(() => {
  const el = document.getElementById('view-settings');
  return el ? { html: el.innerHTML.slice(0,300), classes: el.className } : null;
});
console.log('Settings view content:', settingsContent?.html?.slice(0,150));

await new Promise(r => setTimeout(r, 1000));
console.log('Errors:', errors);
await app.close().catch(()=>{});
