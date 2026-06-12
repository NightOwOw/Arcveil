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

  // Horizontal scroll on rp-tabs via mouse wheel
  const tabsEl = document.getElementById('rp-tabs');
  if (tabsEl) {
    tabsEl.addEventListener('wheel', e => {
      if (e.deltaY === 0) return;
      e.preventDefault();
      tabsEl.scrollLeft += e.deltaY;
    }, { passive: false });
  }

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

const _EP_STYLES = [
  { id: 'solid',     label: 'Solid',     dash: '',         sw: 2 },
  { id: 'dashed',    label: 'Dashed',    dash: '8,4',      sw: 2 },
  { id: 'dotted',    label: 'Dotted',    dash: '2,4',      sw: 2 },
  { id: 'long-dash', label: 'Long dash', dash: '16,6',     sw: 2 },
  { id: 'double',    label: 'Double',    dash: '',         sw: 4 },
  { id: 'thick',     label: 'Thick',     dash: '',         sw: 4 },
  { id: 'thin',      label: 'Thin',      dash: '',         sw: 1 },
  { id: 'animated',  label: 'Animated',  dash: '8,4',      sw: 2 },
  { id: 'wave',      label: 'Wave',      dash: '12,3,2,3', sw: 2 },
];

const _EP_COLORS = [
  '#e74c3c','#e67e22','#f39c12','#2ecc71','#1abc9c','#3498db',
  '#9b59b6','#e91e63','#7c5cbf','#2c3e50','#888888','#ffffff',
];

export function openEdgePanel(id) {
  const edge = state.edges.find(e => e.id === id);
  if (!edge) return;

  const body = document.getElementById('rp-body');
  const tabs = document.getElementById('rp-tabs');
  if (!body || !tabs) return;

  const curStyle = edge.style || 'solid';
  const curColor = edge.color || '#888888';
  const curDir   = edge.dir   || (edge.arrow !== false ? 'forward' : 'none');
  const curThick = edge.thick || 2;

  const panel = document.getElementById('right-panel');
  panel?.classList.remove('collapsed');

  tabs.innerHTML = '<div class="rp-tab active">Connection</div>';
  body.innerHTML = `
    <div class="panel-section-head">Label</div>
    <div class="profile-row" style="margin-bottom:10px">
      <input type="text" id="ep-label" value="${edge.label||''}" placeholder="Friend, Rival, Loves..." style="flex:1">
    </div>

    <div class="panel-section-head">Direction</div>
    <div class="ep-dir-row" id="ep-dir-wrap">
      ${[['forward','A → B'],['both','A ↔ B'],['none','A — B']].map(([v,l]) =>
        `<button class="ep-dir-btn${curDir===v?' active':''}" data-dir="${v}">${l}</button>`
      ).join('')}
    </div>

    <div class="panel-section-head" style="margin-top:10px">Thickness</div>
    <div class="slider-row" style="padding:0 2px;margin-bottom:2px">
      <input type="range" id="ep-thick" min="1" max="6" value="${curThick}" step="1">
      <span id="ep-thick-val">${curThick}px</span>
    </div>

    <div class="panel-section-head" style="margin-top:10px">Line Style</div>
    <div class="ep-style-grid" id="ep-style-grid">
      ${_EP_STYLES.map(s =>
        `<div class="ep-style-opt${curStyle===s.id?' sel':''}" data-style="${s.id}">
          <svg viewBox="0 0 50 14" width="50" height="14">
            <line x1="2" y1="7" x2="48" y2="7" stroke="currentColor" stroke-width="${s.sw}"${s.dash?` stroke-dasharray="${s.dash}"`:''}/>
          </svg>
          <span>${s.label}</span>
        </div>`
      ).join('')}
    </div>

    <div class="panel-section-head" style="margin-top:10px">Color</div>
    <div class="ep-colors" id="ep-colors">
      ${_EP_COLORS.map(c =>
        `<div class="color-swatch${c===curColor?' sel':''}" data-color="${c}"
          style="background:${c};${c==='#ffffff'?'border-color:var(--av-border-strong)':''}"></div>`
      ).join('')}
      <input type="color" id="ep-custom-color" value="${curColor}" title="Custom color"
        style="width:22px;height:22px;padding:1px;border-radius:50%;cursor:pointer;flex-shrink:0;border:2px solid var(--av-border);background:none">
    </div>

    <hr class="av-divider" style="margin-top:14px">
    <button class="btn-danger" id="ep-delete" style="width:100%;margin-top:4px">🗑 Delete Connection</button>
  `;

  const _save = () => import('../state.js').then(m => { m.saveHistory(); EventBus.emit('edges:updated'); });

  document.getElementById('ep-label').oninput = e => { edge.label = e.target.value; _save(); };

  document.getElementById('ep-dir-wrap').querySelectorAll('.ep-dir-btn').forEach(btn => {
    btn.onclick = () => {
      document.getElementById('ep-dir-wrap').querySelectorAll('.ep-dir-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      edge.dir   = btn.dataset.dir;
      edge.arrow = btn.dataset.dir !== 'none';
      _save();
    };
  });

  document.getElementById('ep-thick').oninput = e => {
    edge.thick = +e.target.value;
    document.getElementById('ep-thick-val').textContent = e.target.value + 'px';
    _save();
  };

  document.getElementById('ep-style-grid').querySelectorAll('.ep-style-opt').forEach(opt => {
    opt.onclick = () => {
      document.getElementById('ep-style-grid').querySelectorAll('.ep-style-opt').forEach(o => o.classList.remove('sel'));
      opt.classList.add('sel');
      edge.style = opt.dataset.style;
      _save();
    };
  });

  document.getElementById('ep-colors').querySelectorAll('.color-swatch').forEach(sw => {
    sw.onclick = () => {
      document.getElementById('ep-colors').querySelectorAll('.color-swatch').forEach(s => s.classList.remove('sel'));
      sw.classList.add('sel');
      edge.color = sw.dataset.color;
      document.getElementById('ep-custom-color').value = sw.dataset.color;
      _save();
    };
  });

  document.getElementById('ep-custom-color').oninput = e => {
    document.getElementById('ep-colors').querySelectorAll('.color-swatch').forEach(s => s.classList.remove('sel'));
    edge.color = e.target.value;
    _save();
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
