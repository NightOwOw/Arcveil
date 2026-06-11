// clipboard-bridge.js — Clipboard monitoring (main process, CommonJS)
// OFF by default. User must explicitly opt-in with privacy explanation shown.

const { clipboard, ipcMain } = require('electron');

let _enabled  = false;
let _interval = null;
let _lastText = '';
let _entities = [];  // { name, type, id }
let _onMatch  = null;

function init(onMatch) {
  _onMatch = onMatch;
  // IPC toggle from renderer
  ipcMain.handle('clipboard-bridge:enable',  () => enable());
  ipcMain.handle('clipboard-bridge:disable', () => disable());
  ipcMain.handle('clipboard-bridge:status',  () => _enabled);
}

function enable() {
  if (_enabled) return;
  _enabled = true;
  _lastText = clipboard.readText() || '';
  _interval = setInterval(_poll, 2000);
}

function disable() {
  _enabled = false;
  clearInterval(_interval);
  _interval = null;
}

function updateEntities(entities) {
  _entities = entities || [];
}

function _poll() {
  if (!_enabled) return;
  try {
    const text = clipboard.readText() || '';
    if (text === _lastText) return;
    _lastText = text;
    if (!text.trim()) return;

    // Scan for entity name matches
    const lower = text.toLowerCase();
    for (const entity of _entities) {
      const name = (entity.name || entity.label || '').toLowerCase();
      if (name.length < 3) continue;
      if (lower.includes(name)) {
        _onMatch?.({ text: text.slice(0, 100), entity });
        return; // one match per clipboard change
      }
    }
  } catch {}
}

module.exports = { init, enable, disable, updateEntities };
