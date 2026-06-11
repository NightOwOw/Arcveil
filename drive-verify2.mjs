import { _electron as electron } from 'playwright-core';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)));
const SHOTS = path.join(DIR, 'screenshots', 'verify2');
fs.mkdirSync(SHOTS, { recursive: true });

const electronBin = path.join(DIR, 'node_modules/electron/dist/electron.exe');
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const app = await electron.launch({ executablePath: electronBin, args: ['.'], cwd: DIR, env, timeout: 30000 });
await new Promise(r => setTimeout(r, 5000));

let main = app.windows().find(w => w.url().includes('index.html'));
if (!main) main = await app.firstWindow();

// ── Test 1: Ctrl+Shift+C should NOT open DevTools ──────────────────────────
const windowsBefore = app.windows().length;
console.log('Windows before Ctrl+Shift+C:', windowsBefore);

await main.screenshot({ path: path.join(SHOTS, '1-before.png') });

// Press Ctrl+Shift+C on main window
await main.bringToFront();
await main.keyboard.press('Control+Shift+C');
await new Promise(r => setTimeout(r, 1500));

const windowsAfter = app.windows().length;
const devtoolsOpened = app.windows().some(w => w.url().includes('devtools'));
console.log('Windows after Ctrl+Shift+C:', windowsAfter);
console.log('DevTools opened:', devtoolsOpened, devtoolsOpened ? '✗ STILL BROKEN' : '✓ FIXED');

await main.screenshot({ path: path.join(SHOTS, '2-after-hotkey.png') });

// ── Test 2: Companion position should be within mainWindow bounds ──────────
// Get mainWindow bounds via IPC
const mainBounds = await app.evaluate(({ BrowserWindow }) => {
  const win = BrowserWindow.getAllWindows().find(w => w.webContents.getURL().includes('index.html'));
  return win ? win.getBounds() : null;
});
console.log('\nmainWindow bounds:', mainBounds);

// Toggle companion via IPC
await app.evaluate(({ ipcMain, BrowserWindow }) => {
  const wins = BrowserWindow.getAllWindows();
  const main = wins.find(w => w.webContents.getURL().includes('index.html'));
  // Simulate hotkey by triggering the handler directly
  ipcMain.emit('companion:toggle-internal');
});
await new Promise(r => setTimeout(r, 2000));

const companionBounds = await app.evaluate(({ BrowserWindow }) => {
  const win = BrowserWindow.getAllWindows().find(w => w.webContents.getURL().includes('companion.html'));
  return win ? win.getBounds() : null;
});
console.log('companionWindow bounds:', companionBounds);

if (mainBounds && companionBounds) {
  const withinX = companionBounds.x >= mainBounds.x && companionBounds.x + companionBounds.width <= mainBounds.x + mainBounds.width;
  const withinY = companionBounds.y >= mainBounds.y && companionBounds.y + companionBounds.height <= mainBounds.y + mainBounds.height;
  console.log('Companion within mainWindow X:', withinX ? '✓' : '✗',
    `(companion: ${companionBounds.x}..${companionBounds.x+companionBounds.width}, main: ${mainBounds.x}..${mainBounds.x+mainBounds.width})`);
  console.log('Companion within mainWindow Y:', withinY ? '✓' : '✗',
    `(companion: ${companionBounds.y}..${companionBounds.y+companionBounds.height}, main: ${mainBounds.y}..${mainBounds.y+mainBounds.height})`);
}

// ── Test 3: companion has parent = mainWindow ──────────────────────────────
const hasParent = await app.evaluate(({ BrowserWindow }) => {
  const cWin = BrowserWindow.getAllWindows().find(w => w.webContents.getURL().includes('companion.html'));
  if (!cWin) return null;
  return !!cWin.getParentWindow();
});
console.log('\nCompanion has parent window:', hasParent, hasParent ? '✓ FIXED' : '✗ NOT SET');

// ── Test 4: companion alwaysOnTop ─────────────────────────────────────────
const alwaysOnTop = await app.evaluate(({ BrowserWindow }) => {
  const cWin = BrowserWindow.getAllWindows().find(w => w.webContents.getURL().includes('companion.html'));
  return cWin?.isAlwaysOnTop() ?? null;
});
console.log('Companion alwaysOnTop:', alwaysOnTop, alwaysOnTop === false ? '✓ FIXED' : '✗ STILL ON TOP');

// Screenshot final state
const cWin = app.windows().find(w => w.url().includes('companion.html'));
if (cWin) {
  await cWin.screenshot({ path: path.join(SHOTS, '3-companion.png') });
  console.log('\nshot: companion window');
}
await main.screenshot({ path: path.join(SHOTS, '4-main-with-companion.png') });
console.log('shot: main + companion');

await app.close();
