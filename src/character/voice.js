// ============================================
// voice.js — Voice & Personality tab
// Imports: state.js
// Exports: renderVoice
// ============================================

import { state, esc, getOrCreateProfile, updateProfile, uid } from '../state.js';

const ENNEAGRAM = [
  { n:1, name:'Reformer',   desc:'Principled, purposeful, self-controlled' },
  { n:2, name:'Helper',     desc:'Caring, generous, people-pleasing' },
  { n:3, name:'Achiever',   desc:'Success-oriented, adaptable, driven' },
  { n:4, name:'Individualist', desc:'Expressive, dramatic, self-absorbed' },
  { n:5, name:'Investigator', desc:'Intense, cerebral, perceptive' },
  { n:6, name:'Loyalist',   desc:'Security-oriented, anxious, suspicious' },
  { n:7, name:'Enthusiast', desc:'Spontaneous, versatile, scattered' },
  { n:8, name:'Challenger', desc:'Powerful, dominating, confrontational' },
  { n:9, name:'Peacemaker', desc:'Easygoing, receptive, complacent' },
];

const EMOTIONS = ['Happy','Sad','Angry','Fearful','Sarcastic','Formal','Desperate','Playful','Cold','Vulnerable'];

export function renderVoice(nodeId) {
  const body = document.getElementById('rp-body');
  if (!body) return;
  const p = getOrCreateProfile(nodeId);
  const vc = p.voice || {};
  const samples = vc.samples || [];
  const catchphrases = vc.catchphrases || [];
  const avoided = vc.avoided || [];
  const ax = vc.alignX ?? 50, ay = vc.alignY ?? 50;

  body.innerHTML = `
    <div class="panel-section-head">Moral Alignment</div>
    <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--av-text-muted);margin-bottom:2px;padding:0 4px">
      <span>Lawful</span><span>Chaotic</span>
    </div>
    <div class="alignment-grid" id="align-grid">
      <div style="position:absolute;inset:0;display:grid;grid-template:1fr 1fr/1fr 1fr">
        <div style="background:rgba(52,152,219,.08)"></div><div style="background:rgba(46,204,113,.08)"></div>
        <div style="background:rgba(231,76,60,.08)"></div><div style="background:rgba(149,165,166,.08)"></div>
      </div>
      <div style="position:absolute;left:50%;top:0;bottom:0;border-left:1px solid var(--av-border)"></div>
      <div style="position:absolute;top:50%;left:0;right:0;border-top:1px solid var(--av-border)"></div>
      <div class="align-dot" id="align-dot" style="left:${ax}%;top:${ay}%"></div>
      <div class="align-label" id="align-label">${_alignLabel(ax, ay)}</div>
    </div>
    <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--av-text-muted);padding:2px 4px 8px"><span>Good</span><span>Evil</span></div>

    <div class="panel-section-head">Enneagram Type</div>
    <div class="enneagram-grid" id="enn-grid">
      ${ENNEAGRAM.map(e => `<div class="enneagram-opt${vc.enneagram===e.n?' sel':''}" data-n="${e.n}" title="${e.name}: ${e.desc}">${e.n}</div>`).join('')}
    </div>
    ${vc.enneagram ? `<div style="font-size:10px;color:var(--av-text-muted);margin:4px 0 8px">${ENNEAGRAM.find(e=>e.n===vc.enneagram)?.name||''} — ${ENNEAGRAM.find(e=>e.n===vc.enneagram)?.desc||''}</div>` : ''}

    <div class="panel-section-head">Speech</div>
    <div class="profile-row"><label>Accent</label><input type="text" id="vc-accent" value="${esc(vc.accent||'')}" placeholder="British RP, Southern US..."></div>
    <div class="profile-row"><label>Verbal Tics</label><textarea id="vc-tics" style="flex:1;min-height:44px;padding:5px;font-size:11px;resize:vertical">${esc(vc.tics||'')}</textarea></div>
    <div class="profile-row"><label>Catchphrases</label></div>
    <div id="vc-catchlist" style="margin-bottom:8px">
      ${catchphrases.map((c,i) => `<div style="display:flex;gap:4px;margin-bottom:4px">
        <input type="text" class="vc-catch" data-ci="${i}" value="${esc(c)}" style="flex:1;padding:4px 6px;font-size:11px;border-radius:var(--av-radius-sm)">
        <button class="vc-catch-del btn-sm" data-ci="${i}">✕</button>
      </div>`).join('')}
    </div>
    <button class="btn-sm" id="vc-add-catch" style="margin-bottom:10px">✦ Add Catchphrase</button>

    <div class="profile-row"><label>Avoided Words</label><input type="text" id="vc-avoided" value="${esc(avoided.join(', '))}" placeholder="never, hate, can't..." style="flex:1;padding:5px 8px;font-size:12px;border-radius:var(--av-radius-sm)"></div>

    <div class="panel-section-head">Dialogue Samples
      <button class="btn-sm" id="vc-add-sample" style="float:right">✦ Add</button>
    </div>
    <div id="vc-samples">
      ${samples.map((s,i) => _sampleCard(s, i)).join('')}
    </div>

    <div class="panel-section-head">Music & Aesthetic</div>
    <textarea id="vc-aesthetic" placeholder="What music fits this character? What aesthetic embodies them?" style="width:100%;min-height:56px;border:1px solid var(--av-border);border-radius:var(--av-radius-sm);padding:7px;font-size:12px;resize:vertical;background:var(--av-input-bg);color:var(--av-text-primary)">${esc(vc.aesthetic||'')}</textarea>
  `;

  // Alignment grid
  const grid = document.getElementById('align-grid');
  const dot  = document.getElementById('align-dot');
  const lbl  = document.getElementById('align-label');

  function setAlign(e) {
    const rect = grid.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, (e.clientX - rect.left) / rect.width * 100));
    const y = Math.max(0, Math.min(100, (e.clientY - rect.top)  / rect.height * 100));
    dot.style.left = x + '%'; dot.style.top = y + '%';
    lbl.textContent = _alignLabel(x, y);
    updateProfile(nodeId, { voice: { ...(getOrCreateProfile(nodeId).voice||{}), alignX: x, alignY: y } });
  }
  let aligning = false;
  grid.addEventListener('mousedown', e => { aligning = true; setAlign(e); });
  document.addEventListener('mousemove', e => { if (aligning) setAlign(e); });
  document.addEventListener('mouseup', () => { aligning = false; });

  // Enneagram
  body.querySelectorAll('.enneagram-opt').forEach(opt => {
    opt.onclick = () => {
      body.querySelectorAll('.enneagram-opt').forEach(o => o.classList.remove('sel'));
      opt.classList.add('sel');
      updateProfile(nodeId, { voice: { ...(getOrCreateProfile(nodeId).voice||{}), enneagram: +opt.dataset.n } });
    };
  });

  // Text fields
  const wireVc = (id, field) => {
    document.getElementById(id)?.addEventListener('input', e => {
      updateProfile(nodeId, { voice: { ...(getOrCreateProfile(nodeId).voice||{}), [field]: e.target.value } });
    });
  };
  wireVc('vc-accent', 'accent'); wireVc('vc-tics', 'tics'); wireVc('vc-aesthetic', 'aesthetic');

  // Avoided
  document.getElementById('vc-avoided')?.addEventListener('change', e => {
    updateProfile(nodeId, { voice: { ...(getOrCreateProfile(nodeId).voice||{}), avoided: e.target.value.split(',').map(s=>s.trim()).filter(Boolean) } });
  });

  // Catchphrases
  document.getElementById('vc-add-catch')?.addEventListener('click', () => {
    const vc = getOrCreateProfile(nodeId).voice || {};
    vc.catchphrases = [...(vc.catchphrases||[]), ''];
    updateProfile(nodeId, { voice: vc }); renderVoice(nodeId);
  });
  body.querySelectorAll('.vc-catch').forEach(inp => {
    inp.addEventListener('input', e => {
      const ci = +inp.dataset.ci;
      const vc = getOrCreateProfile(nodeId).voice || {};
      const cp = [...(vc.catchphrases||[])]; cp[ci] = e.target.value;
      updateProfile(nodeId, { voice: { ...vc, catchphrases: cp } });
    });
  });
  body.querySelectorAll('.vc-catch-del').forEach(btn => {
    btn.onclick = () => {
      const vc = getOrCreateProfile(nodeId).voice || {};
      vc.catchphrases = (vc.catchphrases||[]).filter((_,i) => i !== +btn.dataset.ci);
      updateProfile(nodeId, { voice: vc }); renderVoice(nodeId);
    };
  });

  // Dialogue samples
  document.getElementById('vc-add-sample')?.addEventListener('click', () => {
    const vc = getOrCreateProfile(nodeId).voice || {};
    vc.samples = [...(vc.samples||[]), { id: uid(), emotion:'Happy', text:'' }];
    updateProfile(nodeId, { voice: vc }); renderVoice(nodeId);
  });
  body.querySelectorAll('.vc-sample-emo, .vc-sample-txt').forEach(el => {
    el.addEventListener('input', e => {
      const si = +el.dataset.si, field = el.classList.contains('vc-sample-emo') ? 'emotion' : 'text';
      const vc = getOrCreateProfile(nodeId).voice || {};
      const samples = [...(vc.samples||[])];
      samples[si] = { ...samples[si], [field]: e.target.value };
      updateProfile(nodeId, { voice: { ...vc, samples } });
    });
  });
  body.querySelectorAll('.vc-sample-del').forEach(btn => {
    btn.onclick = () => {
      const vc = getOrCreateProfile(nodeId).voice || {};
      vc.samples = (vc.samples||[]).filter((_,i) => i !== +btn.dataset.si);
      updateProfile(nodeId, { voice: vc }); renderVoice(nodeId);
    };
  });
}

function _alignLabel(x, y) {
  const lr = x < 33 ? 'Lawful' : x > 66 ? 'Chaotic' : 'Neutral';
  const ud = y < 33 ? 'Good'   : y > 66 ? 'Evil'    : 'Neutral';
  return lr === 'Neutral' && ud === 'Neutral' ? 'True Neutral' : `${lr} ${ud}`;
}

function _sampleCard(s, idx) {
  return `<div class="sample-card">
    <div style="display:flex;align-items:center;gap:6px">
      <select class="vc-sample-emo" data-si="${idx}" style="font-size:10px;padding:2px 4px">
        ${EMOTIONS.map(e=>`<option value="${e}" ${s.emotion===e?'selected':''}>${e}</option>`).join('')}
      </select>
      <button class="vc-sample-del btn-sm" data-si="${idx}" style="margin-left:auto">✕</button>
    </div>
    <textarea class="vc-sample-txt" data-si="${idx}" placeholder="Dialogue line..." style="width:100%;min-height:44px;margin-top:5px;border:1px solid var(--av-border);border-radius:var(--av-radius-sm);padding:5px;font-size:12px;font-style:italic;resize:vertical;background:var(--av-input-bg);color:var(--av-text-primary)">${esc(s.text||'')}</textarea>
  </div>`;
}
