// ============================================
// sidebar.js — Left sidebar navigation + character list
// Imports: state.js
// Exports: initSidebar, updateCharList
// Events: listens 'nodes:updated', emits 'nav:changed', 'node:open-profile'
// ============================================

import { state, EventBus } from '../state.js';

const NAV_ICONS = {
  dashboard:   `<svg viewBox="0 0 16 16"><rect x="2" y="2" width="5" height="5" rx="1.2"/><rect x="9" y="2" width="5" height="5" rx="1.2"/><rect x="2" y="9" width="5" height="5" rx="1.2"/><rect x="9" y="9" width="5" height="5" rx="1.2"/></svg>`,
  canvas:      `<svg viewBox="0 0 16 16"><circle cx="4" cy="4" r="2"/><circle cx="12" cy="4" r="2"/><circle cx="4" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><path d="M6 4h4M4 6v4M12 6v4M6 12h4"/></svg>`,
  characters:  `<svg viewBox="0 0 16 16"><circle cx="8" cy="5.5" r="3"/><path d="M1.5 14.5c0-3.59 2.91-6.5 6.5-6.5s6.5 2.91 6.5 6.5"/></svg>`,
  writing:     `<svg viewBox="0 0 16 16"><path d="M3 2h10a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z"/><path d="M5 5h6M5 8h6M5 11h4"/></svg>`,
  world:       `<svg viewBox="0 0 16 16"><path d="M8 1L2 5v8h12V5L8 1z"/><path d="M5 13V9h6v4"/></svg>`,
  story:       `<svg viewBox="0 0 16 16"><rect x="2" y="3" width="12" height="11" rx="1.2"/><path d="M5 2v2M11 2v2M2 7h12"/></svg>`,
  universes:   `<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="6"/><path d="M2 8h12M8 2a9 6 0 010 12M8 2a9 6 0 000 12"/></svg>`,
  lore:        `<svg viewBox="0 0 16 16"><path d="M3 2h7l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z"/><path d="M10 2v4h4M5 8h6M5 11h4"/></svg>`,
};

const NAV_ITEMS = [
  { id: 'dashboard',  label: 'Dashboard' },
  { id: 'canvas',     label: 'Relationship Map' },
  { id: 'characters', label: 'Characters' },
  { id: 'writing',    label: 'Writing Hub' },
  { id: 'world',      label: 'World & Maps' },
  { id: 'story',      label: 'Story Structure' },
  { id: 'universes',  label: 'Universes' },
  { id: 'lore',       label: 'Lore & World' },
];

let _activeView = 'dashboard';

export function initSidebar() {
  _renderNav();
  _renderCharList();
  EventBus.on('nodes:updated', _renderCharList);
  EventBus.on('view:changed', (v) => {
    _activeView = v;
    _renderNav();
    // Update hardcoded sidebar-bottom items
    document.querySelectorAll('#sidebar-bottom .nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.view === v);
    });
  });

  // Bridge hardcoded sidebar-bottom CustomEvents to EventBus
  document.addEventListener('nav', e => EventBus.emit('nav:changed', e.detail));
}

function _renderNav() {
  const nav = document.getElementById('sidebar-nav');
  if (!nav) return;
  nav.innerHTML = NAV_ITEMS.map(item => `
    <div class="nav-item${_activeView === item.id ? ' active' : ''}" data-view="${item.id}">
      <span class="nav-icon">${NAV_ICONS[item.id] || ''}</span>
      <span class="nav-label">${item.label}</span>
    </div>
  `).join('');

  nav.querySelectorAll('.nav-item').forEach(el => {
    el.onclick = () => EventBus.emit('nav:changed', el.dataset.view);
  });
}

function _renderCharList() {
  const content = document.getElementById('sidebar-content');
  if (!content) return;

  const chars = state.nodes.filter(n => n.type === 'character');
  if (!chars.length) {
    content.innerHTML = `<div style="padding:12px;font-size:11px;color:var(--av-text-muted);text-align:center">No characters yet</div>`;
    return;
  }

  content.innerHTML = `
    <div style="padding:6px 6px 0;font-size:10px;font-weight:700;color:var(--av-text-muted);text-transform:uppercase;letter-spacing:.5px">Characters (${chars.length})</div>
    ${chars.map(c => `
      <div class="sidebar-char-item" data-id="${c.id}" style="
        display:flex;align-items:center;gap:8px;padding:7px 10px;
        border-radius:var(--av-radius-md);cursor:pointer;margin:1px 4px;
        transition:background var(--av-anim-speed)">
        <div style="width:26px;height:26px;border-radius:50%;background:${c.color||'#7c5cbf'};
          display:flex;align-items:center;justify-content:center;
          font-size:11px;font-weight:800;color:#fff;flex-shrink:0">${c.letter||'?'}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:12px;font-weight:600;color:var(--av-text-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${c.name||''}</div>
        </div>
      </div>
    `).join('')}
  `;

  content.querySelectorAll('.sidebar-char-item').forEach(el => {
    el.addEventListener('mouseenter', () => el.style.background = 'var(--av-bg-hover)');
    el.addEventListener('mouseleave', () => el.style.background = '');
    el.addEventListener('click', () => EventBus.emit('node:open-profile', el.dataset.id));
  });
}
