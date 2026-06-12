// ============================================
// profile.js — Profile panel controller (tab switcher)
// Imports: state.js, all character tab modules
// Exports: renderProfilePanel, renderCharacterList
// Events: listens 'node:open-profile'
// ============================================

import { state, EventBus, esc, getOrCreateProfile, updateProfile } from '../state.js';
import { renderBasicTab }    from './basic-info.js';
import { renderAppearance }  from './appearance.js';
import { renderPowers }      from './powers.js';
import { renderVoice }       from './voice.js';
import { renderArc }         from './arc.js';
import { renderInterview }   from './interview.js';
import { renderChemistry }   from './chemistry.js';
import { renderRelationships } from './relationships.js';
import { renderConnections } from './connections.js';

const TABS = [
  { id: 'basic',     label: 'Basic' },
  { id: 'appear',    label: 'Look' },
  { id: 'powers',    label: 'Powers' },
  { id: 'voice',     label: 'Voice' },
  { id: 'arc',       label: 'Arc' },
  { id: 'interview', label: 'Interview' },
  { id: 'connect',   label: 'Connect' },
  { id: 'chemistry', label: 'Chemistry' },
  { id: 'relations', label: 'Relations' },
  { id: 'au',        label: 'Universes' },
];

let _activeTab = 'basic';

export function renderProfilePanel(nodeId, tab = _activeTab) {
  _activeTab = tab;
  const node = state.nodes.find(n => n.id === nodeId);
  if (!node) return;

  document.getElementById('right-panel')?.classList.remove('collapsed');

  // Dispatch to type-specific panel
  if (node.type === 'location') {
    import('../world/location-panel.js').then(m => m.renderLocationPanel(nodeId, tab));
    return;
  }
  if (node.type === 'faction') {
    import('../world/faction-panel.js').then(m => m.renderFactionPanel(nodeId, tab));
    return;
  }
  if (node.type === 'event') {
    import('../world/event-panel.js').then(m => m.renderEventPanel(nodeId, tab));
    return;
  }
  if (node.type === 'item') {
    import('../world/item-panel.js').then(m => m.renderItemPanel(nodeId, tab));
    return;
  }
  if (node.type === 'media') {
    _renderMediaNode(nodeId, tab);
    return;
  }

  // Character / item / concept — standard tabs
  _renderTabBar(nodeId);
  _switchTab(nodeId, tab);
}

// ── Media node: subtype selector + delegation ─────────────────────────────────

function _renderMediaNode(nodeId, tab) {
  const p = getOrCreateProfile(nodeId);
  if (!p.subtype) {
    _renderMediaTypeSelect(nodeId);
    return;
  }

  const _afterRender = () => {
    // Append "change category" chip after panel content settles
    const body = document.getElementById('rp-body');
    if (!body) return;
    const chip = document.createElement('div');
    chip.style.cssText = 'padding:10px 0 2px;text-align:center';
    chip.innerHTML = `<button style="font-size:10px;color:var(--av-text-muted);background:none;border:1px solid var(--av-border);border-radius:var(--av-radius-sm);padding:3px 10px;cursor:pointer" id="_media-retype">⟳ Change category</button>`;
    body.appendChild(chip);
    document.getElementById('_media-retype')?.addEventListener('click', () => {
      updateProfile(nodeId, { subtype: null });
      renderProfilePanel(nodeId, 'basic');
    });
  };

  switch (p.subtype) {
    case 'location':
      import('../world/location-panel.js').then(m => { m.renderLocationPanel(nodeId, tab); setTimeout(_afterRender, 0); });
      break;
    case 'faction':
      import('../world/faction-panel.js').then(m => { m.renderFactionPanel(nodeId, tab); setTimeout(_afterRender, 0); });
      break;
    case 'event':
      import('../world/event-panel.js').then(m => { m.renderEventPanel(nodeId, tab); setTimeout(_afterRender, 0); });
      break;
    default: // character
      _renderTabBar(nodeId);
      _switchTab(nodeId, tab);
      setTimeout(_afterRender, 0);
  }
}

function _renderMediaTypeSelect(nodeId) {
  const body = document.getElementById('rp-body');
  const tabs = document.getElementById('rp-tabs');
  if (!body || !tabs) return;
  tabs.innerHTML = '<div class="rp-tab active">Media Node</div>';
  body.innerHTML = `
    <div style="padding:16px 0 8px;text-align:center;font-size:12px;color:var(--av-text-muted)">
      What kind of entity does this media represent?
    </div>
    <div class="media-type-grid">
      <button class="media-type-btn" data-t="character"><span class="media-type-icon">👤</span><span>Character</span></button>
      <button class="media-type-btn" data-t="location"><span class="media-type-icon">📍</span><span>Location</span></button>
      <button class="media-type-btn" data-t="event"><span class="media-type-icon">⚡</span><span>Event</span></button>
      <button class="media-type-btn" data-t="faction"><span class="media-type-icon">⚔️</span><span>Faction</span></button>
    </div>
  `;
  body.querySelectorAll('.media-type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      updateProfile(nodeId, { subtype: btn.dataset.t });
      renderProfilePanel(nodeId, 'basic');
    });
  });
}

function _renderTabBar(nodeId) {
  const tabs = document.getElementById('rp-tabs');
  if (!tabs) return;
  tabs.innerHTML = TABS.map(t =>
    `<div class="rp-tab${_activeTab === t.id ? ' active' : ''}" data-tab="${t.id}">${t.label}</div>`
  ).join('');
  tabs.querySelectorAll('.rp-tab').forEach(el => {
    el.onclick = () => renderProfilePanel(nodeId, el.dataset.tab);
  });
}

function _switchTab(nodeId, tab) {
  _activeTab = tab;
  switch (tab) {
    case 'basic':     renderBasicTab(nodeId);     break;
    case 'appear':    renderAppearance(nodeId);   break;
    case 'powers':    renderPowers(nodeId);       break;
    case 'voice':     renderVoice(nodeId);        break;
    case 'arc':       renderArc(nodeId);          break;
    case 'interview': renderInterview(nodeId);    break;
    case 'connect':   renderConnections(nodeId);   break;
    case 'chemistry': renderChemistry(nodeId);    break;
    case 'relations': renderRelationships(nodeId); break;
    case 'au':        import('./au-tab.js').then(m => m.renderAUTab(nodeId)); break;
    default:          renderBasicTab(nodeId);
  }
}

// ── Character list (characters view) ─────────────────────────────────────────

export function renderCharacterList() {
  const view = document.getElementById('view-characters');
  if (!view) return;
  const chars = state.nodes.filter(n => n.type === 'character');

  if (!chars.length) {
    view.innerHTML = `<div class="placeholder-view">
      <div class="ph-icon">👤</div>
      <h2>No Characters Yet</h2>
      <p>Double-click the canvas to add a character node, then open their profile.</p>
      <button class="btn-primary" id="add-first-char">✦ Add First Character</button>
    </div>`;
    document.getElementById('add-first-char')?.addEventListener('click', () => {
      EventBus.emit('nav:changed', 'canvas');
      setTimeout(() => EventBus.emit('canvas:add-node', { type:'character', x:300, y:280 }), 200);
    });
    return;
  }

  view.innerHTML = `
    <div style="padding:12px 16px;border-bottom:1px solid var(--av-border);display:flex;align-items:center;gap:8px;flex-shrink:0">
      <h2 style="font-size:14px;font-weight:700;color:var(--av-text-primary);flex:1">Characters (${chars.length})</h2>
      <button class="btn-primary" id="add-char-btn" style="padding:5px 14px;font-size:12px">✦ Add</button>
    </div>
    <div id="char-grid"></div>
  `;

  document.getElementById('add-char-btn')?.addEventListener('click', () => {
    EventBus.emit('nav:changed', 'canvas');
    setTimeout(() => EventBus.emit('canvas:add-node', { type:'character', x:300+Math.random()*200, y:280+Math.random()*100 }), 200);
  });

  const grid = document.getElementById('char-grid');
  grid.innerHTML = chars.map(c => `
    <div class="char-grid-card" data-id="${c.id}">
      <div class="char-grid-avatar" style="background:${c.color||'#7c5cbf'}">${esc(c.letter||'?')}</div>
      <div class="char-grid-name">${esc(c.name||'Unnamed')}</div>
      <div class="char-grid-sub">${esc((state.profiles[c.id]?.role)||c.type)}</div>
      <button class="char-jump-btn" data-id="${c.id}" title="Jump to on canvas">⊙</button>
    </div>
  `).join('');
  grid.querySelectorAll('.char-grid-card').forEach(el => {
    el.onclick = e => {
      if (e.target.classList.contains('char-jump-btn')) return;
      renderProfilePanel(el.dataset.id, 'basic');
    };
  });
  grid.querySelectorAll('.char-jump-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      EventBus.emit('nav:changed', 'canvas');
      setTimeout(() => EventBus.emit('canvas:focus-node', btn.dataset.id), 160);
    });
  });
}
