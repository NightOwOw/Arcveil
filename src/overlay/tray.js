// tray.js — System tray (main process, CommonJS)

const { Tray, Menu, nativeImage, app } = require('electron');
const path = require('path');

let _tray = null;
let _getState = null;  // fn that returns current project state snapshot
let _actions = {};

function initTray(actions, getStateFn) {
  _actions  = actions;
  _getState = getStateFn;

  const iconPath = path.join(__dirname, '../../assets/icons/tray-icon.png');
  let icon;
  try {
    icon = nativeImage.createFromPath(iconPath);
    if (icon.isEmpty()) throw new Error('empty');
  } catch {
    // Fallback: create a tiny 16×16 colored icon
    icon = nativeImage.createEmpty();
  }

  _tray = new Tray(icon);
  _tray.setToolTip('ArcVeil');

  _tray.on('click', () => { _actions.showMain?.(); });
  _tray.on('right-click', () => _rebuild());

  _rebuild();
}

function _rebuild() {
  if (!_tray) return;
  const s = _getState?.() || {};
  const todos = (s.todos || []).slice(0, 5);
  const chars = (s.characters || []).slice(0, 5);

  const todosMenu = todos.length
    ? todos.map(t => ({ label: (t.completed ? '✓ ' : '• ') + (t.text || '').slice(0, 40), enabled: false }))
    : [{ label: 'No pending todos', enabled: false }];

  const charsMenu = chars.length
    ? chars.map(c => ({ label: c.label || c.name || 'Unnamed', click: () => _actions.lookupCharacter?.(c.id) }))
    : [{ label: 'No characters yet', enabled: false }];

  const menu = Menu.buildFromTemplate([
    { label: s.projectName || 'ArcVeil', enabled: false },
    { type: 'separator' },
    { label: '📂 Open App',       click: () => _actions.showMain?.() },
    { type: 'separator' },
    { label: '👤 Characters',     submenu: charsMenu },
    { label: '✅ Todos',           submenu: todosMenu },
    { type: 'separator' },
    { label: `📝 Today: ${s.todayWords || 0} words`, enabled: false },
    { label: `⏱ Session: ${_fmtTime(s.sessionMs || 0)}`,  enabled: false },
    { type: 'separator' },
    { label: '⚡ Start Sprint',    click: () => _actions.startSprint?.() },
    { label: '📋 Quick Note',      click: () => _actions.quickCapture?.() },
    { type: 'separator' },
    { label: '💬 Toggle Companion', click: () => _actions.toggleCompanion?.() },
    { label: '📊 Toggle HUD',      click: () => _actions.toggleHUD?.() },
    { label: '◀ Toggle Edge Panel', click: () => _actions.toggleEdgePanel?.() },
    { type: 'separator' },
    { label: '⚙ Settings',        click: () => _actions.openSettings?.() },
    { label: 'Quit ArcVeil',       click: () => app.quit() },
  ]);

  _tray.setContextMenu(menu);
}

function setIcon(notify) {
  if (!_tray) return;
  const name = notify ? 'tray-icon-notify.png' : 'tray-icon.png';
  const p = path.join(__dirname, '../../assets/icons/', name);
  try {
    const icon = nativeImage.createFromPath(p);
    if (!icon.isEmpty()) _tray.setImage(icon);
  } catch {}
}

function _fmtTime(ms) {
  const m = Math.floor(ms / 60_000);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m/60)}h ${m%60}m`;
}

function destroy() {
  _tray?.destroy();
  _tray = null;
}

module.exports = { initTray, setIcon, rebuild: _rebuild, destroy };
