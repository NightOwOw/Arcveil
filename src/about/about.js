// about.js — About view: app info, credits, version, keyboard shortcuts
import { state, EventBus } from '../state.js';
import { SHORTCUTS, getKey, setKey, resetKey, recordEvent, findConflict, setKeySwap } from '../shortcuts.js';

export function renderAboutView(container) {
  const view = container || document.getElementById('view-about');
  if (!view) return;
  _render(view);
}

async function _render(view) {
  let version = '1.0.0';
  try { version = await window.api?.version?.() || '1.0.0'; } catch {}

  view.innerHTML = `
    <div class="about-layout">
      <div class="about-hero">
        <img id="about-logo-img" src="assets/icons/app_logo_white.png" style="height:64px;object-fit:contain;margin-bottom:10px;display:block;margin-inline:auto">
        <p class="about-tagline">Your story arc. Your world unveiled.</p>
        <div class="about-version">v${version}</div>
        <div class="about-sub">Local-first creative writing &amp; worldbuilding studio</div>
      </div>

      <div class="about-body">
        <div class="about-grid">

          <div class="about-card">
            <div class="about-card-head">🔒 Privacy First</div>
            <p>Everything lives on <strong>your</strong> computer. No account, no cloud sync, no telemetry. Works offline forever.</p>
          </div>

          <div class="about-card">
            <div class="about-card-head">🚀 Built For Writers</div>
            <p>Character relationship maps, deep profiles, distraction-free writing, fantasy maps, world lore, story beats — all in one place.</p>
          </div>

          <div class="about-card">
            <div class="about-card-head">🐲 Companion AI</div>
            <p>Ciona and Somvora keep you company while you write. Offline preset dialogue or optional local/cloud AI — your choice.</p>
          </div>

          <div class="about-card">
            <div class="about-card-head">🌍 Open Format</div>
            <p>Projects save as plain JSON. Your data is always readable, portable, and yours — no lock-in, ever.</p>
          </div>
        </div>

        <div class="about-section">
          <div class="about-section-head">Keyboard Shortcuts <span style="font-size:9px;font-weight:400;color:var(--av-text-muted);text-transform:none;letter-spacing:0;margin-left:6px">Click a key to customize</span></div>
          <div class="about-shortcut-table">
            <div class="about-shortcut-group">
              <div class="about-shortcut-group-head">Navigation</div>
              ${_kb([
                ['nav-dashboard',  'Dashboard'],
                ['nav-canvas',     'Canvas'],
                ['nav-characters', 'Characters'],
                ['nav-writing',    'Writing'],
                ['nav-world',      'World'],
                ['nav-settings',   'Settings'],
              ])}
            </div>
            <div class="about-shortcut-group">
              <div class="about-shortcut-group-head">Project</div>
              ${_kb([
                ['proj-new',     'New project'],
                ['proj-open',    'Open project'],
                ['proj-save',    'Save project'],
                ['proj-save-as', 'Save as…'],
                ['proj-undo',    'Undo'],
                ['proj-redo',    'Redo'],
              ])}
            </div>
            <div class="about-shortcut-group">
              <div class="about-shortcut-group-head">Overlays (Global — not remappable)</div>
              ${_kb([
                [null, 'Ctrl+Shift+Space', 'Quick Summon'],
                [null, 'Ctrl+Shift+C',     'Toggle Companion'],
                [null, 'Ctrl+Shift+H',     'Toggle HUD'],
                [null, 'Ctrl+Shift+E',     'Toggle Edge Panel'],
                [null, 'Ctrl+Shift+N',     'Quick Capture'],
                [null, 'Ctrl+Shift+W',     'Word Count'],
              ])}
            </div>
            <div class="about-shortcut-group">
              <div class="about-shortcut-group-head">Canvas</div>
              ${_kb([
                ['canvas-add-node', 'Add character node'],
                ['canvas-fit',      'Fit all nodes'],
                ['canvas-delete',   'Delete selected'],
                [null, 'Alt+Drag',  'Pan canvas'],
                [null, 'Scroll',    'Zoom'],
                [null, 'Dbl-click', 'New node at position'],
              ])}
            </div>
          </div>
        </div>

        <div class="about-footer">
          <div class="about-footer-links">
            <button class="btn-sm" id="about-open-data-dir">Open Data Folder</button>
            <button class="btn-sm" id="about-settings-link">Settings</button>
          </div>
          <p style="font-size:10px;color:var(--av-text-muted);margin-top:12px">
            Built with Electron, Vanilla JS, Three.js — No telemetry, no tracking, no cloud required.
          </p>
        </div>
      </div>
    </div>
  `;

  view.querySelector('#about-open-data-dir')?.addEventListener('click', async () => {
    const dir = await window.api?.userData?.();
    if (dir) window.api?.showFolder?.(dir);
  });
  view.querySelector('#about-settings-link')?.addEventListener('click', () => EventBus.emit('nav:changed', 'settings'));

  // Bind shortcut customization clicks
  view.querySelectorAll('.about-key.customizable[data-id]').forEach(el => {
    el.addEventListener('click', () => _showShortcutModal(el.dataset.id, view));
  });

  // Swap logo when theme changes
  const _syncAboutLogo = (themeId) => {
    const logoEl = view.querySelector('#about-logo-img');
    if (!logoEl) return;
    const isDark = !themeId || themeId === 'arcveil';
    logoEl.src = isDark ? 'assets/icons/app_logo_white.png' : 'assets/icons/app_logo.png';
  };
  EventBus.on('theme:changed', _syncAboutLogo);
  _syncAboutLogo(document.documentElement.getAttribute('data-theme'));
}

// pairs: [id_or_null, label_or_fixedKey, optional_label]
// If id matches a SHORTCUT → customizable, key comes from getKey(id)
// If id is null → [null, fixedKey, label] — static display
function _kb(pairs) {
  return pairs.map(entry => {
    const id    = entry[0];
    const sc    = id ? SHORTCUTS.find(s => s.id === id) : null;
    const key   = sc ? getKey(id) : entry[1];
    const label = sc ? entry[1] : entry[2];
    if (sc) {
      return `
        <div class="about-shortcut-row">
          <span class="about-key customizable" data-id="${id}" title="Click to customize">${key}</span>
          <span class="about-shortcut-label">${label}</span>
        </div>`;
    }
    return `
      <div class="about-shortcut-row">
        <span class="about-key">${key}</span>
        <span class="about-shortcut-label">${label}</span>
      </div>`;
  }).join('');
}

function _showShortcutModal(id, view) {
  const sc = SHORTCUTS.find(s => s.id === id);
  if (!sc) return;

  let pending = null;

  const overlay = document.createElement('div');
  overlay.id = 'sc-modal-overlay';
  overlay.innerHTML = `
    <div class="sc-modal">
      <div class="sc-modal-title">Customize shortcut</div>
      <div class="sc-modal-label">${sc.label}</div>
      <div class="sc-modal-hint">Press a new key combination…</div>
      <div class="sc-modal-preview" id="sc-preview">${getKey(id)}</div>
      <div class="sc-modal-conflict" id="sc-conflict"></div>
      <div class="sc-modal-btns">
        <button class="btn-primary" id="sc-save" style="font-size:11px;padding:5px 14px">Save</button>
        <button class="btn-sm" id="sc-reset">Reset default</button>
        <button class="btn-sm" id="sc-cancel">Cancel</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const conflictEl = overlay.querySelector('#sc-conflict');

  const onKey = (e) => {
    e.preventDefault();
    e.stopImmediatePropagation();
    if (e.key === 'Escape') { _close(); return; }
    const combo = recordEvent(e);
    if (!combo) return;
    pending = combo;

    const preview = overlay.querySelector('#sc-preview');
    if (preview) preview.textContent = combo;

    // Real-time conflict detection
    const conflict = findConflict(id, combo);
    if (conflict) {
      const displaced = getKey(id);
      conflictEl.textContent =
        `⚠ Already used by "${conflict.label}". Saving will swap — that action moves to "${displaced}".`;
      conflictEl.style.display = 'block';
    } else {
      conflictEl.style.display = 'none';
    }
  };

  // Capture phase — fires before the app's keydown handler so shortcuts don't trigger
  document.addEventListener('keydown', onKey, { capture: true });

  const _close = () => {
    document.removeEventListener('keydown', onKey, { capture: true });
    overlay.remove();
  };

  const _refresh = () => {
    view.querySelectorAll('.about-key.customizable[data-id]').forEach(el => {
      el.textContent = getKey(el.dataset.id);
    });
  };

  overlay.querySelector('#sc-save').onclick = () => {
    if (pending) { setKeySwap(id, pending); _refresh(); }
    _close();
  };
  overlay.querySelector('#sc-reset').onclick = () => {
    resetKey(id); _refresh(); _close();
  };
  overlay.querySelector('#sc-cancel').onclick = _close;

  // Click outside modal box to cancel
  overlay.addEventListener('click', e => { if (e.target === overlay) _close(); });
}
