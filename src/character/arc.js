// arc.js — Character Arc tab: vertical chapters with add/remove
import { state, esc, getOrCreateProfile, updateProfile, uid } from '../state.js';

export function renderArc(nodeId) {
  const body = document.getElementById('rp-body');
  if (!body) return;
  const p = getOrCreateProfile(nodeId);
  if (!p.arc) p.arc = {};

  // Migrate old start/end format → chapters array
  if (!p.arc.chapters) {
    p.arc.chapters = [
      { id: 'ch-start', label: 'Beginning', goal: p.arc.start?.goal || '', fear: p.arc.start?.fear || '', lie: p.arc.start?.lie || '', wound: p.arc.start?.wound || '', summary: p.arc.start?.summary || '' },
      { id: 'ch-end',   label: 'End',       goal: p.arc.end?.goal   || '', fear: p.arc.end?.fear   || '', lie: p.arc.end?.lie   || '', wound: p.arc.end?.wound   || '', summary: p.arc.end?.summary   || '' },
    ];
  }

  _render(body, nodeId, p);
}

function _render(body, nodeId, p) {
  const chs = p.arc.chapters;

  body.innerHTML = `
    <div style="font-size:11px;color:var(--av-text-muted);padding:0 0 10px">Track how your character evolves across your story.</div>
    <div id="arc-chapters">${chs.map((ch, i) => _chHTML(ch, i, chs.length)).join('')}</div>
    <button id="arc-add-btn" style="
      width:100%;margin-top:8px;padding:8px;
      border:1px dashed var(--av-border);border-radius:var(--av-radius-md);
      font-size:11px;color:var(--av-text-muted);background:none;cursor:pointer;
      transition:border-color .15s,color .15s">+ Add Arc Point</button>
    <div id="arc-verdict" style="
      margin-top:12px;font-size:11px;padding:8px;
      background:var(--av-bg-elevated);border-radius:var(--av-radius-md);
      color:var(--av-text-secondary)">${_verdict(chs)}</div>
  `;

  const addBtn = document.getElementById('arc-add-btn');
  addBtn.addEventListener('mouseenter', () => { addBtn.style.borderColor = 'var(--av-accent)'; addBtn.style.color = 'var(--av-accent)'; });
  addBtn.addEventListener('mouseleave', () => { addBtn.style.borderColor = ''; addBtn.style.color = ''; });
  addBtn.addEventListener('click', () => {
    p.arc.chapters.push({ id: uid(), label: `Act ${p.arc.chapters.length + 1}`, goal: '', fear: '', lie: '', wound: '', summary: '' });
    updateProfile(nodeId, { arc: p.arc });
    renderArc(nodeId);
  });

  body.querySelectorAll('input[data-arc-label]').forEach(el => {
    el.addEventListener('input', () => {
      p.arc.chapters[+el.dataset.arcLabel].label = el.value;
      updateProfile(nodeId, { arc: p.arc });
    });
  });

  body.querySelectorAll('[data-arc-field]').forEach(el => {
    el.addEventListener('input', () => {
      const idx = +el.dataset.arcIdx;
      p.arc.chapters[idx][el.dataset.arcField] = el.value;
      updateProfile(nodeId, { arc: p.arc });
      document.getElementById('arc-verdict').innerHTML = _verdict(p.arc.chapters);
    });
  });

  body.querySelectorAll('[data-arc-delete]').forEach(btn => {
    btn.addEventListener('click', () => {
      p.arc.chapters.splice(+btn.dataset.arcDelete, 1);
      updateProfile(nodeId, { arc: p.arc });
      renderArc(nodeId);
    });
  });
}

function _chHTML(ch, idx, total) {
  const canDel = total > 1;
  return `
    <div style="margin-bottom:10px;padding:10px;background:var(--av-bg-elevated);border-radius:var(--av-radius-md);border:1px solid var(--av-border)">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid var(--av-border)">
        <svg viewBox="0 0 12 12" style="width:10px;height:10px;fill:var(--av-accent);flex-shrink:0"><circle cx="6" cy="6" r="5"/></svg>
        <input data-arc-label="${idx}" value="${esc(ch.label)}" style="flex:1;font-size:12px;font-weight:600;background:none;border:none;color:var(--av-text-primary);padding:0;outline:none">
        ${canDel ? `<button data-arc-delete="${idx}" title="Remove" style="border:none;background:none;color:var(--av-text-muted);cursor:pointer;font-size:11px;padding:0;line-height:1">✕</button>` : ''}
      </div>
      <div class="profile-row"><label>Goal</label><input type="text" data-arc-idx="${idx}" data-arc-field="goal" value="${esc(ch.goal||'')}" placeholder="What do they want?"></div>
      <div class="profile-row"><label>Fear</label><input type="text" data-arc-idx="${idx}" data-arc-field="fear" value="${esc(ch.fear||'')}" placeholder="What do they fear?"></div>
      <div class="profile-row"><label>Lie They Believe</label><input type="text" data-arc-idx="${idx}" data-arc-field="lie" value="${esc(ch.lie||'')}" placeholder="False belief..."></div>
      <div class="profile-row"><label>Core Wound</label><input type="text" data-arc-idx="${idx}" data-arc-field="wound" value="${esc(ch.wound||'')}" placeholder="Root trauma..."></div>
      <div style="margin-top:6px">
        <label style="font-size:10px;color:var(--av-text-muted)">Summary</label>
        <textarea data-arc-idx="${idx}" data-arc-field="summary" rows="2" placeholder="Brief summary of this stage..." style="width:100%;margin-top:3px;padding:5px;font-size:11px;border:1px solid var(--av-border);border-radius:4px;resize:vertical;background:var(--av-input-bg);color:var(--av-text-primary);box-sizing:border-box">${esc(ch.summary||'')}</textarea>
      </div>
    </div>
  `;
}

function _verdict(chapters) {
  if (!chapters.length) return 'Add arc points to track character growth.';
  const first = chapters[0], last = chapters[chapters.length - 1];
  if (!first.goal && !last.goal) return 'Fill in the arc points to see how your character changes.';
  const changed = (first.goal !== last.goal) || (first.fear !== last.fear) || (first.lie !== last.lie);
  return changed
    ? '✓ This character has a clear arc — they change significantly.'
    : '= No change detected yet. Consider how they grow.';
}
