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
  // CSS always beats SVG presentation attributes — set inline style directly
  _svg.style.width  = '8000px';
  _svg.style.height = '8000px';
  EventBus.on('nodes:updated',  renderEdges);
  EventBus.on('edges:updated',  renderEdges);
  EventBus.on('canvas:node-moved', renderEdges);
  EventBus.on('canvas:start-connect', (fromId) => startEdgeConnect(fromId));
  // Expose for connections.js "Add Connection" shortcut
  window._edgesModule = { startEdgeConnect };
}

export function renderEdges() {
  if (!_svg) return;

  // Build entire SVG content as one string — avoids repeated innerHTML parse/serialize cycles
  let html = _buildDefs(state.edges);
  for (const e of state.edges) {
    const from = state.nodes.find(n => n.id === e.from);
    const to   = state.nodes.find(n => n.id === e.to);
    if (!from || !to) continue;
    html += _buildEdge(e, from, to);
  }
  _svg.innerHTML = html;

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

// Collect unique colors used by edges so we can emit per-color marker defs
function _buildDefs(edges) {
  const colors = [...new Set(edges.map(e => e.color || '#888888'))];
  const markers = colors.map(c => {
    const id = 'arr-' + c.replace('#', '');
    const rid = 'arr-r-' + c.replace('#', '');
    return `
    <marker id="${id}" markerWidth="10" markerHeight="10" refX="9" refY="4" orient="auto" markerUnits="strokeWidth">
      <path d="M0,0 L0,8 L9,4 z" fill="${c}"/>
    </marker>
    <marker id="${rid}" markerWidth="10" markerHeight="10" refX="1" refY="4" orient="auto" markerUnits="strokeWidth">
      <path d="M9,0 L9,8 L0,4 z" fill="${c}"/>
    </marker>`;
  }).join('');
  return `<defs>${markers}</defs>`;
}

function _buildEdge(e, from, to) {
  const style = EDGE_STYLES[e.style] || EDGE_STYLES.solid;
  const color = e.color || '#888888';
  const strokeWidth = e.thick || style.strokeWidth;
  const dir = e.dir !== undefined ? e.dir : (e.arrow !== false ? 'forward' : 'none');

  // Node centers
  const cx1 = from.x + (from.size || 52) / 2;
  const cy1 = from.y + (from.size || 52) / 2;
  const cx2 = to.x   + (to.size   || 52) / 2;
  const cy2 = to.y   + (to.size   || 52) / 2;

  // Offset endpoints to sit at node edge (radius + small gap)
  const r1 = (from.size || 52) / 2 + 4;
  const r2 = (to.size   || 52) / 2 + 4;
  const dist = Math.sqrt((cx2-cx1)**2 + (cy2-cy1)**2) || 1;
  const ux = (cx2 - cx1) / dist, uy = (cy2 - cy1) / dist;

  const mx1 = cx1 + ux * r1;
  const my1 = cy1 + uy * r1;
  const mx2 = cx2 - ux * r2;
  const my2 = cy2 - uy * r2;

  // Quadratic bezier control point (slight curve)
  const mcx = (mx1 + mx2) / 2;
  const mcy = (my1 + my2) / 2;
  const dx = mx2 - mx1, dy = my2 - my1;
  const cpx = mcx - dy * 0.18, cpy = mcy + dx * 0.18;

  const d = `M${mx1},${my1} Q${cpx},${cpy} ${mx2},${my2}`;

  const cid  = color.replace('#', '');
  const mEnd   = (dir === 'forward' || dir === 'both') ? `url(#arr-${cid})`   : 'none';
  const mStart = (dir === 'both')                      ? `url(#arr-r-${cid})` : 'none';

  let paths = `<path class="edge-line${style.animated ? ' edge-animated' : ''}" data-id="${e.id}"
    d="${d}" stroke="${color}" stroke-width="${strokeWidth}"
    stroke-dasharray="${style.dash}" fill="none" opacity="0.85"
    marker-end="${mEnd}" marker-start="${mStart}"/>`;

  if (style.double) {
    paths += `<path d="${d}" stroke="var(--av-bg-primary)" stroke-width="${Math.max(1, strokeWidth - 2)}" fill="none" opacity="0.9" pointer-events="none"/>`;
  }

  // Label — positioned along the curve midpoint
  if (e.label) {
    const lx = (mx1 + cpx + mx2) / 3;
    const ly = (my1 + cpy + my2) / 3;
    const tw = Math.max(44, e.label.length * 7);
    paths += `<rect x="${lx - tw/2}" y="${ly-9}" width="${tw}" height="16" rx="4" class="edge-label-bg"/>
      <text x="${lx}" y="${ly+3}" class="edge-label-text" text-anchor="middle">${e.label}</text>`;
  }

  return paths;
}

// ── Connect mode ──────────────────────────────────────────────────────────────

export function startEdgeConnect(fromId) {
  _connecting = { fromId };
  window._avConnecting = true;
  document.body.style.cursor = 'crosshair';

  // Highlight the source node so user knows which node is "from"
  document.querySelector(`.node[data-id="${fromId}"]`)?.classList.add('connecting-source');

  // Show prominent instruction banner
  const fromNode = state.nodes.find(n => n.id === fromId);
  const banner = document.getElementById('connect-banner');
  if (banner) {
    document.getElementById('connect-banner-from').textContent = `From: ${fromNode?.name || 'Node'}`;
    banner.style.display = 'flex';
  }

  EventBus.emit('status:message', 'Click a target node to connect — Escape to cancel');

  const onClick = (id) => {
    if (id !== _connecting?.fromId) {
      const existing = state.edges.find(e =>
        (e.from === _connecting.fromId && e.to === id) ||
        (e.from === id && e.to === _connecting.fromId));
      if (!existing) {
        const newEdge = { id: uid(), from: _connecting.fromId, to: id, label: '', style: 'animated', color: '#7c5cbf', dir: 'forward', thick: 2 };
        stateAddEdge(newEdge);
        // Immediately open the edge panel so the user can configure the new connection
        setTimeout(() => EventBus.emit('edge:clicked', newEdge.id), 50);
      }
    }
    _stopConnect(onClick, onKey);
  };

  const onKey = (e) => { if (e.key === 'Escape') _stopConnect(onClick, onKey); };

  EventBus.on('node:clicked', onClick);
  document.addEventListener('keydown', onKey);
}

function _stopConnect(onClick, onKey) {
  document.querySelectorAll('.node.connecting-source').forEach(el => el.classList.remove('connecting-source'));
  const banner = document.getElementById('connect-banner');
  if (banner) banner.style.display = 'none';
  _connecting = null;
  window._avConnecting = false;
  document.body.style.cursor = '';
  EventBus.off('node:clicked', onClick);
  document.removeEventListener('keydown', onKey);
  EventBus.emit('canvas:mode-reset');
  EventBus.emit('status:message', '');
}
