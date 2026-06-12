// ============================================
// au-tab.js — "Universes" tab in character profile
// Shows this character's overrides across all AUs
// Imports: state.js
// Exports: renderAUTab
// ============================================

import { state, esc, saveHistory } from '../state.js';

export function renderAUTab(nodeId) {
  const body = document.getElementById('rp-body');
  if (!body) return;

  const node = state.nodes.find(n => n.id === nodeId);
  if (!node) return;

  const aus = state.aus || [];

  if (!aus.length) {
    body.innerHTML = `
      <div style="padding:24px 16px;text-align:center;color:var(--av-text-muted)">
        <div style="font-size:24px;margin-bottom:10px;opacity:.4">◈</div>
        <div style="font-size:12px;font-weight:600;color:var(--av-text-secondary);margin-bottom:5px">No AUs yet</div>
        <div style="font-size:11px">Create alternate universes in the <strong>Universes</strong> view to track how ${esc(node.name||'this node')} differs across settings.</div>
      </div>
    `;
    return;
  }

  const canonRole = state.profiles[nodeId]?.role || node.type || '—';
  const isChar    = node.type === 'character';

  body.innerHTML = `
    <div style="padding:10px 0 4px;font-size:11px;color:var(--av-text-muted);margin-bottom:10px;line-height:1.5">
      <strong style="color:var(--av-text-secondary)">Canon:</strong>
      <span style="color:var(--av-text-primary)">${esc(node.name)}</span> · ${esc(canonRole)}
    </div>

    ${aus.map(au => {
      const includedIds = au.includedNodeIds || [];
      const isIncluded  = includedIds.includes(nodeId);
      const isActive    = state.activeAuId === au.id;
      const tags        = (au.tags || []);

      // Read from new nodeOverrides, fall back to legacy characterOverrides
      const ov = (au.nodeOverrides || {})[nodeId] || (au.characterOverrides || {})[nodeId] || {};

      return `
        <div style="
          border:1px solid ${isActive ? 'var(--av-accent)' : 'var(--av-border)'};
          border-left:3px solid ${au.color || '#888888'};
          border-radius:var(--av-radius-md);
          padding:10px 12px;
          margin-bottom:10px;
          background:var(--av-bg-elevated);
          ${!isIncluded ? 'opacity:.65' : ''}
        ">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
            <span style="font-size:12px;font-weight:700;color:var(--av-text-primary);flex:1">${esc(au.name)}</span>
            ${isActive ? `<span style="font-size:9px;font-weight:700;color:var(--av-accent);background:var(--av-accent-soft);padding:1px 6px;border-radius:999px">ACTIVE</span>` : ''}
            ${au.status && au.status !== 'draft' ? `<span style="font-size:9px;color:var(--av-text-muted);padding:1px 5px;border:1px solid var(--av-border);border-radius:4px">${au.status==='active'?'In Progress':'Archived'}</span>` : ''}
          </div>

          ${au.premise ? `<div style="font-size:10px;color:var(--av-text-muted);margin-bottom:5px;font-style:italic">${esc(au.premise)}</div>` : ''}

          ${tags.length ? `
            <div style="display:flex;flex-wrap:wrap;gap:3px;margin-bottom:7px">
              ${tags.map(t => `<span style="font-size:9px;padding:1px 6px;border-radius:999px;background:var(--av-bg-surface);border:1px solid var(--av-border);color:var(--av-text-muted)">${esc(t)}</span>`).join('')}
            </div>
          ` : ''}

          ${au.divergencePoint ? `<div style="font-size:10px;color:var(--av-text-muted);margin-bottom:7px">Diverges after: <em>${esc(au.divergencePoint)}</em></div>` : ''}

          ${!isIncluded ? `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 0 2px">
              <span style="font-size:10px;color:var(--av-text-muted);font-style:italic">Not included in this AU.</span>
              <button class="btn-sm au-include" data-auid="${au.id}" data-nid="${nodeId}" style="font-size:10px;padding:2px 8px">Add to AU</button>
            </div>
          ` : `
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:5px">
              ${_field(au.id, nodeId, 'name',       ov.name||'',       'Name (if changed)', '1/-1')}
              ${isChar ? `
                ${_field(au.id, nodeId, 'occupation',  ov.occupation||'', 'Role / occupation')}
                ${_field(au.id, nodeId, 'appearance',  ov.appearance||'', 'Appearance')}
              ` : `
                ${_field(au.id, nodeId, 'description', ov.description||'', 'Description in AU', '1/-1')}
              `}
              ${_textarea(au.id, nodeId, 'notes', ov.notes||'', 'Notes / personality...')}
            </div>
            <button class="btn-sm au-remove" data-auid="${au.id}" data-nid="${nodeId}"
              style="font-size:9px;margin-top:7px;color:var(--av-text-muted);opacity:.6">Remove from AU</button>
          `}
        </div>
      `;
    }).join('')}
  `;

  // Wire include/remove buttons
  body.querySelectorAll('.au-include').forEach(btn => {
    btn.addEventListener('click', () => {
      const au = (state.aus || []).find(a => a.id === btn.dataset.auid);
      if (!au) return;
      au.includedNodeIds = au.includedNodeIds || [];
      if (!au.includedNodeIds.includes(btn.dataset.nid)) {
        au.includedNodeIds.push(btn.dataset.nid);
        saveHistory();
        renderAUTab(nodeId);
      }
    });
  });

  body.querySelectorAll('.au-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      const au = (state.aus || []).find(a => a.id === btn.dataset.auid);
      if (!au) return;
      au.includedNodeIds = (au.includedNodeIds || []).filter(id => id !== btn.dataset.nid);
      saveHistory();
      renderAUTab(nodeId);
    });
  });

  // Wire override inputs
  body.querySelectorAll('.au-ov-input').forEach(el => {
    el.addEventListener('input', () => {
      const au = (state.aus || []).find(a => a.id === el.dataset.auid);
      if (!au) return;
      au.nodeOverrides = au.nodeOverrides || {};
      au.nodeOverrides[nodeId] = au.nodeOverrides[nodeId] || {};
      au.nodeOverrides[nodeId][el.dataset.field] = el.value;
    });
    el.addEventListener('change', saveHistory);
  });
}

function _field(auid, nodeId, field, value, placeholder, gridColumn = '') {
  return `<input class="au-ov-input" data-auid="${auid}" data-nid="${nodeId}" data-field="${field}"
    value="${esc(value)}" placeholder="${placeholder}"
    style="font-size:11px;padding:4px 7px;border-radius:var(--av-radius-sm);${gridColumn ? `grid-column:${gridColumn}` : ''}">`;
}

function _textarea(auid, nodeId, field, value, placeholder) {
  return `<textarea class="au-ov-input" data-auid="${auid}" data-nid="${nodeId}" data-field="${field}"
    placeholder="${placeholder}"
    style="font-size:11px;padding:4px 7px;border-radius:var(--av-radius-sm);resize:vertical;min-height:48px;grid-column:1/-1">${esc(value)}</textarea>`;
}
