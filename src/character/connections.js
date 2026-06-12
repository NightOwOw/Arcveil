// connections.js — "Connect" profile tab: shows canvas edges for this character
import { state, esc, EventBus } from '../state.js';

const _DASH = {
  solid: '', dashed: '8,4', dotted: '2,4', 'long-dash': '16,6',
  wave: '12,3,2,3', double: '', thick: '', thin: '', animated: '8,4',
};

export function renderConnections(nodeId) {
  const body = document.getElementById('rp-body');
  if (!body) return;

  const edges = state.edges.filter(e => e.from === nodeId || e.to === nodeId);

  body.innerHTML = `
    <div style="font-size:11px;color:var(--av-text-muted);margin-bottom:10px">
      Canvas connections involving this character. Click a row to edit it.
    </div>
    <div id="conn-list">
      ${edges.length === 0
        ? `<div style="text-align:center;padding:20px 8px;font-size:11px;color:var(--av-text-muted)">
             No canvas connections yet.<br>Use the <strong>Connect</strong> tool on the canvas to add one.
           </div>`
        : edges.map(e => _connRow(e, nodeId)).join('')}
    </div>
    <button class="btn-sm" id="add-conn-btn" style="margin-top:8px;width:100%">
      ↔ Go to Canvas &amp; Connect
    </button>
  `;

  // Click a row → navigate to canvas and open that edge's panel
  body.querySelectorAll('.conn-row').forEach(row => {
    row.addEventListener('click', () => {
      const edgeId = row.dataset.edgeId;
      EventBus.emit('nav:changed', 'canvas');
      setTimeout(() => EventBus.emit('edge:clicked', edgeId), 200);
    });
  });

  // "Go to Canvas & Connect" → switch to canvas, activate connect mode pre-set on this node
  document.getElementById('add-conn-btn')?.addEventListener('click', () => {
    EventBus.emit('nav:changed', 'canvas');
    setTimeout(() => {
      window._avCanvasMode = 'connect';
      document.getElementById('ct-connect')?.classList.add('active');
      document.getElementById('ct-select')?.classList.remove('active');
      const canvasEl = document.getElementById('view-canvas');
      if (canvasEl) canvasEl.style.cursor = 'crosshair';
      // Pre-select fromId so the very next node click completes the edge
      const { startEdgeConnect } = /** @type {any} */ (window._edgesModule || {});
      if (startEdgeConnect) {
        startEdgeConnect(nodeId);
      } else {
        EventBus.emit('status:message', 'Click the source node, then the target node to connect');
      }
    }, 200);
  });
}

function _connRow(e, nodeId) {
  const isFrom   = e.from === nodeId;
  const otherId  = isFrom ? e.to : e.from;
  const other    = state.nodes.find(n => n.id === otherId);
  const name     = esc(other?.name || 'Unknown');
  const color    = other?.color || '#888';
  const letter   = esc(other?.letter || '?');
  const dir      = e.dir || (e.arrow !== false ? 'forward' : 'none');
  const arrow    = dir === 'both' ? '↔' : (isFrom ? (dir === 'none' ? '—' : '→') : (dir === 'forward' ? '←' : '↔'));
  const sw       = e.style === 'thick' ? 4 : e.style === 'thin' ? 1 : (e.thick || 2);
  const dash     = _DASH[e.style] || '';
  const edgeCol  = e.color || '#888';

  return `<div class="conn-row" data-edge-id="${e.id}">
    <div style="width:26px;height:26px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#fff;flex-shrink:0">${letter}</div>
    <div style="flex:1;min-width:0">
      <div style="font-size:12px;font-weight:600;color:var(--av-text-primary)">${arrow} ${name}</div>
      <div style="font-size:10px;color:var(--av-text-muted)">${esc(e.label) || '—'}</div>
    </div>
    <svg viewBox="0 0 36 12" width="36" height="12" style="flex-shrink:0">
      <line x1="2" y1="6" x2="34" y2="6" stroke="${edgeCol}" stroke-width="${sw}"${dash ? ` stroke-dasharray="${dash}"` : ''}/>
    </svg>
    <span style="font-size:10px;color:var(--av-text-muted);margin-left:2px">›</span>
  </div>`;
}
