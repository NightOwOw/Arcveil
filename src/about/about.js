// about.js — About view: app info, credits, version, keyboard shortcuts
import { state, EventBus } from '../state.js';

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
        <div class="about-logo-mark">✦</div>
        <h1 class="about-title">ArcVeil</h1>
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
          <div class="about-section-head">Keyboard Shortcuts</div>
          <div class="about-shortcut-table">
            <div class="about-shortcut-group">
              <div class="about-shortcut-group-head">Navigation</div>
              ${_kb([
                ['1', 'Dashboard'],
                ['2', 'Canvas'],
                ['3', 'Characters'],
                ['4', 'Writing'],
                ['5', 'World'],
                ['Ctrl+,', 'Settings'],
              ])}
            </div>
            <div class="about-shortcut-group">
              <div class="about-shortcut-group-head">Project</div>
              ${_kb([
                ['Ctrl+N', 'New project'],
                ['Ctrl+O', 'Open project'],
                ['Ctrl+S', 'Save project'],
                ['Ctrl+Shift+S', 'Save as…'],
                ['Ctrl+Z', 'Undo'],
                ['Ctrl+Y', 'Redo'],
              ])}
            </div>
            <div class="about-shortcut-group">
              <div class="about-shortcut-group-head">Overlays (Global)</div>
              ${_kb([
                ['Ctrl+Shift+Space', 'Quick Summon'],
                ['Ctrl+Shift+C', 'Toggle Companion'],
                ['Ctrl+Shift+H', 'Toggle HUD'],
                ['Ctrl+Shift+E', 'Toggle Edge Panel'],
                ['Ctrl+Shift+N', 'Quick Capture'],
                ['Ctrl+Shift+W', 'Word Count'],
              ])}
            </div>
            <div class="about-shortcut-group">
              <div class="about-shortcut-group-head">Canvas</div>
              ${_kb([
                ['N', 'Add character node'],
                ['F', 'Fit all nodes'],
                ['Del / Backspace', 'Delete selected'],
                ['Alt+Drag', 'Pan canvas'],
                ['Scroll', 'Zoom'],
                ['Dbl-click', 'New node at position'],
              ])}
            </div>
          </div>
        </div>

        <div class="about-section">
          <div class="about-section-head">Phase Progress</div>
          <div class="about-phases">
            ${_phase(true, '1', 'Foundation', 'Electron shell, canvas engine, themes, state')}
            ${_phase(true, '2', 'Characters', 'Profiles, portrait, traits, backstory, gallery')}
            ${_phase(true, '3', 'Writing Hub', 'Editor, chapters, annotations, focus mode, versions')}
            ${_phase(true, '4', 'Story Structure', 'Timeline, scenes, arcs, beats, pacing meter')}
            ${_phase(true, '5', 'Map Generator', 'Fantasy map BFS, rivers, provinces, SVG render')}
            ${_phase(true, '6', 'World & Lore', 'Locations, factions, bestiary, items, calendar')}
            ${_phase(true, '7', 'Companion System', 'VRM/2D, Ciona & Somvora, awareness, tracker')}
            ${_phase(true, '8', 'Overlay System', 'HUD, edge panel, quick summon, tray, global hotkeys')}
            ${_phase(true, '9', 'Settings', 'Themes, typography, companion, AI mode, voice')}
            ${_phase(true, '10', 'Distribution', 'Auto-updater, offline license, build pipeline')}
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
}

function _kb(pairs) {
  return pairs.map(([key, label]) => `
    <div class="about-shortcut-row">
      <span class="about-key">${key}</span>
      <span class="about-shortcut-label">${label}</span>
    </div>
  `).join('');
}

function _phase(done, num, name, desc) {
  return `
    <div class="about-phase${done ? ' done' : ''}">
      <span class="about-phase-icon">${done ? '✅' : '⏳'}</span>
      <span class="about-phase-num">Phase ${num}</span>
      <span class="about-phase-name">${name}</span>
      <span class="about-phase-desc">${desc}</span>
    </div>
  `;
}
