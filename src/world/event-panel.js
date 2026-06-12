// ============================================
// event-panel.js — Event node profile panel
// Imports: state.js, location-panel.js (gallery)
// Exports: renderEventPanel
// ============================================

import { state, esc, getOrCreateProfile, updateProfile, EventBus } from '../state.js';
import { _buildGallery } from './location-panel.js';
import { avatarHTML, wireAvatarUpload } from '../canvas/node-image.js';

const EVT_TYPES = ['Battle','Ceremony','Discovery','Disaster','Meeting','Death','Political','Personal','Other'];
const SIGS      = ['Minor','Major','World-changing'];

const TABS = [
  { id: 'info',    label: 'Info'  },
  { id: 'who',     label: 'Who'   },
  { id: 'story',   label: 'Story' },
  { id: 'links',   label: 'Links' },
  { id: 'gallery', label: 'Gallery' },
];

let _tab = 'info';

export function renderEventPanel(nodeId, tab = _tab) {
  _tab = tab;
  const node = state.nodes.find(n => n.id === nodeId);
  if (!node) return;
  document.getElementById('right-panel')?.classList.remove('collapsed');
  _tabBar(nodeId, tab);
  switch (tab) {
    case 'who':     _renderWho(nodeId);     break;
    case 'story':   _renderStory(nodeId);   break;
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
    d.onclick = () => renderEventPanel(nodeId, d.dataset.tab);
  });
}

// ── Info tab ──────────────────────────────────────────────────────────────────

function _renderInfo(nodeId) {
  const body = document.getElementById('rp-body');
  const node = state.nodes.find(n => n.id === nodeId);
  const p    = getOrCreateProfile(nodeId);

  const locationNodes = state.nodes.filter(n => n.type === 'location');

  body.innerHTML = `
    ${_hero(node, p.evtType || 'Event')}

    <div class="panel-section-head">Identity</div>
    <div class="profile-row"><label>Name</label><input id="ep-name" type="text" value="${esc(node.name||'')}"></div>
    <div class="profile-row"><label>Type</label>
      <select id="ep-type">${EVT_TYPES.map(t=>`<option value="${t}"${p.evtType===t?' selected':''}>${t}</option>`).join('')}</select>
    </div>
    <div class="profile-row"><label>Significance</label>
      <div class="radio-row">
        ${SIGS.map(s=>`<label class="radio-opt"><input type="radio" name="ep-sig" value="${s}"${(p.significance||'Major')===s?' checked':''}><span>${s}</span></label>`).join('')}
      </div>
    </div>
    <div class="profile-row"><label>Color</label><input id="ep-color" type="color" value="${node.color||'#f39c12'}" style="width:40px;height:28px;padding:2px"></div>

    <div class="panel-section-head">When</div>
    <div class="profile-row"><label>Story time</label><input id="ep-stime" type="text" value="${esc(p.storyTime||'')}" placeholder="Chapter 3, Year 341…"></div>
    <div class="profile-row"><label>World date</label><input id="ep-wdate" type="text" value="${esc(p.worldDate||'')}" placeholder="In-world calendar date"></div>
    <div class="profile-row"><label>Duration</label><input id="ep-dur" type="text" value="${esc(p.duration||'')}" placeholder="Instant, days, years…"></div>

    <div class="panel-section-head">Where</div>
    <div class="profile-row"><label>Location</label>
      <select id="ep-location">
        <option value="">— None —</option>
        ${locationNodes.map(n=>`<option value="${n.id}"${p.location===n.id?' selected':''}>${esc(n.name)}</option>`).join('')}
      </select>
    </div>
    <div class="profile-row"><label>Region</label><input id="ep-region" type="text" value="${esc(p.region||'')}"></div>

    <hr class="av-divider" style="margin-top:14px">
    <button class="btn-danger" id="ep-delete" style="width:100%;margin-top:4px">🗑 Delete Event</button>
  `;

  _wire(nodeId, {
    'ep-name':     ['name',         true],
    'ep-color':    ['color',        true],
    'ep-type':     ['evtType',      false],
    'ep-stime':    ['storyTime',    false],
    'ep-wdate':    ['worldDate',    false],
    'ep-dur':      ['duration',     false],
    'ep-location': ['location',     false],
    'ep-region':   ['region',       false],
  });

  document.querySelectorAll('input[name="ep-sig"]').forEach(r => {
    r.onchange = () => updateProfile(nodeId, { significance: r.value });
  });

  document.getElementById('ep-delete')?.addEventListener('click', () => {
    if (confirm(`Delete "${node.name}"? This cannot be undone.`)) {
      import('../state.js').then(m => m.deleteNode(nodeId));
      document.getElementById('rp-body').innerHTML =
        '<div style="padding:20px;text-align:center;color:var(--av-text-muted);font-size:11px">Event deleted.</div>';
      document.getElementById('rp-tabs').innerHTML = '';
    }
  });

  wireAvatarUpload(nodeId, () => renderEventPanel(nodeId, 'info'));
}

// ── Who tab ───────────────────────────────────────────────────────────────────

function _renderWho(nodeId) {
  const body = document.getElementById('rp-body');
  const p    = getOrCreateProfile(nodeId);

  const charNodes    = state.nodes.filter(n => n.type === 'character');
  const factionNodes = state.nodes.filter(n => n.type === 'faction');

  // Key figures: characters with any edge to this event
  const linkedEdges = state.edges.filter(e => e.to === nodeId || e.from === nodeId);
  const linkedChars = state.nodes.filter(n =>
    n.type === 'character' &&
    linkedEdges.some(e => e.from === n.id || e.to === n.id)
  );

  body.innerHTML = `
    <div class="panel-section-head">Key Figures</div>
    <div class="link-list">
      ${linkedChars.length
        ? linkedChars.map(n=>`<div class="link-item" data-id="${n.id}">
            <div class="link-dot" style="background:${n.color||'#888'}"></div>
            <span>${esc(n.name)}</span>
            <span class="link-sub">${esc(linkedEdges.find(e=>e.from===n.id||e.to===n.id)?.label||'')}</span>
          </div>`).join('')
        : '<div class="link-empty">No characters linked via edges</div>'}
    </div>

    <div class="panel-section-head" style="margin-top:10px">Instigator</div>
    <div class="profile-row"><label>Who caused this</label>
      <select id="ep-instigator">
        <option value="">— None —</option>
        ${charNodes.map(n=>`<option value="${n.id}"${p.instigator===n.id?' selected':''}>${esc(n.name)}</option>`).join('')}
      </select>
    </div>

    <div class="panel-section-head" style="margin-top:10px">Factions Involved</div>
    <div class="link-list" id="ep-factions-list">
      ${factionNodes.length
        ? factionNodes.map(n=>`<label class="link-check">
            <input type="checkbox" value="${n.id}" ${(p.factions||[]).includes(n.id)?'checked':''}>
            <div class="link-dot" style="background:${n.color||'#888'}"></div>
            <span>${esc(n.name)}</span>
          </label>`).join('')
        : '<div class="link-empty">No factions in project</div>'}
    </div>
  `;

  _wire(nodeId, { 'ep-instigator': ['instigator', false] });

  body.querySelectorAll('.link-item[data-id]').forEach(el => {
    el.style.cursor = 'pointer';
    el.onclick = () => EventBus.emit('node:open-profile', el.dataset.id);
  });

  body.querySelectorAll('#ep-factions-list input[type=checkbox]').forEach(cb => {
    cb.addEventListener('change', () => {
      const checked = [...body.querySelectorAll('#ep-factions-list input[type=checkbox]:checked')].map(c => c.value);
      updateProfile(nodeId, { factions: checked });
    });
  });
}

// ── Story tab ─────────────────────────────────────────────────────────────────

function _renderStory(nodeId) {
  const body = document.getElementById('rp-body');
  const p    = getOrCreateProfile(nodeId);

  body.innerHTML = `
    <div class="panel-section-head">What Happened</div>
    <label class="field-label">Summary</label>
    <textarea id="ep-summary" class="field-textarea">${esc(p.summary||'')}</textarea>
    <label class="field-label" style="margin-top:8px">Before</label>
    <textarea id="ep-before" class="field-textarea">${esc(p.before||'')}</textarea>
    <label class="field-label" style="margin-top:8px">During</label>
    <textarea id="ep-during" class="field-textarea">${esc(p.during||'')}</textarea>
    <label class="field-label" style="margin-top:8px">After</label>
    <textarea id="ep-after" class="field-textarea">${esc(p.after||'')}</textarea>

    <div class="panel-section-head" style="margin-top:10px">Impact</div>
    <label class="field-label">Consequences</label>
    <textarea id="ep-conseq" class="field-textarea">${esc(p.consequences||'')}</textarea>
    <label class="field-label" style="margin-top:8px">Secrets</label>
    <textarea id="ep-secrets" class="field-textarea">${esc(p.secrets||'')}</textarea>

    <div class="panel-section-head" style="margin-top:10px">Changed</div>
    <input id="ep-changed" type="text" value="${esc((p.changed||[]).join(', '))}" placeholder="What permanently changed…"
      style="width:100%;padding:6px 8px;font-size:12px;border-radius:var(--av-radius-sm);background:var(--av-input-bg);border:1px solid var(--av-border);color:var(--av-text-primary)">
  `;

  _wire(nodeId, {
    'ep-summary': ['summary',      false],
    'ep-before':  ['before',       false],
    'ep-during':  ['during',       false],
    'ep-after':   ['after',        false],
    'ep-conseq':  ['consequences', false],
    'ep-secrets': ['secrets',      false],
  });

  document.getElementById('ep-changed')?.addEventListener('change', e => {
    updateProfile(nodeId, { changed: e.target.value.split(',').map(t => t.trim()).filter(Boolean) });
  });
}

// ── Links tab ─────────────────────────────────────────────────────────────────

function _renderLinks(nodeId) {
  const body = document.getElementById('rp-body');
  const p    = getOrCreateProfile(nodeId);

  const eventNodes = state.nodes.filter(n => n.type === 'event' && n.id !== nodeId);
  const sceneLinks = state.story.scenes?.filter(s => s.eventId === nodeId) || [];

  body.innerHTML = `
    <div class="panel-section-head">Cause &amp; Effect Chain</div>
    <div class="profile-row"><label>Caused by</label>
      <select id="ep-causedby">
        <option value="">— None —</option>
        ${eventNodes.map(n=>`<option value="${n.id}"${p.causedBy===n.id?' selected':''}>${esc(n.name)}</option>`).join('')}
      </select>
    </div>
    <div class="profile-row"><label>Led to</label>
      <select id="ep-ledto">
        <option value="">— None —</option>
        ${eventNodes.map(n=>`<option value="${n.id}"${p.ledTo===n.id?' selected':''}>${esc(n.name)}</option>`).join('')}
      </select>
    </div>

    <div class="panel-section-head" style="margin-top:10px">Linked Scenes</div>
    <div class="link-list">
      ${sceneLinks.length
        ? sceneLinks.map(s=>`<div class="link-item"><span>${esc(s.title||'Untitled scene')}</span></div>`).join('')
        : '<div class="link-empty">No scenes linked to this event</div>'}
    </div>

    <div class="panel-section-head" style="margin-top:10px">Notes</div>
    <textarea id="ep-notes" class="field-textarea">${esc(p.notes||'')}</textarea>
  `;

  _wire(nodeId, {
    'ep-causedby': ['causedBy', false],
    'ep-ledto':    ['ledTo',    false],
    'ep-notes':    ['notes',    false],
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
