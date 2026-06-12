// ============================================
// basic-info.js — Basic info tab
// Imports: state.js
// Exports: renderBasicTab
// ============================================

import { state, esc, getOrCreateProfile, updateProfile, saveHistory, EventBus } from '../state.js';
import { avatarHTML, wireAvatarUpload } from '../canvas/node-image.js';

const MBTI_TYPES = ['INTJ','INTP','ENTJ','ENTP','INFJ','INFP','ENFJ','ENFP','ISTJ','ISFJ','ESTJ','ESFJ','ISTP','ISFP','ESTP','ESFP'];

export function renderBasicTab(nodeId) {
  const body = document.getElementById('rp-body');
  if (!body) return;
  const node = state.nodes.find(n => n.id === nodeId);
  if (!node) return;
  const p = getOrCreateProfile(nodeId);

  body.innerHTML = `
    <!-- Hero -->
    <div class="profile-hero">
      ${avatarHTML(node)}
      <div>
        <div class="profile-name">${esc(node.name||'Unnamed')}</div>
        <div class="profile-subtitle">${esc(p.role||node.type||'Character')}</div>
      </div>
    </div>

    <!-- Identity -->
    <div class="panel-section-head">Identity</div>
    <div class="profile-row"><label>Name</label><input type="text" id="p-name" value="${esc(node.name||'')}"></div>
    <div class="profile-row"><label>Nickname</label><input type="text" id="p-nick" value="${esc(p.nickname||'')}"></div>
    <div class="profile-row"><label>Role</label><input type="text" id="p-role" value="${esc(p.role||'')}"></div>
    <div class="profile-row"><label>Age</label><input type="text" id="p-age" value="${esc(p.age||'')}" style="max-width:80px"></div>
    <div class="profile-row"><label>Gender</label><input type="text" id="p-gender" value="${esc(p.gender||'')}"></div>
    <div class="profile-row"><label>Species</label><input type="text" id="p-species" value="${esc(p.species||'')}"></div>
    <div class="profile-row"><label>Height</label><input type="text" id="p-height" value="${esc(p.height||'')}" style="max-width:80px"></div>
    <div class="profile-row"><label>Weight</label><input type="text" id="p-weight" value="${esc(p.weight||'')}" style="max-width:80px"></div>
    <div class="profile-row"><label>Nationality</label><input type="text" id="p-nat" value="${esc(p.nationality||'')}"></div>
    <div class="profile-row"><label>DOB</label><input type="text" id="p-dob" value="${esc(p.dob||'')}" placeholder="Day Month Year..."></div>

    <div class="panel-section-head">Personality</div>
    <div class="profile-row"><label>MBTI</label>
      <select id="p-mbti">
        <option value="">—</option>
        ${MBTI_TYPES.map(t => `<option value="${t}" ${p.mbti===t?'selected':''}>${t}</option>`).join('')}
      </select>
    </div>
    <div class="profile-row"><label>Rel. Status</label>
      <select id="p-relstatus">
        ${['','Single','Dating','Married','Complicated','Other'].map(s=>`<option value="${s}" ${p.relStatus===s?'selected':''}>${s||'—'}</option>`).join('')}
      </select>
    </div>
    <div class="profile-row"><label>Color</label><input type="color" id="p-color" value="${node.color||'#7c5cbf'}" style="width:40px;height:28px;padding:2px"></div>

    <div class="panel-section-head">Biography</div>
    <textarea id="p-bio" style="width:100%;min-height:80px;border:1px solid var(--av-border);border-radius:var(--av-radius-sm);padding:7px;font-size:12px;resize:vertical;background:var(--av-input-bg);color:var(--av-text-primary)">${esc(p.bio||'')}</textarea>

    <div class="panel-section-head" style="margin-top:10px">Core Stats</div>
    ${_statRow('Strength',    'str',  p.str  || 5)}
    ${_statRow('Intelligence','int',  p.int  || 5)}
    ${_statRow('Wisdom',      'wis',  p.wis  || 5)}
    ${_statRow('Charisma',    'cha',  p.cha  || 5)}
    ${_statRow('Luck',        'luck', p.luck || 5)}

    <div class="panel-section-head" style="margin-top:10px">Personality Traits</div>
    ${_traitRow('Introverted', 'Extroverted', 'ext',  p.ext  ?? 50)}
    ${_traitRow('Logical',     'Emotional',   'emo',  p.emo  ?? 50)}
    ${_traitRow('Cautious',    'Impulsive',   'imp',  p.imp  ?? 50)}
    ${_traitRow('Kind',        'Ruthless',    'ruth', p.ruth ?? 50)}
    ${_traitRow('Honest',      'Deceptive',   'dec',  p.dec  ?? 50)}

    <div class="panel-section-head" style="margin-top:10px">Tags</div>
    <input type="text" id="p-tags" value="${esc((p.tags||[]).join(', '))}" placeholder="hero, tragic, redemption..." style="width:100%;padding:6px 8px;font-size:12px;border-radius:var(--av-radius-sm)">

    <hr class="av-divider" style="margin-top:14px">
    <button class="btn-danger" id="p-delete" style="width:100%;margin-top:4px">🗑 Delete Character</button>
  `;

  // Wire all inputs
  const wire = (id, field, isNode) => {
    document.getElementById(id)?.addEventListener('input', e => {
      if (isNode) {
        const n = state.nodes.find(n => n.id === nodeId);
        if (n) n[field] = e.target.value;
        if (field === 'color') { n.color = e.target.value; EventBus.emit('nodes:updated'); }
        if (field === 'name')  { n.name = e.target.value; n.letter = e.target.value.charAt(0).toUpperCase(); EventBus.emit('nodes:updated'); }
      } else {
        const update = {}; update[field] = e.target.value;
        updateProfile(nodeId, update);
      }
    });
  };

  wire('p-name',     'name',     true);
  wire('p-color',    'color',    true);
  wire('p-nick',     'nickname', false);
  wire('p-role',     'role',     false);
  wire('p-age',      'age',      false);
  wire('p-gender',   'gender',   false);
  wire('p-species',  'species',  false);
  wire('p-height',   'height',   false);
  wire('p-weight',   'weight',   false);
  wire('p-nat',      'nationality', false);
  wire('p-dob',      'dob',      false);
  wire('p-mbti',     'mbti',     false);
  wire('p-relstatus','relStatus',false);
  wire('p-bio',      'bio',      false);

  // Stats
  ['str','int','wis','cha','luck'].forEach(s => {
    document.getElementById(`p-${s}`)?.addEventListener('input', e => {
      const upd = {}; upd[s] = +e.target.value;
      document.getElementById(`pv-${s}`).textContent = e.target.value;
      updateProfile(nodeId, upd);
    });
  });

  // Traits
  ['ext','emo','imp','ruth','dec'].forEach(t => {
    document.getElementById(`pt-${t}`)?.addEventListener('input', e => {
      const upd = {}; upd[t] = +e.target.value;
      updateProfile(nodeId, upd);
    });
  });

  // Tags
  document.getElementById('p-tags')?.addEventListener('change', e => {
    updateProfile(nodeId, { tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) });
  });

  document.getElementById('p-delete')?.addEventListener('click', () => {
    if (confirm(`Delete "${node.name}"? This cannot be undone.`)) {
      import('../state.js').then(m => { m.deleteNode(nodeId); });
      import('./profile.js').then(m => {}); // leave panel
      document.getElementById('rp-body').innerHTML = '<div style="padding:20px;text-align:center;color:var(--av-text-muted);font-size:11px">Character deleted.</div>';
      document.getElementById('rp-tabs').innerHTML = '';
    }
  });

  wireAvatarUpload(nodeId, () => import('./basic-info.js').then(m => m.renderBasicTab(nodeId)));
}

function _statRow(label, id, val) {
  return `<div class="trait-row">
    <label>${label}</label>
    <input type="range" id="p-${id}" min="1" max="10" value="${val}">
    <span class="trait-val" id="pv-${id}">${val}</span>
  </div>`;
}

function _traitRow(leftLabel, rightLabel, id, val) {
  return `<div style="margin-bottom:7px">
    <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--av-text-muted);margin-bottom:2px">
      <span>${leftLabel}</span><span>${rightLabel}</span>
    </div>
    <input type="range" id="pt-${id}" min="0" max="100" value="${val}" style="width:100%;accent-color:var(--av-accent)">
  </div>`;
}
