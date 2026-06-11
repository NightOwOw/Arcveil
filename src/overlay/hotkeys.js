// hotkeys.js — Global hotkeys (main process, CommonJS)
// Register with Electron globalShortcut. Works from any app.

const { globalShortcut, BrowserWindow } = require('electron');

const DEFAULT_HOTKEYS = {
  quickSummon:    'CmdOrCtrl+Shift+Space',
  toggleCompanion:'CmdOrCtrl+Shift+C',
  toggleHUD:      'CmdOrCtrl+Shift+H',
  toggleEdgePanel:'CmdOrCtrl+Shift+E',
  quickCapture:   'CmdOrCtrl+Shift+N',
  wordCount:      'CmdOrCtrl+Shift+W',
};

let _registered = {};
let _handlers = {};

function register(hotkeys, handlers) {
  _handlers = handlers;
  const keys = { ...DEFAULT_HOTKEYS, ...hotkeys };

  unregisterAll();

  const conflicts = [];
  for (const [action, combo] of Object.entries(keys)) {
    if (!combo) continue;
    try {
      const ok = globalShortcut.register(combo, () => {
        if (_handlers[action]) _handlers[action]();
      });
      if (!ok) { conflicts.push({ action, combo }); continue; }
      _registered[action] = combo;
    } catch (e) {
      console.warn('[hotkeys] Failed to register', combo, e.message);
    }
  }

  return { registered: _registered, conflicts };
}

function unregisterAll() {
  for (const combo of Object.values(_registered)) {
    try { globalShortcut.unregister(combo); } catch {}
  }
  _registered = {};
}

function updateHotkey(action, newCombo, handler) {
  const old = _registered[action];
  if (old) { try { globalShortcut.unregister(old); } catch {} }

  if (!newCombo) { delete _registered[action]; return true; }

  try {
    const ok = globalShortcut.register(newCombo, handler || _handlers[action] || (() => {}));
    if (ok) { _registered[action] = newCombo; return true; }
    return false;
  } catch { return false; }
}

function isRegistered(combo) {
  return globalShortcut.isRegistered(combo);
}

module.exports = { register, unregisterAll, updateHotkey, isRegistered, DEFAULT_HOTKEYS };
