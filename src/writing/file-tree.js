// file-tree.js — Folder tree panel for Writing Hub

const WRITEABLE_EXTS = new Set(['.txt','.md','.html','.docx']);
const ICON = {
  folder:       '📁',
  'folder-open':'📂',
  '.txt':       '📄',
  '.md':        '📝',
  '.docx':      '📘',
  '.html':      '🌐',
  default:      '📄',
};

export class FileTree {
  constructor(container, onOpen) {
    this._container = container;
    this._onOpen    = onOpen;     // fn(filePath)
    this._root      = null;       // root path string
    this._expanded  = new Set();  // expanded folder paths
    this._watchId   = 'ft-' + Date.now();
    this._menuEl    = null;
    this._render();
  }

  async openFolder(folderPath) {
    this._root = folderPath;
    this._expanded.clear();
    this._expanded.add(folderPath);
    if (window.api?.fsAPI) {
      await window.api.fsAPI.watch(folderPath, this._watchId);
      window.api.fsAPI.onWatchEvent(d => { if (d.watchId === this._watchId) this.refresh(); });
    }
    await this.refresh();
  }

  async refresh() {
    if (!this._root) { this._render(); return; }
    const items = await window.api?.fsAPI?.readDir(this._root) || [];
    this._tree = items;
    this._render();
  }

  _render() {
    const c = this._container;
    if (!this._root) {
      c.innerHTML = `<div class="tree-empty">
        <div style="font-size:28px;margin-bottom:8px">📂</div>
        <div style="font-size:11px;color:var(--av-text-muted);margin-bottom:12px">No folder open</div>
        <button class="btn-sm" id="tree-open-folder">Open Folder</button>
      </div>`;
      c.querySelector('#tree-open-folder')?.addEventListener('click', () => this._openFolderDialog());
      return;
    }

    const rootName = this._root.split(/[\\/]/).pop();
    c.innerHTML = `
      <div class="tree-root-row">
        <span class="tree-root-icon">📂</span>
        <span class="tree-root-name" title="${rootName}">${rootName}</span>
        <button class="tree-action-btn" id="tree-btn-open-other" title="Open different folder">⊞</button>
        <button class="tree-action-btn" id="tree-btn-new-file" title="New file">+</button>
        <button class="tree-action-btn" id="tree-btn-new-folder" title="New folder">⊕</button>
      </div>
      <div id="tree-list" class="tree-list">${this._renderItems(this._tree || [], this._root, 0)}</div>
    `;

    c.querySelector('#tree-btn-open-other')?.addEventListener('click', () => this._openFolderDialog());
    c.querySelector('#tree-btn-new-file')?.addEventListener('click', () => this._newFile(this._root));
    c.querySelector('#tree-btn-new-folder')?.addEventListener('click', () => this._newFolder(this._root));

    c.querySelectorAll('.tree-item').forEach(el => {
      el.addEventListener('click', (e) => this._onClick(el, e));
      el.addEventListener('contextmenu', (e) => { e.preventDefault(); this._showMenu(el, e.clientX, e.clientY); });
    });
  }

  _renderItems(items, parentPath, depth) {
    return items.map(item => {
      const isFolder = item.type === 'folder';
      const isOpen   = this._expanded.has(item.path);
      const icon     = isFolder ? (isOpen ? ICON['folder-open'] : ICON.folder) : (ICON[item.ext] || ICON.default);
      const isWriteable = !isFolder && WRITEABLE_EXTS.has(item.ext);
      return `<div class="tree-item${isFolder ? ' tree-folder' : ''}${isWriteable ? ' tree-file' : ' tree-file-other'}"
          data-path="${item.path}" data-type="${item.type}" data-ext="${item.ext||''}"
          style="padding-left:${12 + depth * 14}px"
          title="${item.name}">
          <span class="tree-item-icon">${isFolder ? `<span class="tree-caret">${isOpen ? '▾' : '▸'}</span>` : ''}</span>
          <span class="tree-item-emoji">${icon}</span>
          <span class="tree-item-name">${item.name}</span>
        </div>
        ${isFolder && isOpen ? `<div class="tree-children" id="tc-${_pathId(item.path)}"></div>` : ''}`;
    }).join('');
  }

  async _onClick(el, e) {
    const p    = el.dataset.path;
    const type = el.dataset.type;
    const ext  = el.dataset.ext;
    if (type === 'folder') {
      if (this._expanded.has(p)) {
        this._expanded.delete(p);
        // Remove children
        document.getElementById('tc-' + _pathId(p))?.remove();
        el.querySelector('.tree-caret').textContent = '▸';
        el.querySelector('.tree-item-emoji').textContent = ICON.folder;
      } else {
        this._expanded.add(p);
        el.querySelector('.tree-caret').textContent = '▾';
        el.querySelector('.tree-item-emoji').textContent = ICON['folder-open'];
        const children = await window.api?.fsAPI?.readDir(p) || [];
        const wrap = document.createElement('div');
        wrap.className = 'tree-children';
        wrap.id = 'tc-' + _pathId(p);
        const depth = parseInt(el.style.paddingLeft) / 14;
        wrap.innerHTML = this._renderItems(children, p, depth + 1);
        el.after(wrap);
        wrap.querySelectorAll('.tree-item').forEach(cel => {
          cel.addEventListener('click', (e) => this._onClick(cel, e));
          cel.addEventListener('contextmenu', (e) => { e.preventDefault(); this._showMenu(cel, e.clientX, e.clientY); });
        });
      }
    } else if (WRITEABLE_EXTS.has(ext)) {
      this._container.querySelectorAll('.tree-item.selected').forEach(x => x.classList.remove('selected'));
      el.classList.add('selected');
      this._onOpen(p);
    }
  }

  _showMenu(el, x, y) {
    this._closeMenu();
    const p    = el.dataset.path;
    const type = el.dataset.type;
    const ext  = el.dataset.ext;
    const menu = document.createElement('div');
    menu.className = 'ctx-menu tree-ctx-menu';
    menu.style.cssText = `position:fixed;left:${x}px;top:${y}px;z-index:9500`;

    const items = [];
    if (type === 'file' && WRITEABLE_EXTS.has(ext)) items.push({ label: '📄 Open', action: () => this._onOpen(p) });
    if (type === 'folder') {
      items.push({ label: '📄 New File', action: () => this._newFile(p) });
      items.push({ label: '📁 New Folder', action: () => this._newFolder(p) });
      items.push({ sep: true });
    }
    items.push({ label: '✏️ Rename', action: () => this._rename(p, el.querySelector('.tree-item-name').textContent) });
    items.push({ label: '🗑 Delete', danger: true, action: () => this._delete(p) });
    items.push({ sep: true });
    items.push({ label: '📂 Show in Explorer', action: () => window.api?.fsAPI?.showInFolder(p) });

    menu.innerHTML = items.map(it => it.sep
      ? '<div class="ctx-sep"></div>'
      : `<div class="ctx-item${it.danger?' danger':''}" style="color:${it.danger?'var(--av-danger)':'inherit'}">${it.label}</div>`
    ).join('');
    document.body.appendChild(menu);
    this._menuEl = menu;

    let idx = 0;
    menu.querySelectorAll('.ctx-item').forEach(el2 => {
      while (items[idx]?.sep) idx++;
      const item = items[idx++];
      if (item) el2.addEventListener('click', () => { this._closeMenu(); item.action(); });
    });

    setTimeout(() => document.addEventListener('click', () => this._closeMenu(), { once: true }), 0);
  }

  _closeMenu() {
    this._menuEl?.remove();
    this._menuEl = null;
  }

  async _openFolderDialog() {
    const p = await window.api?.fsAPI?.openFolder();
    if (p) this.openFolder(p);
  }

  async _newFile(dirPath) {
    const name = prompt('New file name (e.g. chapter1.md):');
    if (!name) return;
    const filePath = await window.api?.fsAPI?.createFile(dirPath, name);
    if (filePath) { await this.refresh(); this._onOpen(filePath); }
  }

  async _newFolder(dirPath) {
    const name = prompt('New folder name:');
    if (!name) return;
    await window.api?.fsAPI?.createFolder(dirPath, name);
    this.refresh();
  }

  async _rename(filePath, currentName) {
    const newName = prompt('Rename to:', currentName);
    if (!newName || newName === currentName) return;
    await window.api?.fsAPI?.renameFile(filePath, newName);
    this.refresh();
  }

  async _delete(filePath) {
    const name = filePath.split(/[\\/]/).pop();
    if (!confirm(`Delete "${name}"?`)) return;
    await window.api?.fsAPI?.deleteFile(filePath);
    this.refresh();
  }

  destroy() {
    if (this._root) window.api?.fsAPI?.unwatch(this._watchId);
    this._closeMenu();
  }
}

function _pathId(p) {
  return p.replace(/[^a-zA-Z0-9]/g, '_');
}
