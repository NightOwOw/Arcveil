// lore.js — World & Lore: locations, factions, lore entries, bestiary
import { state, EventBus, esc, uid, saveHistory } from '../state.js';

export function renderLoreView() { initLore(); }

export function initLore() {
  const view = document.getElementById('view-lore');
  if (!view) return;
  _render(view);
}

function _render(view) {
  const activeTab = view.dataset.tab || 'locations';
  view.innerHTML = `
    <div style="display:flex;flex-direction:column;height:100%">
      <div style="padding:0 16px;border-bottom:1px solid var(--av-border);display:flex;gap:2px;flex-shrink:0;background:var(--av-bg-secondary)">
        ${['locations','factions','lore','bestiary','items'].map(t => `
          <div class="lore-tab${activeTab===t?' active':''}" data-tab="${t}"
            style="padding:10px 14px;font-size:12px;font-weight:600;cursor:pointer;border-bottom:2px solid ${activeTab===t?'var(--av-accent)':'transparent'};color:${activeTab===t?'var(--av-accent)':'var(--av-text-muted)'}">
            ${_tabLabel(t)}</div>
        `).join('')}
      </div>
      <div id="lore-body" style="flex:1;overflow-y:auto;padding:16px"></div>
    </div>
  `;

  view.querySelectorAll('.lore-tab').forEach(el => {
    el.addEventListener('click', () => { view.dataset.tab = el.dataset.tab; _render(view); });
  });

  const body = document.getElementById('lore-body');
  switch (activeTab) {
    case 'locations': _renderLocations(body); break;
    case 'factions':  _renderFactions(body); break;
    case 'lore':      _renderLoreEntries(body); break;
    case 'bestiary':  _renderBestiary(body); break;
    case 'items':     _renderItems(body); break;
  }
}

// ── Locations ─────────────────────────────────────────────────────────────────

function _renderLocations(body) {
  const locs = state.world.locations || [];
  body.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px">
      <h3 style="font-size:14px;font-weight:700;flex:1">Locations (${locs.length})</h3>
      <button class="btn-primary" id="add-loc">✦ Add Location</button>
    </div>
    <div id="loc-list" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px">
      ${locs.map((l,i) => _locationCard(l,i)).join('')}
    </div>
  `;

  document.getElementById('add-loc')?.addEventListener('click', () => {
    state.world.locations = state.world.locations || [];
    state.world.locations.push({ id: uid(), name: 'New Location', type: 'city', desc: '', climate: '', population: '', notes: '' });
    _renderLocations(body);
    saveHistory();
  });
  _wireList(body, '.loc-del', '.loc-name,.loc-type,.loc-desc,.loc-climate,.loc-pop,.loc-notes',
    state.world.locations || [], { 'loc-name':'name','loc-type':'type','loc-desc':'desc','loc-climate':'climate','loc-pop':'population','loc-notes':'notes' },
    () => _renderLocations(body));
}

function _locationCard(l, i) {
  const TYPES = ['city','town','village','dungeon','forest','mountain','ocean','plains','ruin','other'];
  const TYPE_ICONS = { city:'🏙️', town:'🏘️', village:'🏡', dungeon:'⛩️', forest:'🌲', mountain:'⛰️', ocean:'🌊', plains:'🌾', ruin:'🏚️', other:'📍' };
  return `<div style="background:var(--av-bg-elevated);border:1px solid var(--av-border);border-radius:var(--av-radius-lg);padding:12px">
    <div style="display:flex;gap:6px;margin-bottom:8px;align-items:center">
      <span style="font-size:20px">${TYPE_ICONS[l.type]||'📍'}</span>
      <input class="loc-name" data-i="${i}" value="${esc(l.name||'')}" placeholder="Location name..." style="flex:1;padding:4px 7px;font-size:13px;font-weight:600;border-radius:var(--av-radius-sm)">
      <button class="btn-sm loc-del" data-i="${i}">✕</button>
    </div>
    <select class="loc-type" data-i="${i}" style="width:100%;margin-bottom:6px;padding:4px 6px;font-size:11px;border-radius:var(--av-radius-sm)">
      ${TYPES.map(t=>`<option value="${t}" ${l.type===t?'selected':''}>${t}</option>`).join('')}
    </select>
    <textarea class="loc-desc" data-i="${i}" placeholder="Description..." style="width:100%;min-height:56px;border:1px solid var(--av-border);border-radius:var(--av-radius-sm);padding:5px;font-size:11px;resize:vertical;background:var(--av-input-bg);color:var(--av-text-primary)">${esc(l.desc||'')}</textarea>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:6px">
      <input class="loc-climate" data-i="${i}" value="${esc(l.climate||'')}" placeholder="Climate..." style="padding:3px 6px;font-size:11px;border-radius:var(--av-radius-sm)">
      <input class="loc-pop" data-i="${i}" value="${esc(l.population||'')}" placeholder="Population..." style="padding:3px 6px;font-size:11px;border-radius:var(--av-radius-sm)">
    </div>
    <textarea class="loc-notes" data-i="${i}" placeholder="Notes, secrets, history..." style="width:100%;min-height:40px;margin-top:6px;border:1px solid var(--av-border);border-radius:var(--av-radius-sm);padding:4px 6px;font-size:11px;resize:vertical;background:var(--av-input-bg);color:var(--av-text-primary)">${esc(l.notes||'')}</textarea>
  </div>`;
}

// ── Factions ──────────────────────────────────────────────────────────────────

function _renderFactions(body) {
  const factions = state.world.factions || [];
  body.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px">
      <h3 style="font-size:14px;font-weight:700;flex:1">Factions (${factions.length})</h3>
      <button class="btn-primary" id="add-faction">✦ Add Faction</button>
    </div>
    <div id="faction-list">
      ${factions.map((f,i) => `
        <div style="background:var(--av-bg-elevated);border:1px solid var(--av-border);border-radius:var(--av-radius-lg);padding:12px;margin-bottom:10px;border-left:4px solid ${f.color||'#888'}">
          <div style="display:flex;gap:6px;margin-bottom:8px;align-items:center">
            <input type="color" class="fac-color" data-i="${i}" value="${f.color||'#888888'}" style="width:28px;height:28px;padding:2px;border-radius:4px;flex-shrink:0">
            <input class="fac-name" data-i="${i}" value="${esc(f.name||'')}" placeholder="Faction name..." style="flex:1;padding:4px 7px;font-size:13px;font-weight:600;border-radius:var(--av-radius-sm)">
            <input class="fac-motto" data-i="${i}" value="${esc(f.motto||'')}" placeholder="Motto..." style="flex:1;padding:4px 7px;font-size:11px;font-style:italic;border-radius:var(--av-radius-sm)">
            <button class="btn-sm fac-del" data-i="${i}">✕</button>
          </div>
          <textarea class="fac-desc" data-i="${i}" placeholder="Goals, ideology, history..." style="width:100%;min-height:64px;border:1px solid var(--av-border);border-radius:var(--av-radius-sm);padding:6px;font-size:12px;resize:vertical;background:var(--av-input-bg);color:var(--av-text-primary)">${esc(f.desc||'')}</textarea>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px">
            <div><label style="font-size:10px;color:var(--av-text-muted)">Allies</label>
              <input class="fac-allies" data-i="${i}" value="${esc(f.allies||'')}" placeholder="Ally factions..." style="width:100%;padding:3px 6px;font-size:11px;border-radius:var(--av-radius-sm)"></div>
            <div><label style="font-size:10px;color:var(--av-text-muted)">Enemies</label>
              <input class="fac-enemies" data-i="${i}" value="${esc(f.enemies||'')}" placeholder="Enemy factions..." style="width:100%;padding:3px 6px;font-size:11px;border-radius:var(--av-radius-sm)"></div>
          </div>
        </div>
      `).join('')}
    </div>
  `;

  document.getElementById('add-faction')?.addEventListener('click', () => {
    state.world.factions = state.world.factions || [];
    state.world.factions.push({ id: uid(), name: 'New Faction', color: '#e67e22', motto: '', desc: '', allies: '', enemies: '' });
    _renderFactions(body);
    saveHistory();
  });
  _wireList(body, '.fac-del', '.fac-name,.fac-color,.fac-motto,.fac-desc,.fac-allies,.fac-enemies',
    state.world.factions, { 'fac-name':'name','fac-color':'color','fac-motto':'motto','fac-desc':'desc','fac-allies':'allies','fac-enemies':'enemies' },
    () => _renderFactions(body));
}

// ── Lore Entries ──────────────────────────────────────────────────────────────

function _renderLoreEntries(body) {
  const lore = state.world.lore || [];
  const CATEGORIES = ['history','magic','religion','culture','geography','language','other'];
  body.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px">
      <h3 style="font-size:14px;font-weight:700;flex:1">Lore Entries (${lore.length})</h3>
      <button class="btn-primary" id="add-lore">✦ Add Entry</button>
    </div>
    <div id="lore-entry-list">
      ${lore.map((e,i) => `
        <div style="background:var(--av-bg-elevated);border:1px solid var(--av-border);border-radius:var(--av-radius-md);padding:10px;margin-bottom:8px">
          <div style="display:flex;gap:6px;margin-bottom:6px">
            <input class="le-title" data-i="${i}" value="${esc(e.title||'')}" placeholder="Entry title..." style="flex:1;padding:4px 7px;font-size:13px;font-weight:600;border-radius:var(--av-radius-sm)">
            <select class="le-cat" data-i="${i}" style="font-size:11px;padding:3px 5px;border-radius:var(--av-radius-sm)">
              ${CATEGORIES.map(c=>`<option value="${c}" ${e.category===c?'selected':''}>${c}</option>`).join('')}
            </select>
            <button class="btn-sm le-del" data-i="${i}">✕</button>
          </div>
          <textarea class="le-body" data-i="${i}" placeholder="The lore content..." style="width:100%;min-height:80px;border:1px solid var(--av-border);border-radius:var(--av-radius-sm);padding:6px;font-size:12px;line-height:1.6;resize:vertical;background:var(--av-input-bg);color:var(--av-text-primary)">${esc(e.body||'')}</textarea>
          <input class="le-tags" data-i="${i}" value="${esc((e.tags||[]).join(', '))}" placeholder="Tags (comma-separated)..." style="width:100%;margin-top:5px;padding:3px 6px;font-size:11px;border-radius:var(--av-radius-sm)">
        </div>
      `).join('')}
    </div>
  `;

  document.getElementById('add-lore')?.addEventListener('click', () => {
    state.world.lore = state.world.lore || [];
    state.world.lore.push({ id: uid(), title: 'New Entry', category: 'history', body: '', tags: [] });
    _renderLoreEntries(body);
    saveHistory();
  });
  body.querySelectorAll('.le-del').forEach(btn => {
    btn.onclick = () => { state.world.lore.splice(+btn.dataset.i, 1); _renderLoreEntries(body); };
  });
  body.querySelectorAll('.le-title,.le-cat,.le-body,.le-tags').forEach(el => {
    el.addEventListener('input', e => {
      const i = +el.dataset.i;
      const f = el.classList.contains('le-title')?'title':el.classList.contains('le-cat')?'category':el.classList.contains('le-body')?'body':'tags';
      if (f === 'tags') state.world.lore[i].tags = e.target.value.split(',').map(t=>t.trim()).filter(Boolean);
      else state.world.lore[i][f] = e.target.value;
    });
  });
}

// ── Bestiary ──────────────────────────────────────────────────────────────────

function _renderBestiary(body) {
  const beasts = state.world.bestiary || [];
  body.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px">
      <h3 style="font-size:14px;font-weight:700;flex:1">Bestiary (${beasts.length})</h3>
      <button class="btn-primary" id="add-beast">✦ Add Creature</button>
    </div>
    <div id="beast-list" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px">
      ${beasts.map((b,i) => `
        <div style="background:var(--av-bg-elevated);border:1px solid var(--av-border);border-radius:var(--av-radius-lg);padding:12px">
          <div style="display:flex;gap:6px;margin-bottom:8px">
            <input class="be-name" data-i="${i}" value="${esc(b.name||'')}" placeholder="Creature name..." style="flex:1;padding:4px 7px;font-size:13px;font-weight:600;border-radius:var(--av-radius-sm)">
            <button class="btn-sm be-del" data-i="${i}">✕</button>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:6px">
            <input class="be-type" data-i="${i}" value="${esc(b.type||'')}" placeholder="Type (beast, undead...)" style="padding:3px 6px;font-size:11px;border-radius:var(--av-radius-sm)">
            <input class="be-threat" data-i="${i}" value="${esc(b.threat||'')}" placeholder="Threat level..." style="padding:3px 6px;font-size:11px;border-radius:var(--av-radius-sm)">
          </div>
          <textarea class="be-desc" data-i="${i}" placeholder="Appearance, behavior, habitat..." style="width:100%;min-height:64px;border:1px solid var(--av-border);border-radius:var(--av-radius-sm);padding:5px;font-size:11px;resize:vertical;background:var(--av-input-bg);color:var(--av-text-primary)">${esc(b.desc||'')}</textarea>
          <textarea class="be-abilities" data-i="${i}" placeholder="Special abilities..." style="width:100%;min-height:40px;margin-top:5px;border:1px solid var(--av-border);border-radius:var(--av-radius-sm);padding:4px 6px;font-size:11px;resize:vertical;background:var(--av-input-bg);color:var(--av-text-primary)">${esc(b.abilities||'')}</textarea>
        </div>
      `).join('')}
    </div>
  `;

  document.getElementById('add-beast')?.addEventListener('click', () => {
    state.world.bestiary = state.world.bestiary || [];
    state.world.bestiary.push({ id: uid(), name: 'New Creature', type: '', threat: '', desc: '', abilities: '' });
    _renderBestiary(body);
    saveHistory();
  });
  _wireList(body, '.be-del', '.be-name,.be-type,.be-threat,.be-desc,.be-abilities',
    state.world.bestiary, { 'be-name':'name','be-type':'type','be-threat':'threat','be-desc':'desc','be-abilities':'abilities' },
    () => _renderBestiary(body));
}

// ── Items ─────────────────────────────────────────────────────────────────────

function _renderItems(body) {
  const items = state.world.items || [];
  const RARITIES = ['common','uncommon','rare','legendary','artifact','unique'];
  const RARITY_COLORS = { common:'#888', uncommon:'#2ecc71', rare:'#3498db', legendary:'#9b59b6', artifact:'#e74c3c', unique:'#f39c12' };
  body.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px">
      <h3 style="font-size:14px;font-weight:700;flex:1">Items &amp; Artifacts (${items.length})</h3>
      <button class="btn-primary" id="add-item">✦ Add Item</button>
    </div>
    <div id="item-list" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px">
      ${items.map((it,i) => `
        <div style="background:var(--av-bg-elevated);border:1px solid var(--av-border);border-left:4px solid ${RARITY_COLORS[it.rarity]||'#888'};border-radius:var(--av-radius-lg);padding:12px">
          <div style="display:flex;gap:6px;margin-bottom:8px;align-items:center">
            <input class="it-name" data-i="${i}" value="${esc(it.name||'')}" placeholder="Item name..." style="flex:1;padding:4px 7px;font-size:13px;font-weight:600;border-radius:var(--av-radius-sm)">
            <select class="it-rarity" data-i="${i}" style="font-size:10px;padding:3px 5px;border-radius:var(--av-radius-sm);color:${RARITY_COLORS[it.rarity]||'#888'}">
              ${RARITIES.map(r=>`<option value="${r}" ${it.rarity===r?'selected':''}>${r}</option>`).join('')}
            </select>
            <button class="btn-sm it-del" data-i="${i}">✕</button>
          </div>
          <input class="it-type" data-i="${i}" value="${esc(it.type||'')}" placeholder="Type (weapon, potion, armor...)" style="width:100%;margin-bottom:6px;padding:3px 6px;font-size:11px;border-radius:var(--av-radius-sm)">
          <textarea class="it-desc" data-i="${i}" placeholder="Description, lore, appearance..." style="width:100%;min-height:56px;border:1px solid var(--av-border);border-radius:var(--av-radius-sm);padding:5px;font-size:11px;resize:vertical;background:var(--av-input-bg);color:var(--av-text-primary)">${esc(it.desc||'')}</textarea>
          <textarea class="it-effect" data-i="${i}" placeholder="Effects, powers, drawbacks..." style="width:100%;min-height:36px;margin-top:5px;border:1px solid var(--av-border);border-radius:var(--av-radius-sm);padding:4px 6px;font-size:11px;resize:vertical;background:var(--av-input-bg);color:var(--av-text-primary)">${esc(it.effect||'')}</textarea>
        </div>
      `).join('')}
    </div>
  `;

  document.getElementById('add-item')?.addEventListener('click', () => {
    state.world.items = state.world.items || [];
    state.world.items.push({ id: uid(), name: 'New Item', rarity: 'common', type: '', desc: '', effect: '' });
    _renderItems(body);
    saveHistory();
  });
  _wireList(body, '.it-del', '.it-name,.it-rarity,.it-type,.it-desc,.it-effect',
    state.world.items, { 'it-name':'name','it-rarity':'rarity','it-type':'type','it-desc':'desc','it-effect':'effect' },
    () => _renderItems(body));
}

// ── Shared helpers ────────────────────────────────────────────────────────────

let _loreHistoryTimer = null;
const _scheduleHistory = () => { clearTimeout(_loreHistoryTimer); _loreHistoryTimer = setTimeout(saveHistory, 1500); };

function _wireList(body, delSel, inputSel, arr, fieldMap, rerender) {
  body.querySelectorAll(delSel).forEach(btn => {
    btn.onclick = () => { arr.splice(+btn.dataset.i, 1); rerender(); saveHistory(); };
  });
  body.querySelectorAll(inputSel).forEach(el => {
    el.addEventListener('input', e => {
      const i = +el.dataset.i;
      const cls = Array.from(el.classList).find(c => fieldMap[c]);
      if (cls && arr[i] !== undefined) { arr[i][fieldMap[cls]] = e.target.value; _scheduleHistory(); }
    });
  });
}

function _tabLabel(t) {
  return { locations:'Locations', factions:'Factions', lore:'Lore', bestiary:'Bestiary', items:'Items' }[t] || t;
}
