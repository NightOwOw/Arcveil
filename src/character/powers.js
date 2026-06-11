// ============================================
// powers.js — Powers & Abilities tab
// Imports: state.js
// Exports: renderPowers
// ============================================

import { state, esc, getOrCreateProfile, updateProfile, uid } from '../state.js';

const ABILITY_TYPES = ['Active','Passive','Ultimate','Innate','Reaction','Stance','Buff','Debuff'];
const WEAKNESS_TYPES = ['Physical','Elemental','Magical','Psychological','Social','Material','Temporal','Other'];

export function renderPowers(nodeId) {
  const body = document.getElementById('rp-body');
  if (!body) return;
  const p = getOrCreateProfile(nodeId);
  const pw = p.powers || { origin:'', abilities:[], weaknesses:[] };

  body.innerHTML = `
    <div class="panel-section-head">Power Origin</div>
    <textarea id="pw-origin" placeholder="How did they get their powers? What is the source?" style="width:100%;min-height:64px;border:1px solid var(--av-border);border-radius:var(--av-radius-sm);padding:7px;font-size:12px;resize:vertical;background:var(--av-input-bg);color:var(--av-text-primary)">${esc(pw.origin||'')}</textarea>

    <div class="panel-section-head" style="margin-top:10px;display:flex;align-items:center">
      Abilities
      <button class="btn-sm" id="pw-add-ability" style="margin-left:auto">✦ Add</button>
    </div>
    <div id="pw-ability-list">
      ${(pw.abilities||[]).map((a,i) => _abilityCard(a, i)).join('')}
    </div>

    <div class="panel-section-head" style="display:flex;align-items:center">
      Weaknesses
      <button class="btn-sm" id="pw-add-weak" style="margin-left:auto">✦ Add</button>
    </div>
    <div id="pw-weak-list">
      ${(pw.weaknesses||[]).map((w,i) => _weakCard(w, i)).join('')}
    </div>
  `;

  document.getElementById('pw-origin')?.addEventListener('input', e => {
    const pw = getOrCreateProfile(nodeId).powers || {};
    updateProfile(nodeId, { powers: { ...pw, origin: e.target.value } });
  });

  _wireAbilities(nodeId, pw);
  _wireWeaknesses(nodeId, pw);

  document.getElementById('pw-add-ability')?.addEventListener('click', () => {
    const pw = getOrCreateProfile(nodeId).powers || { abilities:[], weaknesses:[] };
    pw.abilities = pw.abilities || [];
    pw.abilities.push({ id: uid(), name:'New Ability', type:'Active', desc:'', cost:'', cooldown:'', range:'', proficiency:1, vfx:'' });
    updateProfile(nodeId, { powers: pw });
    renderPowers(nodeId);
  });

  document.getElementById('pw-add-weak')?.addEventListener('click', () => {
    const pw = getOrCreateProfile(nodeId).powers || { abilities:[], weaknesses:[] };
    pw.weaknesses = pw.weaknesses || [];
    pw.weaknesses.push({ id: uid(), name:'New Weakness', type:'Physical', severity:3, desc:'' });
    updateProfile(nodeId, { powers: pw });
    renderPowers(nodeId);
  });

  // Expand ability cards
  body.querySelectorAll('.ability-header').forEach(h => {
    h.onclick = () => h.nextElementSibling?.classList.toggle('open');
  });
}

function _abilityCard(a, idx) {
  const dots = Array.from({length:5}, (_,i) =>
    `<div class="prof-dot${i < (a.proficiency||1) ? ' filled':''}" data-ai="${idx}" data-dot="${i+1}"></div>`).join('');
  return `<div class="ability-card">
    <div class="ability-header">
      <div style="flex:1;font-size:12px;font-weight:600;color:var(--av-text-primary)">${esc(a.name||'Ability')}</div>
      <div style="font-size:10px;color:var(--av-text-muted);margin-right:6px">${esc(a.type||'')}</div>
      <div class="proficiency-dots">${dots}</div>
    </div>
    <div class="ability-body">
      <div class="profile-row"><label>Name</label><input type="text" class="ab-name" data-ai="${idx}" value="${esc(a.name||'')}"></div>
      <div class="profile-row"><label>Type</label>
        <select class="ab-type" data-ai="${idx}">
          ${ABILITY_TYPES.map(t => `<option value="${t}" ${a.type===t?'selected':''}>${t}</option>`).join('')}
        </select>
      </div>
      <div class="profile-row"><label>Cost</label><input type="text" class="ab-cost" data-ai="${idx}" value="${esc(a.cost||'')}"></div>
      <div class="profile-row"><label>Cooldown</label><input type="text" class="ab-cd" data-ai="${idx}" value="${esc(a.cooldown||'')}"></div>
      <div class="profile-row"><label>Range</label><input type="text" class="ab-range" data-ai="${idx}" value="${esc(a.range||'')}"></div>
      <div class="profile-row"><label>VFX</label><input type="text" class="ab-vfx" data-ai="${idx}" value="${esc(a.vfx||'')}" placeholder="Visual effect description"></div>
      <div style="margin-top:4px"><label style="font-size:11px;color:var(--av-text-secondary)">Description</label>
        <textarea class="ab-desc" data-ai="${idx}" style="width:100%;min-height:52px;margin-top:4px;border:1px solid var(--av-border);border-radius:var(--av-radius-sm);padding:5px;font-size:11px;resize:vertical;background:var(--av-input-bg);color:var(--av-text-primary)">${esc(a.desc||'')}</textarea>
      </div>
      <button class="btn-danger ab-del" data-ai="${idx}" style="margin-top:6px;padding:3px 10px;font-size:10px">🗑 Remove</button>
    </div>
  </div>`;
}

function _weakCard(w, idx) {
  return `<div style="border:1px solid var(--av-border);border-radius:var(--av-radius-md);padding:8px 10px;margin-bottom:5px;background:var(--av-bg-elevated)">
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
      <input type="text" class="wk-name" data-wi="${idx}" value="${esc(w.name||'')}" placeholder="Weakness name" style="flex:1;padding:4px 6px;font-size:12px;border-radius:var(--av-radius-sm)">
      <select class="wk-type" data-wi="${idx}" style="font-size:10px;padding:3px 4px">
        ${WEAKNESS_TYPES.map(t => `<option value="${t}" ${w.type===t?'selected':''}>${t}</option>`).join('')}
      </select>
      <button class="btn-danger wk-del" data-wi="${idx}" style="padding:2px 8px;font-size:10px">🗑</button>
    </div>
    <div style="display:flex;align-items:center;gap:6px">
      <span style="font-size:10px;color:var(--av-text-muted)">Severity</span>
      <input type="range" class="wk-sev" data-wi="${idx}" min="1" max="5" value="${w.severity||3}" style="flex:1;accent-color:var(--av-danger)">
      <span style="font-size:10px;color:var(--av-text-muted)">${_sevLabel(w.severity||3)}</span>
    </div>
    <textarea class="wk-desc" data-wi="${idx}" placeholder="Description..." style="width:100%;min-height:38px;margin-top:5px;border:1px solid var(--av-border);border-radius:var(--av-radius-sm);padding:4px 6px;font-size:11px;resize:vertical;background:var(--av-input-bg);color:var(--av-text-primary)">${esc(w.desc||'')}</textarea>
  </div>`;
}

function _sevLabel(v) {
  return ['Minor','Moderate','Major','Severe','Critical'][v-1] || 'Minor';
}

function _wireAbilities(nodeId, pw) {
  const b = document.getElementById('rp-body');
  if (!b) return;

  b.querySelectorAll('.ab-name, .ab-type, .ab-cost, .ab-cd, .ab-range, .ab-vfx, .ab-desc').forEach(el => {
    el.addEventListener('input', e => {
      const ai = +e.target.dataset.ai;
      const fieldMap = { 'ab-name':'name','ab-type':'type','ab-cost':'cost','ab-cd':'cooldown','ab-range':'range','ab-vfx':'vfx','ab-desc':'desc' };
      const cls = Array.from(e.target.classList).find(c => fieldMap[c]);
      if (cls) {
        const pw = getOrCreateProfile(nodeId).powers || {};
        if (pw.abilities?.[ai]) { pw.abilities[ai][fieldMap[cls]] = e.target.value; updateProfile(nodeId, { powers: pw }); }
      }
    });
  });

  b.querySelectorAll('.prof-dot').forEach(dot => {
    dot.onclick = () => {
      const ai = +dot.dataset.ai, val = +dot.dataset.dot;
      const pw = getOrCreateProfile(nodeId).powers || {};
      if (pw.abilities?.[ai]) { pw.abilities[ai].proficiency = val; updateProfile(nodeId, { powers: pw }); renderPowers(nodeId); }
    };
  });

  b.querySelectorAll('.ab-del').forEach(btn => {
    btn.onclick = () => {
      const ai = +btn.dataset.ai;
      const pw = getOrCreateProfile(nodeId).powers || {};
      pw.abilities = pw.abilities.filter((_,i) => i !== ai);
      updateProfile(nodeId, { powers: pw }); renderPowers(nodeId);
    };
  });
}

function _wireWeaknesses(nodeId, pw) {
  const b = document.getElementById('rp-body');
  if (!b) return;
  b.querySelectorAll('.wk-name, .wk-type, .wk-desc').forEach(el => {
    el.addEventListener('input', e => {
      const wi = +e.target.dataset.wi;
      const fieldMap = {'wk-name':'name','wk-type':'type','wk-desc':'desc'};
      const cls = Array.from(e.target.classList).find(c => fieldMap[c]);
      if (cls) {
        const pw = getOrCreateProfile(nodeId).powers || {};
        if (pw.weaknesses?.[wi]) { pw.weaknesses[wi][fieldMap[cls]] = e.target.value; updateProfile(nodeId, { powers: pw }); }
      }
    });
  });
  b.querySelectorAll('.wk-sev').forEach(sl => {
    sl.oninput = e => {
      const wi = +sl.dataset.wi;
      const pw = getOrCreateProfile(nodeId).powers || {};
      if (pw.weaknesses?.[wi]) { pw.weaknesses[wi].severity = +e.target.value; updateProfile(nodeId, { powers: pw }); }
    };
  });
  b.querySelectorAll('.wk-del').forEach(btn => {
    btn.onclick = () => {
      const wi = +btn.dataset.wi;
      const pw = getOrCreateProfile(nodeId).powers || {};
      pw.weaknesses = pw.weaknesses.filter((_,i) => i !== wi);
      updateProfile(nodeId, { powers: pw }); renderPowers(nodeId);
    };
  });
}
