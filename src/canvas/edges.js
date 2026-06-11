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
  EventBus.on('nodes:updated',  renderEdges);
  EventBus.on('edges:updated',  renderEdges);
  EventBus.on('canvas:node-moved', renderEdges);
  EventBus.on('canvas:start-connect', (fromId) => startEdgeConnect(fromId));
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
