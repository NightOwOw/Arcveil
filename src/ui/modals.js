// ============================================
// modals.js — All modal dialogs, quick search (Ctrl+K)
// Imports: state.js
// Exports: initModals, showModal, closeModal, showQuickSearch
// Events: listens keyboard shortcuts
// ============================================

import { state, EventBus } from '../state.js';

export function initModals() {
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      showQuickSearch();
    }
    if (e.key === 'Escape') closeModal();
  });
}

export function showModal(title, content, actions = []) {
  closeModal();
  const overlay = document.createElement('div');
  overlay.id = 'modal-overlay';
  overlay.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:10000;
    display:flex;align-items:center;justify-content:center;backdrop-filter:blur(2px);`;

  const modal = document.createElement('div');
  modal.id = 'modal-box';
  modal.style.cssText = `
    background:var(--av-bg-elevated);border:1px solid var(--av-border-strong);
    border-radius:var(--av-radius-lg);padding:24px;min-width:340px;max-width:600px;
    max-height:80vh;overflow-y:auto;box-shadow:0 24px 60px rgba(0,0,0,0.6);`;

  modal.innerHTML = `
    <div style="display:flex;align-items:center;margin-bottom:16px">
      <div style="font-size:15px;font-weight:700;color:var(--av-text-primary);flex:1">${title}</div>
      <button id="modal-close" class="btn-icon" style="flex-shrink:0">✕</button>
    </div>
    <div id="modal-content">${content}</div>
    ${actions.length ? `<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:20px">
      ${actions.map(a => `<button class="${a.primary ? 'btn-primary' : 'btn-secondary'}" data-action="${a.id}">${a.label}</button>`).join('')}
    </div>` : ''}
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
  document.getElementById('modal-close').onclick = closeModal;

  actions.forEach(a => {
    modal.querySelector(`[data-action="${a.id}"]`)?.addEventListener('click', () => { a.action?.(); });
  });

  return modal;
}

export function closeModal() {
  document.getElementById('modal-overlay')?.remove();
}

// ── Quick Search (Ctrl+K) ──────────────────────────────────────────────────────

export function showQuickSearch() {
  closeModal();
  const overlay = document.createElement('div');
  overlay.id = 'modal-overlay';
  overlay.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:10000;
    display:flex;align-items:flex-start;justify-content:center;padding-top:100px;
    backdrop-filter:blur(2px);`;

  const box = document.createElement('div');
  box.style.cssText = `
    width:560px;background:var(--av-bg-elevated);border:1px solid var(--av-border-strong);
    border-radius:var(--av-radius-lg);overflow:hidden;box-shadow:0 24px 60px rgba(0,0,0,0.6);`;

  box.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid var(--av-border)">
      <span style="font-size:16px;color:var(--av-text-muted)">🔍</span>
      <input id="qs-input" placeholder="Search characters, locations, documents, lore..."
        style="flex:1;background:none;border:none;font-size:14px;color:var(--av-text-primary);outline:none">
      <kbd style="font-size:10px;color:var(--av-text-muted);background:var(--av-bg-hover);padding:2px 6px;border-radius:3px">Esc</kbd>
    </div>
    <div id="qs-results" style="max-height:400px;overflow-y:auto;padding:6px"></div>
  `;

  overlay.appendChild(box);
  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });

  const input = document.getElementById('qs-input');
  input.focus();

  let debounce;
  input.oninput = () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => _doSearch(input.value.trim()), 150);
  };

  // Show recent by default
  _doSearch('');
}

function _doSearch(q) {
  const results = document.getElementById('qs-results');
  if (!results) return;

  const lq = q.toLowerCase();
  const items = [];

  // Characters
  for (const n of state.nodes) {
    if (!lq || n.name?.toLowerCase().includes(lq))
      items.push({ icon:'👤', type:'Character', id: n.id, label: n.name, color: n.color, action: () => { closeModal(); EventBus.emit('node:open-profile', n.id); } });
  }

  // Locations
  for (const l of (state.world.locations || [])) {
    if (!lq || l.name?.toLowerCase().includes(lq))
      items.push({ icon:'📍', type:'Location', id: l.id, label: l.name, action: () => { closeModal(); EventBus.emit('location:open', l.id); } });
  }

  // Documents
  for (const d of (state.writing.documents || [])) {
    if (!lq || d.title?.toLowerCase().includes(lq))
      items.push({ icon:'📄', type:'Document', id: d.id, label: d.title, action: () => { closeModal(); EventBus.emit('writing:open-doc', d.id); } });
  }

  // Lore
  for (const l of (state.world.lore || [])) {
    if (!lq || l.title?.toLowerCase().includes(lq))
      items.push({ icon:'📚', type:'Lore', id: l.id, label: l.title, action: () => { closeModal(); EventBus.emit('lore:open', l.id); } });
  }

  if (!items.length) {
    results.innerHTML = `<div style="padding:20px;text-align:center;color:var(--av-text-muted);font-size:12px">${q ? 'No results' : 'Start typing to search...'}</div>`;
    return;
  }

  const shown = items.slice(0, 12);
  results.innerHTML = shown.map((item, i) => `
    <div class="qs-item" data-idx="${i}" style="
      display:flex;align-items:center;gap:10px;padding:10px 14px;
      border-radius:var(--av-radius-md);cursor:pointer;transition:background .1s;margin:2px 4px">
      <span style="font-size:16px">${item.icon}</span>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:600;color:var(--av-text-primary)">${item.label||'Untitled'}</div>
        <div style="font-size:10px;color:var(--av-text-muted)">${item.type}</div>
      </div>
    </div>
  `).join('');

  results.querySelectorAll('.qs-item').forEach(el => {
    el.addEventListener('mouseenter', () => el.style.background = 'var(--av-bg-hover)');
    el.addEventListener('mouseleave', () => el.style.background = '');
    el.onclick = () => shown[+el.dataset.idx].action();
  });
}
