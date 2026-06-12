// ============================================
// location-panel.js — Location node profile panel
// Imports: state.js
// Exports: renderLocationPanel
// ============================================

import { state, esc, getOrCreateProfile, updateProfile, EventBus } from '../state.js';
import { avatarHTML, wireAvatarUpload } from '../canvas/node-image.js';

const LOC_TYPES = ['City','Village','Region','Dungeon','Ruin','Landmark','Building','Natural','Other'];
const CLIMATES  = ['Temperate','Tropical','Arctic','Arid','Mediterranean','Subarctic','Continental','Oceanic','Other'];
const SIZES     = ['Tiny','Small','Medium','Large','Massive'];
const POPS      = ['Uninhabited','Sparse','Small','Moderate','Dense','Massive'];

const TABS = [
  { id: 'info',    label: 'Info'    },
  { id: 'feel',    label: 'Feel'    },
  { id: 'links',   label: 'Links'   },
  { id: 'gallery', label: 'Gallery' },
];

let _tab = 'info';

export function renderLocationPanel(nodeId, tab = _tab) {
  _tab = tab;
  const node = state.nodes.find(n => n.id === nodeId);
  if (!node) return;
  document.getElementById('right-panel')?.classList.remove('collapsed');
  _tabBar(nodeId, tab);
  switch (tab) {
    case 'feel':    _renderFeel(nodeId);    break;
    case 'links':   _renderLinks(nodeId);   break;
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
    d.onclick = () => renderLocationPanel(nodeId, d.dataset.tab);
  });
}

// ── Info tab ──────────────────────────────────────────────────────────────────

function _renderInfo(nodeId) {
  const body = document.getElementById('rp-body');
  const node = state.nodes.find(n => n.id === nodeId);
  const p    = getOrCreateProfile(nodeId);

  const factionNodes = state.nodes.filter(n => n.type === 'faction');

  body.innerHTML = `
    ${_hero(node, p.locType || 'Location')}

    <div class="panel-section-head">Identity</div>
    <div class="profile-row"><label>Name</label><input id="lp-name" type="text" value="${esc(node.name||'')}"></div>
    <div class="profile-row"><label>Also known as</label><input id="lp-aka" type="text" value="${esc(p.aka||'')}" placeholder="Aliases, old names"></div>
    <div class="profile-row"><label>Type</label>
      <select id="lp-type">${LOC_TYPES.map(t=>`<option value="${t}"${p.locType===t?' selected':''}>${t}</option>`).join('')}</select>
    </div>
    <div class="profile-row"><label>Color</label><input id="lp-color" type="color" value="${node.color||'#2ecc71'}" style="width:40px;height:28px;padding:2px"></div>

    <div class="panel-section-head">Geography</div>
    <div class="profile-row"><label>Region</label><input id="lp-region" type="text" value="${esc(p.region||'')}" placeholder="Parent location"></div>
    <div class="profile-row"><label>Climate</label>
      <select id="lp-climate"><option value="">—</option>${CLIMATES.map(c=>`<option value="${c}"${p.climate===c?' selected':''}>${c}</option>`).join('')}</select>
    </div>
    <div class="profile-row"><label>Terrain</label><input id="lp-terrain" type="text" value="${esc(p.terrain||'')}" placeholder="Plains, mountain, coast…"></div>
    <div class="profile-row"><label>Size</label>
      <div class="radio-row">
        ${SIZES.map(s=>`<label class="radio-opt"><input type="radio" name="lp-size" value="${s}"${(p.locSize||'Medium')===s?' checked':''}><span>${s}</span></label>`).join('')}
      </div>
    </div>

    <div class="panel-section-head">Civilization</div>
    <div class="profile-row"><label>Population</label>
      <select id="lp-pop">${POPS.map(v=>`<option value="${v}"${p.population===v?' selected':''}>${v}</option>`).join('')}</select>
    </div>
    <div class="profile-row"><label>Government</label><input id="lp-gov" type="text" value="${esc(p.government||'')}"></div>
    <div class="profile-row"><label>Ruling faction</label>
      <select id="lp-faction">
        <option value="">— None —</option>
        ${factionNodes.map(n=>`<option value="${n.id}"${p.rulingFaction===n.id?' selected':''}>${esc(n.name)}</option>`).join('')}
      </select>
    </div>
    <div class="profile-row"><label>Founded</label><input id="lp-founded" type="text" value="${esc(p.founded||'')}" placeholder="Year, era…"></div>

    <hr class="av-divider" style="margin-top:14px">
    <button class="btn-danger" id="lp-delete" style="width:100%;margin-top:4px">🗑 Delete Location</button>
  `;

  _wire(nodeId, {
    'lp-name':    ['name',         true],
    'lp-color':   ['color',        true],
    'lp-aka':     ['aka',          false],
    'lp-type':    ['locType',      false],
    'lp-region':  ['region',       false],
    'lp-climate': ['climate',      false],
    'lp-terrain': ['terrain',      false],
    'lp-pop':     ['population',   false],
    'lp-gov':     ['government',   false],
    'lp-faction': ['rulingFaction',false],
    'lp-founded': ['founded',      false],
  });

  document.querySelectorAll('input[name="lp-size"]').forEach(r => {
    r.onchange = () => updateProfile(nodeId, { locSize: r.value });
  });

  document.getElementById('lp-delete')?.addEventListener('click', () => {
    if (confirm(`Delete "${node.name}"? This cannot be undone.`)) {
      import('../state.js').then(m => m.deleteNode(nodeId));
      document.getElementById('rp-body').innerHTML =
        '<div style="padding:20px;text-align:center;color:var(--av-text-muted);font-size:11px">Location deleted.</div>';
      document.getElementById('rp-tabs').innerHTML = '';
    }
  });

  wireAvatarUpload(nodeId, () => renderLocationPanel(nodeId, 'info'));
}

// ── Feel tab ──────────────────────────────────────────────────────────────────

function _renderFeel(nodeId) {
  const body = document.getElementById('rp-body');
  const p    = getOrCreateProfile(nodeId);

  body.innerHTML = `
    <div class="panel-section-head">Atmosphere</div>
    <label class="field-label">Description</label>
    <textarea id="lp-desc" class="field-textarea">${esc(p.description||'')}</textarea>
    <div class="profile-row" style="margin-top:8px"><label>Day mood</label><input id="lp-day" type="text" value="${esc(p.dayMood||'')}"></div>
    <div class="profile-row"><label>Night mood</label><input id="lp-night" type="text" value="${esc(p.nightMood||'')}"></div>

    <div class="panel-section-head" style="margin-top:10px">Tags</div>
    <input id="lp-tags" type="text" value="${esc((p.tags||[]).join(', '))}" placeholder="coastal, ancient, dangerous…"
      style="width:100%;padding:6px 8px;font-size:12px;border-radius:var(--av-radius-sm);background:var(--av-input-bg);border:1px solid var(--av-border);color:var(--av-text-primary)">
  `;

  _wire(nodeId, {
    'lp-desc':  ['description', false],
    'lp-day':   ['dayMood',     false],
    'lp-night': ['nightMood',   false],
  });

  document.getElementById('lp-tags')?.addEventListener('change', e => {
    updateProfile(nodeId, { tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) });
  });
}

// ── Links tab ─────────────────────────────────────────────────────────────────

function _renderLinks(nodeId) {
  const body = document.getElementById('rp-body');
  const p    = getOrCreateProfile(nodeId);

  const hereEdges = state.edges.filter(e =>
    (e.to === nodeId || e.from === nodeId) &&
    /lives in|born in|located in|based in|home/i.test(e.label || '')
  );
  const hereNodes = state.nodes.filter(n =>
    hereEdges.some(e => (e.from === n.id || e.to === n.id) && n.id !== nodeId)
  );

  const sceneLinks = state.story.scenes?.filter(s => s.locationId === nodeId) || [];

  body.innerHTML = `
    <div class="panel-section-head">Characters Here</div>
    <div class="link-list">
      ${hereNodes.length
        ? hereNodes.map(n => `<div class="link-item" data-id="${n.id}">
            <div class="link-dot" style="background:${n.color||'#888'}"></div>
            <span>${esc(n.name)}</span>
          </div>`).join('')
        : '<div class="link-empty">No characters linked via "lives in" or similar edges</div>'}
    </div>

    <div class="panel-section-head" style="margin-top:10px">Linked Scenes</div>
    <div class="link-list">
      ${sceneLinks.length
        ? sceneLinks.map(s => `<div class="link-item"><span>${esc(s.title||'Untitled scene')}</span></div>`).join('')
        : '<div class="link-empty">No scenes pinned to this location</div>'}
    </div>

    <div class="panel-section-head" style="margin-top:10px">Notes</div>
    <textarea id="lp-notes" class="field-textarea">${esc(p.notes||'')}</textarea>
  `;

  body.querySelectorAll('.link-item[data-id]').forEach(el => {
    el.style.cursor = 'pointer';
    el.onclick = () => EventBus.emit('node:open-profile', el.dataset.id);
  });

  document.getElementById('lp-notes')?.addEventListener('input', e => {
    updateProfile(nodeId, { notes: e.target.value });
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

export function _buildGallery(body, nodeId, refresh) {
  const p = getOrCreateProfile(nodeId);
  const images = p.gallery || [];

  body.innerHTML = `
    <div class="panel-section-head">Reference Images</div>
    <div class="gallery-grid">
      ${images.map((src, i) => `
        <div class="gallery-item">
          <img src="${src}" alt="ref ${i+1}">
          <button class="gallery-remove" data-i="${i}">✕</button>
        </div>`).join('')}
    </div>
    <button class="btn-primary" id="gal-add" style="width:100%;margin-top:8px">+ Add Image</button>
    <input type="file" id="gal-input" accept="image/*" style="display:none">
  `;

  document.getElementById('gal-add')?.addEventListener('click', () =>
    document.getElementById('gal-input')?.click());

  document.getElementById('gal-input')?.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const imgs = [...(getOrCreateProfile(nodeId).gallery || []), ev.target.result];
      updateProfile(nodeId, { gallery: imgs });
      refresh();
    };
    reader.readAsDataURL(file);
  });

  body.querySelectorAll('.gallery-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      const imgs = [...(getOrCreateProfile(nodeId).gallery || [])];
      imgs.splice(+btn.dataset.i, 1);
      updateProfile(nodeId, { gallery: imgs });
      refresh();
    });
  });
}
