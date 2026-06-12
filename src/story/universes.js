// ============================================
// universes.js — Alternate Universe manager
// Imports: state.js
// Exports: renderUniversesView, updateAUBanner
// ============================================

import { state, EventBus, uid, esc, saveHistory } from '../state.js';

const TROPE_PRESETS = [
  'Coffee Shop', 'High School', 'College', 'Modern', 'Royalty', 'Sci-Fi',
  'Fantasy', 'Dark AU', 'Soulmate', 'Time Travel', 'Canon Divergence',
  'Alternate Timeline', 'Age Swap', 'Role Reversal', 'Enemies to Lovers',
  'Found Family', 'Sports', 'Magic School', 'Post-Apocalypse', 'Noir',
  'Cyberpunk', 'Historical', 'Omegaverse', 'Superhero', 'Western',
];

const ALLOWED_TYPES = ['character', 'location', 'faction', 'item', 'event'];

let _view = null;
let _closeDropdownsFn = null;

export function renderUniversesView(container) {
  _view = container || document.getElementById('view-universes');
  if (!_view) return;
  _render();
  EventBus.off('nodes:updated', _render);
  EventBus.on('nodes:updated', _render);
  EventBus.off('project:loaded', _render);
  EventBus.on('project:loaded', _render);
}

function _render() {
  if (!_view) return;
  const aus      = state.aus || [];
  const allNodes = state.nodes.filter(n => ALLOWED_TYPES.includes(n.type));
  const activeId = state.activeAuId || null;

  _view.innerHTML = `
    <div style="display:flex;flex-direction:column;height:100%">

      <div style="padding:14px 16px 12px;border-bottom:1px solid var(--av-border);display:flex;align-items:center;gap:10px;flex-shrink:0;background:var(--av-bg-secondary)">
        <div style="flex:1">
          <h2 style="font-size:14px;font-weight:700;color:var(--av-text-primary)">Alternate Universes</h2>
          <div style="font-size:11px;color:var(--av-text-muted);margin-top:1px">Branch your story into different settings, timelines, and genres</div>
        </div>
        <button class="btn-primary" id="au-add" style="padding:5px 14px;font-size:12px">+ New AU</button>
      </div>

      <div style="flex:1;overflow-y:auto;padding:16px">
        ${!aus.length ? `
          <div style="text-align:center;padding:60px 24px;color:var(--av-text-muted)">
            <div style="font-size:36px;margin-bottom:12px;opacity:.4">◈</div>
            <div style="font-size:13px;font-weight:600;color:var(--av-text-secondary);margin-bottom:6px">No alternate universes yet</div>
            <div style="font-size:11px;max-width:320px;margin:0 auto;line-height:1.5">
              An AU lets you explore your story in a completely different world — modern coffee-shop, space opera, college, time-skip, or anything else.
            </div>
          </div>
        ` : aus.map(au => _auCard(au, allNodes, activeId)).join('')}
      </div>

    </div>
  `;

  document.getElementById('au-add')?.addEventListener('click', () => {
    state.aus = state.aus || [];
    state.aus.push({
      id: uid(), name: 'New AU', premise: '', genre: '', worldNotes: '',
      color: '#888888', tags: [], divergencePoint: '', status: 'draft',
      includedNodeIds: [], nodeOverrides: {}, relationshipOverrides: [],
      snapshot: null,
    });
    saveHistory();
    _render();
  });

  _wireCards(allNodes);
}

// ── AU Card ───────────────────────────────────────────────────────────────────

function _auCard(au, allNodes, activeId) {
  const isActive    = au.id === activeId;
  const tags        = au.tags || [];
  const includedIds = au.includedNodeIds || [];
  const included    = allNodes.filter(n => includedIds.includes(n.id));
  const excluded    = allNodes.filter(n => !includedIds.includes(n.id));
  const status      = au.status || 'draft';
  const relOvs      = au.relationshipOverrides || [];

  const ovCount = included.filter(n => {
    const ov = _getOv(au, n.id);
    return Object.values(ov).some(v => v);
  }).length;

  const STATUS_LABEL = { draft: 'Draft', active: 'In Progress', archived: 'Archived' };
  const STATUS_STYLE = {
    draft:    'background:var(--av-bg-surface);color:var(--av-text-muted)',
    active:   'background:var(--av-accent-soft);color:var(--av-accent)',
    archived: 'background:var(--av-bg-surface);color:var(--av-text-muted);opacity:.6',
  };

  return `
    <div class="au-card" data-id="${au.id}" style="
      background:var(--av-bg-elevated);
      border:1.5px solid ${isActive ? 'var(--av-accent)' : 'var(--av-border)'};
      border-left:4px solid ${au.color || '#888888'};
      border-radius:var(--av-radius-lg);
      margin-bottom:14px;overflow:hidden;
    ">

      <!-- ── Header ── -->
      <div style="padding:12px 14px;display:flex;align-items:center;gap:10px;border-bottom:1px solid var(--av-border)">
        <div style="flex:1;min-width:0">
          <input class="au-f au-name" data-id="${au.id}" data-field="name" value="${esc(au.name)}"
            placeholder="AU name..."
            style="font-size:14px;font-weight:700;color:var(--av-text-primary);background:none;border:none;outline:none;width:100%;padding:0">
          <input class="au-f" data-id="${au.id}" data-field="premise" value="${esc(au.premise||'')}"
            placeholder="Premise — describe this AU in one sentence..."
            style="font-size:11px;color:var(--av-text-secondary);background:none;border:none;outline:none;width:100%;padding:0;margin-top:2px">
        </div>
        <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
          ${isActive ? `<span style="font-size:10px;font-weight:700;color:var(--av-accent);background:var(--av-accent-soft);padding:2px 8px;border-radius:999px">ACTIVE</span>` : ''}
          <select class="au-f" data-id="${au.id}" data-field="status"
            style="font-size:10px;padding:2px 6px;border-radius:var(--av-radius-sm);border:1px solid var(--av-border);cursor:pointer;${STATUS_STYLE[status]}">
            <option value="draft"    ${status==='draft'?'selected':''}>Draft</option>
            <option value="active"   ${status==='active'?'selected':''}>In Progress</option>
            <option value="archived" ${status==='archived'?'selected':''}>Archived</option>
          </select>
          <input type="color" class="au-f" data-id="${au.id}" data-field="color" value="${esc(au.color||'#888888')}"
            title="AU colour" style="width:24px;height:24px;padding:2px;border:none;border-radius:4px;cursor:pointer;background:none">
          <button class="btn-sm au-activate" data-id="${au.id}"
            style="font-size:11px;${isActive ? 'background:var(--av-accent);color:#fff;border-color:var(--av-accent)' : ''}">
            ${isActive ? 'Deactivate' : 'Activate'}
          </button>
          <button class="btn-sm au-dup" data-id="${au.id}" title="Duplicate AU" style="font-size:11px">⧉</button>
          <button class="btn-sm au-del" data-id="${au.id}" style="font-size:11px;color:var(--av-danger)">✕</button>
        </div>
      </div>

      <!-- ── Trope Tags ── -->
      <div style="padding:8px 14px;display:flex;flex-wrap:wrap;gap:5px;align-items:center;border-bottom:1px solid var(--av-border)">
        ${tags.map(tag => `
          <span style="display:inline-flex;align-items:center;gap:3px;font-size:10px;padding:2px 8px;
            border-radius:999px;background:var(--av-bg-surface);border:1px solid var(--av-border);
            color:var(--av-text-secondary)">
            ${esc(tag)}
            <span class="au-tag-del" data-id="${au.id}" data-tag="${esc(tag)}"
              style="cursor:pointer;opacity:.5;line-height:1;margin-left:1px">×</span>
          </span>
        `).join('')}
        <div class="au-tag-picker" data-id="${au.id}" style="position:relative;display:inline-block">
          <button class="btn-sm au-tag-open" data-id="${au.id}"
            style="font-size:10px;padding:2px 8px;border-radius:999px">＋ Tag</button>
          <div class="au-tag-dd" data-id="${au.id}" style="
            display:none;position:absolute;top:calc(100% + 4px);left:0;z-index:300;
            background:var(--av-bg-elevated);border:1px solid var(--av-border);
            border-radius:var(--av-radius-md);padding:8px;min-width:200px;
            box-shadow:0 4px 20px rgba(0,0,0,.4)">
            <input class="au-tag-custom" data-id="${au.id}" placeholder="Type custom tag + Enter"
              style="width:100%;font-size:11px;padding:4px 8px;border-radius:var(--av-radius-sm);
              margin-bottom:6px;box-sizing:border-box">
            <div style="max-height:140px;overflow-y:auto;display:flex;flex-wrap:wrap;gap:3px">
              ${TROPE_PRESETS.filter(t => !tags.includes(t)).map(t => `
                <span class="au-tag-preset" data-id="${au.id}" data-tag="${esc(t)}"
                  style="font-size:10px;padding:2px 8px;border-radius:999px;cursor:pointer;
                  background:var(--av-bg-surface);border:1px solid var(--av-border);
                  color:var(--av-text-secondary);transition:background .1s">
                  ${esc(t)}
                </span>
              `).join('')}
            </div>
          </div>
        </div>
        ${!tags.length ? `<span style="font-size:10px;color:var(--av-text-muted);font-style:italic">No trope tags yet</span>` : ''}
      </div>

      <!-- ── Meta Row ── -->
      <div style="padding:8px 14px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;border-bottom:1px solid var(--av-border)">
        <input class="au-f" data-id="${au.id}" data-field="genre" value="${esc(au.genre||'')}"
          placeholder="Genre / type..."
          style="width:110px;font-size:11px;padding:4px 8px;border-radius:var(--av-radius-sm)">
        <input class="au-f" data-id="${au.id}" data-field="worldNotes" value="${esc(au.worldNotes||'')}"
          placeholder="World notes — what's fundamentally different here?"
          style="flex:1;min-width:140px;font-size:11px;padding:4px 8px;border-radius:var(--av-radius-sm)">
        <span style="font-size:10px;color:var(--av-text-muted);white-space:nowrap;flex-shrink:0">Diverges after:</span>
        <input class="au-f" data-id="${au.id}" data-field="divergencePoint" value="${esc(au.divergencePoint||'')}"
          placeholder="Story point, chapter, or event..."
          style="width:160px;font-size:11px;padding:4px 8px;border-radius:var(--av-radius-sm)">
      </div>

      <!-- ── Included Nodes ── -->
      <div style="padding:10px 14px;border-bottom:1px solid var(--av-border)">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
          <span style="font-size:10px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:var(--av-text-muted)">
            Included${included.length ? ` (${included.length})` : ''}
          </span>
          <span style="flex:1"></span>
          ${ovCount ? `<span style="font-size:10px;color:var(--av-text-muted)">${ovCount} override${ovCount===1?'':'s'}</span>` : ''}
          ${excluded.length ? `
            <div class="au-node-picker" data-id="${au.id}" style="position:relative">
              <button class="btn-sm au-node-open" data-id="${au.id}" style="font-size:10px;padding:2px 8px">＋ Add Node</button>
              <div class="au-node-dd" data-id="${au.id}" style="
                display:none;position:absolute;top:calc(100% + 4px);right:0;z-index:300;
                background:var(--av-bg-elevated);border:1px solid var(--av-border);
                border-radius:var(--av-radius-md);padding:4px;min-width:200px;
                box-shadow:0 4px 20px rgba(0,0,0,.4);max-height:220px;overflow-y:auto">
                ${excluded.map(n => `
                  <div class="au-node-add" data-id="${au.id}" data-nid="${n.id}" style="
                    display:flex;align-items:center;gap:7px;padding:6px 8px;
                    border-radius:var(--av-radius-sm);cursor:pointer;transition:background .1s">
                    <div style="width:20px;height:20px;border-radius:${n.type==='character'?'50%':'4px'};
                      background:${n.color||'#7c5cbf'};display:flex;align-items:center;
                      justify-content:center;font-size:9px;font-weight:800;color:#fff;flex-shrink:0">
                      ${esc(n.letter||'?')}
                    </div>
                    <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
                      font-size:11px;color:var(--av-text-secondary)">${esc(n.name||'Unnamed')}</span>
                    <span style="font-size:9px;color:var(--av-text-muted)">${n.type}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}
        </div>

        ${included.length === 0 ? `
          <div style="font-size:11px;color:var(--av-text-muted);font-style:italic;padding:4px 0 2px">
            Click <strong>＋ Add Node</strong> to choose which characters, locations, and factions change in this AU.
          </div>
        ` : `
          <div style="max-height:260px;overflow-y:auto;overflow-x:hidden;border-radius:var(--av-radius-sm)">
            ${included.map(n => _nodeRow(au, n)).join('')}
          </div>
        `}
      </div>

      <!-- ── Relationship Overrides ── -->
      <div style="padding:10px 14px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
          <span style="font-size:10px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:var(--av-text-muted)">
            Relationship Changes
          </span>
          ${included.length >= 2 ? `
            <button class="btn-sm au-rel-add" data-id="${au.id}" style="font-size:10px;padding:2px 8px">＋ Add</button>
          ` : ''}
        </div>
        ${included.length < 2 ? `
          <div style="font-size:11px;color:var(--av-text-muted);font-style:italic">Add at least 2 nodes to track relationship changes.</div>
        ` : relOvs.length === 0 ? `
          <div style="font-size:11px;color:var(--av-text-muted);font-style:italic">How do dynamics between included nodes change in this AU?</div>
        ` : relOvs.map((r, ri) => `
          <div style="display:flex;align-items:center;gap:5px;margin-bottom:5px;flex-wrap:wrap">
            <select class="au-rel-f" data-id="${au.id}" data-ri="${ri}" data-field="fromId"
              style="font-size:10px;padding:3px 6px;border-radius:var(--av-radius-sm);flex:1;min-width:80px">
              <option value="">— from —</option>
              ${included.map(n => `<option value="${n.id}" ${r.fromId===n.id?'selected':''}>${esc(n.name||'Unnamed')}</option>`).join('')}
            </select>
            <span style="font-size:10px;color:var(--av-text-muted);flex-shrink:0">↔</span>
            <select class="au-rel-f" data-id="${au.id}" data-ri="${ri}" data-field="toId"
              style="font-size:10px;padding:3px 6px;border-radius:var(--av-radius-sm);flex:1;min-width:80px">
              <option value="">— to —</option>
              ${included.map(n => `<option value="${n.id}" ${r.toId===n.id?'selected':''}>${esc(n.name||'Unnamed')}</option>`).join('')}
            </select>
            <input class="au-rel-f" data-id="${au.id}" data-ri="${ri}" data-field="canonLabel"
              value="${esc(r.canonLabel||'')}" placeholder="Canon dynamic"
              style="font-size:10px;padding:3px 6px;border-radius:var(--av-radius-sm);flex:1;min-width:80px">
            <span style="font-size:10px;color:var(--av-accent);flex-shrink:0">→</span>
            <input class="au-rel-f" data-id="${au.id}" data-ri="${ri}" data-field="auLabel"
              value="${esc(r.auLabel||'')}" placeholder="In this AU"
              style="font-size:10px;padding:3px 6px;border-radius:var(--av-radius-sm);flex:1;min-width:80px">
            <button class="btn-sm au-rel-del" data-id="${au.id}" data-ri="${ri}"
              style="font-size:10px;color:var(--av-danger);padding:2px 6px;flex-shrink:0">✕</button>
          </div>
        `).join('')}
      </div>

    </div>
  `;
}

// ── Compact node row (one line per node in the included list) ────────────────

function _nodeRow(au, node) {
  const ov     = _getOv(au, node.id);
  const isChar = node.type === 'character';
  const hasOv  = Object.values(ov).some(v => v);

  return `
    <div style="
      display:flex;align-items:center;gap:6px;
      padding:5px 8px;
      border-radius:var(--av-radius-sm);
      background:${hasOv ? 'var(--av-bg-surface)' : 'transparent'};
      border:1px solid ${hasOv ? 'var(--av-border-strong)' : 'var(--av-border)'};
      margin-bottom:4px;
    ">
      <div style="width:20px;height:20px;border-radius:${isChar?'50%':'4px'};
        background:${node.color||'#7c5cbf'};flex-shrink:0;
        display:flex;align-items:center;justify-content:center;
        font-size:9px;font-weight:800;color:#fff">
        ${esc(node.letter||'?')}
      </div>
      <div style="font-size:11px;font-weight:600;color:var(--av-text-secondary);
        white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:60px;max-width:90px;flex-shrink:0"
        title="${esc(node.name||'')}">
        ${esc(node.name||'Unnamed')}
      </div>
      <span style="font-size:9px;color:var(--av-text-muted);flex-shrink:0;
        background:var(--av-bg-surface);padding:1px 5px;border-radius:3px;border:1px solid var(--av-border)">
        ${node.type}
      </span>
      <input class="au-ov" data-auid="${au.id}" data-nid="${node.id}" data-field="name"
        value="${esc(ov.name||'')}" placeholder="Name override"
        style="flex:1;min-width:0;font-size:10px;padding:3px 6px;border-radius:var(--av-radius-sm)">
      ${isChar ? `
        <input class="au-ov" data-auid="${au.id}" data-nid="${node.id}" data-field="occupation"
          value="${esc(ov.occupation||'')}" placeholder="Role / occupation"
          style="flex:1;min-width:0;font-size:10px;padding:3px 6px;border-radius:var(--av-radius-sm)">
      ` : `
        <input class="au-ov" data-auid="${au.id}" data-nid="${node.id}" data-field="description"
          value="${esc(ov.description||'')}" placeholder="Description in AU"
          style="flex:1.5;min-width:0;font-size:10px;padding:3px 6px;border-radius:var(--av-radius-sm)">
      `}
      <button class="au-node-remove" data-id="${au.id}" data-nid="${node.id}"
        title="Remove from AU"
        style="font-size:12px;color:var(--av-text-muted);background:none;border:none;
          cursor:pointer;padding:0 2px;line-height:1;opacity:.5;flex-shrink:0">×</button>
    </div>
  `;
}

// ── Node override card ────────────────────────────────────────────────────────

function _getOv(au, nodeId) {
  // Support both legacy characterOverrides and new nodeOverrides
  return (au.nodeOverrides || {})[nodeId] || (au.characterOverrides || {})[nodeId] || {};
}

function _nodeCard(au, node) {
  const ov    = _getOv(au, node.id);
  const hasOv = Object.values(ov).some(v => v);
  const isChar = node.type === 'character';

  return `
    <div style="
      border:1px solid ${hasOv ? 'var(--av-border-strong)' : 'var(--av-border)'};
      border-radius:var(--av-radius-md);padding:8px 10px;
      background:${hasOv ? 'var(--av-bg-surface)' : 'transparent'};
    ">
      <div style="display:flex;align-items:center;gap:7px;margin-bottom:7px">
        <div style="width:22px;height:22px;border-radius:${isChar?'50%':'5px'};
          background:${node.color||'#7c5cbf'};
          display:flex;align-items:center;justify-content:center;
          font-size:9px;font-weight:800;color:#fff;flex-shrink:0">
          ${esc(node.letter||'?')}
        </div>
        <div style="flex:1;min-width:0">
          <div style="font-size:11px;font-weight:600;color:var(--av-text-primary);
            overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
            ${esc(node.name||'Unnamed')}
          </div>
          <div style="font-size:9px;color:var(--av-text-muted);text-transform:capitalize">${node.type}</div>
        </div>
        ${hasOv ? `<span style="width:6px;height:6px;border-radius:50%;background:var(--av-accent);flex-shrink:0" title="Has overrides"></span>` : ''}
        <button class="au-node-remove" data-id="${au.id}" data-nid="${node.id}"
          title="Remove from AU"
          style="font-size:11px;color:var(--av-text-muted);background:none;border:none;cursor:pointer;padding:0 2px;line-height:1;opacity:.5">×</button>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px">
        <input class="au-ov" data-auid="${au.id}" data-nid="${node.id}" data-field="name"
          value="${esc(ov.name||'')}" placeholder="Name (if changed)"
          style="font-size:10px;padding:3px 6px;border-radius:var(--av-radius-sm);grid-column:1/-1">
        ${isChar ? `
          <input class="au-ov" data-auid="${au.id}" data-nid="${node.id}" data-field="occupation"
            value="${esc(ov.occupation||'')}" placeholder="Role / occupation"
            style="font-size:10px;padding:3px 6px;border-radius:var(--av-radius-sm)">
          <input class="au-ov" data-auid="${au.id}" data-nid="${node.id}" data-field="appearance"
            value="${esc(ov.appearance||'')}" placeholder="Appearance"
            style="font-size:10px;padding:3px 6px;border-radius:var(--av-radius-sm)">
        ` : `
          <input class="au-ov" data-auid="${au.id}" data-nid="${node.id}" data-field="description"
            value="${esc(ov.description||'')}" placeholder="Description in AU"
            style="font-size:10px;padding:3px 6px;border-radius:var(--av-radius-sm);grid-column:1/-1">
        `}
        <textarea class="au-ov" data-auid="${au.id}" data-nid="${node.id}" data-field="notes"
          placeholder="Notes..."
          style="font-size:10px;padding:3px 6px;border-radius:var(--av-radius-sm);resize:vertical;min-height:36px;grid-column:1/-1">${esc(ov.notes||'')}</textarea>
      </div>
    </div>
  `;
}

// ── Wire all interactions ─────────────────────────────────────────────────────

function _wireCards(allNodes) {
  if (!_view) return;

  // AU field updates
  _view.querySelectorAll('.au-f').forEach(el => {
    el.addEventListener('input', () => {
      const au = (state.aus || []).find(a => a.id === el.dataset.id);
      if (!au) return;
      au[el.dataset.field] = el.value;
      if (el.dataset.field === 'color') {
        const card = _view.querySelector(`.au-card[data-id="${au.id}"]`);
        if (card) card.style.borderLeftColor = el.value;
      }
      if (el.dataset.field === 'name') updateAUBanner();
    });
    el.addEventListener('change', saveHistory);
  });

  // Node override inputs
  _view.querySelectorAll('.au-ov').forEach(el => {
    el.addEventListener('input', () => {
      const au = (state.aus || []).find(a => a.id === el.dataset.auid);
      if (!au) return;
      au.nodeOverrides = au.nodeOverrides || {};
      au.nodeOverrides[el.dataset.nid] = au.nodeOverrides[el.dataset.nid] || {};
      au.nodeOverrides[el.dataset.nid][el.dataset.field] = el.value;
    });
    el.addEventListener('change', saveHistory);
  });

  // Relationship override fields
  _view.querySelectorAll('.au-rel-f').forEach(el => {
    el.addEventListener('change', () => {
      const au = (state.aus || []).find(a => a.id === el.dataset.id);
      if (!au) return;
      const ri = parseInt(el.dataset.ri);
      if (!au.relationshipOverrides?.[ri]) return;
      au.relationshipOverrides[ri][el.dataset.field] = el.value;
      saveHistory();
    });
    el.addEventListener('input', () => {
      const au = (state.aus || []).find(a => a.id === el.dataset.id);
      if (!au) return;
      const ri = parseInt(el.dataset.ri);
      if (!au.relationshipOverrides?.[ri]) return;
      au.relationshipOverrides[ri][el.dataset.field] = el.value;
    });
  });

  // Add relationship override
  _view.querySelectorAll('.au-rel-add').forEach(btn => {
    btn.addEventListener('click', () => {
      const au = (state.aus || []).find(a => a.id === btn.dataset.id);
      if (!au) return;
      au.relationshipOverrides = au.relationshipOverrides || [];
      au.relationshipOverrides.push({ fromId: '', toId: '', canonLabel: '', auLabel: '' });
      saveHistory();
      _render();
    });
  });

  // Delete relationship override
  _view.querySelectorAll('.au-rel-del').forEach(btn => {
    btn.addEventListener('click', () => {
      const au = (state.aus || []).find(a => a.id === btn.dataset.id);
      if (!au) return;
      const ri = parseInt(btn.dataset.ri);
      au.relationshipOverrides = (au.relationshipOverrides || []).filter((_, i) => i !== ri);
      saveHistory();
      _render();
    });
  });

  // ── Trope tag open/close ──
  _view.querySelectorAll('.au-tag-open').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const dd = _view.querySelector(`.au-tag-dd[data-id="${btn.dataset.id}"]`);
      if (!dd) return;
      const isOpen = dd.style.display !== 'none';
      _closeAllDropdowns();
      if (!isOpen) { dd.style.display = 'block'; setTimeout(() => dd.querySelector('.au-tag-custom')?.focus(), 0); }
    });
  });

  _view.querySelectorAll('.au-tag-preset').forEach(el => {
    el.addEventListener('mouseenter', () => el.style.background = 'var(--av-bg-hover)');
    el.addEventListener('mouseleave', () => el.style.background = 'var(--av-bg-surface)');
    el.addEventListener('click', e => {
      e.stopPropagation();
      const au = (state.aus || []).find(a => a.id === el.dataset.id);
      if (!au) return;
      au.tags = au.tags || [];
      if (!au.tags.includes(el.dataset.tag)) { au.tags.push(el.dataset.tag); saveHistory(); _render(); }
    });
  });

  _view.querySelectorAll('.au-tag-custom').forEach(el => {
    el.addEventListener('keydown', e => {
      if (e.key !== 'Enter') return;
      const val = el.value.trim();
      if (!val) return;
      const au = (state.aus || []).find(a => a.id === el.dataset.id);
      if (!au) return;
      au.tags = au.tags || [];
      if (!au.tags.includes(val)) { au.tags.push(val); saveHistory(); _render(); }
    });
  });

  _view.querySelectorAll('.au-tag-del').forEach(el => {
    el.addEventListener('click', e => {
      e.stopPropagation();
      const au = (state.aus || []).find(a => a.id === el.dataset.id);
      if (!au) return;
      au.tags = (au.tags || []).filter(t => t !== el.dataset.tag);
      saveHistory();
      _render();
    });
  });

  // ── Node add dropdown ──
  _view.querySelectorAll('.au-node-open').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const dd = _view.querySelector(`.au-node-dd[data-id="${btn.dataset.id}"]`);
      if (!dd) return;
      const isOpen = dd.style.display !== 'none';
      _closeAllDropdowns();
      if (!isOpen) dd.style.display = 'block';
    });
  });

  _view.querySelectorAll('.au-node-add').forEach(el => {
    el.addEventListener('mouseenter', () => el.style.background = 'var(--av-bg-hover)');
    el.addEventListener('mouseleave', () => el.style.background = '');
    el.addEventListener('click', e => {
      e.stopPropagation();
      const au = (state.aus || []).find(a => a.id === el.dataset.id);
      if (!au) return;
      au.includedNodeIds = au.includedNodeIds || [];
      if (!au.includedNodeIds.includes(el.dataset.nid)) {
        au.includedNodeIds.push(el.dataset.nid);
        saveHistory();
        _render();
      }
    });
  });

  _view.querySelectorAll('.au-node-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      const au = (state.aus || []).find(a => a.id === btn.dataset.id);
      if (!au) return;
      au.includedNodeIds = (au.includedNodeIds || []).filter(id => id !== btn.dataset.nid);
      saveHistory();
      _render();
    });
  });

  // ── Activate / deactivate ──
  _view.querySelectorAll('.au-activate').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      state.activeAuId = (state.activeAuId === id) ? null : id;
      updateAUBanner();
      saveHistory();
      _render();
    });
  });

  // ── Duplicate ──
  _view.querySelectorAll('.au-dup').forEach(btn => {
    btn.addEventListener('click', () => {
      const src = (state.aus || []).find(a => a.id === btn.dataset.id);
      if (!src) return;
      const copy = JSON.parse(JSON.stringify(src));
      copy.id   = uid();
      copy.name = src.name + ' (copy)';
      state.aus.push(copy);
      saveHistory();
      _render();
    });
  });

  // ── Delete ──
  _view.querySelectorAll('.au-del').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!confirm(`Delete "${(state.aus||[]).find(a=>a.id===btn.dataset.id)?.name}"?`)) return;
      state.aus = (state.aus || []).filter(a => a.id !== btn.dataset.id);
      if (state.activeAuId === btn.dataset.id) { state.activeAuId = null; updateAUBanner(); }
      saveHistory();
      _render();
    });
  });

  // ── Close dropdowns on outside click ──
  if (_closeDropdownsFn) document.removeEventListener('click', _closeDropdownsFn);
  _closeDropdownsFn = e => {
    if (!e.target.closest?.('.au-tag-picker') && !e.target.closest?.('.au-node-picker')) {
      _closeAllDropdowns();
    }
  };
  document.addEventListener('click', _closeDropdownsFn);
}

function _closeAllDropdowns() {
  _view?.querySelectorAll('.au-tag-dd, .au-node-dd').forEach(dd => dd.style.display = 'none');
}

// ── Banner ────────────────────────────────────────────────────────────────────

export function updateAUBanner() {
  const banner = document.getElementById('au-banner');
  if (!banner) return;
  const auId = state.activeAuId;
  if (!auId) { banner.style.display = 'none'; return; }
  const au = (state.aus || []).find(a => a.id === auId);
  if (!au) { banner.style.display = 'none'; return; }
  banner.style.display = 'flex';
  const dot = document.getElementById('au-banner-dot');
  if (dot) dot.style.background = au.color || '#888888';
  const nm = document.getElementById('au-banner-name');
  if (nm) nm.textContent = au.name;
}
