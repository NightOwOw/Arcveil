// ============================================
// faction-panel.js — Faction node profile panel
// Imports: state.js, location-panel.js (gallery)
// Exports: renderFactionPanel
// ============================================

import { state, esc, getOrCreateProfile, updateProfile, EventBus } from '../state.js';
import { _buildGallery } from './location-panel.js';
import { avatarHTML, wireAvatarUpload } from '../canvas/node-image.js';

const FAC_TYPES = ['Guild','Kingdom','Order','Gang','Religion','Company','Secret society','Military','Other'];
const SIZES     = ['Tiny','Small','Medium','Large','Massive'];
const STATUSES  = ['Active','Dissolved','Secret','Rising'];

const TABS = [
  { id: 'info',    label: 'Info'    },
  { id: 'people',  label: 'People'  },
  { id: 'creed',   label: 'Creed'   },
  { id: 'lore',    label: 'Lore'    },
  { id: 'gallery', label: 'Gallery' },
];

let _tab = 'info';

export function renderFactionPanel(nodeId, tab = _tab) {
  _tab = tab;
  const node = state.nodes.find(n => n.id === nodeId);
  if (!node) return;
  document.getElementById('right-panel')?.classList.remove('collapsed');
  _tabBar(nodeId, tab);
  switch (tab) {
    case 'people':  _renderPeople(nodeId);  break;
    case 'creed':   _renderCreed(nodeId);   break;
    case 'lore':    _renderLore(nodeId);    break;
    case 'gallery': _renderGallery(nodeId); break;
    default:        _renderInfo(nodeId);    break;
  }
}

function _tabBar(nodeId, active) {
  const el = document.getElementById('rp-tabs');
  if (!el) return;
  el.innerHTML = TABS.map(t =>
    `<div class="rp-tab${active === t.id ? ' active' : ''}" data-tab="${t.id}">${t.label}</div>`
  ).join('');
  el.querySelectorAll('.rp-tab').forEach(d => {
    d.onclick = () => renderFactionPanel(nodeId, d.dataset.tab);
  });
}

// ── Info tab ──────────────────────────────────────────────────────────────────

function _renderInfo(nodeId) {
  const body = document.getElementById('rp-body');
  const node = state.nodes.find(n => n.id === nodeId);
  const p    = getOrCreateProfile(nodeId);

  const locationNodes = state.nodes.filter(n => n.type === 'location');

  body.innerHTML = `
    ${_hero(node, p.facType || 'Faction')}

    <div class="panel-section-head">Identity</div>
    <div class="profile-row"><label>Name</label><input id="fp-name" type="text" value="${esc(node.name||'')}"></div>
    <div class="profile-row"><label>Short name</label><input id="fp-short" type="text" value="${esc(p.shortName||'')}" placeholder="Abbreviation, common name"></div>
    <div class="profile-row"><label>Type</label>
      <select id="fp-type">${FAC_TYPES.map(t=>`<option value="${t}"${p.facType===t?' selected':''}>${t}</option>`).join('')}</select>
    </div>
    <div class="profile-row"><label>Motto</label><input id="fp-motto" type="text" value="${esc(p.motto||'')}"></div>
    <div class="profile-row"><label>Symbol</label><input id="fp-symbol" type="text" value="${esc(p.symbol||'')}" placeholder="Describe their sigil/flag"></div>
    <div class="profile-row"><label>Color</label><input id="fp-color" type="color" value="${node.color||'#e67e22'}" style="width:40px;height:28px;padding:2px"></div>

    <div class="panel-section-head">Structure</div>
    <div class="profile-row"><label>Founded</label><input id="fp-founded" type="text" value="${esc(p.founded||'')}" placeholder="Year, era…"></div>
    <div class="profile-row"><label>Status</label>
      <div class="radio-row">
        ${STATUSES.map(s=>`<label class="radio-opt"><input type="radio" name="fp-status" value="${s}"${(p.status||'Active')===s?' checked':''}><span>${s}</span></label>`).join('')}
      </div>
    </div>
    <div class="profile-row"><label>Size</label>
      <div class="radio-row">
        ${SIZES.map(s=>`<label class="radio-opt"><input type="radio" name="fp-size" value="${s}"${(p.facSize||'Medium')===s?' checked':''}><span>${s}</span></label>`).join('')}
      </div>
    </div>
    <div class="profile-row"><label>Territory</label>
      <select id="fp-territory">
        <option value="">— None —</option>
        ${locationNodes.map(n=>`<option value="${n.id}"${p.territory===n.id?' selected':''}>${esc(n.name)}</option>`).join('')}
      </select>
    </div>
    <div class="profile-row"><label>Headquarters</label>
      <select id="fp-hq">
        <option value="">— None —</option>
        ${locationNodes.map(n=>`<option value="${n.id}"${p.hq===n.id?' selected':''}>${esc(n.name)}</option>`).join('')}
      </select>
    </div>

    <hr class="av-divider" style="margin-top:14px">
    <button class="btn-danger" id="fp-delete" style="width:100%;margin-top:4px">🗑 Delete Faction</button>
  `;

  _wire(nodeId, {
    'fp-name':      ['name',      true],
    'fp-color':     ['color',     true],
    'fp-short':     ['shortName', false],
    'fp-type':      ['facType',   false],
    'fp-motto':     ['motto',     false],
    'fp-symbol':    ['symbol',    false],
    'fp-founded':   ['founded',   false],
    'fp-territory': ['territory', false],
    'fp-hq':        ['hq',        false],
  });

  document.querySelectorAll('input[name="fp-status"]').forEach(r => {
    r.onchange = () => updateProfile(nodeId, { status: r.value });
  });
  document.querySelectorAll('input[name="fp-size"]').forEach(r => {
    r.onchange = () => updateProfile(nodeId, { facSize: r.value });
  });

  document.getElementById('fp-delete')?.addEventListener('click', () => {
    if (confirm(`Delete "${node.name}"? This cannot be undone.`)) {
      import('../state.js').then(m => m.deleteNode(nodeId));
      document.getElementById('rp-body').innerHTML =
        '<div style="padding:20px;text-align:center;color:var(--av-text-muted);font-size:11px">Faction deleted.</div>';
      document.getElementById('rp-tabs').innerHTML = '';
    }
  });

  wireAvatarUpload(nodeId, () => renderFactionPanel(nodeId, 'info'));
}

// ── People tab ────────────────────────────────────────────────────────────────

function _renderPeople(nodeId) {
  const body = document.getElementById('rp-body');
  const p    = getOrCreateProfile(nodeId);

  const charNodes = state.nodes.filter(n => n.type === 'character');

  // Members: characters with "member of" edge to this faction
  const memberEdges = state.edges.filter(e =>
    (e.to === nodeId || e.from === nodeId) &&
    /member|belongs to|part of/i.test(e.label || '')
  );
  const memberNodes = state.nodes.filter(n =>
    memberEdges.some(e => (e.from === n.id || e.to === n.id) && n.id !== nodeId)
  );

  body.innerHTML = `
    <div class="panel-section-head">Leadership</div>
    <div class="profile-row"><label>Leader</label>
      <select id="fp-leader">
        <option value="">— None —</option>
        ${charNodes.map(n=>`<option value="${n.id}"${p.leader===n.id?' selected':''}>${esc(n.name)}</option>`).join('')}
      </select>
    </div>
    <div class="profile-row"><label>Deputy</label>
      <select id="fp-deputy">
        <option value="">— None —</option>
        ${charNodes.map(n=>`<option value="${n.id}"${p.deputy===n.id?' selected':''}>${esc(n.name)}</option>`).join('')}
      </select>
    </div>
    <label class="field-label">Hierarchy</label>
    <textarea id="fp-hierarchy" class="field-textarea">${esc(p.hierarchy||'')}</textarea>

    <div class="panel-section-head" style="margin-top:10px">Members</div>
    <div class="link-list">
      ${memberNodes.length
        ? memberNodes.map(n=>`<div class="link-item" data-id="${n.id}">
            <div class="link-dot" style="background:${n.color||'#888'}"></div>
            <span>${esc(n.name)}</span>
          </div>`).join('')
        : '<div class="link-empty">No characters linked via "member of" edges</div>'}
    </div>

    <div class="profile-row" style="margin-top:8px"><label>Join method</label><input id="fp-join" type="text" value="${esc(p.joinMethod||'')}" placeholder="How to join…"></div>

    <div class="panel-section-head" style="margin-top:10px">Ranks</div>
    <input id="fp-ranks" type="text" value="${esc((p.ranks||[]).join(', '))}" placeholder="Initiate, Member, Elder…"
      style="width:100%;padding:6px 8px;font-size:12px;border-radius:var(--av-radius-sm);background:var(--av-input-bg);border:1px solid var(--av-border);color:var(--av-text-primary)">
  `;

  _wire(nodeId, {
    'fp-leader':    ['leader',    false],
    'fp-deputy':    ['deputy',    false],
    'fp-hierarchy': ['hierarchy', false],
    'fp-join':      ['joinMethod',false],
  });

  document.getElementById('fp-ranks')?.addEventListener('change', e => {
    updateProfile(nodeId, { ranks: e.target.value.split(',').map(t => t.trim()).filter(Boolean) });
  });

  body.querySelectorAll('.link-item[data-id]').forEach(el => {
    el.style.cursor = 'pointer';
    el.onclick = () => EventBus.emit('node:open-profile', el.dataset.id);
  });
}

// ── Creed tab ─────────────────────────────────────────────────────────────────

function _renderCreed(nodeId) {
  const body = document.getElementById('rp-body');
  const p    = getOrCreateProfile(nodeId);

  // Auto-list enemies/allies from edges
  const enemyEdges = state.edges.filter(e =>
    (e.to === nodeId || e.from === nodeId) &&
    /rival|at war|enemies|enemy/i.test(e.label || '')
  );
  const allyEdges = state.edges.filter(e =>
    (e.to === nodeId || e.from === nodeId) &&
    /allied|alliance|ally/i.test(e.label || '')
  );
  const _autoList = (edges) => {
    const ids = edges.map(e => e.from === nodeId ? e.to : e.from);
    return state.nodes.filter(n => ids.includes(n.id) && n.id !== nodeId);
  };
  const enemies = _autoList(enemyEdges);
  const allies  = _autoList(allyEdges);

  body.innerHTML = `
    <div class="panel-section-head">Ideology</div>
    <label class="field-label">Goals</label>
    <textarea id="fp-goals" class="field-textarea">${esc(p.goals||'')}</textarea>
    <label class="field-label" style="margin-top:8px">Methods</label>
    <textarea id="fp-methods" class="field-textarea">${esc(p.methods||'')}</textarea>
    <label class="field-label" style="margin-top:8px">Values</label>
    <textarea id="fp-values" class="field-textarea">${esc(p.values||'')}</textarea>

    <div class="panel-section-head" style="margin-top:10px">Enemies</div>
    <div class="link-list">
      ${enemies.length
        ? enemies.map(n=>`<div class="link-item" data-id="${n.id}">
            <div class="link-dot" style="background:${n.color||'#e74c3c'}"></div>
            <span>${esc(n.name)}</span>
          </div>`).join('')
        : '<div class="link-empty">No rivals/enemies linked via edges</div>'}
    </div>

    <div class="panel-section-head" style="margin-top:10px">Allies</div>
    <div class="link-list">
      ${allies.length
        ? allies.map(n=>`<div class="link-item" data-id="${n.id}">
            <div class="link-dot" style="background:${n.color||'#2ecc71'}"></div>
            <span>${esc(n.name)}</span>
          </div>`).join('')
        : '<div class="link-empty">No allies linked via edges</div>'}
    </div>
  `;

  _wire(nodeId, {
    'fp-goals':   ['goals',   false],
    'fp-methods': ['methods', false],
    'fp-values':  ['values',  false],
  });

  body.querySelectorAll('.link-item[data-id]').forEach(el => {
    el.style.cursor = 'pointer';
    el.onclick = () => EventBus.emit('node:open-profile', el.dataset.id);
  });
}

// ── Lore tab ──────────────────────────────────────────────────────────────────

function _renderLore(nodeId) {
  const body = document.getElementById('rp-body');
  const p    = getOrCreateProfile(nodeId);

  body.innerHTML = `
    <div class="panel-section-head">History</div>
    <textarea id="fp-history" class="field-textarea">${esc(p.history||'')}</textarea>

    <div class="panel-section-head" style="margin-top:10px">Public Image</div>
    <textarea id="fp-public" class="field-textarea">${esc(p.publicImage||'')}</textarea>

    <div class="panel-section-head" style="margin-top:10px">Dark Secret</div>
    <textarea id="fp-secret" class="field-textarea">${esc(p.darkSecret||'')}</textarea>

    <div class="panel-section-head" style="margin-top:10px">Tags</div>
    <input id="fp-tags" type="text" value="${esc((p.tags||[]).join(', '))}" placeholder="militant, ancient, corrupt…"
      style="width:100%;padding:6px 8px;font-size:12px;border-radius:var(--av-radius-sm);background:var(--av-input-bg);border:1px solid var(--av-border);color:var(--av-text-primary)">
  `;

  _wire(nodeId, {
    'fp-history': ['history',    false],
    'fp-public':  ['publicImage',false],
    'fp-secret':  ['darkSecret', false],
  });

  document.getElementById('fp-tags')?.addEventListener('change', e => {
    updateProfile(nodeId, { tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) });
  });
}

// ── Gallery tab ───────────────────────────────────────────────────────────────

function _renderGallery(nodeId) {
  _buildGallery(document.getElementById('rp-body'), nodeId, () => _renderGallery(nodeId));
}

// ── Shared helpers ────────────────────────────────────────────────────────────

function _hero(node, subtitle) {
  return `<div class="profile-hero">
    ${avatarHTML(node)}
    <div>
      <div class="profile-name">${esc(node.name||'Unnamed')}</div>
      <div class="profile-subtitle">${esc(subtitle)}</div>
    </div>
  </div>`;
}

function _wire(nodeId, map) {
  for (const [elId, [field, isNode]] of Object.entries(map)) {
    const el = document.getElementById(elId);
    if (!el) continue;
    const evt = el.tagName === 'SELECT' ? 'change' : 'input';
    el.addEventListener(evt, e => {
      if (isNode) {
        const n = state.nodes.find(n => n.id === nodeId);
        if (!n) return;
        n[field] = e.target.value;
        if (field === 'color') EventBus.emit('nodes:updated');
        if (field === 'name') { n.letter = e.target.value.charAt(0).toUpperCase() || '?'; EventBus.emit('nodes:updated'); }
      } else {
        const upd = {}; upd[field] = e.target.value;
        updateProfile(nodeId, upd);
      }
    });
  }
}
