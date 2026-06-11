import { _electron as electron } from 'playwright-core';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)));
const SHOTS = path.join(DIR, 'screenshots', 'live');
fs.mkdirSync(SHOTS, { recursive: true });

const electronBin = path.join(DIR, 'node_modules/electron/dist/electron.exe');

// Claude Code sets ELECTRON_RUN_AS_NODE=1 which prevents Electron from starting as an app.
// Remove it so Electron initialises properly.
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

console.log('Launching ArcVeil via Playwright _electron...');
const app = await electron.launch({
  executablePath: electronBin,
  args: ['.'],
  cwd: DIR,
  env,
  timeout: 30000,
});

await new Promise(r => setTimeout(r, 5000));

let main = null;
for (const w of app.windows()) {
  const url = w.url();
  console.log('window:', url);
  if (url.includes('index.html')) main = w;
}
if (!main) main = await app.firstWindow();
console.log('main window:', main.url());

const errors = [];
main.on('pageerror', e => errors.push('PAGE: ' + e.message));
main.on('console', msg => { if (msg.type() === 'error') errors.push('CON: ' + msg.text()); });

await new Promise(r => setTimeout(r, 1000));

const ss = async (name) => {
  await main.screenshot({ path: path.join(SHOTS, name + '.png') });
  console.log('shot:', name);
};

const nav = async (view, ms = 800) => {
  const clicked = await main.evaluate(v => {
    const el = document.querySelector(`[data-view="${v}"]`) || document.querySelector(`[data-nav="${v}"]`);
    if (el) { el.click(); return true; }
    return false;
  }, view);
  await new Promise(r => setTimeout(r, ms));
  return clicked;
};

await ss('00-launch');

// Visit every section
const views = ['dashboard','canvas','characters','writing','world','story','lore','settings','about'];
for (const v of views) {
  const ok = await nav(v);
  await ss('view-' + v);
  console.log('visited:', v, ok ? 'ok' : 'NOT FOUND');
}

// Extra: interact with writing — create doc, type
await nav('writing');
await main.evaluate(() => document.getElementById('w-create-first')?.click() || document.getElementById('w-new-doc')?.click());
await new Promise(r => setTimeout(r, 500));
await main.evaluate(() => document.getElementById('w-body')?.focus());
await main.keyboard.type('Once upon a time...', { delay: 20 });
await ss('writing-with-text');

// Extra: story beat sheet
await nav('story');
await main.evaluate(() => {
  const tab = [...document.querySelectorAll('.tab-btn')].find(e => e.textContent.includes('Beat'));
  if (tab) tab.click();
});
await new Promise(r => setTimeout(r, 400));
await ss('story-beats');

// Extra: settings appearance
await nav('settings');
await ss('settings-themes');

console.log('\nErrors:', errors.length);
errors.slice(0, 5).forEach(e => console.log(e));
console.log('\nDone! Screenshots in:', SHOTS);

await app.close();
