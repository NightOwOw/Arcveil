// ============================================
// edges.js — Connection lines, 9 styles, rendering
// Imports: state.js
// Exports: renderEdges, startEdgeConnect, initEdges
// Events: emits 'edge:clicked', 'edges:updated'
// ============================================

import { state, EventBus, uid, addEdge as stateAddEdge, deleteEdge } from '../state.js';

const EDGE_STYLES = {
  solid:       { dash: '',              strokeWidth: 2 },
  dashed:      { dash: '8,4',           strokeWidth: 2 },
  dotted:      { dash: '2,4',           strokeWidth: 2 },
  double:      { dash: '',              strokeWidth: 4, double: true },
  thick:       { dash: '',              strokeWidth: 4 },
  thin:        { dash: '',              strokeWidth: 1 },
  animated:    { dash: '8,4',           strokeWidth: 2, animated: true },
  wave:        { dash: '12,3,2,3',      strokeWidth: 2 },
  'long-dash': { dash: '16,6',          strokeWidth: 2 },
};

let _svg = null;
let _connecting = null; // { fromId, tempLine }

export function initEdges(svg) {
  _svg = svg;
  // Fix: give SVG explicit large size so edges render even when canvas-inner has 0 computed size
  if (_svg) {
    _svg.style.width  = '10000px';
    _svg.style.height = '10000px';
  }
  EventBus.on('nodes:updated',  renderEdges);
  EventBus.on('edges:updated',  renderEdges);
  EventBus.on('canvas:node-moved', renderEdges);
  EventBus.on('canvas:start-connect', (fromId) => startEdgeConnect(fromId));
  EventBus.on('canvas:connect-drag-start', ({ fromId, clientX, clientY }) =>
    startEdgeConnectDrag(fromId, clientX, clientY));
}

export function renderEdges() {
  if (!_svg) return;
  _svg.innerHTML = _buildDefs();

  for (const e of state.edges) {
    const from = state.nodes.find(n => n.id === e.from);
    const to   = state.nodes.find(n => n.id === e.to);
    if (!from || !to) continue;
    _svg.innerHTML += _buildEdge(e, from, to);
  }

  // Bind click events on paths
  _svg.querySelectorAll('.edge-line').forEach(path => {
    path.addEventListener('click', ev => {
      ev.stopPropagation();
      EventBus.emit('edge:clicked', path.dataset.id);
    });
    path.addEventListener('contextmenu', ev => {
      ev.preventDefault();
      ev.stopPropagation();
      EventBus.emit('edge:right-clicked', { id: path.dataset.id, x: ev.clientX, y: ev.clientY });
    });
  });
}

function _buildDefs() {
  return `<defs>
    <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0,0 L0,6 L8,3 z" fill="context-stroke"/>
    </marker>
  </defs>`;
}

function _buildEdge(e, from, to) {
  const style = EDGE_STYLES[e.style] || EDGE_STYLES.solid;
  const color = e.color || '#888';
  const mx1 = from.x + (from.size || 52) / 2;
  const my1 = from.y + (from.size || 52) / 2;
  const mx2 = to.x   + (to.size || 52) / 2;
  const my2 = to.y   + (to.size || 52) / 2;

  const cx = (mx1 + mx2) / 2;
  const cy = (my1 + my2) / 2;
  const dx = mx2 - mx1, dy = my2 - my1;
  const curve = Math.sqrt(dx*dx + dy*dy) * 0.18;
  const cpx = cx - dy * 0.18, cpy = cy + dx * 0.18;

  const d = `M${mx1},${my1} Q${cpx},${cpy} ${mx2},${my2}`;
  const selected = state.selectedNodes.size === 0 ? false : false; // edge selection logic TODO

  let paths = `<path class="edge-line${style.animated ? ' edge-animated' : ''}" data-id="${e.id}"
    d="${d}" stroke="${color}" stroke-width="${style.strokeWidth}"
    stroke-dasharray="${style.dash}" fill="none" opacity="0.8"
    marker-end="${e.arrow !== false ? 'url(#arrow)' : 'none'}"/>`;

  if (style.double) {
    paths += `<path d="${d}" stroke="var(--av-bg-primary)" stroke-width="${style.strokeWidth - 2}" fill="none" opacity="0.9" pointer-events="none"/>`;
  }

  // Label
  if (e.label) {
    const lx = (mx1 + cpx + mx2) / 3;
    const ly = (my1 + cpy + my2) / 3;
    paths += `<rect x="${lx-22}" y="${ly-9}" width="44" height="14" class="edge-label-bg"/>
      <text x="${lx}" y="${ly+2}" class="edge-label-text" text-anchor="middle">${e.label}</text>`;
  }

  return paths;
}

// ── Connect mode ──────────────────────────────────────────────────────────────

export function startEdgeConnect(fromId) {
  _connecting = { fromId };
  window._avConnecting = true;
  window._avCanvasMode = 'select';
  document.body.style.cursor = 'crosshair';

  EventBus.emit('status:message', 'Click a node to connect — Escape to cancel');

  const onClick = (id) => {
    if (id !== _connecting?.fromId) {
      const existing = state.edges.find(e =>
        (e.from === _connecting.fromId && e.to === id) ||
        (e.from === id && e.to === _connecting.fromId));
      if (!existing) {
        stateAddEdge({ id: uid(), from: _connecting.fromId, to: id, label: '', style: 'solid', color: '#7c5cbf' });
      }
    }
    _stopConnect(onClick, onKey);
  };

  const onKey = (e) => { if (e.key === 'Escape') _stopConnect(onClick, onKey); };

  EventBus.on('node:clicked', onClick);
  document.addEventListener('keydown', onKey);
}

function _stopConnect(onClick, onKey) {
  _connecting = null;
  window._avConnecting = false;
  document.body.style.cursor = '';
  EventBus.off('node:clicked', onClick);
  document.removeEventListener('keydown', onKey);
  EventBus.emit('canvas:mode-reset');
  EventBus.emit('status:message', '');
}

// ── Connect drag (toolbar connect mode) ───────────────────────────────────────

export function startEdgeConnectDrag(fromId, clientX, clientY) {
  const fromNode = state.nodes.find(n => n.id === fromId);
  if (!fromNode || !_svg) return;

  const fromX = fromNode.x + (fromNode.size || 52) / 2;
  const fromY = fromNode.y + (fromNode.size || 52) / 2;

  // Rubber-band temp line
  const tempLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  tempLine.setAttribute('x1', fromX);
  tempLine.setAttribute('y1', fromY);
  tempLine.setAttribute('x2', fromX);
  tempLine.setAttribute('y2', fromY);
  tempLine.setAttribute('stroke', '#7c5cbf');
  tempLine.setAttribute('stroke-width', '2');
  tempLine.setAttribute('stroke-dasharray', '7,3');
  tempLine.style.opacity = '0.75';
  tempLine.style.pointerEvents = 'none';
  _svg.appendChild(tempLine);

  const srcEl = document.querySelector(`.node[data-id="${fromId}"]`);
  if (srcEl) srcEl.style.outline = '2px solid #7c5cbf';

  let hoveredEl = null;

  function toCanvas(cx, cy) {
    const container = document.getElementById('view-canvas');
    if (!container) return { x: cx, y: cy };
    const r = container.getBoundingClientRect();
    return {
      x: (cx - r.left - state.view.x) / state.view.scale,
      y: (cy - r.top  - state.view.y) / state.view.scale,
    };
  }

  function onMove(e) {
    const { x, y } = toCanvas(e.clientX, e.clientY);
    tempLine.setAttribute('x2', x);
    tempLine.setAttribute('y2', y);

    if (hoveredEl) { hoveredEl.style.outline = ''; hoveredEl = null; }
    const target = e.target.closest?.('.node');
    if (target && target.dataset.id && target.dataset.id !== fromId) {
      hoveredEl = target;
      target.style.outline = '2px dashed #7c5cbf';
    }
  }

  function onUp(e) {
    cleanup();
    const target = e.target.closest?.('.node');
    if (target && target.dataset.id && target.dataset.id !== fromId) {
      _promptEdgeLabel(fromId, target.dataset.id, e.clientX, e.clientY);
    }
  }

  function cleanup() {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup',  onUp);
    tempLine.remove();
    if (srcEl) srcEl.style.outline = '';
    if (hoveredEl) { hoveredEl.style.outline = ''; hoveredEl = null; }
  }

  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup',  onUp);
}

export function promptEdgeLabel(fromId, toId, clientX, clientY) {
  _promptEdgeLabel(fromId, toId, clientX, clientY);
}

function _promptEdgeLabel(fromId, toId, clientX, clientY) {
  const from = state.nodes.find(n => n.id === fromId);
  const to   = state.nodes.find(n => n.id === toId);
  if (!from || !to) return;

  const existing = state.edges.find(e =>
    (e.from === fromId && e.to === toId) ||
    (e.from === toId   && e.to === fromId));
  if (existing) return;

  const px = Math.min(clientX + 10, window.innerWidth  - 270);
  const py = Math.min(clientY + 10, window.innerHeight - 190);

  const popup = document.createElement('div');
  popup.style.cssText = `
    position:fixed;left:${px}px;top:${py}px;z-index:10000;
    background:var(--av-bg-elevated);border:1px solid var(--av-border-strong);
    border-radius:var(--av-radius-lg);padding:14px;width:250px;
    box-shadow:0 8px 32px rgba(0,0,0,0.5);
  `;

  const presets = ['Ally','Enemy','Mentor','Rival','Family','Friend'];
  popup.innerHTML = `
    <div style="font-size:12px;font-weight:600;color:var(--av-text-primary);margin-bottom:3px;">${from.name} → ${to.name}</div>
    <div style="font-size:11px;color:var(--av-text-muted);margin-bottom:8px;">Relationship label (optional)</div>
    <input id="_elInp" type="text" placeholder="e.g. Mentor, Ally, Enemy..."
      style="width:100%;padding:6px 8px;border-radius:var(--av-radius-sm);font-size:12px;
             border:1px solid var(--av-border);background:var(--av-bg-base);
             color:var(--av-text-primary);outline:none;box-sizing:border-box;margin-bottom:8px;">
    <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:10px;">
      ${presets.map(p =>
        `<button class="_elChip" data-p="${p}"
          style="padding:3px 8px;border-radius:10px;border:1px solid var(--av-border);
                 background:var(--av-bg-base);color:var(--av-text-muted);
                 cursor:pointer;font-size:11px;">${p}</button>`
      ).join('')}
    </div>
    <div style="display:flex;gap:6px;">
      <button id="_elSkip" style="flex:1;padding:6px;border-radius:var(--av-radius-sm);
        border:1px solid var(--av-border);background:transparent;
        color:var(--av-text-muted);cursor:pointer;font-size:11px;">Skip</button>
      <button id="_elOk" style="flex:2;padding:6px;border-radius:var(--av-radius-sm);
        border:none;background:var(--av-accent,#7c5cbf);color:#fff;
        cursor:pointer;font-size:11px;font-weight:600;">Connect</button>
    </div>
  `;
  document.body.appendChild(popup);

  const inp = popup.querySelector('#_elInp');
  setTimeout(() => inp?.focus(), 30);

  popup.querySelectorAll('._elChip').forEach(btn => {
    btn.addEventListener('click', () => { if (inp) inp.value = btn.dataset.p; });
  });

  function doConnect(label) {
    import('../state.js').then(({ uid, addEdge }) => {
      addEdge({ id: uid(), from: fromId, to: toId, label: label || '', style: 'solid', color: '#7c5cbf', arrow: true });
    });
    popup.remove();
    if (onOut) document.removeEventListener('mousedown', onOut);
  }

  popup.querySelector('#_elOk').addEventListener('click', () => doConnect(inp?.value.trim() || ''));
  popup.querySelector('#_elSkip').addEventListener('click', () => doConnect(''));
  inp?.addEventListener('keydown', e => {
    if (e.key === 'Enter')  doConnect(inp.value.trim());
    if (e.key === 'Escape') { popup.remove(); document.removeEventListener('mousedown', onOut); }
  });

  let onOut;
  setTimeout(() => {
    onOut = e => {
      if (!popup.contains(e.target)) { popup.remove(); document.removeEventListener('mousedown', onOut); }
    };
    document.addEventListener('mousedown', onOut);
  }, 150);
}
