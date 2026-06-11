// ============================================
// contextmenu.js — All right-click context menus
// Imports: state.js
// Exports: showNodeMenu, showEdgeMenu, showCanvasMenu, hideMenu
// Events: listens 'node:right-clicked', 'edge:right-clicked'
// ============================================

import { state, EventBus, deleteNode, deleteEdge, uid, addEdge } from '../state.js';

let _menu = null;

export function initContextMenus() {
  EventBus.on('node:right-clicked', ({ id, x, y }) => showNodeMenu(id, x, y));
  EventBus.on('edge:right-clicked', ({ id, x, y }) => showEdgeMenu(id, x, y));

  document.addEventListener('click',       hideMenu);
  document.addEventListener('contextmenu', e => { if (e.target.closest('#ctx-menu')) return; hideMenu(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') hideMenu(); });
}

export function hideMenu() {
  _menu?.remove();
  _menu = null;
}

function _show(x, y, items) {
  hideMenu();
  _menu = document.createElement('div');
  _menu.id = 'ctx-menu';
  _menu.style.cssText = `
    position:fixed;left:${x}px;top:${y}px;z-index:9999;
    background:var(--av-bg-elevated);border:1px solid var(--av-border-strong);
    border-radius:var(--av-radius-md);padding:4px;min-width:160px;
    box-shadow:0 8px 32px rgba(0,0,0,0.5);font-size:12px;`;

  for (const item of items) {
    if (item === 'sep') {
      const sep = document.createElement('div');
      sep.style.cssText = 'border-top:1px solid var(--av-border);margin:4px 0;';
      _menu.appendChild(sep);
      continue;
    }
    const btn = document.createElement('button');
    btn.style.cssText = `
      display:flex;align-items:center;gap:8px;width:100%;padding:7px 10px;
      border-radius:var(--av-radius-sm);color:${item.danger ? 'var(--av-danger)' : 'var(--av-text-primary)'};
      background:none;border:none;cursor:pointer;text-align:left;
      transition:background var(--av-anim-speed);`;
    btn.innerHTML = `<span>${item.icon || ''}</span><span>${item.label}</span>`;
    btn.addEventListener('mouseenter', () => btn.style.background = 'var(--av-bg-hover)');
    btn.addEventListener('mouseleave', () => btn.style.background = '');
    btn.onclick = () => { hideMenu(); item.action(); };
    _menu.appendChild(btn);
  }

  document.body.appendChild(_menu);

  // Clamp to viewport
  const r = _menu.getBoundingClientRect();
  if (r.right  > window.innerWidth)  _menu.style.left = (x - r.width)  + 'px';
  if (r.bottom > window.innerHeight) _menu.style.top  = (y - r.height) + 'px';
}

export function showNodeMenu(id, x, y) {
  const node = state.nodes.find(n => n.id === id);
  if (!node) return;
  const isMedia = node.type === 'media';

  const items = [
    !isMedia && { icon:'👤', label:'Open Profile', action: () => EventBus.emit('node:open-profile', id) },
    !isMedia && { icon:'↔', label:'Connect to...', action: () => EventBus.emit('canvas:start-connect', id) },
    'sep',
    { icon:'✏', label:'Rename', action: () => {
      const name = prompt('New name:', node.name);
      if (name !== null) { node.name = name; node.letter = name.charAt(0).toUpperCase(); import('../state.js').then(m => { m.saveHistory(); EventBus.emit('nodes:updated'); }); }
    }},
    { icon:'🎨', label:'Change color', action: () => {
      _openColorWheel(node.color || '#7c5cbf', (c) => {
        node.color = c;
        import('../state.js').then(m => { m.saveHistory(); EventBus.emit('nodes:updated'); });
      });
    }},
    isMedia && node.mediaPath && { icon:'📂', label:'Open File', action: () => window.api?.openPath(node.mediaPath) },
    isMedia && node.mediaPath && { icon:'📁', label:'Show in Folder', action: () => window.api?.showFolder(node.mediaPath) },
    'sep',
    { icon:'🗑', label:'Delete', danger: true, action: () => deleteNode(id) },
  ].filter(Boolean);

  _show(x, y, items);
}

export function showEdgeMenu(id, x, y) {
  const edge = state.edges.find(e => e.id === id);
  if (!edge) return;

  const styles = ['solid','dashed','dotted','double','thick','thin','animated','wave','long-dash'];

  _show(x, y, [
    { icon:'✏', label:'Edit label', action: () => {
      const lbl = prompt('Edge label:', edge.label || '');
      if (lbl !== null) { edge.label = lbl; import('../state.js').then(m => { m.saveHistory(); EventBus.emit('edges:updated'); }); }
    }},
    { icon:'🎨', label:'Change color', action: () => {
      _openColorWheel(edge.color || '#888888', (c) => {
        edge.color = c;
        import('../state.js').then(m => { m.saveHistory(); EventBus.emit('edges:updated'); });
      });
    }},
    { icon:'〰', label:'Change style →' + (edge.style||'solid'), action: () => {
      const idx = styles.indexOf(edge.style || 'solid');
      edge.style = styles[(idx + 1) % styles.length];
      import('../state.js').then(m => { m.saveHistory(); EventBus.emit('edges:updated'); });
    }},
    'sep',
    { icon:'🗑', label:'Delete', danger: true, action: () => deleteEdge(id) },
  ]);
}

function _openColorWheel(initial, onChange) {
  const inp = document.createElement('input');
  inp.type = 'color';
  inp.value = initial;
  inp.style.cssText = 'position:fixed;opacity:0;width:0;height:0;left:-9999px;top:-9999px;pointer-events:none';
  document.body.appendChild(inp);
  inp.addEventListener('input', e => onChange(e.target.value));
  inp.addEventListener('change', () => { onChange(inp.value); inp.remove(); });
  inp.addEventListener('blur', () => inp.remove());
  inp.click();
}

export function showCanvasMenu(x, y, canvasX, canvasY) {
  _show(x, y, [
    { icon:'👤', label:'Add Character', action: () => EventBus.emit('canvas:add-node', { type:'character', x: canvasX, y: canvasY }) },
    { icon:'📍', label:'Add Location',  action: () => EventBus.emit('canvas:add-node', { type:'location',  x: canvasX, y: canvasY }) },
    { icon:'⚔',  label:'Add Faction',   action: () => EventBus.emit('canvas:add-node', { type:'faction',   x: canvasX, y: canvasY }) },
    { icon:'💎', label:'Add Item',      action: () => EventBus.emit('canvas:add-node', { type:'item',      x: canvasX, y: canvasY }) },
    { icon:'💭', label:'Add Concept',   action: () => EventBus.emit('canvas:add-node', { type:'concept',   x: canvasX, y: canvasY }) },
    { icon:'⭐', label:'Add Event',     action: () => EventBus.emit('canvas:add-node', { type:'event',     x: canvasX, y: canvasY }) },
    'sep',
    { icon:'🔍', label:'Fit all to view', action: () => EventBus.emit('canvas:fit-all') },
  ]);
}
