// chemistry.js — Chemistry matrix tab
import { state, esc, getOrCreateProfile, updateProfile } from '../state.js';

const CHEMISTRY_TYPES = ['Rivals','Friends','Enemies','Lovers','Mentor/Student','Allies','Complicated','Unknown'];

export function renderChemistry(nodeId) {
  const body = document.getElementById('rp-body');
  if (!body) return;
  const p = getOrCreateProfile(nodeId);
  const chemistry = p.chemistry || {};
  const chars = state.nodes.filter(n => n.type === 'character' && n.id !== nodeId);

  if (!chars.length) {
    body.innerHTML = `<div class="placeholder-view"><div class="ph-icon">⚗️</div><h2>No Other Characters</h2><p>Add more characters to track chemistry.</p></div>`;
    return;
  }

  body.innerHTML = `
    <div style="font-size:11px;color:var(--av-text-muted);margin-bottom:10px">Define how this character relates to each other character.</div>
    <div id="chem-list">
      ${chars.map(c => {
        const rel = chemistry[c.id] || {};
        return `<div class="chem-row" style="border:1px solid var(--av-border);border-radius:var(--av-radius-md);padding:8px 10px;margin-bottom:6px;background:var(--av-bg-elevated)">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
            <div style="width:28px;height:28px;border-radius:50%;background:${c.color||'#7c5cbf'};display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff;flex-shrink:0">${esc(c.letter||'?')}</div>
            <span style="font-size:13px;font-weight:600;color:var(--av-text-primary);flex:1">${esc(c.name||'Character')}</span>
            <select class="chem-type" data-cid="${c.id}" style="font-size:11px;padding:2px 4px;border-radius:var(--av-radius-sm)">
              ${CHEMISTRY_TYPES.map(t => `<option value="${t}" ${rel.type===t?'selected':''}>${t}</option>`).join('')}
            </select>
          </div>
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:5px">
            <span style="font-size:10px;color:var(--av-text-muted);min-width:60px">Chemistry</span>
            <input type="range" class="chem-score" data-cid="${c.id}" min="0" max="100" value="${rel.score??50}" style="flex:1;accent-color:var(--av-accent)">
            <span style="font-size:10px;min-width:24px">${rel.score??50}%</span>
          </div>
          <textarea class="chem-note" data-cid="${c.id}" placeholder="How do they feel about each other?" style="width:100%;min-height:40px;border:1px solid var(--av-border);border-radius:var(--av-radius-sm);padding:4px 6px;font-size:11px;resize:vertical;background:var(--av-input-bg);color:var(--av-text-primary)">${esc(rel.note||'')}</textarea>
        </div>`;
      }).join('')}
    </div>
  `;

  body.querySelectorAll('.chem-type,.chem-note').forEach(el => {
    el.addEventListener('input', e => {
      const cid = e.target.dataset.cid;
      const field = el.classList.contains('chem-type') ? 'type' : 'note';
      const ch = { ...(getOrCreateProfile(nodeId).chemistry || {}) };
      ch[cid] = { ...(ch[cid] || {}), [field]: e.target.value };
      updateProfile(nodeId, { chemistry: ch });
    });
  });

  body.querySelectorAll('.chem-score').forEach(sl => {
    sl.addEventListener('input', e => {
      const cid = sl.dataset.cid;
      sl.nextElementSibling.textContent = e.target.value + '%';
      const ch = { ...(getOrCreateProfile(nodeId).chemistry || {}) };
      ch[cid] = { ...(ch[cid] || {}), score: +e.target.value };
      updateProfile(nodeId, { chemistry: ch });
    });
  });
}
