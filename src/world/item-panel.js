// ============================================
// item-panel.js — Item node profile panel
// Imports: state.js, location-panel.js (gallery)
// Exports: renderItemPanel
// ============================================

import { state, esc, getOrCreateProfile, updateProfile, EventBus } from '../state.js';
import { _buildGallery } from './location-panel.js';
import { avatarHTML, wireAvatarUpload } from '../canvas/node-image.js';

const ITEM_TYPES  = ['Weapon','Armor','Tool','Artifact','Document','Relic','Consumable','Jewelry','Other'];
const RARITIES    = ['Common','Uncommon','Rare','Legendary','Unique'];
const CONDITIONS  = ['Pristine','Good','Damaged','Destroyed'];

const TABS = [
  { id: 'identity',   label: 'Identity'   },
  { id: 'appear',     label: 'Appearance' },
  { id: 'props',      label: 'Properties' },
  { id: 'history',    label: 'History'    },
  { id: 'status',     label: 'Status'     },
  { id: 'lore',       label: 'Lore'       },
  { id: 'gallery',    label: 'Gallery'    },
];

const SWATCH_COLORS = [
  '#c0392b','#e67e22','#f1c40f','#2ecc71','#1abc9c',
  '#3498db','#9b59b6','#e91e63','#7c5cbf','#888888',
  '#2c3e50','#ffffff',
];

let _tab = 'identity';

export function renderItemPanel(nodeId, tab = _tab) {
  _tab = tab;
  const node = state.nodes.find(n => n.id === nodeId);
  if (!node) return;
  document.getElementById('right-panel')?.classList.remove('collapsed');
  _tabBar(nodeId, tab);
  switch (tab) {
    case 'appear':   _renderAppear(nodeId);   break;
    case 'props':    _renderProps(nodeId);     break;
    case 'history':  _renderHistory(nodeId);  break;
    case 'status':   _renderStatus(nodeId);   break;
    case 'lore':     _renderLore(nodeId);     break;
    case 'gallery':  _renderGallery(nodeId);  break;
    default:         _renderIdentity(nodeId); break;
  }
}

function _tabBar(nodeId, active) {
  const el = document.getElementById('rp-tabs');
  if (!el) return;
  el.innerHTML = TABS.map(t =>
    `<div class="rp-tab${active === t.id ? ' active' : ''}" data-tab="${t.id}">${t.label}</div>`
  ).join('');
  el.querySelectorAll('.rp-tab').forEach(d => {
    d.onclick = () => renderItemPanel(nodeId, d.dataset.tab);
  });
}

// ── Identity tab ──────────────────────────────────────────────────────────────

function _renderIdentity(nodeId) {
  const body = document.getElementById('rp-body');
  const node = state.nodes.find(n => n.id === nodeId);
  const p    = getOrCreateProfile(nodeId);

  body.innerHTML = `
    ${_hero(node, p.itemType || 'Item')}

    <div class="panel-section-head">Identity</div>
    <div class="profile-row"><label>Name</label><input id="ip-name" type="text" value="${esc(node.name||'')}"></div>
    <div class="profile-row"><label>Also known as</label><input id="ip-aka" type="text" value="${esc(p.aka||'')}" placeholder="Aliases, epithets"></div>
    <div class="profile-row"><label>Type</label>
      <select id="ip-type">
        ${ITEM_TYPES.map(t => `<option value="${t}"${p.itemType===t?' selected':''}>${t}</option>`).join('')}
      </select>
    </div>
    <div class="profile-row"><label>Color</label>
      <input id="ip-color" type="color" value="${node.color||'#e74c3c'}" style="width:40px;height:28px;padding:2px">
    </div>

    <div class="panel-section-head">Rarity</div>
    <div class="radio-row">
      ${RARITIES.map(r => `<label class="radio-opt">
        <input type="radio" name="ip-rarity" value="${r}"${(p.rarity||'Common')===r?' checked':''}>
        <span>${r}</span>
      </label>`).join('')}
    </div>

    <hr class="av-divider" style="margin-top:14px">
    <button class="btn-danger" id="ip-delete" style="width:100%;margin-top:4px">🗑 Delete Item</button>
  `;

  _wire(nodeId, {
    'ip-name':  ['name',     true],
    'ip-color': ['color',    true],
    'ip-aka':   ['aka',      false],
    'ip-type':  ['itemType', false],
  });

  document.querySelectorAll('input[name="ip-rarity"]').forEach(r => {
    r.onchange = () => updateProfile(nodeId, { rarity: r.value });
  });

  document.getElementById('ip-delete')?.addEventListener('click', () => {
    if (confirm(`Delete "${node.name}"? This cannot be undone.`)) {
      import('../state.js').then(m => m.deleteNode(nodeId));
      document.getElementById('rp-body').innerHTML =
        '<div style="padding:20px;text-align:center;color:var(--av-text-muted);font-size:11px">Item deleted.</div>';
      document.getElementById('rp-tabs').innerHTML = '';
    }
  });

  wireAvatarUpload(nodeId, () => renderItemPanel(nodeId, 'identity'));
}

// ── Appearance tab ────────────────────────────────────────────────────────────

function _renderAppear(nodeId) {
  const body = document.getElementById('rp-body');
  const p    = getOrCreateProfile(nodeId);
  const pal  = p.palette || {};

  body.innerHTML = `
    <div class="panel-section-head">Appearance</div>
    <label class="field-label">Description</label>
    <textarea id="ip-desc" class="field-textarea">${esc(p.description||'')}</textarea>
    <div class="profile-row" style="margin-top:8px"><label>Material</label><input id="ip-material" type="text" value="${esc(p.material||'')}"></div>
    <div class="profile-row"><label>Size</label><input id="ip-size" type="text" value="${esc(p.itemSize||'')}" placeholder="Tiny, hand-sized, massive…"></div>
    <div class="profile-row"><label>Markings</label><input id="ip-markings" type="text" value="${esc(p.markings||'')}" placeholder="Runes, engravings, symbols…"></div>

    <div class="panel-section-head" style="margin-top:10px">Color Palette</div>
    <div class="swatch-row" style="flex-direction:column;gap:6px">
      ${['Primary','Secondary','Accent'].map((lbl, li) => {
        const key = ['pal0','pal1','pal2'][li];
        return `<div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:11px;color:var(--av-text-secondary);min-width:68px">${lbl}</span>
          <div class="swatch-list" id="ip-swatches-${li}">
            ${SWATCH_COLORS.map(c => `<div class="color-swatch${pal[key]===c?' sel':''}" data-c="${c}" data-k="${key}" style="background:${c};${c==='#ffffff'?'border-color:var(--av-border-strong)':''}"></div>`).join('')}
          </div>
          <input type="color" class="col-wheel" id="ip-pal-${li}" value="${pal[key]||'#888888'}">
        </div>`;
      }).join('')}
    </div>
  `;

  _wire(nodeId, {
    'ip-desc':     ['description', false],
    'ip-material': ['material',    false],
    'ip-size':     ['itemSize',    false],
    'ip-markings': ['markings',    false],
  });

  // Swatch pickers
  body.querySelectorAll('.color-swatch[data-k]').forEach(sw => {
    sw.addEventListener('click', () => {
      const k = sw.dataset.k;
      body.querySelectorAll(`.color-swatch[data-k="${k}"]`).forEach(s => s.classList.remove('sel'));
      sw.classList.add('sel');
      const upd = { palette: { ...(getOrCreateProfile(nodeId).palette||{}), [k]: sw.dataset.c } };
      updateProfile(nodeId, upd);
    });
  });

  [0,1,2].forEach(li => {
    const key = ['pal0','pal1','pal2'][li];
    document.getElementById(`ip-pal-${li}`)?.addEventListener('input', e => {
      body.querySelectorAll(`.color-swatch[data-k="${key}"]`).forEach(s => s.classList.remove('sel'));
      updateProfile(nodeId, { palette: { ...(getOrCreateProfile(nodeId).palette||{}), [key]: e.target.value } });
    });
  });
}

// ── Properties tab ────────────────────────────────────────────────────────────

function _renderProps(nodeId) {
  const body = document.getElementById('rp-body');
  const p    = getOrCreateProfile(nodeId);

  body.innerHTML = `
    <div class="panel-section-head">Powers &amp; Limitations</div>
    <label class="field-label">Powers</label>
    <textarea id="ip-powers" class="field-textarea">${esc(p.powers||'')}</textarea>
    <label class="field-label" style="margin-top:8px">Limitations</label>
    <textarea id="ip-limits" class="field-textarea">${esc(p.limitations||'')}</textarea>

    <div class="panel-section-head" style="margin-top:10px">Traits</div>
    <label class="toggle-row">
      <span class="toggle-label">Sentient</span>
      <span class="toggle-sub">Does it have a will of its own?</span>
      <input type="checkbox" id="ip-sentient" class="toggle-cb" ${p.sentient?'checked':''}>
      <span class="toggle-track"><span class="toggle-thumb"></span></span>
    </label>
    <label class="toggle-row" style="margin-top:8px">
      <span class="toggle-label">Cursed</span>
      <span class="toggle-sub">Carries a curse or dark magic</span>
      <input type="checkbox" id="ip-cursed" class="toggle-cb" ${p.cursed?'checked':''}>
      <span class="toggle-track"><span class="toggle-thumb"></span></span>
    </label>
  `;

  _wire(nodeId, {
    'ip-powers': ['powers',     false],
    'ip-limits': ['limitations',false],
  });

  document.getElementById('ip-sentient')?.addEventListener('change', e => {
    updateProfile(nodeId, { sentient: e.target.checked });
  });
  document.getElementById('ip-cursed')?.addEventListener('change', e => {
    updateProfile(nodeId, { cursed: e.target.checked });
  });
}

// ── History tab ───────────────────────────────────────────────────────────────

function _renderHistory(nodeId) {
  const body = document.getElementById('rp-body');
  const p    = getOrCreateProfile(nodeId);

  const charNodes    = state.nodes.filter(n => n.type === 'character');
  const factionNodes = state.nodes.filter(n => n.type === 'faction');
  const creatorNodes = [...charNodes, ...factionNodes];

  body.innerHTML = `
    <div class="panel-section-head">Origin</div>
    <textarea id="ip-origin" class="field-textarea">${esc(p.origin||'')}</textarea>

    <div class="panel-section-head" style="margin-top:10px">Background</div>
    <div class="profile-row"><label>Creator</label>
      <select id="ip-creator">
        <option value="">— None —</option>
        ${creatorNodes.map(n=>`<option value="${n.id}"${p.creator===n.id?' selected':''}>[${n.type[0].toUpperCase()}] ${esc(n.name)}</option>`).join('')}
      </select>
    </div>
    <div class="profile-row"><label>Age</label><input id="ip-age" type="text" value="${esc(p.age||'')}" placeholder="Ancient, 300 years, unknown…"></div>

    <div class="panel-section-head" style="margin-top:10px">Previous Owners</div>
    <div class="link-list" id="ip-prev-list">
      ${charNodes.map(n=>`<label class="link-check">
        <input type="checkbox" value="${n.id}" ${(p.prevOwners||[]).includes(n.id)?'checked':''}>
        <div class="link-dot" style="background:${n.color||'#888'}"></div>
        <span>${esc(n.name)}</span>
      </label>`).join('') || '<div class="link-empty">No characters in project</div>'}
    </div>

    <div class="panel-section-head" style="margin-top:10px">Notable Events</div>
    <textarea id="ip-events" class="field-textarea">${esc(p.notableEvents||'')}</textarea>
  `;

  _wire(nodeId, {
    'ip-origin':  ['origin',       false],
    'ip-creator': ['creator',      false],
    'ip-age':     ['age',          false],
    'ip-events':  ['notableEvents',false],
  });

  body.querySelectorAll('#ip-prev-list input[type=checkbox]').forEach(cb => {
    cb.addEventListener('change', () => {
      const checked = [...body.querySelectorAll('#ip-prev-list input[type=checkbox]:checked')].map(c => c.value);
      updateProfile(nodeId, { prevOwners: checked });
    });
  });
}

// ── Status tab ────────────────────────────────────────────────────────────────

function _renderStatus(nodeId) {
  const body = document.getElementById('rp-body');
  const p    = getOrCreateProfile(nodeId);

  const charNodes = state.nodes.filter(n => n.type === 'character');
  const locNodes  = state.nodes.filter(n => n.type === 'location');

  body.innerHTML = `
    <div class="panel-section-head">Current Status</div>
    <div class="profile-row"><label>Owner</label>
      <select id="ip-owner">
        <option value="">— None —</option>
        ${charNodes.map(n=>`<option value="${n.id}"${p.owner===n.id?' selected':''}>${esc(n.name)}</option>`).join('')}
      </select>
    </div>
    <div class="profile-row"><label>Location</label>
      <select id="ip-location">
        <option value="">— Unknown —</option>
        ${locNodes.map(n=>`<option value="${n.id}"${p.location===n.id?' selected':''}>${esc(n.name)}</option>`).join('')}
      </select>
    </div>

    <div class="panel-section-head" style="margin-top:10px">Condition</div>
    <div class="radio-row">
      ${CONDITIONS.map(c=>`<label class="radio-opt">
        <input type="radio" name="ip-cond" value="${c}"${(p.condition||'Good')===c?' checked':''}>
        <span>${c}</span>
      </label>`).join('')}
    </div>

    <div class="panel-section-head" style="margin-top:10px">Known To</div>
    <div class="link-list" id="ip-known-list">
      ${charNodes.map(n=>`<label class="link-check">
        <input type="checkbox" value="${n.id}" ${(p.knownTo||[]).includes(n.id)?'checked':''}>
        <div class="link-dot" style="background:${n.color||'#888'}"></div>
        <span>${esc(n.name)}</span>
      </label>`).join('') || '<div class="link-empty">No characters in project</div>'}
    </div>
  `;

  _wire(nodeId, {
    'ip-owner':    ['owner',    false],
    'ip-location': ['location', false],
  });

  document.querySelectorAll('input[name="ip-cond"]').forEach(r => {
    r.onchange = () => updateProfile(nodeId, { condition: r.value });
  });

  body.querySelectorAll('#ip-known-list input[type=checkbox]').forEach(cb => {
    cb.addEventListener('change', () => {
      const checked = [...body.querySelectorAll('#ip-known-list input[type=checkbox]:checked')].map(c => c.value);
      updateProfile(nodeId, { knownTo: checked });
    });
  });
}

// ── Lore tab ──────────────────────────────────────────────────────────────────

function _renderLore(nodeId) {
  const body = document.getElementById('rp-body');
  const p    = getOrCreateProfile(nodeId);

  body.innerHTML = `
    <div class="panel-section-head">In-World Myths</div>
    <textarea id="ip-myths" class="field-textarea" style="min-height:96px">${esc(p.myths||'')}</textarea>

    <div class="panel-section-head" style="margin-top:10px">True Nature</div>
    <div style="font-size:10px;color:var(--av-text-muted);margin-bottom:6px">Author-only truth — hidden from the world</div>
    <textarea id="ip-truth" class="field-textarea" style="min-height:96px">${esc(p.trueNature||'')}</textarea>
  `;

  _wire(nodeId, {
    'ip-myths': ['myths',     false],
    'ip-truth': ['trueNature',false],
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
