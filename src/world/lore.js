// ============================================
// lore.js — World Codex: unified entity browser + lore entries
// Entities (location/faction/item) mirror canvas state.nodes.
// Lore entries are standalone text in state.world.lore.
// Imports: state.js
// Exports: renderLoreView
// ============================================

import { state, EventBus, esc, uid, saveHistory, addNode as stateAddNode } from '../state.js';

const _NODE_DEFAULTS = {
  location: { color: '#2ecc71', size: 50, label: 'Location' },
  faction:  { color: '#e67e22', size: 52, label: 'Faction'  },
  item:     { color: '#e74c3c', size: 48, label: 'Item'     },
};

const LORE_CATEGORIES = ['History','Magic','Religion','Culture','Geography','Language','Other'];

export function renderLoreView(container) {
  if (!container) return;
  const tab = container.dataset.tab || 'locations';

  container.innerHTML = `
    <div style="display:flex;flex-direction:column;height:100%;overflow:hidden">
      <div class="codex-tabbar">
        ${[['locations','Locations'],['factions','Factions'],['items','Items'],['lore','Lore']].map(([id,lbl]) =>
          `<div class="codex-tab${tab===id?' active':''}" data-tab="${id}">${lbl}</div>`
        ).join('')}
      </div>
      <div id="codex-body" style="flex:1;overflow-y:auto;padding:16px"></div>
    </div>
  `;

  container.querySelectorAll('.codex-tab').forEach(el => {
    el.addEventListener('click', () => { container.dataset.tab = el.dataset.tab; renderLoreView(container); });
  });

  const body = document.getElementById('codex-body');
  switch (tab) {
    case 'locations': _renderEntities(body, 'location', 'Locations', '📍'); break;
    case 'factions':  _renderEntities(body, 'faction',  'Factions',  '⚔️'); break;
    case 'items':     _renderEntities(body, 'item',     'Items',     '💎'); break;
    case 'lore':      _renderLore(body); break;
  }
}

// ── Entity list (location / faction / item) ───────────────────────────────────

function _renderEntities(body, type, title, icon) {
  const nodes = state.nodes.filter(n => n.type === type);

  body.innerHTML = `
    <div class="codex-list-head">
      <span class="codex-list-title">${icon} ${title} <span class="codex-count">(${nodes.length})</span></span>
      <button class="btn-primary" id="codex-add">✦ Add ${_NODE_DEFAULTS[type].label}</button>
    </div>
    ${nodes.length
      ? `<div class="codex-entity-list">${nodes.map(n => _entityCard(n)).join('')}</div>`
      : `<div class="codex-empty">
          <div style="font-size:36px;margin-bottom:10px">${icon}</div>
          <div>No ${title.toLowerCase()} yet.</div>
          <div style="font-size:11px;margin-top:4px;color:var(--av-text-muted)">Add one here, or place a ${_NODE_DEFAULTS[type].label.toLowerCase()} node on the canvas.</div>
        </div>`}
  `;

  document.getElementById('codex-add')?.addEventListener('click', () => {
    const cfg = _NODE_DEFAULTS[type];
    const name = `New ${cfg.label}`;
    const node = {
      id:           uid(),
      type,
      name,
      letter:       name.charAt(0),
      color:        cfg.color,
      x:            300 + Math.random() * 400,
      y:            200 + Math.random() * 300,
      size:         cfg.size,
      showOnCanvas: false,
    };
    stateAddNode(node);
    renderLoreView(document.getElementById('view-lore'));
  });

  body.querySelectorAll('.codex-jump').forEach(btn => {
    btn.addEventListener('click', () => {
      EventBus.emit('nav:changed', 'canvas');
      setTimeout(() => EventBus.emit('canvas:focus-node', btn.dataset.id), 160);
    });
  });

  body.querySelectorAll('.codex-open').forEach(btn => {
    btn.addEventListener('click', () => EventBus.emit('node:open-profile', btn.dataset.id));
  });

  body.querySelectorAll('.codex-canvas-toggle').forEach(cb => {
    cb.addEventListener('change', () => {
      const n = state.nodes.find(n => n.id === cb.dataset.id);
      if (!n) return;
      n.showOnCanvas = cb.checked;
      saveHistory();
      EventBus.emit('nodes:updated');
      // Refresh the card row so the jump button appears/disappears
      renderLoreView(document.getElementById('view-lore'));
    });
  });
}

function _entityCard(n) {
  const onCanvas = n.showOnCanvas !== false;
  return `
    <div class="codex-card">
      <div class="codex-avatar" style="background:${n.color||'#888'}">${esc(n.letter||'?')}</div>
      <div class="codex-card-info">
        <div class="codex-card-name">${esc(n.name||'Unnamed')}</div>
        <div class="codex-card-sub">${esc(n.type)}</div>
      </div>
      <div class="codex-card-actions">
        <label class="codex-canvas-label" title="Show on canvas">
          <input type="checkbox" class="codex-canvas-toggle" data-id="${n.id}" ${onCanvas?'checked':''}>
          <span>Canvas</span>
        </label>
        ${onCanvas
          ? `<button class="btn-sm codex-jump" data-id="${n.id}" title="Jump to on canvas">⊙ Jump</button>`
          : ''}
        <button class="btn-sm codex-open" data-id="${n.id}" title="Open profile">Open →</button>
      </div>
    </div>
  `;
}

// ── Lore entries (standalone, not canvas nodes) ───────────────────────────────

function _renderLore(body) {
  const lore = state.world.lore || [];

  body.innerHTML = `
    <div class="codex-list-head">
      <span class="codex-list-title">📖 Lore <span class="codex-count">(${lore.length})</span></span>
      <button class="btn-primary" id="lore-add">✦ Add Entry</button>
    </div>
    <div id="lore-entry-list">
      ${lore.map((e, i) => `
        <div class="lore-entry-card">
          <div class="lore-entry-head">
            <input class="le-title" data-i="${i}" value="${esc(e.title||'')}" placeholder="Entry title…"
              style="flex:1;padding:4px 8px;font-size:13px;font-weight:600;border-radius:var(--av-radius-sm)">
            <select class="le-cat" data-i="${i}" style="font-size:11px;padding:3px 6px;border-radius:var(--av-radius-sm)">
              ${LORE_CATEGORIES.map(c=>`<option value="${c}"${e.category===c?' selected':''}>${c}</option>`).join('')}
            </select>
            <button class="btn-sm le-del" data-i="${i}">✕</button>
          </div>
          <textarea class="le-body" data-i="${i}" placeholder="The lore content…"
            style="width:100%;min-height:80px;border:1px solid var(--av-border);border-radius:var(--av-radius-sm);padding:6px;font-size:12px;line-height:1.6;resize:vertical;background:var(--av-input-bg);color:var(--av-text-primary)">${esc(e.body||'')}</textarea>
          <input class="le-tags" data-i="${i}" value="${esc((e.tags||[]).join(', '))}" placeholder="Tags, comma-separated…"
            style="width:100%;margin-top:5px;padding:3px 7px;font-size:11px;border-radius:var(--av-radius-sm)">
        </div>
      `).join('')}
    </div>
  `;

  document.getElementById('lore-add')?.addEventListener('click', () => {
    state.world.lore = state.world.lore || [];
    state.world.lore.push({ id: uid(), title: 'New Entry', category: 'History', body: '', tags: [] });
    _renderLore(body);
    saveHistory();
  });

  let _debounce = null;
  const _save = () => { clearTimeout(_debounce); _debounce = setTimeout(saveHistory, 1200); };

  body.querySelectorAll('.le-del').forEach(btn => {
    btn.onclick = () => { state.world.lore.splice(+btn.dataset.i, 1); _renderLore(body); saveHistory(); };
  });
  body.querySelectorAll('.le-title,.le-body,.le-tags').forEach(el => {
    const isInput = el.tagName === 'INPUT';
    el.addEventListener(isInput ? 'change' : 'input', () => {
      const i = +el.dataset.i;
      if (el.classList.contains('le-title')) state.world.lore[i].title = el.value;
      else if (el.classList.contains('le-body'))  state.world.lore[i].body  = el.value;
      else if (el.classList.contains('le-tags'))  state.world.lore[i].tags  = el.value.split(',').map(t=>t.trim()).filter(Boolean);
      _save();
    });
  });
  body.querySelectorAll('.le-cat').forEach(el => {
    el.addEventListener('change', () => {
      state.world.lore[+el.dataset.i].category = el.value; _save();
    });
  });
}
