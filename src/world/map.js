// map.js — World Map view: map list, generation form, map rendering, region panel.
import { state, saveHistory, EventBus, uid, esc } from '../state.js';
import { generateMap }                       from './map-generator.js';
import { renderMapCanvas, refreshMapCanvas } from './map-canvas.js';

let _container = null;
let _activeId  = null;
let _lastForm  = null;
let _booted    = false;

export function renderWorldView(container) {
  if (!container) return;
  _container = container;

  if (!_booted) {
    _booted = true;
    EventBus.on('project:loaded', () => { _activeId = null; _render(); });
    EventBus.on('map:regenerate',  id  => _regen(id));
    EventBus.on('map:updated', ({ mapId, mapData }) => {
      const m = _maps().find(x => x.id === mapId);
      if (m) { Object.assign(m, mapData); saveHistory(); }
    });
    EventBus.on('map:select-region', ({ mapId, regionId }) => _openRegionPanel(mapId, regionId));
  }

  _render();
}

// ── Routing ────────────────────────────────────────────────────────────────

function _maps() { return state.world.maps; }

function _render() {
  if (!_container) return;
  const maps = _maps();
  if (!maps.length) { _renderEmpty(); return; }
  const active = maps.find(m => m.id === _activeId);
  active ? _renderMap(active) : _renderMapList();
}

// ── Empty state ────────────────────────────────────────────────────────────

function _renderEmpty() {
  _container.innerHTML = `
    <div class="world-empty">
      <div style="font-size:56px;margin-bottom:14px">🗺</div>
      <h2 style="font-size:20px;margin:0 0 8px;color:var(--av-text-primary)">No Maps Yet</h2>
      <p style="color:var(--av-text-muted);max-width:340px;line-height:1.6;font-size:13px">
        Generate a fantasy political map — define regions, seeds, and coastline style,
        then let ArcVeil create an organic world for you.
      </p>
      <button class="btn-primary" id="wm-new-btn" style="margin-top:16px;padding:10px 28px;font-size:13px">
        ✦ Create New Map
      </button>
    </div>`;
  document.getElementById('wm-new-btn').onclick = () => _renderForm();
}

// ── Map list ───────────────────────────────────────────────────────────────

function _renderMapList() {
  _container.innerHTML = `
    <div style="display:flex;flex-direction:column;height:100%;overflow:hidden">
      <div class="world-toolbar">
        <h2 style="margin:0;font-size:14px;font-weight:700;color:var(--av-text-primary)">🗺 World Maps</h2>
        <button class="btn-sm" id="wm-new-btn2">＋ New Map</button>
      </div>
      <div class="wm-list-grid">
        ${_maps().map(m => `
          <div class="wm-map-card" data-mid="${m.id}">
            <div style="font-size:32px;margin-bottom:6px">🗺</div>
            <div class="wm-card-name">${esc(m.name || 'Unnamed Map')}</div>
            <div class="wm-card-meta">${(m.regions||[]).length} regions · ${esc(m.type||'World')}</div>
            <button class="wm-del-btn" data-mid="${m.id}" title="Delete">🗑</button>
          </div>`).join('')}
      </div>
    </div>`;
  _container.querySelectorAll('.wm-map-card').forEach(card => {
    card.onclick = e => { if (e.target.classList.contains('wm-del-btn')) return; _activeId = card.dataset.mid; _render(); };
  });
  _container.querySelectorAll('.wm-del-btn').forEach(btn => {
    btn.onclick = e => { e.stopPropagation(); _deleteMap(btn.dataset.mid); };
  });
  document.getElementById('wm-new-btn2').onclick = () => _renderForm();
}

// ── New map form ───────────────────────────────────────────────────────────

const COLORS = ['#b5c9a0','#c4a882','#a8bccc','#c9a5b5','#d4c88a','#a0b8c4','#c8b49a','#96b89a','#bba8c8','#c8a896'];
let _colorIdx = 0;

function _renderForm(prefill) {
  const seed = prefill?.seed || (Math.random() * 99999 | 0) + 10000;
  _container.innerHTML = `
    <div style="display:flex;flex-direction:column;height:100%;overflow:hidden">
      <div class="world-toolbar">
        <h2 style="margin:0;font-size:14px;font-weight:700;color:var(--av-text-primary)">✦ New Map</h2>
        <button class="btn-sm" id="wm-form-back">← Back</button>
      </div>
      <div class="wm-form-scroll">
        <div class="wm-form">
          <div class="wm-form-row">
            <label>Map Name</label>
            <input id="wf-name" value="${esc(prefill?.name||'The Known World')}" placeholder="World name">
          </div>
          <div class="wm-form-row">
            <label>Seed</label>
            <div style="display:flex;gap:6px;align-items:center">
              <input id="wf-seed" type="number" value="${seed}" style="width:110px">
              <button class="btn-sm" id="wf-reseed">🔀 Random</button>
            </div>
          </div>
          <div class="wm-form-row">
            <label>Size</label>
            <div style="display:flex;gap:14px">
              ${['small','medium','large'].map(s=>`<label class="wm-radio-wrap"><input type="radio" name="wf-size" value="${s}" ${s==='large'?'checked':''}> ${_cap(s)}</label>`).join('')}
            </div>
          </div>
          <div class="wm-form-row">
            <label>Coastline</label>
            <div style="display:flex;gap:14px">
              ${['smooth','jagged','island-heavy'].map(c=>`<label class="wm-radio-wrap"><input type="radio" name="wf-coast" value="${c}" ${c==='jagged'?'checked':''}> ${c}</label>`).join('')}
            </div>
          </div>
          <div class="wm-section-head">REGIONS</div>
          <div id="wf-region-rows"></div>
          <button class="btn-sm" id="wf-add-region" style="margin-top:8px">＋ Add Region</button>
          <div class="wm-section-head" style="margin-top:16px">OPTIONS</div>
          <label class="wm-radio-wrap" style="display:block;margin-bottom:6px"><input type="checkbox" id="wf-rivers"> Include rivers</label>
          <label class="wm-radio-wrap" style="display:block;margin-bottom:6px"><input type="checkbox" id="wf-provinces"> Include provinces / sub-regions</label>
          <div style="margin-top:22px;display:flex;gap:10px">
            <button class="btn-primary" id="wf-generate" style="padding:10px 32px;font-size:13px">⚡ Generate Map</button>
          </div>
        </div>
      </div>
    </div>`;

  document.getElementById('wm-form-back').onclick = () => _render();
  document.getElementById('wf-reseed').onclick = () => { document.getElementById('wf-seed').value = (Math.random()*99999|0)+10000; };
  document.getElementById('wf-add-region').onclick = () => _addRegionRow();
  document.getElementById('wf-generate').onclick = () => _handleGenerate();

  const defaults = prefill?.regions || [
    { name:'Kingdom of Arlen', size:'28', pos:'west',      color:'#b5c9a0' },
    { name:'Empire of Keth',   size:'24', pos:'east',      color:'#c4a882' },
    { name:'The Wildlands',    size:'18', pos:'north',     color:'#8a9f72' },
    { name:'Southron Isles',   size:'14', pos:'south',     color:'#a8bccc' },
    { name:'Shadowmere',       size:'12', pos:'northwest', color:'#b5a8c4' },
  ];
  defaults.forEach(d => _addRegionRow(d));
}

function _addRegionRow(d = {}) {
  const rows = document.getElementById('wf-region-rows'); if (!rows) return;
  const id = uid();
  const color = d.color || COLORS[_colorIdx++ % COLORS.length];
  const POSITIONS = ['center','north','south','east','west','northeast','northwest','southeast','southwest','north-coast','south-coast','island','random'];
  const row = document.createElement('div');
  row.className = 'wf-region-row'; row.dataset.rid = id;
  row.innerHTML = `
    <input type="text"   class="rr-name" placeholder="Region name" value="${esc(d.name||'')}">
    <input type="number" class="rr-size" placeholder="%" min="1" max="99" value="${d.size||'15'}" title="Size %" style="width:52px">
    <select class="rr-pos" title="Position hint">
      ${POSITIONS.map(p=>`<option value="${p}" ${p===(d.pos||d.positionHint||'random')?'selected':''}>${p}</option>`).join('')}
    </select>
    <input type="color" class="rr-color" value="${color}" style="width:30px;height:28px;border:none;cursor:pointer;padding:1px;background:transparent">
    <button class="rr-del btn-sm" title="Remove">✕</button>
  `;
  row.querySelector('.rr-del').onclick = () => row.remove();
  rows.appendChild(row);
}

function _handleGenerate() {
  const name     = document.getElementById('wf-name').value.trim() || 'My World';
  const seed     = parseInt(document.getElementById('wf-seed').value) || (Math.random()*99999|0);
  const size     = document.querySelector('[name="wf-size"]:checked')?.value || 'large';
  const coast    = document.querySelector('[name="wf-coast"]:checked')?.value || 'jagged';
  const rivers   = document.getElementById('wf-rivers').checked;
  const provinces = document.getElementById('wf-provinces').checked;

  const regionDefs = [...document.querySelectorAll('.wf-region-row')].map((row, i) => ({
    id:           row.dataset.rid,
    name:         row.querySelector('.rr-name').value.trim() || `Region ${i+1}`,
    sizePercent:  row.querySelector('.rr-size').value || '10',
    positionHint: row.querySelector('.rr-pos').value,
    color:        row.querySelector('.rr-color').value,
    government: '', ruler: '', capital: '', population: '', description: '', tags: [],
  }));
  if (!regionDefs.length) { alert('Add at least one region.'); return; }

  _lastForm = { name, seed, sizeKey: size, coastlineStyle: coast, regions: regionDefs, includeRivers: rivers, includeProvinces: provinces };
  _generate(_lastForm);
}

// ── Generation ─────────────────────────────────────────────────────────────

function _generate(cfg) {
  _container.innerHTML = `<div class="world-loading"><div class="world-loading-inner">⚙️ Generating world…</div></div>`;
  setTimeout(() => {
    const mapData  = generateMap(cfg);
    mapData.id     = uid();
    mapData.name   = cfg.name;
    mapData.type   = 'World';
    mapData.cities = [];
    _maps().push(mapData);
    saveHistory();
    _activeId = mapData.id;
    _renderMap(mapData);
  }, 30);
}

function _regen(mapId) {
  const m = _maps().find(x => x.id === mapId); if (!m) return;
  const cfg = _lastForm
    ? { ..._lastForm, seed: (_lastForm.seed||42)+1 }
    : { name: m.name, seed: (m.seed||42)+1, sizeKey:'large', coastlineStyle:'jagged',
        regions: m.regions, includeRivers: false, includeProvinces: false };
  _container.innerHTML = `<div class="world-loading"><div class="world-loading-inner">🔀 Regenerating…</div></div>`;
  setTimeout(() => {
    const newData  = generateMap(cfg);
    newData.id     = mapId;
    newData.name   = m.name;
    newData.type   = m.type;
    newData.cities = m.cities || [];
    const idx = _maps().findIndex(x => x.id === mapId);
    if (idx >= 0) _maps()[idx] = newData;
    saveHistory();
    if (_lastForm) _lastForm.seed = cfg.seed;
    _renderMap(newData);
  }, 30);
}

// ── Map display ────────────────────────────────────────────────────────────

function _renderMap(mapData) {
  _container.innerHTML = `
    <div style="display:flex;flex-direction:column;height:100%;overflow:hidden">
      <div class="world-toolbar">
        <button class="btn-sm" id="wm-back-btn">← Maps</button>
        <span style="flex:1;font-size:13px;font-weight:700;color:var(--av-text-primary)">${esc(mapData.name||'Map')}</span>
        <span style="font-size:10px;color:var(--av-text-muted)">${mapData.width}×${mapData.height} · seed ${mapData.seed}</span>
      </div>
      <div class="wm-canvas-area" id="wm-canvas-area"></div>
    </div>`;
  document.getElementById('wm-back-btn').onclick = () => { _activeId = null; _render(); };
  renderMapCanvas(document.getElementById('wm-canvas-area'), mapData, mapData.id);
}

// ── Region side panel ──────────────────────────────────────────────────────

const GOVTS = ['Empire','Kingdom','Duchy','Republic','Theocracy','Tribal','Anarchy','City-State','Confederacy','Other'];
const POPS  = ['Sparse','Moderate','Dense','Teeming'];

function _openRegionPanel(mapId, regionId) {
  const m = _maps().find(x => x.id === mapId); if (!m) return;
  const r = m.regions.find(x => x.id === regionId); if (!r) return;

  const panel = document.getElementById('right-panel'); if (!panel) return;
  panel.classList.remove('collapsed');

  const rpHeader = document.getElementById('rp-header');
  if (rpHeader) rpHeader.textContent = r.name || 'Region';

  const rpTabs = document.getElementById('rp-tabs');
  if (rpTabs) rpTabs.innerHTML = '';

  const rpBody = document.getElementById('rp-body');
  if (!rpBody) return;

  rpBody.innerHTML = `
    <div class="panel-section-head">🌍 Region Info</div>
    <div class="panel-row"><label>Name</label><input id="rp-rn" type="text" value="${esc(r.name||'')}"></div>
    <div class="panel-row">
      <label>Color</label>
      <input type="color" id="rp-rc" value="${r.color||'#c8aa7a'}" style="width:40px;height:28px;border:none;cursor:pointer;background:transparent;border-radius:4px">
    </div>
    <div class="panel-row">
      <label>Government</label>
      <select id="rp-rg">${GOVTS.map(g=>`<option${r.government===g?' selected':''}>${g}</option>`).join('')}</select>
    </div>
    <div class="panel-row"><label>Ruler</label><input id="rp-rr" type="text" value="${esc(r.ruler||'')}" placeholder="Name, title…"></div>
    <div class="panel-row">
      <label>Population</label>
      <select id="rp-rp">${POPS.map(p=>`<option${r.population===p?' selected':''}>${p}</option>`).join('')}</select>
    </div>
    <div style="margin-bottom:8px">
      <label style="font-size:11px;font-weight:600;color:var(--av-text-secondary);display:block;margin-bottom:4px">Lore / Description</label>
      <textarea id="rp-rd" style="width:100%;box-sizing:border-box;padding:6px 8px;font-size:11px;min-height:72px;font-family:inherit;resize:vertical">${esc(r.description||'')}</textarea>
    </div>
    <div class="panel-row"><label>Tags</label><input id="rp-rt" type="text" value="${esc((r.tags||[]).join(', '))}" placeholder="cursed, ancient, coastal…"></div>
    <div style="margin-top:4px;font-size:10px;color:var(--av-text-muted)">
      ${r.cellCount||0} cells · ${((r.normPct||0)*100).toFixed(1)}% of landmass
    </div>
    <button class="btn-sm" id="rp-regen-btn" style="margin-top:12px;width:100%">🔀 Regenerate Map</button>
  `;

  document.getElementById('rp-rc').oninput = e => {
    r.color = e.target.value;
    _saveRegion(m, mapId);
  };
  document.getElementById('rp-regen-btn').onclick = () => EventBus.emit('map:regenerate', mapId);

  const save = () => {
    r.name        = document.getElementById('rp-rn').value;
    r.government  = document.getElementById('rp-rg').value;
    r.ruler       = document.getElementById('rp-rr').value;
    r.population  = document.getElementById('rp-rp').value;
    r.description = document.getElementById('rp-rd').value;
    r.tags        = document.getElementById('rp-rt').value.split(',').map(t=>t.trim()).filter(Boolean);
    if (rpHeader) rpHeader.textContent = r.name || 'Region';
    _saveRegion(m, mapId);
  };
  ['rp-rn','rp-rg','rp-rr','rp-rp','rp-rd','rp-rt'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', save);
    document.getElementById(id)?.addEventListener('change', save);
  });
}

function _saveRegion(mapData, mapId) {
  EventBus.emit('map:updated', { mapId, mapData });
  refreshMapCanvas(mapData);
}

function _deleteMap(mapId) {
  if (!confirm('Delete this map? This cannot be undone.')) return;
  const idx = _maps().findIndex(m => m.id === mapId);
  if (idx >= 0) { _maps().splice(idx, 1); saveHistory(); }
  if (_activeId === mapId) _activeId = null;
  _render();
}

function _cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
