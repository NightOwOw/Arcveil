// Full feature exploration of ArcVeil
import { _electron as electron } from 'playwright-core';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)));
const SHOTS = path.join(DIR, 'screenshots', 'explore');
fs.mkdirSync(SHOTS, { recursive: true });

const electronBin = path.join(DIR, 'node_modules/electron/dist/electron.exe');

const app = await electron.launch({
  executablePath: electronBin,
  args: [DIR, '--no-sandbox', '--disable-gpu'],
  timeout: 45000,
  env: { ...process.env, ELECTRON_ENABLE_LOGGING: '1' },
});

await new Promise(r => setTimeout(r, 5000));

// Find main window
let main = null;
for (const w of app.windows()) {
  const url = w.url();
  console.log('window url:', url);
  if (url.includes('index.html') || url.endsWith('/')) main = w;
}
if (!main) {
  main = await app.firstWindow();
  console.log('fallback to firstWindow:', main.url());
}

const errors = [];
main.on('pageerror', e => errors.push('PAGE: ' + e.message));
main.on('console', msg => { if (msg.type() === 'error') errors.push('CON: ' + msg.text()); });

await new Promise(r => setTimeout(r, 1500));

const ss = async (name) => {
  const p = path.join(SHOTS, name + '.png');
  await main.screenshot({ path: p, scale: 'css' });
  console.log('screenshot:', name);
};

const nav = async (view, wait = 800) => {
  await main.evaluate(v => {
    const el = document.querySelector(`[data-view="${v}"]`) || document.querySelector(`[data-nav="${v}"]`);
    if (el) { el.click(); return true; }
    return false;
  }, view);
  await new Promise(r => setTimeout(r, wait));
};

await ss('1-launch');

// Get all nav items from sidebar
const navItems = await main.evaluate(() =>
  [...document.querySelectorAll('[data-view], [data-nav]')]
    .map(e => ({ view: e.dataset.view || e.dataset.nav, text: e.textContent.trim() }))
    .filter(e => e.view && e.view.length > 0)
);
console.log('Nav items:', navItems);

// Dashboard
await nav('dashboard');
await ss('2-dashboard');
const dashContent = await main.evaluate(() => document.querySelector('#view-dashboard, .view-dashboard, [id*="dashboard"]')?.innerHTML?.slice(0,3000) || '');

// Canvas
await nav('canvas');
await ss('3-canvas');
const nodeAddButtons = await main.evaluate(() =>
  [...document.querySelectorAll('[data-action]')].map(e => ({ action: e.dataset.action, title: e.title || e.textContent.trim() }))
);
console.log('Node add buttons:', nodeAddButtons);

// Characters
await nav('characters');
await ss('4-characters');
const charContent = await main.evaluate(() => ({
  html: document.querySelector('#view-characters, .view-characters')?.innerHTML?.slice(0, 2000) || '',
  buttons: [...document.querySelectorAll('#view-characters button, [id*="char"] button')].map(b => b.textContent.trim()).filter(Boolean)
}));
console.log('Characters:', charContent.buttons);

// Writing
await nav('writing');
await ss('5-writing');
const writingContent = await main.evaluate(() => ({
  toolbar: [...document.querySelectorAll('#w-toolbar button, #w-format-bar button')].map(b => b.title || b.textContent.trim()).filter(Boolean),
  panels: [...document.querySelectorAll('[id*="writing"] .tab-btn, [id*="w-"] .panel-tab')].map(e => e.textContent.trim()).filter(Boolean),
}));
console.log('Writing toolbar:', writingContent.toolbar);
// Create doc
await main.evaluate(() => document.getElementById('w-create-first')?.click() || document.getElementById('w-new-doc')?.click());
await new Promise(r => setTimeout(r, 500));
await ss('5-writing-doc');
await main.evaluate(() => document.getElementById('w-body')?.focus());
await main.keyboard.type('Once upon a time in a land far away.', { delay: 15 });
await new Promise(r => setTimeout(r, 300));
await ss('5-writing-typed');

// World
await nav('world');
await ss('6-world');
const worldContent = await main.evaluate(() => ({
  tabs: [...document.querySelectorAll('[id*="world"] .tab-btn, #world-tabs .tab-btn, [id*="world"] [data-tab]')].map(e => e.textContent.trim()).filter(Boolean),
  buttons: [...document.querySelectorAll('[id*="world"] button')].map(b => b.textContent.trim()).filter(Boolean).slice(0, 25),
  subviews: [...document.querySelectorAll('[data-view^="world"]')].map(e => e.dataset.view)
}));
console.log('World tabs:', worldContent.tabs);
console.log('World buttons:', worldContent.buttons);

// Map
await nav('map');
await new Promise(r => setTimeout(r, 500));
await ss('7-map');
const mapContent = await main.evaluate(() => ({
  buttons: [...document.querySelectorAll('[id*="map"] button, #view-map button')].map(b => ({ id: b.id, text: b.textContent.trim() })).filter(b => b.text),
  controls: [...document.querySelectorAll('#map-controls input, #map-controls select')].map(c => ({ id: c.id, type: c.type, label: c.previousElementSibling?.textContent || '' }))
}));
console.log('Map buttons:', mapContent.buttons);
// Try generating a map
await main.evaluate(() => document.getElementById('gen-map')?.click() || document.querySelector('[id*="generate"]')?.click() || document.querySelector('[id*="gen"]')?.click());
await new Promise(r => setTimeout(r, 2000));
await ss('7-map-generated');

// Lore
await nav('lore');
await new Promise(r => setTimeout(r, 500));
await ss('8-lore');
const loreContent = await main.evaluate(() => ({
  sections: [...document.querySelectorAll('#view-lore h3, #view-lore .section-header, #view-lore .lore-section-title')].map(e => e.textContent.trim()),
  buttons: [...document.querySelectorAll('#view-lore button, [id*="lore"] button')].map(b => ({ id: b.id, text: b.textContent.trim() })).filter(b => b.text),
}));
console.log('Lore sections:', loreContent.sections);
console.log('Lore buttons:', loreContent.buttons);

// Story
await nav('story');
await new Promise(r => setTimeout(r, 500));
await ss('9-story');
const storyContent = await main.evaluate(() => ({
  tabs: [...document.querySelectorAll('#view-story .tab-btn, #story-tabs .tab-btn, [id*="story"] [data-tab]')].map(e => ({ id: e.id, text: e.textContent.trim() })).filter(e => e.text),
  buttons: [...document.querySelectorAll('#view-story button')].map(b => b.textContent.trim()).filter(Boolean).slice(0, 20),
}));
console.log('Story tabs:', storyContent.tabs);
// Visit each story sub-tab
for (const tab of storyContent.tabs.slice(0, 4)) {
  if (tab.id) await main.evaluate(id => document.getElementById(id)?.click(), tab.id);
  await new Promise(r => setTimeout(r, 400));
  await ss('9-story-' + tab.text.toLowerCase().replace(/\s+/g,'-'));
}

// Settings
await nav('settings');
await new Promise(r => setTimeout(r, 600));
await ss('10-settings');
const settingsContent = await main.evaluate(() => ({
  sections: [...document.querySelectorAll('#view-settings h3, #view-settings .settings-section, #view-settings .section-title, #view-settings legend')].map(e => e.textContent.trim()).filter(Boolean).slice(0,30),
  tabs: [...document.querySelectorAll('#view-settings .tab-btn, [id*="settings"] .tab-btn')].map(e => e.textContent.trim()),
  themes: [...document.querySelectorAll('[data-theme]')].map(e => e.dataset.theme),
  inputs: [...document.querySelectorAll('#view-settings input, #view-settings select')].map(e => ({ id: e.id, type: e.type, label: document.querySelector(`label[for="${e.id}"]`)?.textContent || '' })).filter(e => e.label).slice(0, 20),
}));
console.log('Settings sections:', settingsContent.sections);
console.log('Themes:', settingsContent.themes);
// Click companion tab if it exists
const compTab = await main.evaluate(() => {
  const el = [...document.querySelectorAll('#view-settings .tab-btn, [id*="settings"] .tab-btn')].find(e => e.textContent.toLowerCase().includes('companion'));
  if (el) { el.click(); return true; }
  return false;
});
if (compTab) { await new Promise(r => setTimeout(r, 400)); await ss('10-settings-companion'); }

// About
await nav('about');
await new Promise(r => setTimeout(r, 500));
await ss('11-about');
const aboutText = await main.evaluate(() => document.querySelector('#view-about')?.textContent?.trim().slice(0,1000) || '');
console.log('About text (first 300):', aboutText.slice(0,300));

// Full sidebar structure
const fullNav = await main.evaluate(() => {
  const nav = document.querySelector('#sidebar, .sidebar');
  return nav?.innerHTML?.slice(0, 3000) || '';
});

// Full toolbar structure
const fullToolbar = await main.evaluate(() => {
  const tb = document.querySelector('#toolbar, .toolbar');
  return [...(tb?.querySelectorAll('button, [data-action]') || [])].map(e => ({
    id: e.id, action: e.dataset.action, title: e.title, text: e.textContent.trim()
  }));
});
console.log('\n=== TOOLBAR BUTTONS ===');
console.log(JSON.stringify(fullToolbar, null, 2));

console.log('\n=== ERRORS ===', errors.length);
errors.slice(0, 10).forEach(e => console.log(e));

await app.close();
console.log('\nDone. Screenshots saved to:', SHOTS);
