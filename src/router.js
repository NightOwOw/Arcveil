// ============================================
// router.js — View switching, toolbar, keyboard shortcuts
// Imports: all view modules
// Exports: initRouter, navigateTo
// Events: listens 'nav:changed', emits 'view:changed'
// ============================================

import { state, EventBus, uid, saveHistory, undo, redo } from './state.js';
import { matchShortcut } from './shortcuts.js';
import { initCanvas, fitAll, screenToCanvas, applyTransform } from './canvas/canvas.js';
import { initNodes, renderNodes, addNodeAt, addMediaNode } from './canvas/nodes.js';
import { initEdges, renderEdges, startEdgeConnect } from './canvas/edges.js';
import { initSidebar } from './ui/sidebar.js';
import { initPanels } from './ui/panels.js';
import { initContextMenus, showCanvasMenu, showMultiSelectMenu } from './ui/contextmenu.js';
import { initModals } from './ui/modals.js';
import { initThemes, applyTheme, cycleTheme } from './ui/themes.js';
import { saveProject, saveProjectAs, openProject, newProject, startAutoSave } from './storage.js';
import { initCompanion } from './companion/companion.js';

let _currentView = 'dashboard';

export async function initRouter() {
  // Apply theme first
  initThemes();

  // Init UI subsystems
  initSidebar();
  initPanels();
  initContextMenus();
  initModals();

  // Init canvas
  const canvasContainer = document.getElementById('view-canvas');
  const canvasInner     = document.getElementById('canvas-inner');
  const edgesSvg        = document.getElementById('edges-svg');

  initCanvas(canvasContainer, canvasInner);
  initNodes(canvasInner);
  initEdges(edgesSvg);
  _bindCanvasInteraction(canvasContainer);

  // Navigation
  EventBus.on('nav:changed', navigateTo);
  EventBus.on('canvas:fit-all', fitAll);
  EventBus.on('canvas:add-node', ({ type, x, y }) => addNodeAt(type, x, y));
  EventBus.on('canvas:zoom-changed', (z) => {
    document.getElementById('sb-zoom').textContent = Math.round(z * 100) + '%';
  });
  EventBus.on('status:message', (msg) => {
    const el = document.getElementById('sb-msg');
    if (el) el.textContent = msg || '';
  });
  EventBus.on('state:changed', _updateStatusbar);
  EventBus.on('project:saved', () => {
    const dot = document.getElementById('sb-save-dot');
    const txt = document.getElementById('sb-save-txt');
    if (dot) { dot.className = 'sb-dot'; }
    if (txt) txt.textContent = 'Saved';
  });

  // Init canvas mode
  window._avCanvasMode = 'select';
  window._avConnecting = false;

  // Toolbar bindings
  _bindToolbar();
  _bindCanvasToolbar();
  _bindPanelResize();

  // Window controls
  document.getElementById('wc-min')?.addEventListener('click', () => window.api.minimize());
  document.getElementById('wc-max')?.addEventListener('click', () => window.api.maximize());
  document.getElementById('wc-close')?.addEventListener('click', () => _onClose());

  // Keyboard shortcuts
  _bindKeyboard();

  // Load last project or show demo
  await _loadStartup();

  // AU banner exit
  document.getElementById('au-banner-exit')?.addEventListener('click', () => {
    state.activeAuId = null;
    import('./story/universes.js').then(m => m.updateAUBanner?.());
  });

  // Restore AU banner on project load
  EventBus.on('project:loaded', () => {
    import('./story/universes.js').then(m => m.updateAUBanner?.());
  });

  // Navigate to dashboard
  navigateTo('dashboard');

  // Start companion system (non-blocking)
  initCompanion().catch(e => console.warn('[companion] init failed:', e));

  // Wire overlay requests from main
  window.api?.on('overlay:request-state', _pushOverlayState);
  window.api?.on('navigate:item',  item => _navigateToItem(item));
  window.api?.on('navigate:settings', () => navigateTo('settings'));
  window.api?.on('quick-capture',  () => navigateTo('writing'));

  // Start periodic overlay state push
  setInterval(_pushOverlayState, 30_000);
  setTimeout(_pushOverlayState, 3000);
}

function _pushOverlayState() {
  const wc = (state.writing?.documents || []).reduce((s, d) => s + _wc(d.text || ''), 0);
  const chars = (state.nodes || [])
    .filter(n => n.type === 'character')
    .slice(0, 10)
    .map(n => ({ id: n.id, name: n.name, icon: '○' }));

  window.api?.overlayStatePush?.({
    projectName:      state.project?.name    || 'Untitled',
    wordCountToday:   state.companion?.todayWords || 0,
    dailyGoal:        state.companion?.dailyGoal  || 1000,
    sessionMs:        0,
    streak:           state.companion?.streak     || 0,
    recentCharacters: chars,
    activeTodos:      (state.companion?.todos || []).filter(t => !t.completed).slice(0, 5),
    companionName:    state.companion?.name || 'Ciona',
    documents:        (state.writing?.documents || []).map(d => ({ id: d.id, title: d.title, wordCount: _wc(d.text||'') })),
    locations:        (state.world?.locations || []),
    lore:             (state.world?.lore      || []),
    todos:            (state.companion?.todos  || []),
  });
}

function _wc(text) {
  return (text || '').trim().split(/\s+/).filter(Boolean).length;
}

function _navigateToItem(item) {
  if (!item) return;
  switch (item.type) {
    case 'character': navigateTo('characters'); break;
    case 'document':  navigateTo('writing'); break;
    case 'location':
    case 'lore':      navigateTo('lore'); break;
    default:          navigateTo('dashboard');
  }
}

export function navigateTo(view) {
  _currentView = view;
  state.activeView = view;

  // Hide all views
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));

  // Show target view
  const viewEl = document.getElementById(`view-${view}`);
  if (viewEl) viewEl.classList.add('active');

  // Update nav active state
  EventBus.emit('view:changed', view);

  // Lazy-load view modules
  _loadViewModule(view);
}

async function _loadViewModule(view) {
  try {
    switch (view) {
      case 'canvas':
        renderNodes(); renderEdges(); applyTransform();
        EventBus.emit('canvas:zoom-changed', state.view.scale);
        break;
      case 'characters':
        (await import('./character/profile.js')).renderCharacterList?.();
        break;
      case 'writing':
        (await import('./writing/editor.js')).renderWritingView?.(document.getElementById('view-writing'));
        break;
      case 'world':
        (await import('./world/map.js')).renderWorldView?.(document.getElementById('view-world'));
        break;
      case 'story':
        (await import('./story/timeline.js')).renderStoryView?.(document.getElementById('view-story'));
        break;
      case 'universes':
        (await import('./story/universes.js')).renderUniversesView?.(document.getElementById('view-universes'));
        break;
      case 'lore':
        (await import('./world/lore.js')).renderLoreView?.(document.getElementById('view-lore'));
        break;
      case 'dashboard':
        (await import('./ui/dashboard.js')).renderDashboard?.(document.getElementById('view-dashboard'));
        break;
      case 'settings':
        (await import('./settings/settings-ui.js')).renderSettingsView?.(document.getElementById('view-settings'));
        break;
      case 'about':
        (await import('./about/about.js')).renderAboutView?.(document.getElementById('view-about'));
        break;
    }
  } catch (e) { console.warn('View load error:', view, e); }
}

// ── Canvas interaction ────────────────────────────────────────────────────────

function _bindCanvasInteraction(container) {
  if (!container) return;
  let panning = false, startX, startY, startVX, startVY;

  // ── Right-mouse drag: box selection ──────────────────────────────────────────
  let _selStart = null, _selBox = null, _selDragged = false, _suppressCtxMenu = false;

  container.addEventListener('mousedown', e => {
    if (e.button === 2 && !e.target.closest('.node') && !e.target.closest('#ctx-menu')) {
      e.preventDefault();
      const rect = container.getBoundingClientRect();
      _selStart = { x: e.clientX - rect.left, y: e.clientY - rect.top, cx: e.clientX, cy: e.clientY };
      _selDragged = false;
      return;
    }
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      panning = true;
      startX = e.clientX; startY = e.clientY;
      startVX = state.view.x; startVY = state.view.y;
      container.style.cursor = 'grabbing';
      e.preventDefault();
    }
    // Left-click on empty canvas clears selection (skip SVG edges — their own click handlers fire after mousedown)
    if (e.button === 0 && !e.target.closest('.node') && !e.target.closest('#edges-svg') && !e.altKey) {
      state.selectedNodes.clear();
      EventBus.emit('nodes:updated');
    }
  });

  document.addEventListener('mousemove', e => {
    // Panning
    if (panning) {
      state.view.x = startVX + (e.clientX - startX);
      state.view.y = startVY + (e.clientY - startY);
      applyTransform();
    }
    // Selection box
    if (_selStart && (e.buttons & 2)) {
      const rect = container.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      const dx = e.clientX - _selStart.cx, dy = e.clientY - _selStart.cy;
      if (!_selDragged && Math.abs(dx) + Math.abs(dy) > 6) {
        _selDragged = true;
        _selBox = document.createElement('div');
        _selBox.id = 'av-sel-box';
        container.appendChild(_selBox);
      }
      if (_selBox) {
        const x1 = Math.min(mx, _selStart.x), y1 = Math.min(my, _selStart.y);
        const x2 = Math.max(mx, _selStart.x), y2 = Math.max(my, _selStart.y);
        _selBox.style.cssText = `position:absolute;left:${x1}px;top:${y1}px;width:${x2-x1}px;height:${y2-y1}px;pointer-events:none;z-index:200`;
      }
    }
  });

  document.addEventListener('mouseup', e => {
    if (e.button === 1 || panning) {
      panning = false;
      container.style.cursor = '';
    }
    if (e.button === 2 && _selStart) {
      if (_selDragged && _selBox) {
        // Compute canvas-space rect
        const rect = container.getBoundingClientRect();
        const mx = e.clientX - rect.left, my = e.clientY - rect.top;
        const x1 = Math.min(mx, _selStart.x), y1 = Math.min(my, _selStart.y);
        const x2 = Math.max(mx, _selStart.x), y2 = Math.max(my, _selStart.y);
        const p1 = screenToCanvas(x1, y1);
        const p2 = screenToCanvas(x2, y2);
        state.selectedNodes.clear();
        for (const n of state.nodes) {
          const ns = n.size || 52;
          if (n.x + ns > p1.x && n.x < p2.x && n.y + ns > p1.y && n.y < p2.y) {
            state.selectedNodes.add(n.id);
          }
        }
        EventBus.emit('nodes:updated');
        _suppressCtxMenu = true;
        setTimeout(() => { _suppressCtxMenu = false; }, 120);
        // Show multi-select context menu if any selected
        if (state.selectedNodes.size > 1) {
          showMultiSelectMenu(e.clientX, e.clientY, [...state.selectedNodes]);
        }
      }
      _selBox?.remove(); _selBox = null; _selStart = null; _selDragged = false;
    }
  });

  container.addEventListener('contextmenu', e => {
    e.preventDefault();
    if (_suppressCtxMenu) return;
    const rect = container.getBoundingClientRect();
    const { x, y } = screenToCanvas(e.clientX - rect.left, e.clientY - rect.top);
    showCanvasMenu(e.clientX, e.clientY, x, y);
  });

}

// ── Toolbar ───────────────────────────────────────────────────────────────────

function _bindToolbar() {
  document.getElementById('tb-new')?.addEventListener('click', newProject);
  document.getElementById('tb-open')?.addEventListener('click', () => openProject());
  document.getElementById('tb-save')?.addEventListener('click', saveProject);
  document.getElementById('tb-undo')?.addEventListener('click', undo);
  document.getElementById('tb-redo')?.addEventListener('click', redo);
  document.getElementById('tb-theme')?.addEventListener('click', cycleTheme);
  document.getElementById('tb-settings')?.addEventListener('click', () => navigateTo('settings'));
  document.getElementById('tb-media')?.addEventListener('click', () => {
    if (_currentView === 'canvas') {
      const rect = document.getElementById('view-canvas').getBoundingClientRect();
      const { x, y } = screenToCanvas(rect.width / 2, rect.height / 2);
      addMediaNode(x, y);
    }
  });

  // Node type quick-add
  document.querySelectorAll('[data-add-type]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (_currentView !== 'canvas') navigateTo('canvas');
      setTimeout(() => {
        const rect = document.getElementById('view-canvas')?.getBoundingClientRect();
        if (rect) {
          const { x, y } = screenToCanvas(rect.width/2 + Math.random()*80-40, rect.height/2 + Math.random()*80-40);
          addNodeAt(btn.dataset.addType, x, y);
        }
      }, 100);
    });
  });
}

// ── Keyboard shortcuts ────────────────────────────────────────────────────────

function _bindKeyboard() {
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    // Project
    if (matchShortcut('proj-new',     e)) { e.preventDefault(); newProject(); }
    if (matchShortcut('proj-open',    e)) { e.preventDefault(); openProject(); }
    if (matchShortcut('proj-save-as', e)) { e.preventDefault(); saveProjectAs(); }
    else if (matchShortcut('proj-save', e)) { e.preventDefault(); saveProject(); }
    if (matchShortcut('proj-undo',    e)) { e.preventDefault(); undo(); EventBus.emit('nodes:updated'); }
    if (matchShortcut('proj-redo',    e)) { e.preventDefault(); redo(); EventBus.emit('nodes:updated'); }
    if (matchShortcut('nav-settings', e)) { e.preventDefault(); navigateTo('settings'); }

    // Canvas-only shortcuts
    if (_currentView === 'canvas') {
      if (matchShortcut('canvas-add-node', e)) addNodeAt('character', 300 + Math.random()*200, 200 + Math.random()*200);
      if (matchShortcut('canvas-fit',      e)) fitAll();
      if (matchShortcut('canvas-delete',   e) || e.key === 'Backspace') {
        state.selectedNodes.forEach(id => { import('./state.js').then(m => m.deleteNode(id)); });
        state.selectedNodes.clear();
      }
    }

    // Navigation
    if (matchShortcut('nav-dashboard',   e)) navigateTo('dashboard');
    if (matchShortcut('nav-canvas',      e)) navigateTo('canvas');
    if (matchShortcut('nav-characters',  e)) navigateTo('characters');
    if (matchShortcut('nav-writing',     e)) navigateTo('writing');
    if (matchShortcut('nav-world',       e)) navigateTo('world');
  });
}

// ── Statusbar ──────────────────────────────────────────────────────────────────

function _updateStatusbar() {
  const dot = document.getElementById('sb-save-dot');
  const txt = document.getElementById('sb-save-txt');
  const name = document.getElementById('titlebar-project-name');
  const dirty = document.getElementById('titlebar-dirty');

  if (dot) dot.className = state.project.isDirty ? 'sb-dot unsaved' : 'sb-dot';
  if (txt) txt.textContent = state.project.isDirty ? 'Unsaved' : 'Saved';
  if (name) name.textContent = state.project.name || 'Untitled';
  if (dirty) dirty.textContent = state.project.isDirty ? ' •' : '';
}

// ── Startup ───────────────────────────────────────────────────────────────────

// ── Canvas toolbar ────────────────────────────────────────────────────────────

function _bindCanvasToolbar() {
  const setMode = (mode) => {
    window._avCanvasMode = mode;
    document.getElementById('ct-select')?.classList.toggle('active', mode === 'select');
    document.getElementById('ct-connect')?.classList.toggle('active', mode === 'connect');
    const canvas = document.getElementById('view-canvas');
    if (canvas) canvas.style.cursor = mode === 'connect' ? 'crosshair' : '';
    if (mode === 'connect') EventBus.emit('status:message', 'Click the first node, then the second to connect');
    else EventBus.emit('status:message', '');
  };

  document.getElementById('ct-select')?.addEventListener('click', () => setMode('select'));
  document.getElementById('ct-connect')?.addEventListener('click', () => {
    setMode(window._avCanvasMode === 'connect' ? 'select' : 'connect');
  });
  document.getElementById('ct-fit')?.addEventListener('click', fitAll);
  document.getElementById('ct-zoom-in')?.addEventListener('click', () => {
    state.view.scale = Math.min(8, state.view.scale * 1.25);
    applyTransform();
    EventBus.emit('canvas:zoom-changed', state.view.scale);
  });
  document.getElementById('ct-zoom-out')?.addEventListener('click', () => {
    state.view.scale = Math.max(0.1, state.view.scale / 1.25);
    applyTransform();
    EventBus.emit('canvas:zoom-changed', state.view.scale);
  });

  EventBus.on('canvas:mode-reset', () => setMode('select'));
}

// ── Panel resize ──────────────────────────────────────────────────────────────

function _bindPanelResize() {
  _makeResizable('sidebar-resize', 'sidebar', false, 140, 360);
  _makeResizable('panel-resize',   'right-panel', true,  160, 480);
}

function _makeResizable(handleId, panelId, fromRight, min, max) {
  const handle = document.getElementById(handleId);
  const panel  = document.getElementById(panelId);
  if (!handle || !panel) return;
  let startX, startW;

  handle.addEventListener('mousedown', e => {
    startX = e.clientX;
    startW = panel.getBoundingClientRect().width;
    handle.classList.add('dragging');
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    e.preventDefault();
  });

  function onMove(e) {
    const dx = e.clientX - startX;
    const newW = Math.max(min, Math.min(max, fromRight ? startW - dx : startW + dx));
    panel.style.width = newW + 'px';
  }

  function onUp() {
    handle.classList.remove('dragging');
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
  }
}

async function _loadStartup() {
  try {
    const settings = await window.api.loadSettings();
    if (settings?.theme) applyTheme(settings.theme);
    if (settings?.lastFile) {
      const exists = await window.api.fsExists(settings.lastFile);
      if (exists) {
        await openProject(settings.lastFile);
        return;
      }
    }
  } catch {}

  // Load demo content if no project
  import('./storage.js').then(m => {
    if (!state.nodes.length) {
      m.loadDemoProject();
    }
  });
}

async function _onClose() {
  if (state.project.isDirty) {
    const confirmed = confirm('You have unsaved changes. Save before closing?');
    if (confirmed) await saveProject();
  }
  window.api.close();
}

// Auto-boot when loaded as a module script
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => initRouter());
} else {
  initRouter();
}
