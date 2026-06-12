// editor.js — Writing Hub: full-featured editor
import { state, EventBus, esc, uid, saveHistory } from '../state.js';
import { exportDocument, exportAllDocuments } from './exporter.js';
import { initSprintUI, isRunning as sprintRunning } from './sprint.js';
import { FileTree } from './file-tree.js';

let _fileTree   = null;
let _tabs       = [];       // [{ id, title, path, html, text, dirty, fromFolder }]
let _activeTabId = null;
let _findOpen   = false;
let _findMatches = [];
let _findIndex  = 0;

export function renderWritingView() { initWriting(); }

export function initWriting() {
  const view = document.getElementById('view-writing');
  if (!view) return;
  if (view.dataset.initialized) {
    _refreshAll();
    return;
  }
  view.dataset.initialized = '1';

  view.innerHTML = `
    <div class="writing-sidebar" id="w-sidebar">
      <!-- Left panel tabs -->
      <div class="w-panel-tabs" id="w-panel-tabs">
        <button class="w-panel-tab active" data-tab="documents">Documents</button>
        <button class="w-panel-tab" data-tab="folder">Folder</button>
      </div>

      <!-- Documents panel -->
      <div id="w-docs-panel" class="w-panel-body">
        <div class="writing-sidebar-header">
          <span style="font-size:12px;font-weight:700;flex:1;color:var(--av-text-primary)">Documents</span>
          <button class="btn-sm" id="w-new-doc" title="New document (Ctrl+N)">+</button>
          <button class="btn-sm" id="w-template-btn" title="New from template">⬡</button>
        </div>
        <div id="w-doc-list" class="writing-doc-list"></div>
      </div>

      <!-- Folder tree panel -->
      <div id="w-folder-panel" class="w-panel-body" style="display:none">
        <div id="w-tree-container" class="tree-container"></div>
      </div>

      <!-- Chapter navigation -->
      <div id="w-nav-panel" class="w-nav-panel">
        <div class="w-nav-tabs">
          <button class="w-nav-tab active" data-nav="headings">Headings</button>
          <button class="w-nav-tab" data-nav="search">Search</button>
        </div>
        <div id="w-nav-headings" class="w-nav-body"></div>
        <div id="w-nav-search" class="w-nav-body" style="display:none">
          <input type="text" id="w-nav-search-input" class="w-search-input" placeholder="Search in document…">
          <div id="w-nav-search-results" class="w-search-results"></div>
        </div>
      </div>
    </div>

    <div id="w-main" class="writing-main">
      <!-- Tab bar -->
      <div id="w-tab-bar" class="w-tab-bar"></div>

      <!-- Editor area -->
      <div id="w-editor-area" style="flex:1;display:flex;flex-direction:column;min-width:0;overflow:hidden">
        <div id="w-no-doc" class="placeholder-view">
          <div class="ph-icon">📝</div>
          <h2>No Document Open</h2>
          <p>Create a new document or open a folder.</p>
          <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
            <button class="btn-primary" id="w-create-first">✦ New Document</button>
            <button class="btn-sm" id="w-open-folder-btn">📂 Open Folder</button>
          </div>
        </div>
      </div>

      <!-- Stats bar -->
      <div id="w-stats-bar" class="editor-statusbar" style="display:none">
        <span id="wsb-words">0 words</span>
        <span id="wsb-chars">0 chars</span>
        <span id="wsb-read">~0 min read</span>
        <span style="flex:1"></span>
        <span id="wsb-goal-label" style="display:none">Goal:</span>
        <div class="editor-goal-bar" id="wsb-goal-wrap" style="display:none">
          <div class="editor-goal-fill" id="wsb-goal-fill" style="width:0%"></div>
        </div>
        <span id="wsb-goal-pct" style="display:none">0%</span>
      </div>
    </div>
  `;

  // Panel tab switching
  view.querySelectorAll('.w-panel-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      view.querySelectorAll('.w-panel-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const tab = btn.dataset.tab;
      document.getElementById('w-docs-panel').style.display  = tab === 'documents' ? 'flex' : 'none';
      document.getElementById('w-folder-panel').style.display = tab === 'folder' ? 'flex' : 'none';
    });
  });

  // Nav tab switching
  view.querySelectorAll('.w-nav-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      view.querySelectorAll('.w-nav-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const nav = btn.dataset.nav;
      document.getElementById('w-nav-headings').style.display = nav === 'headings' ? 'block' : 'none';
      document.getElementById('w-nav-search').style.display   = nav === 'search'   ? 'flex' : 'none';
    });
  });

  // Nav search
  document.getElementById('w-nav-search-input')?.addEventListener('input', e => _navSearch(e.target.value));

  // Doc list actions
  document.getElementById('w-new-doc')?.addEventListener('click', () => _newDoc());
  document.getElementById('w-create-first')?.addEventListener('click', () => _newDoc());
  document.getElementById('w-template-btn')?.addEventListener('click', e => _showTemplateMenu(e));

  // Folder
  const treeContainer = document.getElementById('w-tree-container');
  _fileTree = new FileTree(treeContainer, (filePath) => _openFileFromDisk(filePath));
  if (state.writing.openFolderPath) _fileTree.openFolder(state.writing.openFolderPath);

  document.getElementById('w-open-folder-btn')?.addEventListener('click', async () => {
    const p = await window.api?.fsAPI?.openFolder();
    if (p) {
      state.writing.openFolderPath = p;
      _fileTree.openFolder(p);
      // Switch to folder tab
      document.querySelector('[data-tab="folder"]')?.click();
    }
  });

  // File tree folder open
  EventBus.on('writing:open-folder', async () => {
    const p = await window.api?.fsAPI?.openFolder();
    if (p) { state.writing.openFolderPath = p; _fileTree.openFolder(p); }
  });

  // Sync tabs from state
  _tabs = (state.writing.documents || []).map(d => ({
    id: d.id, title: d.title || 'Untitled',
    path: d.path || null, html: d.html || '', text: d.text || '',
    dirty: false, fromFolder: !!d.path,
  }));
  _activeTabId = state.writing.activeDocId;

  _refreshDocList();
  _renderTabBar();
  if (_activeTabId) _switchToTab(_activeTabId);
}

// ── Tabs ──────────────────────────────────────────────────────────────────────

function _renderTabBar() {
  const bar = document.getElementById('w-tab-bar');
  if (!bar) return;
  if (!_tabs.length) { bar.innerHTML = ''; return; }
  bar.innerHTML = _tabs.map(t => `
    <div class="w-tab${t.id === _activeTabId ? ' active' : ''}" data-id="${t.id}" title="${esc(t.title)}">
      <span class="w-tab-title">${esc(t.title)}</span>
      ${t.dirty ? '<span class="w-tab-dot" title="Unsaved">●</span>' : ''}
      <button class="w-tab-close" data-id="${t.id}" title="Close tab">×</button>
    </div>
  `).join('');
  bar.querySelectorAll('.w-tab').forEach(el => {
    el.addEventListener('click', e => {
      if (e.target.classList.contains('w-tab-close')) return;
      _switchToTab(el.dataset.id);
    });
    el.addEventListener('auxclick', e => { if (e.button === 1) { e.preventDefault(); _closeTab(el.dataset.id); } });
  });
  bar.querySelectorAll('.w-tab-close').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation(); _closeTab(btn.dataset.id); });
  });
}

async function _closeTab(id) {
  const tab = _tabs.find(t => t.id === id);
  if (tab?.dirty && !confirm(`"${tab.title}" has unsaved changes. Close anyway?`)) return;
  if (tab?.path) await _saveFileToDisk(tab);
  _tabs = _tabs.filter(t => t.id !== id);
  if (_activeTabId === id) {
    _activeTabId = _tabs[_tabs.length - 1]?.id || null;
  }
  _syncTabsToState();
  _renderTabBar();
  if (_activeTabId) _switchToTab(_activeTabId);
  else _showNoDoc();
}

function _switchToTab(id) {
  _activeTabId = id;
  state.writing.activeDocId = id;
  const tab = _tabs.find(t => t.id === id);
  if (!tab) { _showNoDoc(); return; }
  _renderTabBar();
  _openDocEditor(tab);
  _refreshDocList();
}

function _showNoDoc() {
  const area = document.getElementById('w-editor-area');
  if (!area) return;
  area.innerHTML = `<div id="w-no-doc" class="placeholder-view">
    <div class="ph-icon">📝</div><h2>No Document Open</h2>
    <p>Create a new document or open a folder.</p>
    <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
      <button class="btn-primary" id="w-create-first">✦ New Document</button>
      <button class="btn-sm" id="w-open-folder-btn2">📂 Open Folder</button>
    </div>
  </div>`;
  area.querySelector('#w-create-first')?.addEventListener('click', () => _newDoc());
  area.querySelector('#w-open-folder-btn2')?.addEventListener('click', async () => {
    const p = await window.api?.fsAPI?.openFolder();
    if (p) { state.writing.openFolderPath = p; _fileTree?.openFolder(p); document.querySelector('[data-tab="folder"]')?.click(); }
  });
  document.getElementById('w-stats-bar').style.display = 'none';
}

// ── Open file from disk ────────────────────────────────────────────────────────

async function _openFileFromDisk(filePath) {
  // If already open, switch to it
  const existing = _tabs.find(t => t.path === filePath);
  if (existing) { _switchToTab(existing.id); return; }

  const result = await window.api?.fsAPI?.readFile(filePath);
  if (!result) return;

  const name = filePath.split(/[\\/]/).pop();
  const html = result.type === 'html' ? result.content
    : result.type === 'md'   ? _mdToHtml(result.content)
    : `<p>${esc(result.content).replace(/\n/g,'</p><p>')}</p>`;

  const tab = {
    id: uid(), title: name, path: filePath,
    html, text: _stripHtml(html),
    dirty: false, fromFolder: true,
  };
  _tabs.push(tab);
  _syncTabsToState();
  _renderTabBar();
  _switchToTab(tab.id);
}

async function _saveFileToDisk(tab) {
  if (!tab.path || !tab.dirty) return true;
  const ext = tab.path.split('.').pop().toLowerCase();
  const content = (ext === 'docx') ? tab.html : (ext === 'md') ? _htmlToMd(tab.html) : tab.text;
  return window.api?.fsAPI?.writeFile(tab.path, content, ext) || true;
}

// ── Editor ────────────────────────────────────────────────────────────────────

function _openDocEditor(tab) {
  const area = document.getElementById('w-editor-area');
  if (!area) return;

  area.innerHTML = `
    <div id="w-toolbar" class="editor-toolbar">
      <button class="et-btn wt-cmd" data-cmd="bold"        title="Bold (Ctrl+B)"><b>B</b></button>
      <button class="et-btn wt-cmd" data-cmd="italic"      title="Italic (Ctrl+I)"><i>I</i></button>
      <button class="et-btn wt-cmd" data-cmd="underline"   title="Underline (Ctrl+U)"><u>U</u></button>
      <button class="et-btn wt-cmd" data-cmd="strikethrough" title="Strikethrough"><s>S</s></button>
      <div class="et-sep"></div>
      <button class="et-btn wt-cmd" data-cmd="h1" title="Heading 1">H1</button>
      <button class="et-btn wt-cmd" data-cmd="h2" title="Heading 2">H2</button>
      <button class="et-btn wt-cmd" data-cmd="h3" title="Heading 3">H3</button>
      <div class="et-sep"></div>
      <button class="et-btn wt-cmd" data-cmd="quote"        title="Blockquote">"</button>
      <button class="et-btn wt-cmd" data-cmd="ul"           title="Bullet list">☰</button>
      <button class="et-btn wt-cmd" data-cmd="ol"           title="Numbered list">①</button>
      <button class="et-btn wt-cmd" data-cmd="indent"       title="Indent">→</button>
      <button class="et-btn wt-cmd" data-cmd="outdent"      title="Outdent">←</button>
      <button class="et-btn wt-cmd" data-cmd="scene"        title="Scene break">—</button>
      <div class="et-sep"></div>
      <div class="et-highlight-wrap" title="Highlight">
        <button class="et-btn wt-cmd" data-cmd="highlight" id="w-hl-btn" style="background:var(--w-hl-color,#ffe066);color:#222">H</button>
        <div class="et-hl-palette" id="w-hl-palette">
          ${['#ffe066','#b8f5b0','#b0d6ff','#ffb3b3','#e8b0ff','#ffd8a8'].map(c =>
            `<button class="et-hl-swatch" data-color="${c}" style="background:${c}" title="${c}"></button>`
          ).join('')}
        </div>
      </div>
      <div class="et-sep"></div>
      <button class="et-btn" id="w-find-btn"   title="Find &amp; Replace (Ctrl+H)">🔍</button>
      <button class="et-btn" id="w-sprint-btn" title="Writing sprint">⚡</button>
      <button class="et-btn" id="w-export-btn" title="Export">⬇</button>
      <div style="flex:1"></div>
      <button class="et-btn" id="w-wc-btn" title="Word count stats" id="w-wc-btn">
        <span id="w-wc">0 words</span>
      </button>
      <button class="et-btn" id="w-focus" title="Focus mode">⛶</button>
      ${tab.path ? `<button class="et-btn" id="w-save-file" title="Save file (Ctrl+S)">💾</button>` : ''}
    </div>
    <div id="w-sprint-panel" style="display:none;flex-shrink:0"></div>
    <div id="w-find-bar" class="find-bar" style="display:none">
      <input type="text" id="w-find-input" placeholder="Find…" style="width:140px">
      <input type="text" id="w-replace-input" placeholder="Replace…" style="width:120px">
      <span id="w-find-count" class="find-count">0/0</span>
      <button class="btn-icon" id="w-find-prev" title="Previous (Shift+Enter)">▲</button>
      <button class="btn-icon" id="w-find-next" title="Next (Enter)">▼</button>
      <button class="btn-icon" id="w-replace-one" title="Replace">⇌</button>
      <button class="btn-icon" id="w-replace-all" title="Replace All">⇌⇌</button>
      <button class="btn-icon" id="w-find-close" title="Close (Esc)">×</button>
    </div>
    <div class="editor-scroll" id="w-scroll">
      <div class="editor-page" id="w-page">
        ${!tab.fromFolder ? `<input type="text" id="w-title-input" value="${esc(tab.title)}" placeholder="Document title…"
          class="editor-title-input">` : `<div class="editor-file-path">${esc(tab.title)}</div>`}
        <div class="editor-content" id="w-body" contenteditable="true" spellcheck="true"
          data-placeholder="Begin writing your story…">${tab.html || ''}</div>
      </div>
    </div>
  `;

  const body   = document.getElementById('w-body');
  const titleEl = document.getElementById('w-title-input');
  const wc      = document.getElementById('w-wc');

  let _dirtyTimer = null;
  const _markDirty = () => {
    tab.dirty = true;
    state.project.isDirty = true;
    EventBus.emit('state:changed');
    _renderTabBar();
    clearTimeout(_dirtyTimer);
    _dirtyTimer = setTimeout(() => { _syncTabsToState(); saveHistory(); }, 2000);
  };

  // Title input
  titleEl?.addEventListener('input', e => {
    tab.title = e.target.value;
    _refreshDocList();
    _renderTabBar();
    _markDirty();
  });

  // Content
  body.addEventListener('input', () => {
    tab.html = body.innerHTML;
    tab.text = body.innerText;
    const count = _wordCount(tab.text);
    if (wc) wc.textContent = count + ' words';
    _updateStats(tab);
    _refreshHeadings(tab);
    _refreshDocList();
    _markDirty();
  });

  // Initial stats
  _updateStats(tab);
  _refreshHeadings(tab);

  // Toolbar commands
  area.querySelectorAll('.wt-cmd').forEach(btn => {
    btn.addEventListener('mousedown', e => { e.preventDefault(); _execCmd(btn.dataset.cmd, body); });
  });

  // Highlight palette
  const hlBtn = document.getElementById('w-hl-btn');
  const hlPalette = document.getElementById('w-hl-palette');
  hlBtn?.parentElement.addEventListener('mouseenter', () => { hlPalette.style.display = 'flex'; });
  hlBtn?.parentElement.addEventListener('mouseleave', () => { hlPalette.style.display = 'none'; });
  hlPalette?.querySelectorAll('.et-hl-swatch').forEach(sw => {
    sw.addEventListener('click', () => {
      document.getElementById('w-main').style.setProperty('--w-hl-color', sw.dataset.color);
      _execCmd('highlight', body, sw.dataset.color);
      hlPalette.style.display = 'none';
    });
  });

  // Find & Replace
  document.getElementById('w-find-btn')?.addEventListener('click', () => _toggleFind(body));

  const findInput    = document.getElementById('w-find-input');
  const replaceInput = document.getElementById('w-replace-input');
  const findCount    = document.getElementById('w-find-count');
  findInput?.addEventListener('input',  () => _doFind(body, findInput.value, findCount));
  findInput?.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.shiftKey ? _findNav(-1, body, findCount) : _findNav(1, body, findCount); }
    if (e.key === 'Escape') _closeFind(body);
  });
  document.getElementById('w-find-prev')?.addEventListener('click',    () => _findNav(-1, body, findCount));
  document.getElementById('w-find-next')?.addEventListener('click',    () => _findNav( 1, body, findCount));
  document.getElementById('w-find-close')?.addEventListener('click',   () => _closeFind(body));
  document.getElementById('w-replace-one')?.addEventListener('click',  () => _replaceOne(body, findInput, replaceInput, findCount));
  document.getElementById('w-replace-all')?.addEventListener('click',  () => _replaceAll(body, findInput, replaceInput, findCount));

  // Focus mode
  document.getElementById('w-focus')?.addEventListener('click', () => _focusMode(tab));

  // Save file (folder mode)
  document.getElementById('w-save-file')?.addEventListener('click', async () => {
    await _saveFileToDisk(tab);
    tab.dirty = false;
    _renderTabBar();
  });

  // Sprint
  const sprintPanel = document.getElementById('w-sprint-panel');
  document.getElementById('w-sprint-btn')?.addEventListener('click', () => {
    const open = sprintPanel.style.display !== 'none';
    sprintPanel.style.display = open ? 'none' : 'block';
    if (!open) initSprintUI(sprintPanel);
  });

  // Export
  document.getElementById('w-export-btn')?.addEventListener('click', e => _showExportMenu(e, tab));

  // Keyboard shortcuts in editor
  body.addEventListener('keydown', e => {
    const ctrl = e.ctrlKey || e.metaKey;
    if (ctrl && e.key === 'b') { e.preventDefault(); document.execCommand('bold'); }
    if (ctrl && e.key === 'i') { e.preventDefault(); document.execCommand('italic'); }
    if (ctrl && e.key === 'u') { e.preventDefault(); document.execCommand('underline'); }
    if (ctrl && e.key === 'h') { e.preventDefault(); _toggleFind(body); }
    if (ctrl && e.key === 's') {
      e.preventDefault();
      if (tab.path) _saveFileToDisk(tab).then(() => { tab.dirty = false; _renderTabBar(); });
      else { _syncTabsToState(); saveHistory(); }
    }
  });

  if (wc) wc.textContent = _wordCount(tab.text || '') + ' words';
}

// ── Toolbar commands ──────────────────────────────────────────────────────────

function _execCmd(cmd, body, param) {
  body?.focus();
  switch (cmd) {
    case 'bold':          document.execCommand('bold'); break;
    case 'italic':        document.execCommand('italic'); break;
    case 'underline':     document.execCommand('underline'); break;
    case 'strikethrough': document.execCommand('strikeThrough'); break;
    case 'h1':            document.execCommand('formatBlock', false, 'h1'); break;
    case 'h2':            document.execCommand('formatBlock', false, 'h2'); break;
    case 'h3':            document.execCommand('formatBlock', false, 'h3'); break;
    case 'quote':         document.execCommand('formatBlock', false, 'blockquote'); break;
    case 'ul':            document.execCommand('insertUnorderedList'); break;
    case 'ol':            document.execCommand('insertOrderedList'); break;
    case 'indent':        document.execCommand('indent'); break;
    case 'outdent':       document.execCommand('outdent'); break;
    case 'highlight': {
      const color = param || '#ffe066';
      document.execCommand('hiliteColor', false, color);
      break;
    }
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

// ── Find & Replace ─────────────────────────────────────────────────────────────

function _toggleFind(body) {
  const bar = document.getElementById('w-find-bar');
  if (!bar) return;
  _findOpen = !_findOpen;
  bar.style.display = _findOpen ? 'flex' : 'none';
  if (_findOpen) document.getElementById('w-find-input')?.focus();
  else _clearHighlights(body);
}

function _closeFind(body) {
  _findOpen = false;
  const bar = document.getElementById('w-find-bar');
  if (bar) bar.style.display = 'none';
  _clearHighlights(body);
  body?.focus();
}

function _doFind(body, term, countEl) {
  _clearHighlights(body);
  _findMatches = [];
  _findIndex = 0;
  if (!term || !body) { if (countEl) countEl.textContent = '0/0'; return; }

  const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
  const re = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  const ranges = [];
  let node;
  while ((node = walker.nextNode())) {
    let m;
    while ((m = re.exec(node.textContent)) !== null) {
      const range = document.createRange();
      range.setStart(node, m.index);
      range.setEnd(node, m.index + m[0].length);
      ranges.push(range);
    }
  }

  // Wrap matches in mark elements
  for (let i = ranges.length - 1; i >= 0; i--) {
    const mark = document.createElement('mark');
    mark.className = 'find-highlight';
    mark.dataset.idx = i;
    try { ranges[i].surroundContents(mark); } catch {}
  }
  _findMatches = body.querySelectorAll('.find-highlight');
  if (countEl) countEl.textContent = `0/${_findMatches.length}`;
  if (_findMatches.length) _findNav(1, body, countEl);
}

function _findNav(dir, body, countEl) {
  if (!_findMatches.length) return;
  _findMatches[_findIndex]?.classList.remove('find-current');
  _findIndex = (_findIndex + dir + _findMatches.length) % _findMatches.length;
  const cur = _findMatches[_findIndex];
  cur?.classList.add('find-current');
  cur?.scrollIntoView({ block: 'center' });
  if (countEl) countEl.textContent = `${_findIndex + 1}/${_findMatches.length}`;
}

function _clearHighlights(body) {
  if (!body) return;
  body.querySelectorAll('.find-highlight').forEach(mark => {
    mark.replaceWith(...mark.childNodes);
  });
  body.normalize();
  _findMatches = [];
}

function _replaceOne(body, findInput, replaceInput, countEl) {
  const cur = _findMatches[_findIndex];
  if (!cur) return;
  cur.replaceWith(document.createTextNode(replaceInput?.value || ''));
  const term = findInput?.value;
  if (term) _doFind(body, term, countEl);
}

function _replaceAll(body, findInput, replaceInput, countEl) {
  const term = findInput?.value;
  if (!term) return;
  _doFind(body, term, countEl);
  [...body.querySelectorAll('.find-highlight')].forEach(m => {
    m.replaceWith(document.createTextNode(replaceInput?.value || ''));
  });
  if (countEl) countEl.textContent = '0/0';
}

// ── Headings navigation ────────────────────────────────────────────────────────

function _refreshHeadings(tab) {
  const container = document.getElementById('w-nav-headings');
  if (!container) return;
  const body = document.getElementById('w-body');
  if (!body) return;
  const headings = body.querySelectorAll('h1,h2,h3,h4');
  if (!headings.length) {
    container.innerHTML = '<div style="padding:10px;font-size:11px;color:var(--av-text-muted)">No headings found</div>';
    return;
  }
  container.innerHTML = [...headings].map((h, i) => {
    const level = parseInt(h.tagName[1]);
    return `<div class="nav-heading-item nav-h${level}" data-idx="${i}" style="padding-left:${(level-1)*10+8}px" title="${esc(h.textContent)}">
      ${esc(h.textContent)}
    </div>`;
  }).join('');
  container.querySelectorAll('.nav-heading-item').forEach((el, i) => {
    el.addEventListener('click', () => {
      headings[i]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

function _navSearch(term) {
  const results = document.getElementById('w-nav-search-results');
  const body = document.getElementById('w-body');
  if (!results || !body || !term.trim()) {
    if (results) results.innerHTML = '';
    return;
  }
  const text = body.innerText;
  const re   = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  const matches = [];
  let m;
  while ((m = re.exec(text)) !== null && matches.length < 50) {
    matches.push({ index: m.index, text: text.slice(Math.max(0, m.index - 30), m.index + term.length + 30) });
  }
  if (!matches.length) {
    results.innerHTML = '<div style="padding:8px;font-size:11px;color:var(--av-text-muted)">No results</div>';
    return;
  }
  results.innerHTML = matches.map(m => `<div class="nav-search-result">…${esc(m.text)}…</div>`).join('');
}

// ── Stats bar ─────────────────────────────────────────────────────────────────

function _updateStats(tab) {
  const bar = document.getElementById('w-stats-bar');
  if (!bar) return;
  bar.style.display = 'flex';
  const words = _wordCount(tab.text || '');
  const chars = (tab.text || '').length;
  const readMin = Math.max(1, Math.round(words / 200));
  document.getElementById('wsb-words').textContent = `${words.toLocaleString()} words`;
  document.getElementById('wsb-chars').textContent = `${chars.toLocaleString()} chars`;
  document.getElementById('wsb-read').textContent  = `~${readMin} min read`;
  const wcEl = document.getElementById('w-wc');
  if (wcEl) wcEl.textContent = words + ' words';
}

// ── Document list ─────────────────────────────────────────────────────────────

function _refreshDocList() {
  const list = document.getElementById('w-doc-list');
  if (!list) return;
  const internalTabs = _tabs.filter(t => !t.fromFolder);
  if (!internalTabs.length) {
    list.innerHTML = '<div style="padding:12px;font-size:11px;color:var(--av-text-muted);text-align:center">No documents yet</div>';
    return;
  }
  list.innerHTML = internalTabs.map(t => `
    <div class="writing-doc-item${t.id === _activeTabId ? ' active' : ''}" data-id="${t.id}" title="${esc(t.title)}">
      <div style="flex:1;min-width:0">
        <div style="font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(t.title || 'Untitled')}</div>
        <div style="font-size:10px;color:var(--av-text-muted)">${_wordCount(t.text || '')} words</div>
      </div>
      ${t.dirty ? '<span style="color:var(--av-accent);font-size:10px">●</span>' : ''}
    </div>
  `).join('');
  list.querySelectorAll('.writing-doc-item').forEach(el => {
    el.addEventListener('click', () => _switchToTab(el.dataset.id));
    el.addEventListener('contextmenu', e => { e.preventDefault(); _docMenu(el.dataset.id, e.clientX, e.clientY); });
  });
}

function _refreshAll() {
  _refreshDocList();
  _renderTabBar();
}

// ── New document ──────────────────────────────────────────────────────────────

function _newDoc(html, title) {
  const tab = {
    id: uid(), title: title || 'Untitled', path: null,
    html: html || '', text: _stripHtml(html || ''),
    dirty: false, fromFolder: false,
  };
  _tabs.push(tab);
  const stateDoc = { id: tab.id, title: tab.title, html: tab.html, text: tab.text, created: Date.now() };
  state.writing.documents.push(stateDoc);
  _syncTabsToState();
  _renderTabBar();
  _switchToTab(tab.id);
  saveHistory();
  setTimeout(() => document.getElementById('w-title-input')?.focus(), 50);
}

function _syncTabsToState() {
  state.writing.documents = _tabs.filter(t => !t.fromFolder).map(t => ({
    id: t.id, title: t.title, html: t.html, text: t.text,
    path: t.path, created: Date.now(),
  }));
  state.writing.activeDocId = _activeTabId;
}

// ── Focus mode ────────────────────────────────────────────────────────────────

function _focusMode(tab) {
  const overlay = document.createElement('div');
  overlay.id = 'focus-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:#0d0d0d;z-index:9999;display:flex;flex-direction:column;align-items:center;padding:60px 20px 40px;overflow-y:auto';
  overlay.innerHTML = `
    <div style="width:100%;max-width:680px;display:flex;flex-direction:column">
      <div style="display:flex;align-items:center;margin-bottom:20px;gap:12px">
        <span style="font-size:20px;font-weight:700;flex:1;color:#e8e6e0">${esc(tab.title)}</span>
        <button id="focus-exit" style="background:transparent;border:1px solid #555;color:#aaa;padding:4px 12px;border-radius:4px;cursor:pointer;font-size:12px">Exit (Esc)</button>
      </div>
      <div id="focus-body" contenteditable="true" spellcheck="true"
        style="font-family:Georgia,serif;font-size:18px;line-height:1.9;color:#e8e6e0;outline:none;min-height:80vh;padding-bottom:80px">${tab.html || ''}</div>
      <div style="text-align:center;font-size:11px;color:#555;margin-top:10px;position:fixed;bottom:20px;left:50%;transform:translateX(-50%)" id="focus-wc">${_wordCount(tab.text || '')} words</div>
    </div>
  `;
  document.body.appendChild(overlay);
  const fb = document.getElementById('focus-body');
  fb.focus();
  fb.addEventListener('input', () => {
    tab.html = fb.innerHTML; tab.text = fb.innerText;
    document.getElementById('focus-wc').textContent = _wordCount(tab.text) + ' words';
    tab.dirty = true;
  });
  document.getElementById('focus-exit').addEventListener('click', () => { overlay.remove(); _openDocEditor(tab); });
  const onKey = e => { if (e.key === 'Escape') { overlay.remove(); _openDocEditor(tab); document.removeEventListener('keydown', onKey); } };
  document.addEventListener('keydown', onKey);
}

// ── Document context menu ─────────────────────────────────────────────────────

function _docMenu(id, x, y) {
  const existing = document.getElementById('doc-ctx-menu');
  if (existing) existing.remove();
  const menu = document.createElement('div');
  menu.id = 'doc-ctx-menu';
  menu.className = 'ctx-menu';
  menu.style.cssText = `position:fixed;left:${x}px;top:${y}px;z-index:9000`;
  const items = [
    { label: '✏️ Rename', action: () => {
      const tab = _tabs.find(t => t.id === id);
      if (!tab) return;
      const n = prompt('Rename:', tab.title || '');
      if (n !== null) { tab.title = n; _syncTabsToState(); _refreshDocList(); _renderTabBar(); }
    }},
    { label: '📋 Duplicate', action: () => {
      const tab = _tabs.find(t => t.id === id);
      if (!tab) return;
      _newDoc(tab.html, (tab.title || 'Untitled') + ' (copy)');
    }},
    { label: '🗑 Delete', danger: true, action: () => {
      if (!confirm('Delete this document?')) return;
      _tabs = _tabs.filter(t => t.id !== id);
      _syncTabsToState();
      if (_activeTabId === id) {
        _activeTabId = _tabs[0]?.id || null;
        if (_activeTabId) _switchToTab(_activeTabId); else _showNoDoc();
      }
      _refreshDocList();
      _renderTabBar();
    }},
  ];
  menu.innerHTML = items.map(it => `<div class="ctx-item${it.danger?' danger':''}" style="color:${it.danger?'var(--av-danger)':'inherit'}">${it.label}</div>`).join('');
  document.body.appendChild(menu);
  menu.querySelectorAll('.ctx-item').forEach((el, i) => { el.addEventListener('click', () => { menu.remove(); items[i].action(); }); });
  setTimeout(() => document.addEventListener('click', () => menu.remove(), { once: true }), 0);
}

// ── Export ────────────────────────────────────────────────────────────────────

function _showExportMenu(e, tab) {
  const menu = document.createElement('div');
  menu.className = 'ctx-menu';
  menu.style.cssText = `position:fixed;left:${e.clientX}px;top:${e.clientY}px;z-index:9000`;
  menu.innerHTML = `
    <div class="ctx-item" data-fmt="txt">Export as Plain Text…</div>
    <div class="ctx-item" data-fmt="md">Export as Markdown…</div>
    <div class="ctx-item" data-fmt="html">Export as HTML…</div>
    <div class="ctx-item" data-fmt="docx">Export as Word (.docx)…</div>
    <div class="ctx-sep"></div>
    <div class="ctx-item" data-action="all-md">Export All (Markdown)…</div>
    <div class="ctx-item" data-action="all-txt">Export All (Plain Text)…</div>
  `;
  document.body.appendChild(menu);
  const remove = () => menu.remove();
  menu.addEventListener('click', async e2 => {
    const item = e2.target.closest('[data-fmt],[data-action]');
    if (!item) return;
    remove();
    if (item.dataset.fmt === 'docx') {
      const savePath = await window.api?.saveDialog?.(`${tab.title || 'document'}.docx`);
      if (savePath) await window.api?.fsAPI?.writeFile(savePath, tab.html, 'docx');
    } else if (item.dataset.fmt) {
      await exportDocument(tab.id, item.dataset.fmt);
    } else if (item.dataset.action === 'all-md')  await exportAllDocuments('md');
    else if (item.dataset.action === 'all-txt') await exportAllDocuments('txt');
  });
  setTimeout(() => document.addEventListener('click', remove, { once: true }), 50);
}

// ── Templates ─────────────────────────────────────────────────────────────────

function _showTemplateMenu(e) {
  const templates = [
    { label: '📄 Blank Document',       html: '' },
    { label: '📖 Novel Chapter',        html: '<h1>Chapter Title</h1><p>Scene begins here. Set the location and mood.</p><hr class="scene-break"><p>Continue the scene…</p>' },
    { label: '🎬 Scene Card',           html: '<h2>Scene</h2><p><strong>Location:</strong> </p><p><strong>Characters:</strong> </p><p><strong>Goal:</strong> </p><p><strong>Conflict:</strong> </p><p><strong>Outcome:</strong> </p><hr class="scene-break"><p>Scene beats and notes…</p>' },
    { label: '🧑 Character Interview',  html: '<h2>Character Interview</h2><p><strong>Name:</strong> </p><p><strong>Age:</strong> </p><p><strong>What do you want most?</strong></p><p></p><p><strong>What are you afraid of?</strong></p><p></p><p><strong>What secret do you keep?</strong></p><p></p>' },
    { label: '📚 Lore Entry',           html: '<h2>Lore Entry</h2><p><strong>Subject:</strong> </p><p><strong>Category:</strong> </p><h3>Description</h3><p></p><h3>History</h3><p></p><h3>Significance</h3><p></p>' },
    { label: '✍️ Free Write (timed)',   html: '<p></p>' },
  ];
  const menu = document.createElement('div');
  menu.className = 'ctx-menu';
  menu.style.cssText = `position:fixed;left:${e.clientX}px;top:${e.clientY + 4}px;z-index:9000`;
  menu.innerHTML = templates.map((t, i) => `<div class="ctx-item" data-idx="${i}">${t.label}</div>`).join('');
  document.body.appendChild(menu);
  menu.querySelectorAll('.ctx-item').forEach(el => {
    el.addEventListener('click', () => {
      menu.remove();
      const t = templates[parseInt(el.dataset.idx)];
      _newDoc(t.html, t.label.replace(/^[^\w]+/, '').trim());
    });
  });
  setTimeout(() => document.addEventListener('click', () => menu.remove(), { once: true }), 50);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function _wordCount(text) {
  return (text || '').trim().split(/\s+/).filter(Boolean).length;
}

function _stripHtml(html) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function _mdToHtml(md) {
  return md
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm,  '<h2>$1</h2>')
    .replace(/^# (.+)$/gm,   '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,     '<em>$1</em>')
    .replace(/^---$/gm, '<hr class="scene-break">')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(.+)$/, '<p>$1</p>');
}

function _htmlToMd(html) {
  return html
    .replace(/<h1>(.*?)<\/h1>/gi,   '# $1\n\n')
    .replace(/<h2>(.*?)<\/h2>/gi,   '## $1\n\n')
    .replace(/<h3>(.*?)<\/h3>/gi,   '### $1\n\n')
    .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<em>(.*?)<\/em>/gi,        '*$1*')
    .replace(/<hr[^>]*>/gi, '\n---\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .trim();
}
