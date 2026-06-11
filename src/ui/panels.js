// ============================================
// panels.js — Right panel system
// Imports: state.js, character/profile.js
// Exports: initPanels, openNodePanel, closePanel, updatePanelTabs
// Events: listens 'node:open-profile', 'node:clicked'
// ============================================

import { state, EventBus } from '../state.js';

let _activeNodeId = null;

export function initPanels() {
  EventBus.on('node:open-profile',  (id)   => openNodePanel(id));
  EventBus.on('node:clicked',       (id)   => _onNodeClick(id));
  EventBus.on('node:dblclicked',    (id)   => openNodePanel(id));
  EventBus.on('edge:clicked',       (id)   => openEdgePanel(id));
  EventBus.on('map:select-region',  (data) => _onRegionSelect(data));

  document.getElementById('rp-header')?.addEventListener('click', togglePanel);

  // Ctrl+wheel zoom for both panels
  _addPanelZoom(document.getElementById('right-panel'));
  _addPanelZoom(document.getElementById('sidebar'));

  // Keyboard close
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && _activeNodeId) closePanel();
  });
}

export function openNodePanel(id, tab = 'basic') {
  _activeNodeId = id;
  const panel = document.getElementById('right-panel');
  panel?.classList.remove('collapsed');
  import('../character/profile.js').then(m => m.renderProfilePanel(id, tab));
}

export function openEdgePanel(id) {
  const edge = state.edges.find(e => e.id === id);
  if (!edge) return;

  const body = document.getElementById('rp-body');
  const tabs = document.getElementById('rp-tabs');
  if (!body || !tabs) return;

  tabs.innerHTML = '<div class="rp-tab active">Edge</div>';
  body.innerHTML = `
    <div class="panel-section-head">Edge Properties</div>
    <div class="panel-row"><label>Label</label>
      <input type="text" id="ep-label" value="${edge.label||''}" placeholder="Relationship...">
    </div>
    <div class="panel-row"><label>Style</label>
      <select id="ep-style">
        ${['solid','dashed','dotted','double','thick','thin','animated','wave','long-dash'].map(s =>
          `<option value="${s}" ${edge.style===s?'selected':''}>${s}</option>`).join('')}
      </select>
    </div>
    <div class="panel-row"><label>Color</label>
      <input type="color" id="ep-color" value="${edge.color||'#888888'}">
    </div>
    <div class="panel-row"><label>Arrow</label>
      <input type="checkbox" id="ep-arrow" ${edge.arrow!==false?'checked':''}>
    </div>
    <hr class="av-divider">
    <button class="btn-danger" id="ep-delete">🗑 Delete Edge</button>
  `;

  document.getElementById('ep-label').oninput = e => {
    edge.label = e.target.value;
    import('../state.js').then(m => { m.saveHistory(); EventBus.emit('edges:updated'); });
  };
  document.getElementById('ep-style').onchange = e => {
    edge.style = e.target.value;
    import('../state.js').then(m => { m.saveHistory(); EventBus.emit('edges:updated'); });
  };
  document.getElementById('ep-color').oninput = e => {
    edge.color = e.target.value;
    import('../state.js').then(m => { m.saveHistory(); EventBus.emit('edges:updated'); });
  };
  document.getElementById('ep-arrow').onchange = e => {
    edge.arrow = e.target.checked;
    import('../state.js').then(m => { m.saveHistory(); EventBus.emit('edges:updated'); });
  };
  document.getElementById('ep-delete').onclick = () => {
    import('../state.js').then(m => m.deleteEdge(edge.id));
    closePanel();
  };
}

function _onNodeClick(id) {
  state.selectedNodes.clear();
  state.selectedNodes.add(id);
  EventBus.emit('nodes:updated');
  if (window._avConnecting) return;
  openNodePanel(id);
}

function _onRegionSelect({ mapId, regionId }) {
  import('../world/map.js').then(m => m.openRegionPanel?.(mapId, regionId));
}

export function closePanel() {
  _activeNodeId = null;
  const body = document.getElementById('rp-body');
  const tabs = document.getElementById('rp-tabs');
  if (body) body.innerHTML = '<div class="placeholder-view" style="padding:20px;font-size:11px;color:var(--av-text-muted);text-align:center">Select a node to view details</div>';
  if (tabs) tabs.innerHTML = '';
}

export function togglePanel() {
  document.getElementById('right-panel')?.classList.toggle('collapsed');
}

function _addPanelZoom(el) {
  if (!el) return;
  let scale = 1;
  el.addEventListener('wheel', e => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    scale = Math.max(0.6, Math.min(1.6, scale + (e.deltaY < 0 ? 0.05 : -0.05)));
    el.style.fontSize = scale + 'em';
  }, { passive: false });
}
