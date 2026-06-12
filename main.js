// ============================================
// main.js — Electron entry point
// Creates mainWindow + companion overlay windows
// Handles IPC, auto-save, file dialogs, tray
// ============================================

const { app, BrowserWindow, ipcMain, dialog, shell, Menu, nativeTheme, screen, globalShortcut } = require('electron');
const path = require('path');
const fs   = require('fs');
const chokidar = require('chokidar');
let mammoth = null; try { mammoth = require('mammoth'); } catch {}
let docxLib = null; try { docxLib = require('docx'); } catch {}

// Active folder watchers: Map<watchId, chokidar.FSWatcher>
const _watchers = new Map();

const hotkeys         = require('./src/overlay/hotkeys.js');
const trayManager     = require('./src/overlay/tray.js');
const clipboardBridge = require('./src/overlay/clipboard-bridge.js');
const windowContext   = require('./src/overlay/window-context.js');
const { initUpdater, checkForUpdates } = require('./src/updater.js');

const APP_ICON    = path.join(__dirname, 'assets/icons/app_logo.png');
const PROJECTS_DIR = path.join(__dirname, 'projects');

// Ensure projects folder exists at startup
try { fs.mkdirSync(PROJECTS_DIR, { recursive: true }); } catch {}

let mainWindow     = null;
let splashWindow   = null;
let companionWindow = null;
let hudWindow      = null;
let edgePanelWindow = null;
let summonWindow   = null;

// Cached project state snapshot for overlay data pushes
let _overlayState    = {};
let _cachedAiSettings = {};

// Load persisted AI settings from disk so model choice survives restarts
const _aiSettingsPath = path.join(app.getPath('userData'), 'ai-settings.json');
try {
  const saved = JSON.parse(fs.readFileSync(_aiSettingsPath, 'utf8'));
  if (saved && typeof saved === 'object') _cachedAiSettings = saved;
} catch { /* file doesn't exist yet — use defaults */ }

function _buildOverlayState() { return _overlayState; }

// ── Splash screen ─────────────────────────────────────────────────────────────

function createSplashWindow() {
  const { width, height } = screen.getPrimaryDisplay().bounds;
  splashWindow = new BrowserWindow({
    width,
    height,
    frame: false,
    transparent: false,
    resizable: false,
    center: true,
    skipTaskbar: true,
    alwaysOnTop: true,
    show: false,
    icon: APP_ICON,
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  });

  splashWindow.loadFile('splash.html');

  splashWindow.once('ready-to-show', () => {
    splashWindow.show();
  });
}

// ── Main window ─────────────────────────────────────────────────────────────

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    backgroundColor: '#1a1a2e',
    show: false,
    icon: APP_ICON,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile('index.html');

  mainWindow.once('ready-to-show', () => {
    // Keep splash visible for at least 2 seconds from app start
    const elapsed = Date.now() - _appStartTime;
    const remaining = Math.max(0, 2000 - elapsed);
    setTimeout(() => {
      if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.close();
        splashWindow = null;
      }
      mainWindow.show();
      mainWindow.focus();
    }, remaining);
  });

  mainWindow.on('close', () => {
    mainWindow.webContents.send('app:before-close');
  });

  // Minimize/restore companion with main window
  mainWindow.on('minimize', () => { if (companionWindow && !companionWindow.isDestroyed()) companionWindow.hide(); });
  mainWindow.on('restore',  () => { if (companionWindow && !companionWindow.isDestroyed()) companionWindow.show(); });

  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.send('app:ready');
  });

  // Close DevTools immediately if opened (prevents accidental Inspect Element)
  mainWindow.webContents.on('devtools-opened', () => mainWindow.webContents.closeDevTools());
}

const _appStartTime = Date.now();

app.whenReady().then(() => {
  createSplashWindow();
  createMainWindow();
  initTray();
  initHotkeys();
  initUpdater(mainWindow);
  // Pre-load summon window for fast appearance
  createSummonWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('will-quit', () => {
  hotkeys.unregisterAll();
  trayManager.destroy?.();
});

// ── Companion window ──────────────────────────────────────────────────────────

function createCompanionWindow() {
  // Position inside mainWindow's bottom-right corner
  const [mx, my] = mainWindow.getPosition();
  const [mw, mh] = mainWindow.getSize();
  const cw = 220, ch = 380;
  const cx = mx + mw - cw - 20;
  const cy = my + mh - ch - 10;

  companionWindow = new BrowserWindow({
    width: cw,
    height: ch,
    x: cx,
    y: cy,
    transparent: true,
    frame: false,
    parent: mainWindow,   // stays above app, below other apps automatically
    alwaysOnTop: false,
    skipTaskbar: true,
    focusable: false,
    hasShadow: false,
    resizable: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'companion-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  companionWindow.loadFile('companion.html');
  // Start click-through by default; renderer toggles via IPC when mouse enters interactive area
  companionWindow.setIgnoreMouseEvents(true, { forward: true });

  // Close DevTools immediately if opened in companion window
  companionWindow.webContents.on('devtools-opened', () => companionWindow.webContents.closeDevTools());

  companionWindow.once('ready-to-show', () => {
    companionWindow.show();
    console.log('[companion] Window shown');
    companionWindow.webContents.send('companion:ready', { companionId: 'ciona' });
    // Push latest AI settings so companion chat works immediately
    if (Object.keys(_cachedAiSettings).length > 0) {
      setTimeout(() => companionWindow?.webContents.send('companion:settings', _cachedAiSettings), 500);
    }
  });

  companionWindow.on('closed', () => {
    companionWindow = null;
    _isDragging = false;
    clearInterval(_dragInterval);
  });
}

// ── Companion drag tracking ───────────────────────────────────────────────────

let _isDragging   = false;
let _dragOffset   = { x: 0, y: 0 };
let _dragInterval = null;

ipcMain.on('companion:start-drag', () => {
  if (!companionWindow) return;
  const cursor = screen.getCursorScreenPoint();
  const [wx, wy] = companionWindow.getPosition();
  _isDragging = true;
  _dragOffset = { x: cursor.x - wx, y: cursor.y - wy };
  clearInterval(_dragInterval);
  _dragInterval = setInterval(() => {
    if (!_isDragging || !companionWindow) return;
    const cur = screen.getCursorScreenPoint();
    const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize;
    const W = 220, H = 380, SNAP = 22;
    let x = cur.x - _dragOffset.x;
    let y = cur.y - _dragOffset.y;
    // Snap to screen edges
    if (x < SNAP)          x = 0;
    if (x + W > sw - SNAP) x = sw - W;
    if (y < SNAP)          y = 0;
    if (y + H > sh - SNAP) y = sh - H;
    companionWindow.setPosition(Math.round(x), Math.round(y));
  }, 16);
});

ipcMain.on('companion:stop-drag', () => {
  _isDragging = false;
  clearInterval(_dragInterval);
  _dragInterval = null;
});

ipcMain.on('companion:enable-mouse', (e) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  win?.setIgnoreMouseEvents(false);
});

ipcMain.on('companion:disable-mouse', (e) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  win?.setIgnoreMouseEvents(true, { forward: true });
});

ipcMain.handle('companion:get-model-path', (_, id) => {
  const fp = path.join(__dirname, 'assets', 'models', `${id}.vrm`);
  if (!fs.existsSync(fp)) return null;
  return 'file:///' + fp.replace(/\\/g, '/');
});

ipcMain.on('companion:open-model-picker', async () => {
  if (!companionWindow) return;
  const result = await dialog.showOpenDialog(companionWindow, {
    title: 'Load VRM Model',
    filters: [{ name: 'VRM Model', extensions: ['vrm'] }],
    properties: ['openFile'],
  });
  if (!result.canceled && result.filePaths.length > 0) {
    const fp = result.filePaths[0];
    const url = 'file:///' + fp.replace(/\\/g, '/');
    companionWindow.webContents.send('companion:load-model', url);
  }
});

// ── Cursor-position push for head tracking (~30fps) ───────────────────────────

setInterval(() => {
  if (!companionWindow || companionWindow.isDestroyed()) return;
  try {
    const cursor = screen.getCursorScreenPoint();
    const bounds = companionWindow.getBounds();
    companionWindow.webContents.send('companion:cursor-pos', {
      relX: cursor.x - (bounds.x + bounds.width  / 2),
      relY: cursor.y - (bounds.y + bounds.height * 0.35),
    });
  } catch {}
}, 33);

ipcMain.handle('companion:open',   () => { if (!companionWindow) createCompanionWindow(); });
ipcMain.handle('companion:close',  () => { companionWindow?.close(); companionWindow = null; });
ipcMain.handle('companion:toggle', () => {
  if (companionWindow) { companionWindow.close(); companionWindow = null; }
  else createCompanionWindow();
});

ipcMain.on('companion:say', (_, payload) => {
  companionWindow?.webContents.send('companion:say', payload?.text || payload);
});

ipcMain.on('companion:switch', (_, id) => {
  companionWindow?.webContents.send('companion:switch', id);
});

ipcMain.on('companion:state-update', (_, data) => {
  companionWindow?.webContents.send('companion:state', data);
});

ipcMain.on('companion:settings-update', (_, data) => {
  if (data?.aiMode !== undefined) {
    _cachedAiSettings = data;
    console.log('[settings-update] cached ollamaModel:', data.ollamaModel, '| aiMode:', data.aiMode);
    // Persist so model choice survives app restarts
    try { fs.writeFileSync(_aiSettingsPath, JSON.stringify(data)); } catch { /* ignore */ }
  }
  companionWindow?.webContents.send('companion:settings', data);
});

// ── AI Chat ───────────────────────────────────────────────────────────────────

ipcMain.handle('companion:ai-chat', async (_, { messages, systemPrompt, settings }) => {
  // Merge: cached provides defaults, companion's live settings override (companion has freshest values via onSettings)
  const s = { ..._cachedAiSettings, ...(settings || {}) };
  console.log('[ai-chat] ollamaModel:', s.ollamaModel, '| from companion:', settings?.ollamaModel, '| cached:', _cachedAiSettings.ollamaModel);
  const { aiMode, aiProvider, ollamaUrl, ollamaModel } = s;
  const anthropicKey = (s.anthropicKey || '').trim();
  const openaiKey    = (s.openaiKey    || '').trim();
  const geminiKey    = (s.geminiKey    || '').trim();
  try {
    if (aiMode === 'local') {
      const url = (ollamaUrl || 'http://localhost:11434') + '/api/chat';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model:   ollamaModel || 'llama3',
          messages: systemPrompt ? [{ role: 'system', content: systemPrompt }, ...messages] : messages,
          stream:  false,
        }),
      });
      if (!res.ok) throw new Error(`Ollama HTTP ${res.status} [model: ${ollamaModel || 'llama3'}]`);
      const data = await res.json();
      return { ok: true, text: data.message?.content || '' };

    } else if (aiMode === 'cloud') {
      if ((aiProvider || 'anthropic') === 'anthropic') {
        if (!anthropicKey) throw new Error('Anthropic API key not configured');
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': anthropicKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 512,
            system: systemPrompt || '',
            messages,
          }),
        });
        if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error?.message || `HTTP ${res.status}`); }
        const data = await res.json();
        return { ok: true, text: data.content?.[0]?.text || '' };

      } else if (aiProvider === 'openai') {
        if (!openaiKey) throw new Error('OpenAI API key not configured');
        const msgs = systemPrompt ? [{ role: 'system', content: systemPrompt }, ...messages] : messages;
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openaiKey}` },
          body: JSON.stringify({ model: 'gpt-4o-mini', messages: msgs, max_tokens: 512 }),
        });
        if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error?.message || `HTTP ${res.status}`); }
        const data = await res.json();
        return { ok: true, text: data.choices?.[0]?.message?.content || '' };

      } else if (aiProvider === 'gemini') {
        if (!geminiKey) throw new Error('Google API key not configured');
        const contents = messages.map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        }));
        const finalContents = systemPrompt
          ? [{ role: 'user', parts: [{ text: systemPrompt }] }, { role: 'model', parts: [{ text: 'Understood!' }] }, ...contents]
          : contents;
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: finalContents,
              generationConfig: { maxOutputTokens: 512 },
            }),
          }
        );
        if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error?.message || `HTTP ${res.status}`); }
        const data = await res.json();
        return { ok: true, text: data.candidates?.[0]?.content?.parts?.[0]?.text || '' };
      }
    }
    return { ok: false, error: 'No AI provider configured' };
  } catch (err) {
    const detail = err.cause?.message || err.cause?.code || '';
    return { ok: false, error: detail ? `${err.message} (${detail})` : err.message };
  }
});

ipcMain.handle('companion:get-ai-settings', () => _cachedAiSettings);

ipcMain.handle('ollama:list-models', async (_, url) => {
  try {
    const res = await fetch(`${url || 'http://localhost:11434'}/api/tags`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.models || []).map(m => m.name);
  } catch { return []; }
});

ipcMain.on('companion:set-focusable', (e, bool) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  if (win) win.setFocusable(!!bool);
});

// ── HUD window ────────────────────────────────────────────────────────────────

function createHUDWindow() {
  const { width: sw } = screen.getPrimaryDisplay().workAreaSize;
  hudWindow = new BrowserWindow({
    width: 220, height: 90,
    x: sw - 230, y: 10,
    transparent: true, frame: false,
    alwaysOnTop: true, skipTaskbar: true,
    focusable: false, hasShadow: false,
    resizable: false, show: false,
    webPreferences: {
      preload: path.join(__dirname, 'overlay-preload.js'),
      contextIsolation: true, nodeIntegration: false,
    },
  });
  hudWindow.loadFile('hud.html');
  hudWindow.once('ready-to-show', () => { hudWindow.show(); _pushOverlayData(); });
  hudWindow.on('closed', () => { hudWindow = null; });
}

// ── Summon window (pre-loaded) ────────────────────────────────────────────────

function createSummonWindow() {
  const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize;
  summonWindow = new BrowserWindow({
    width: 600, height: 420,
    x: Math.floor((sw - 600) / 2), y: Math.floor(sh * 0.25),
    transparent: true, frame: false,
    alwaysOnTop: true, skipTaskbar: true,
    focusable: true, hasShadow: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'overlay-preload.js'),
      contextIsolation: true, nodeIntegration: false,
    },
  });
  summonWindow.loadFile('summon.html');
  summonWindow.on('blur', () => summonWindow?.hide());
  summonWindow.on('closed', () => { summonWindow = null; });
}

// ── Edge panel window ─────────────────────────────────────────────────────────

function createEdgePanelWindow() {
  const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize;
  edgePanelWindow = new BrowserWindow({
    width: 308, height: sh,
    x: sw - 308, y: 0,
    transparent: true, frame: false,
    alwaysOnTop: true, skipTaskbar: true,
    focusable: false, hasShadow: false,
    resizable: false, show: false,
    webPreferences: {
      preload: path.join(__dirname, 'overlay-preload.js'),
      contextIsolation: true, nodeIntegration: false,
    },
  });
  edgePanelWindow.loadFile('edge-panel.html');
  edgePanelWindow.once('ready-to-show', () => { edgePanelWindow.show(); _pushOverlayData(); });
  edgePanelWindow.on('closed', () => { edgePanelWindow = null; });
}

// ── Overlay IPC ───────────────────────────────────────────────────────────────

ipcMain.handle('overlay:hud-toggle',   () => { if (hudWindow) { hudWindow.close(); hudWindow = null; } else createHUDWindow(); });
ipcMain.handle('overlay:summon-toggle',() => { if (!summonWindow) createSummonWindow(); if (summonWindow.isVisible()) summonWindow.hide(); else { summonWindow.webContents.send('overlay:show'); summonWindow.show(); summonWindow.focus(); _pushSummonData(); } });
ipcMain.handle('overlay:edge-toggle',  () => { if (edgePanelWindow) { edgePanelWindow.close(); edgePanelWindow = null; } else createEdgePanelWindow(); });

ipcMain.on('overlay:hide-self',  (e) => { if (e.sender.isDestroyed()) return; BrowserWindow.fromWebContents(e.sender)?.hide(); });
ipcMain.on('overlay:close-self', (e) => { if (e.sender.isDestroyed()) return; BrowserWindow.fromWebContents(e.sender)?.close(); });
ipcMain.on('overlay:move-by', (e, { x, y }) => {
  if (e.sender.isDestroyed()) return;
  const win = BrowserWindow.fromWebContents(e.sender);
  if (!win) return;
  const [cx, cy] = win.getPosition();
  win.setPosition(cx + x, cy + y);
});
ipcMain.on('overlay:resize', (e, mode) => {
  if (e.sender.isDestroyed()) return;
  const win = BrowserWindow.fromWebContents(e.sender); if (!win) return;
  const sizes = { micro: [220, 34], compact: [220, 90], full: [220, 160] };
  const [w, h] = sizes[mode] || sizes.compact;
  win.setSize(w, h);
});
ipcMain.on('overlay:select', (_, item) => {
  // Navigate main window to selected item
  mainWindow?.webContents.send('navigate:item', item);
  mainWindow?.show();
  mainWindow?.focus();
});

// Receive state snapshot from renderer for overlay data push
ipcMain.on('overlay:state-push', (_, data) => {
  _overlayState = { ..._overlayState, ...data };
  trayManager.rebuild?.();
});

function _pushOverlayData() {
  const data = _buildOverlayState();
  hudWindow?.webContents.send('overlay:update', data);
  edgePanelWindow?.webContents.send('overlay:data', data);
}

function _pushSummonData() {
  summonWindow?.webContents.send('overlay:data', _buildOverlayState());
}

// Push overlay data every 30s
setInterval(() => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('overlay:request-state');
    setTimeout(_pushOverlayData, 500);
  }
}, 30_000);

// ── System tray ────────────────────────────────────────────────────────────────

function initTray() {
  trayManager.initTray({
    showMain:        () => { mainWindow?.show(); mainWindow?.focus(); },
    toggleCompanion: () => ipcMain.emit('companion:toggle-internal'),
    toggleHUD:       () => ipcMain.emit('overlay:hud-internal'),
    toggleEdgePanel: () => ipcMain.emit('overlay:edge-internal'),
    startSprint:     () => mainWindow?.webContents.send('sprint:start'),
    quickCapture:    () => mainWindow?.webContents.send('quick-capture'),
    openSettings:    () => mainWindow?.webContents.send('navigate:settings'),
    lookupCharacter: (id) => { mainWindow?.show(); mainWindow?.webContents.send('navigate:character', id); },
  }, _buildOverlayState);
}

// ── Global hotkeys ─────────────────────────────────────────────────────────────

function initHotkeys() {
  hotkeys.register({}, {
    quickSummon:     () => ipcMain.emit('overlay:summon-internal'),
    toggleCompanion: () => { if (companionWindow) { companionWindow.close(); companionWindow = null; } else createCompanionWindow(); },
    toggleHUD:       () => { if (hudWindow) { hudWindow.close(); hudWindow = null; } else createHUDWindow(); },
    toggleEdgePanel: () => { if (edgePanelWindow) { edgePanelWindow.close(); edgePanelWindow = null; } else createEdgePanelWindow(); },
    quickCapture:    () => mainWindow?.webContents.send('quick-capture'),
    wordCount:       () => mainWindow?.webContents.send('overlay:word-count-bubble'),
  });
}

// Internal events for tray → windows
ipcMain.on('overlay:summon-internal',    () => { if (!summonWindow) createSummonWindow(); summonWindow?.show(); summonWindow?.focus(); _pushSummonData(); });
ipcMain.on('companion:toggle-internal',  () => { if (companionWindow) { companionWindow.close(); companionWindow = null; } else createCompanionWindow(); });
ipcMain.on('overlay:hud-internal',       () => { if (hudWindow) { hudWindow.close(); hudWindow = null; } else createHUDWindow(); });
ipcMain.on('overlay:edge-internal',      () => { if (edgePanelWindow) { edgePanelWindow.close(); edgePanelWindow = null; } else createEdgePanelWindow(); });

// ── Clipboard bridge ──────────────────────────────────────────────────────────

clipboardBridge.init((match) => {
  mainWindow?.webContents.send('clipboard:entity-match', match);
  companionWindow?.webContents.send('companion:say', `I noticed "${match.entity?.name}" in your clipboard~`);
});

// ── Window context ────────────────────────────────────────────────────────────

windowContext.init(({ title, mode }) => {
  mainWindow?.webContents.send('window-context', { title, mode });
  companionWindow?.webContents.send('companion:say',
    mode === 'art' ? `Ooh are you drawing in ${title}? SO cool!! 🎨` : undefined
  );
});

// Expose overlay toggle handles to renderer
ipcMain.handle('overlay:hud-open',    () => { if (!hudWindow) createHUDWindow(); });
ipcMain.handle('overlay:edge-open',   () => { if (!edgePanelWindow) createEdgePanelWindow(); });
ipcMain.handle('overlay:summon-open', () => { if (!summonWindow) createSummonWindow(); summonWindow?.show(); summonWindow?.focus(); _pushSummonData(); });

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ── Window controls ──────────────────────────────────────────────────────────

ipcMain.handle('window:minimize',   () => mainWindow?.minimize());
ipcMain.handle('window:maximize',   () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize();
  else mainWindow?.maximize();
});
ipcMain.handle('window:close',      () => mainWindow?.close());
ipcMain.handle('window:is-maximized', () => mainWindow?.isMaximized() ?? false);

// ── File dialogs ─────────────────────────────────────────────────────────────

ipcMain.handle('dialog:open', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    defaultPath: PROJECTS_DIR,
    filters: [{ name: 'ArcVeil Project', extensions: ['arcveil'] }],
    properties: ['openFile'],
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('dialog:save', async (_, defaultName) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: path.join(PROJECTS_DIR, defaultName || 'My Project.arcveil'),
    filters: [{ name: 'ArcVeil Project', extensions: ['arcveil'] }],
  });
  return result.canceled ? null : result.filePath;
});

ipcMain.handle('project:list-defaults', () => {
  try {
    return fs.readdirSync(PROJECTS_DIR)
      .filter(f => f.endsWith('.arcveil'))
      .sort()
      .map(f => path.join(PROJECTS_DIR, f));
  } catch { return []; }
});

ipcMain.handle('dialog:open-media', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Media', extensions: ['png','jpg','jpeg','gif','webp','mp4','webm','mp3','wav','ogg','pdf','docx','txt','md','svg'] },
    ],
  });
  return result.canceled ? null : result.filePaths[0];
});

// ── File system ───────────────────────────────────────────────────────────────

ipcMain.handle('fs:read', async (_, filePath) => {
  try { return fs.readFileSync(filePath, 'utf8'); }
  catch { return null; }
});

ipcMain.handle('fs:write', async (_, filePath, content) => {
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  } catch (e) { return false; }
});

ipcMain.handle('fs:exists', async (_, filePath) => fs.existsSync(filePath));

ipcMain.handle('fs:read-binary', async (_, filePath) => {
  try {
    const buf = fs.readFileSync(filePath);
    return buf.toString('base64');
  } catch { return null; }
});

ipcMain.handle('fs:mkdir', async (_, dirPath) => {
  try { fs.mkdirSync(dirPath, { recursive: true }); return true; }
  catch { return false; }
});

ipcMain.handle('fs:list', async (_, dirPath) => {
  try { return fs.readdirSync(dirPath); }
  catch { return []; }
});

ipcMain.handle('fs:copy', async (_, src, dst) => {
  try { fs.copyFileSync(src, dst); return true; }
  catch { return false; }
});

// ── Shell ─────────────────────────────────────────────────────────────────────

ipcMain.handle('shell:open-path',   (_, p) => shell.openPath(p));
ipcMain.handle('shell:show-folder', (_, p) => shell.showItemInFolder(p));

// ── Settings persistence (userData) ───────────────────────────────────────────

const settingsPath = path.join(app.getPath('userData'), 'settings.json');

ipcMain.handle('settings:load', () => {
  try { return JSON.parse(fs.readFileSync(settingsPath, 'utf8')); }
  catch { return {}; }
});

ipcMain.handle('settings:save', (_, data) => {
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(data, null, 2));
    return true;
  } catch { return false; }
});

// ── App info ───────────────────────────────────────────────────────────────────

ipcMain.handle('app:version',       () => app.getVersion());
ipcMain.handle('app:platform',      () => process.platform);
ipcMain.handle('app:user-data',     () => app.getPath('userData'));
ipcMain.handle('app:check-update',  () => checkForUpdates());

// ── Writing Hub: Folder & File FS ─────────────────────────────────────────────

ipcMain.handle('fs:open-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Open Folder',
  });
  return result.canceled ? null : result.filePaths[0];
});

function _buildTree(dirPath, depth) {
  if (depth > 6) return [];
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    return entries
      .filter(e => !e.name.startsWith('.'))
      .sort((a, b) => {
        if (a.isDirectory() && !b.isDirectory()) return -1;
        if (!a.isDirectory() && b.isDirectory()) return 1;
        return a.name.localeCompare(b.name);
      })
      .map(e => ({
        name: e.name,
        path: path.join(dirPath, e.name),
        type: e.isDirectory() ? 'folder' : 'file',
        ext: e.isDirectory() ? '' : path.extname(e.name).toLowerCase(),
        children: e.isDirectory() ? null : undefined,
      }));
  } catch { return []; }
}

ipcMain.handle('fs:read-dir',          async (_, dirPath) => _buildTree(dirPath, 0));
ipcMain.handle('fs:read-dir-children', async (_, dirPath) => _buildTree(dirPath, 0));

ipcMain.handle('fs:read-file', async (_, filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  try {
    if (ext === '.docx' && mammoth) {
      const result = await mammoth.convertToHtml({ path: filePath });
      return { type: 'html', content: result.value };
    }
    const content = fs.readFileSync(filePath, 'utf8');
    return { type: ext === '.md' ? 'md' : 'text', content };
  } catch (e) { return { type: 'error', content: e.message }; }
});

ipcMain.handle('fs:write-file', async (_, filePath, content, format) => {
  try {
    const ext = format || path.extname(filePath).toLowerCase();
    if ((ext === '.docx' || ext === 'docx') && docxLib) {
      const { Document, Paragraph, TextRun, Packer } = docxLib;
      const lines = content
        .replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n').replace(/<\/h[1-6]>/gi, '\n')
        .replace(/<[^>]+>/g, '').split('\n').map(l => l.trim()).filter(l => l);
      const doc = new Document({ sections: [{ children: lines.map(l => new Paragraph({ children: [new TextRun(l)] })) }] });
      const buf = await Packer.toBuffer(doc);
      fs.writeFileSync(filePath, buf);
      return true;
    }
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  } catch { return false; }
});

ipcMain.handle('fs:delete-file', async (_, filePath) => {
  try { await shell.trashItem(filePath); return true; }
  catch { try { fs.rmSync(filePath, { recursive: true }); return true; } catch { return false; } }
});

ipcMain.handle('fs:rename-file', async (_, oldPath, newName) => {
  try {
    const newPath = path.join(path.dirname(oldPath), newName);
    fs.renameSync(oldPath, newPath);
    return newPath;
  } catch { return null; }
});

ipcMain.handle('fs:create-file', async (_, dirPath, name) => {
  try {
    const filePath = path.join(dirPath, name);
    fs.mkdirSync(dirPath, { recursive: true });
    fs.writeFileSync(filePath, '', 'utf8');
    return filePath;
  } catch { return null; }
});

ipcMain.handle('fs:create-folder', async (_, dirPath, name) => {
  try {
    const folderPath = path.join(dirPath, name);
    fs.mkdirSync(folderPath, { recursive: true });
    return folderPath;
  } catch { return null; }
});

ipcMain.handle('fs:open-system',   async (_, p) => shell.openPath(p));
ipcMain.handle('fs:show-in-folder', async (_, p) => shell.showItemInFolder(p));

ipcMain.handle('fs:watch', async (_, folderPath, watchId) => {
  if (_watchers.has(watchId)) { _watchers.get(watchId).close(); _watchers.delete(watchId); }
  try {
    const watcher = chokidar.watch(folderPath, { ignoreInitial: true, depth: 5, ignored: /(^|[\/\\])\./ });
    watcher.on('all', (event, filePath) => {
      mainWindow?.webContents.send('fs:watch-event', { watchId, event, path: filePath });
    });
    _watchers.set(watchId, watcher);
    return true;
  } catch { return false; }
});

ipcMain.handle('fs:unwatch', async (_, watchId) => {
  if (_watchers.has(watchId)) { _watchers.get(watchId).close(); _watchers.delete(watchId); }
  return true;
});

// ── Close flow ────────────────────────────────────────────────────────────────

ipcMain.on('app:quit-confirmed', () => {
  mainWindow?.destroy();
  app.quit();
});
