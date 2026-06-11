// relationships.js — Relationship map tab (simplified tree view)
import { state, esc, getOrCreateProfile, updateProfile, uid } from '../state.js';

export function renderRelationships(nodeId) {
  const body = document.getElementById('rp-body');
  if (!body) return;
  const p = getOrCreateProfile(nodeId);
  const rels = p.relationships || [];
  const node = state.nodes.find(n => n.id === nodeId);
  const otherNodes = state.nodes.filter(n => n.id !== nodeId);

  body.innerHTML = `
    <div style="font-size:11px;color:var(--av-text-muted);margin-bottom:10px">Track narrative relationships beyond the canvas edges.</div>
    <div id="rel-list">
      ${rels.map((r, i) => _relRow(r, i, otherNodes)).join('')}
    </div>
    <button class="btn-sm" id="add-rel" style="margin-top:4px">✦ Add Relationship</button>

    <div class="panel-section-head" style="margin-top:12px">Relationship Web</div>
    <canvas id="rel-mini-canvas" width="260" height="180" style="width:100%;border-radius:var(--av-radius-md);background:var(--av-bg-elevated);display:block"></canvas>
  `;

  document.getElementById('add-rel')?.addEventListener('click', () => {
    const rls = [...(getOrCreateProfile(nodeId).relationships || []), { id: uid(), targetId:'', label:'', desc:'' }];
    updateProfile(nodeId, { relationships: rls });
    renderRelationships(nodeId);
  });

  body.querySelectorAll('.rel-target,.rel-label,.rel-desc').forEach(el => {
    el.addEventListener('input', e => {
      const ri = +e.target.dataset.ri;
      const field = el.classList.contains('rel-target') ? 'targetId' : el.classList.contains('rel-label') ? 'label' : 'desc';
      const rls = [...(getOrCreateProfile(nodeId).relationships || [])];
      if (rls[ri]) { rls[ri][field] = e.target.value; updateProfile(nodeId, { relationships: rls }); }
    });
  });

  body.querySelectorAll('.rel-del').forEach(btn => {
    btn.onclick = () => {
      const rls = (getOrCreateProfile(nodeId).relationships || []).filter((_,i) => i !== +btn.dataset.ri);
      updateProfile(nodeId, { relationships: rls });
      renderRelationships(nodeId);
    };
  });

  _drawRelWeb(nodeId, node, rels, otherNodes);
}

function _relRow(r, idx, otherNodes) {
  return `<div style="border:1px solid var(--av-border);border-radius:var(--av-radius-md);padding:6px 8px;margin-bottom:5px;background:var(--av-bg-elevated)">
    <div style="display:flex;gap:4px;margin-bottom:4px">
      <select class="rel-target" data-ri="${idx}" style="flex:1;font-size:11px;padding:2px 4px;border-radius:var(--av-radius-sm)">
        <option value="">— Select character/node —</option>
        ${otherNodes.map(n => `<option value="${n.id}" ${r.targetId===n.id?'selected':''}>${n.name||n.id}</option>`).join('')}
      </select>
      <button class="btn-sm rel-del" data-ri="${idx}">✕</button>
    </div>
    <input type="text" class="rel-label" data-ri="${idx}" value="${esc(r.label||'')}" placeholder="Relationship label (e.g. 'Mentor', 'Rival')..." style="width:100%;margin-bottom:4px;padding:3px 6px;font-size:11px;border-radius:var(--av-radius-sm)">
    <textarea class="rel-desc" data-ri="${idx}" placeholder="Notes..." style="width:100%;min-height:36px;border:1px solid var(--av-border);border-radius:var(--av-radius-sm);padding:4px 6px;font-size:11px;resize:vertical;background:var(--av-input-bg);color:var(--av-text-primary)">${esc(r.desc||'')}</textarea>
  </div>`;
}

function _drawRelWeb(nodeId, node, rels, otherNodes) {
  const canvas = document.getElementById('rel-mini-canvas');
  if (!canvas || !node) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  const cx = W/2, cy = H/2;
  const connected = rels.map(r => otherNodes.find(n => n.id === r.targetId)).filter(Boolean);
  const angle = Math.PI * 2 / Math.max(connected.length, 1);
  const r = Math.min(W, H) * 0.35;

  ctx.font = '9px sans-serif';
  ctx.textAlign = 'center';

  connected.forEach((n, i) => {
    const a = angle * i - Math.PI/2;
    const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
    ctx.strokeStyle = '#888'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x, y); ctx.stroke();
    ctx.fillStyle = n.color || '#7c5cbf';
    ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillText((n.letter||'?'), x, y+3);
    ctx.fillStyle = '#aaa'; ctx.fillText(rels[i]?.label||'', (cx+x)/2, (cy+y)/2-3);
  });

  ctx.fillStyle = node.color || '#7c5cbf';
  ctx.beginPath(); ctx.arc(cx, cy, 14, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 10px sans-serif';
  ctx.fillText(node.letter||'?', cx, cy+3);
}
