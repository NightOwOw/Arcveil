// ============================================
// profile.js — Profile panel controller (tab switcher)
// Imports: state.js, all character tab modules
// Exports: renderProfilePanel, renderCharacterList
// Events: listens 'node:open-profile'
// ============================================

import { state, EventBus, esc } from '../state.js';
import { renderBasicTab }    from './basic-info.js';
import { renderAppearance }  from './appearance.js';
import { renderPowers }      from './powers.js';
import { renderVoice }       from './voice.js';
import { renderArc }         from './arc.js';
import { renderInterview }   from './interview.js';
import { renderChemistry }   from './chemistry.js';
import { renderRelationships } from './relationships.js';

const TABS = [
  { id: 'basic',     label: 'Basic' },
  { id: 'appear',    label: 'Look' },
  { id: 'powers',    label: 'Powers' },
  { id: 'voice',     label: 'Voice' },
  { id: 'arc',       label: 'Arc' },
  { id: 'interview', label: 'Interview' },
  { id: 'chemistry', label: 'Chemistry' },
  { id: 'relations', label: 'Relations' },
];

let _activeTab = 'basic';

export function renderProfilePanel(nodeId, tab = _activeTab) {
  _activeTab = tab;
  const node = state.nodes.find(n => n.id === nodeId);
  if (!node) return;

  const panel = document.getElementById('right-panel');
  panel?.classList.remove('collapsed');

  _renderTabBar(nodeId);
  _switchTab(nodeId, tab);
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
    case 'chemistry': renderChemistry(nodeId);    break;
    case 'relations': renderRelationships(nodeId); break;
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
    </div>
  `).join('');
  grid.querySelectorAll('.char-grid-card').forEach(el => {
    el.onclick = () => renderProfilePanel(el.dataset.id, 'basic');
  });
}
