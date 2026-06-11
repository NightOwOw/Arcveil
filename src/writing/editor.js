// editor.js — Writing Hub: document list + rich contenteditable editor
import { state, EventBus, esc, uid, saveHistory } from '../state.js';
import { exportDocument, exportAllDocuments } from './exporter.js';
import { initSprintUI, isRunning as sprintRunning } from './sprint.js';

export function renderWritingView() { initWriting(); }

export function initWriting() {
  const view = document.getElementById('view-writing');
  if (!view) return;
  if (view.dataset.initialized) { _refreshDocList(); return; }
  view.dataset.initialized = '1';

  view.innerHTML = `
    <div class="writing-sidebar">
      <div style="padding:8px 10px;border-bottom:1px solid var(--av-border);display:flex;align-items:center;gap:6px;flex-shrink:0">
        <span style="font-size:12px;font-weight:700;flex:1;color:var(--av-text-primary)">Documents</span>
        <button class="btn-sm" id="w-new-doc" title="New document">+</button>
      </div>
      <div id="w-doc-list" style="flex:1;overflow-y:auto"></div>
    </div>
    <div id="w-editor-area" style="flex:1;display:flex;flex-direction:column;min-width:0">
      <div id="w-no-doc" class="placeholder-view">
        <div class="ph-icon">📝</div>
        <h2>No Document Open</h2>
        <p>Create a new document or select one from the sidebar.</p>
        <button class="btn-primary" id="w-create-first">✦ New Document</button>
      </div>
    </div>
  `;

  document.getElementById('w-new-doc')?.addEventListener('click', _newDoc);
  document.getElementById('w-create-first')?.addEventListener('click', _newDoc);

  _refreshDocList();
  if (state.writing.activeDocId) _openDoc(state.writing.activeDocId);
}

function _refreshDocList() {
  const list = document.getElementById('w-doc-list');
  if (!list) return;
  const docs = state.writing.documents;
  if (!docs.length) {
    list.innerHTML = '<div style="padding:12px;font-size:11px;color:var(--av-text-muted);text-align:center">No documents yet</div>';
    return;
  }
  list.innerHTML = docs.map(d => `
    <div class="writing-doc-item${d.id === state.writing.activeDocId ? ' active' : ''}" data-id="${d.id}" title="${esc(d.title||'Untitled')}">
      <div style="font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(d.title||'Untitled')}</div>
      <div style="font-size:10px;color:var(--av-text-muted)">${_wordCount(d.text||'')} words</div>
    </div>
  `).join('');
  list.querySelectorAll('.writing-doc-item').forEach(el => {
    el.addEventListener('click', () => _openDoc(el.dataset.id));
    el.addEventListener('contextmenu', e => { e.preventDefault(); _docMenu(el.dataset.id, e.clientX, e.clientY); });
  });
}

function _openDoc(id) {
  state.writing.activeDocId = id;
  const doc = state.writing.documents.find(d => d.id === id);
  if (!doc) return;

  const area = document.getElementById('w-editor-area');
  if (!area) return;

  area.innerHTML = `
    <div id="w-toolbar" style="padding:6px 12px;border-bottom:1px solid var(--av-border);display:flex;align-items:center;gap:4px;flex-shrink:0;flex-wrap:wrap">
      <button class="btn-icon wt-cmd" data-cmd="bold" title="Bold (Ctrl+B)"><b>B</b></button>
      <button class="btn-icon wt-cmd" data-cmd="italic" title="Italic (Ctrl+I)"><i>I</i></button>
      <button class="btn-icon wt-cmd" data-cmd="underline" title="Underline"><u>U</u></button>
      <div style="width:1px;height:18px;background:var(--av-border);margin:0 4px"></div>
      <button class="btn-icon wt-cmd" data-cmd="h1" title="Heading 1">H1</button>
      <button class="btn-icon wt-cmd" data-cmd="h2" title="Heading 2">H2</button>
      <button class="btn-icon wt-cmd" data-cmd="h3" title="Heading 3">H3</button>
      <div style="width:1px;height:18px;background:var(--av-border);margin:0 4px"></div>
      <button class="btn-icon wt-cmd" data-cmd="quote" title="Blockquote">"</button>
      <button class="btn-icon wt-cmd" data-cmd="scene" title="Scene break">—</button>
      <div style="width:1px;height:18px;background:var(--av-border);margin:0 4px"></div>
      <button class="btn-sm" id="w-sprint-btn" title="Writing sprint">⚡ Sprint</button>
      <button class="btn-sm" id="w-export-btn" title="Export document">⬇ Export</button>
      <div style="flex:1"></div>
      <span id="w-wc" style="font-size:10px;color:var(--av-text-muted)">0 words</span>
      <button class="btn-sm" id="w-focus" title="Focus mode">⛶ Focus</button>
    </div>
    <div id="w-sprint-panel" style="display:none"></div>
    <input type="text" id="w-title-input" value="${esc(doc.title||'')}" placeholder="Document title..."
      style="padding:12px 16px;font-size:18px;font-weight:700;border:none;border-bottom:1px solid var(--av-border);background:transparent;color:var(--av-text-primary);flex-shrink:0;outline:none">
    <div class="editor-content" id="w-body" contenteditable="true" spellcheck="true"
      data-placeholder="Begin writing your story...">${doc.html||''}</div>
  `;

  const body = document.getElementById('w-body');
  const titleEl = document.getElementById('w-title-input');
  const wc = document.getElementById('w-wc');

  let _dirtyTimer = null;
  const _markDirty = () => {
    state.project.isDirty = true;
    EventBus.emit('state:changed');
    clearTimeout(_dirtyTimer);
    _dirtyTimer = setTimeout(saveHistory, 2000);
  };

  // Title
  titleEl.addEventListener('input', e => {
    doc.title = e.target.value;
    _refreshDocList();
    _markDirty();
  });

  // Content
  body.addEventListener('input', () => {
    doc.html = body.innerHTML;
    doc.text = body.innerText;
    const count = _wordCount(doc.text);
    if (wc) wc.textContent = count + ' words';
    _refreshDocList();
    _markDirty();
  });

  // Initial word count
  if (wc) wc.textContent = _wordCount(doc.text||'') + ' words';

  // Toolbar commands
  document.querySelectorAll('.wt-cmd').forEach(btn => {
    btn.addEventListener('mousedown', e => {
      e.preventDefault();
      _execCmd(btn.dataset.cmd, body);
    });
  });

  // Focus mode
  document.getElementById('w-focus')?.addEventListener('click', () => _focusMode(doc));

  // Sprint
  const sprintPanel = document.getElementById('w-sprint-panel');
  document.getElementById('w-sprint-btn')?.addEventListener('click', () => {
    if (!sprintPanel) return;
    const open = sprintPanel.style.display !== 'none';
    sprintPanel.style.display = open ? 'none' : 'block';
    if (!open) initSprintUI(sprintPanel);
  });

  // Export dropdown
  document.getElementById('w-export-btn')?.addEventListener('click', e => {
    const menu = document.createElement('div');
    menu.className = 'ctx-menu';
    menu.style.cssText = `position:fixed;left:${e.clientX}px;top:${e.clientY}px;z-index:9000`;
    menu.innerHTML = `
      <div class="ctx-item" data-fmt="txt">Export as Plain Text…</div>
      <div class="ctx-item" data-fmt="md">Export as Markdown…</div>
      <div class="ctx-item" data-fmt="html">Export as HTML…</div>
      <div class="ctx-sep"></div>
      <div class="ctx-item" data-action="export-all-md">Export All Documents (MD)…</div>
      <div class="ctx-item" data-action="export-all-txt">Export All Documents (TXT)…</div>
    `;
    document.body.appendChild(menu);
    const remove = () => menu.remove();
    menu.addEventListener('click', async e2 => {
      const item = e2.target.closest('[data-fmt],[data-action]');
      if (!item) return;
      remove();
      if (item.dataset.fmt)    await exportDocument(doc.id, item.dataset.fmt);
      if (item.dataset.action === 'export-all-md')  await exportAllDocuments('md');
      if (item.dataset.action === 'export-all-txt') await exportAllDocuments('txt');
    });
    setTimeout(() => document.addEventListener('click', remove, { once: true }), 50);
  });

  // Keyboard shortcuts in editor
  body.addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'b') { e.preventDefault(); document.execCommand('bold'); }
      if (e.key === 'i') { e.preventDefault(); document.execCommand('italic'); }
      if (e.key === 'u') { e.preventDefault(); document.execCommand('underline'); }
    }
  });

  _refreshDocList();
}

function _execCmd(cmd, body) {
  body?.focus();
  switch (cmd) {
    case 'bold':      document.execCommand('bold'); break;
    case 'italic':    document.execCommand('italic'); break;
    case 'underline': document.execCommand('underline'); break;
    case 'h1': document.execCommand('formatBlock', false, 'h1'); break;
    case 'h2': document.execCommand('formatBlock', false, 'h2'); break;
    case 'h3': document.execCommand('formatBlock', false, 'h3'); break;
    case 'quote': document.execCommand('formatBlock', false, 'blockquote'); break;
    case 'scene': {
      const hr = document.createElement('hr');
      hr.className = 'scene-break';
      const sel = window.getSelection();
      if (sel.rangeCount) {
        const range = sel.getRangeAt(0);
        range.collapse(false);
        range.insertNode(hr);
        const p = document.createElement('p');
        p.innerHTML = '<br>';
        hr.after(p);
        sel.collapse(p, 0);
      }
      break;
    }
  }
}

function _focusMode(doc) {
  const overlay = document.createElement('div');
  overlay.id = 'focus-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:#0d0d0d;z-index:9999;display:flex;flex-direction:column;align-items:center;padding:60px 20px 40px';
  overlay.innerHTML = `
    <div style="width:100%;max-width:680px;display:flex;flex-direction:column;height:100%">
      <div style="display:flex;align-items:center;margin-bottom:20px;gap:12px">
        <input type="text" id="focus-title" value="${esc(doc.title||'')}" placeholder="Title..."
          style="flex:1;font-size:22px;font-weight:700;background:transparent;border:none;color:#e8e6e0;outline:none">
        <button id="focus-exit" style="background:transparent;border:1px solid #555;color:#aaa;padding:4px 12px;border-radius:4px;cursor:pointer;font-size:12px">Exit</button>
      </div>
      <div id="focus-body" contenteditable="true" spellcheck="true"
        style="flex:1;overflow-y:auto;font-family:Georgia,serif;font-size:18px;line-height:1.9;color:#e8e6e0;outline:none;padding-bottom:60px">${doc.html||''}</div>
      <div style="text-align:center;font-size:11px;color:#555;margin-top:10px" id="focus-wc">${_wordCount(doc.text||'')} words</div>
    </div>
  `;
  document.body.appendChild(overlay);
  const fb = document.getElementById('focus-body');
  const ft = document.getElementById('focus-title');
  const fw = document.getElementById('focus-wc');
  fb.focus();
  fb.addEventListener('input', () => {
    doc.html = fb.innerHTML; doc.text = fb.innerText;
    if (fw) fw.textContent = _wordCount(doc.text) + ' words';
    _refreshDocList();
  });
  ft.addEventListener('input', e => { doc.title = e.target.value; _refreshDocList(); });
  document.getElementById('focus-exit').addEventListener('click', () => { overlay.remove(); _openDoc(doc.id); });
  document.addEventListener('keydown', function esc(e) {
    if (e.key === 'Escape') { overlay.remove(); _openDoc(doc.id); document.removeEventListener('keydown', esc); }
  });
}

function _docMenu(id, x, y) {
  const existing = document.getElementById('doc-ctx-menu');
  if (existing) existing.remove();
  const menu = document.createElement('div');
  menu.id = 'doc-ctx-menu';
  menu.style.cssText = `position:fixed;left:${x}px;top:${y}px;background:var(--av-bg-elevated);border:1px solid var(--av-border);border-radius:var(--av-radius-md);padding:4px;z-index:9000;min-width:140px;box-shadow:0 4px 16px rgba(0,0,0,.4)`;
  const items = [
    { label: '✏️ Rename', action: () => { const doc = state.writing.documents.find(d=>d.id===id); if(doc){const n=prompt('Rename:',doc.title||'');if(n!==null){doc.title=n;_refreshDocList();}} } },
    { label: '📋 Duplicate', action: () => { const doc = state.writing.documents.find(d=>d.id===id); if(doc){const copy={...doc,id:uid(),title:(doc.title||'Untitled')+' (copy)'};state.writing.documents.push(copy);_refreshDocList();} } },
    { label: '🗑 Delete', danger: true, action: () => { if(confirm('Delete this document?')){state.writing.documents=state.writing.documents.filter(d=>d.id!==id);if(state.writing.activeDocId===id){state.writing.activeDocId=null;document.getElementById('w-editor-area').innerHTML='<div id="w-no-doc" class="placeholder-view"><div class="ph-icon">📝</div><h2>No Document Open</h2></div>';}  _refreshDocList();} } },
  ];
  menu.innerHTML = items.map(it => `<div class="ctx-item${it.danger?' danger':''}" style="padding:6px 10px;cursor:pointer;border-radius:4px;font-size:12px;color:${it.danger?'var(--av-danger)':'var(--av-text-primary)'}">${it.label}</div>`).join('');
  document.body.appendChild(menu);
  menu.querySelectorAll('.ctx-item').forEach((el,i) => { el.addEventListener('click', () => { menu.remove(); items[i].action(); }); });
  const close = () => menu.remove();
  setTimeout(() => document.addEventListener('click', close, { once: true }), 0);
}

function _newDoc() {
  const doc = { id: uid(), title: 'Untitled', html: '', text: '', created: Date.now() };
  state.writing.documents.push(doc);
  state.writing.activeDocId = doc.id;
  _refreshDocList();
  _openDoc(doc.id);
  saveHistory();
  // Focus title after render
  setTimeout(() => document.getElementById('w-title-input')?.focus(), 50);
}

function _wordCount(text) {
  return (text || '').trim().split(/\s+/).filter(Boolean).length;
}
