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
    !isMedia && { icon:'↔', label:'Connect to...', action: () => _showConnectDialog(id) },
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

function _showConnectDialog(fromId) {
  const fromNode = state.nodes.find(n => n.id === fromId);
  if (!fromNode) return;

  const candidates = state.nodes.filter(n => n.id !== fromId);
  if (!candidates.length) {
    _showToast('Thêm node khác trước khi tạo kết nối.');
    return;
  }

  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center;';

  const dialog = document.createElement('div');
  dialog.style.cssText = `
    background:var(--av-bg-elevated);border:1px solid var(--av-border-strong);
    border-radius:var(--av-radius-lg);padding:16px;width:290px;max-height:460px;
    display:flex;flex-direction:column;box-shadow:0 16px 48px rgba(0,0,0,0.55);
  `;

  overlay.appendChild(dialog);
  document.body.appendChild(overlay);

  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  const escHandler = e => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', escHandler);

  function close() {
    if (overlay.parentNode) document.body.removeChild(overlay);
    document.removeEventListener('keydown', escHandler);
  }

  // ── Phase 1: pick target node ────────────────────────────────────────────────
  function showPickPhase() {
    dialog.innerHTML = '';

    const title = document.createElement('div');
    title.style.cssText = 'font-size:13px;font-weight:600;color:var(--av-text-primary);margin-bottom:2px;';
    title.textContent = 'Connect to...';
    dialog.appendChild(title);

    const sub = document.createElement('div');
    sub.style.cssText = 'font-size:11px;color:var(--av-text-muted);margin-bottom:10px;';
    sub.textContent = `From: ${fromNode.name}`;
    dialog.appendChild(sub);

    const search = document.createElement('input');
    search.type = 'text';
    search.placeholder = 'Search nodes...';
    search.style.cssText = `
      width:100%;padding:6px 8px;border-radius:var(--av-radius-sm);font-size:12px;
      border:1px solid var(--av-border);background:var(--av-bg-base);color:var(--av-text-primary);
      outline:none;box-sizing:border-box;margin-bottom:8px;
    `;
    dialog.appendChild(search);

    const list = document.createElement('div');
    list.style.cssText = 'overflow-y:auto;flex:1;display:flex;flex-direction:column;gap:2px;';
    dialog.appendChild(list);

    function buildList(filter) {
      list.innerHTML = '';
      const filtered = candidates.filter(n => !filter || n.name.toLowerCase().includes(filter.toLowerCase()));
      if (!filtered.length) {
        const empty = document.createElement('div');
        empty.style.cssText = 'padding:12px;text-align:center;color:var(--av-text-muted);font-size:12px;';
        empty.textContent = 'No nodes found';
        list.appendChild(empty);
        return;
      }
      for (const n of filtered) {
        const isConnected = state.edges.some(e =>
          (e.from === fromId && e.to === n.id) ||
          (e.from === n.id  && e.to === fromId));

        const row = document.createElement('button');
        row.style.cssText = `
          display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:var(--av-radius-sm);
          background:none;border:none;width:100%;text-align:left;font-size:12px;
          cursor:${isConnected ? 'default' : 'pointer'};
          color:${isConnected ? 'var(--av-text-muted)' : 'var(--av-text-primary)'};
          opacity:${isConnected ? 0.55 : 1};
        `;

        const dot = document.createElement('span');
        dot.style.cssText = `width:10px;height:10px;border-radius:50%;background:${n.color || '#888'};flex-shrink:0;`;
        row.appendChild(dot);

        const nameSpan = document.createElement('span');
        nameSpan.style.flex = '1';
        nameSpan.textContent = n.name;
        row.appendChild(nameSpan);

        const tag = document.createElement('span');
        tag.style.cssText = 'font-size:10px;color:var(--av-text-muted);';
        tag.textContent = isConnected ? '✓' : n.type;
        row.appendChild(tag);

        if (!isConnected) {
          row.addEventListener('mouseenter', () => { row.style.background = 'var(--av-bg-hover)'; });
          row.addEventListener('mouseleave', () => { row.style.background = ''; });
          row.onclick = () => showLabelPhase(n);
        }

        list.appendChild(row);
      }
    }

    buildList('');
    search.addEventListener('input', () => buildList(search.value));

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText = `
      margin-top:10px;padding:7px;width:100%;border-radius:var(--av-radius-sm);
      border:1px solid var(--av-border);background:transparent;
      color:var(--av-text-muted);cursor:pointer;font-size:12px;
    `;
    cancelBtn.onclick = close;
    dialog.appendChild(cancelBtn);

    setTimeout(() => search.focus(), 50);
  }

  // ── Phase 2: enter relationship label ────────────────────────────────────────
  function showLabelPhase(toNode) {
    dialog.innerHTML = '';

    const title = document.createElement('div');
    title.style.cssText = 'font-size:13px;font-weight:600;color:var(--av-text-primary);margin-bottom:4px;';
    title.textContent = 'Set Relationship';
    dialog.appendChild(title);

    const arrow = document.createElement('div');
    arrow.style.cssText = 'font-size:11px;color:var(--av-text-muted);margin-bottom:12px;display:flex;align-items:center;gap:6px;';
    arrow.innerHTML = `<span style="color:var(--av-text-primary);font-weight:500;">${fromNode.name}</span>
      <span>→</span>
      <span style="color:var(--av-text-primary);font-weight:500;">${toNode.name}</span>`;
    dialog.appendChild(arrow);

    const labelInput = document.createElement('input');
    labelInput.type = 'text';
    labelInput.placeholder = 'e.g. Mentor, Ally, Enemy...';
    labelInput.style.cssText = `
      width:100%;padding:7px 8px;border-radius:var(--av-radius-sm);font-size:12px;
      border:1px solid var(--av-border);background:var(--av-bg-base);color:var(--av-text-primary);
      outline:none;box-sizing:border-box;margin-bottom:10px;
    `;
    dialog.appendChild(labelInput);

    const presetsWrap = document.createElement('div');
    presetsWrap.style.cssText = 'display:flex;flex-wrap:wrap;gap:5px;margin-bottom:14px;';
    for (const p of ['Ally','Enemy','Mentor','Rival','Family','Friend','Stranger','Lover']) {
      const chip = document.createElement('button');
      chip.textContent = p;
      chip.style.cssText = `
        padding:3px 9px;border-radius:10px;border:1px solid var(--av-border);
        background:var(--av-bg-base);color:var(--av-text-muted);
        cursor:pointer;font-size:11px;
      `;
      chip.addEventListener('mouseenter', () => { chip.style.borderColor = 'var(--av-accent,#7c5cbf)'; chip.style.color = 'var(--av-text-primary)'; });
      chip.addEventListener('mouseleave', () => { chip.style.borderColor = 'var(--av-border)'; chip.style.color = 'var(--av-text-muted)'; });
      chip.onclick = () => { labelInput.value = p; labelInput.focus(); };
      presetsWrap.appendChild(chip);
    }
    dialog.appendChild(presetsWrap);

    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:8px;';

    const backBtn = document.createElement('button');
    backBtn.textContent = '← Back';
    backBtn.style.cssText = `
      flex:1;padding:7px;border-radius:var(--av-radius-sm);
      border:1px solid var(--av-border);background:transparent;
      color:var(--av-text-muted);cursor:pointer;font-size:12px;
    `;
    backBtn.onclick = showPickPhase;
    btnRow.appendChild(backBtn);

    const connectBtn = document.createElement('button');
    connectBtn.textContent = 'Connect';
    connectBtn.style.cssText = `
      flex:2;padding:7px;border-radius:var(--av-radius-sm);
      border:none;background:var(--av-accent,#7c5cbf);color:#fff;
      cursor:pointer;font-size:12px;font-weight:600;
    `;
    connectBtn.onclick = () => doConnect(labelInput.value.trim());
    btnRow.appendChild(connectBtn);
    dialog.appendChild(btnRow);

    setTimeout(() => labelInput.focus(), 30);
    labelInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') doConnect(labelInput.value.trim());
    });

    function doConnect(label) {
      import('../state.js').then(({ uid, addEdge }) => {
        addEdge({ id: uid(), from: fromId, to: toNode.id, label, style: 'solid', color: '#7c5cbf', arrow: true });
      });
      close();
    }
  }

  showPickPhase();
}

function _showToast(msg) {
  const t = document.createElement('div');
  t.style.cssText = `
    position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:11000;
    background:var(--av-bg-elevated);border:1px solid var(--av-border-strong);
    border-radius:var(--av-radius-md);padding:8px 16px;font-size:12px;
    color:var(--av-text-primary);box-shadow:0 4px 16px rgba(0,0,0,0.4);
  `;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2500);
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
