// settings-ui.js — Full appearance + assistant settings
import { state, EventBus, esc } from '../state.js';
import { applyTheme, THEME_LIST } from '../ui/themes.js';
import { applyTokens, clearCustomTokens, exportThemeJSON, importThemeJSON, suggestPalette, saveCustomTheme } from './theme-engine.js';
import PRESET_THEMES from './preset-themes.js';
import { renderCompanionTab, renderCompanionContent } from './settings-companion.js';

export function renderSettingsView(container) { initSettings(container); }

export function initSettings(container) {
  const view = container || document.getElementById('view-settings');
  if (!view) return;
  _render(view);
}

let _activeTab = 'appearance';
let _view = null;

function _render(view) {
  _view = view;
  view.innerHTML = `
    <div class="settings-layout">
      <div class="settings-sidebar">
        <div class="settings-logo">⚙ Settings</div>
        <nav class="settings-nav">
          <div class="settings-nav-item active" data-tab="appearance">🎨 Appearance</div>
          <div class="settings-nav-item" data-tab="assistant">✨ ARCtor</div>
          <div class="settings-nav-item" data-tab="overlays">◻ Overlays</div>
          <div class="settings-nav-item" data-tab="general">⚙ General</div>
        </nav>
      </div>
      <div class="settings-content" id="settings-content"></div>
    </div>
  `;

  view.querySelectorAll('.settings-nav-item').forEach(el => {
    el.addEventListener('click', () => {
      view.querySelectorAll('.settings-nav-item').forEach(n => n.classList.remove('active'));
      el.classList.add('active');
      _activeTab = el.dataset.tab;
      _renderTab(_activeTab);
    });
  });

  _renderTab('appearance');
}

function _refreshActiveTab() { if (_view) _renderTab(_activeTab); }

function _renderTab(tab) {
  const content = document.getElementById('settings-content');
  if (!content) return;
  switch (tab) {
    case 'appearance': _renderAppearance(content); break;
    case 'assistant':  _renderAssistant(content);  break;
    case 'overlays':   _renderOverlays(content);   break;
    case 'general':    _renderGeneral(content);    break;
  }
}

// ── Appearance ────────────────────────────────────────────────────────────────

function _renderAppearance(el) {
  const s = state.settings;
  const allThemes = [...PRESET_THEMES, ...(s.customThemes || [])];

  el.innerHTML = `
    <div class="settings-scroll">
      <h2 class="settings-section-title">Appearance</h2>

      <div class="settings-block">
        <div class="settings-block-head">Themes</div>
        <div class="theme-grid" id="theme-grid">
          ${allThemes.map(t => `
            <div class="theme-card${s.theme === t.id ? ' active' : ''}" data-tid="${t.id}">
              <div class="theme-swatches">
                ${(t.swatches || ['#222','#7c5cbf','#eee']).map(c => `<span class="theme-swatch" style="background:${c}"></span>`).join('')}
              </div>
              <div class="theme-card-name">${esc(t.name)}</div>
              <div class="theme-card-desc">${esc(t.desc || '')}</div>
              <div class="theme-card-actions">
                <button class="btn-xs theme-apply-btn" data-tid="${t.id}">Apply</button>
                <button class="btn-xs theme-export-btn" data-tid="${t.id}" title="Export JSON">📤</button>
              </div>
            </div>
          `).join('')}
          <div class="theme-card theme-import-card" id="theme-import-card">
            <div style="font-size:28px;margin-bottom:6px;opacity:0.4">+</div>
            <div class="theme-card-name" style="opacity:0.6">Import Theme</div>
          </div>
        </div>
      </div>

      <div class="settings-block" id="token-editor-block" style="display:none">
        <div class="settings-block-head">Color Token Editor <button class="btn-xs" id="token-close-btn">✕</button></div>
        <div id="token-editor"></div>
        <div class="settings-block-head" style="margin-top:12px">Color Harmony</div>
        <div style="display:flex;align-items:center;gap:8px;margin-top:6px">
          <label style="font-size:11px;color:var(--av-text-secondary)">Base color</label>
          <input type="color" id="harmony-base" value="#7c5cbf" style="width:36px;height:28px;border:none;cursor:pointer;background:transparent">
          <select id="harmony-mode" style="flex:1">
            <option value="complementary">Complementary</option>
            <option value="analogous">Analogous</option>
            <option value="triadic">Triadic</option>
            <option value="monochrome">Monochrome</option>
          </select>
          <button class="btn-sm" id="harmony-suggest">Suggest</button>
        </div>
        <div id="harmony-result" style="display:flex;gap:6px;margin-top:8px"></div>
        <div style="margin-top:12px;display:flex;gap:8px">
          <button class="btn-primary btn-sm" id="token-save-btn">💾 Save as Custom Theme</button>
        </div>
      </div>

      <div class="settings-block">
        <div class="settings-block-head">Typography</div>
        <div class="settings-row"><label>Interface Font</label>
          <select id="font-ui">${_fontOptions(s.typography?.fontUi || '')}</select>
        </div>
        <div class="settings-row"><label>Heading Font</label>
          <select id="font-heading">${_fontOptions(s.typography?.fontHeading || '')}</select>
        </div>
        <div class="settings-row"><label>Editor Font</label>
          <select id="font-editor">${_fontOptions(s.typography?.fontEditor || '')}</select>
        </div>
        <div class="settings-row">
          <label>Base Size <span id="font-size-val">${s.typography?.fontSize || 13}px</span></label>
          <input type="range" id="font-size" min="12" max="18" value="${s.typography?.fontSize || 13}" style="flex:1">
        </div>
        <div class="settings-row">
          <label>Line Height <span id="line-height-val">${s.typography?.lineHeight || 1.6}</span></label>
          <input type="range" id="line-height" min="1.3" max="2.0" step="0.1" value="${s.typography?.lineHeight || 1.6}" style="flex:1">
        </div>
        <div class="settings-row">
          <label>Letter Spacing <span id="letter-spacing-val">${s.typography?.letterSpacing || 0}px</span></label>
          <input type="range" id="letter-spacing" min="-1" max="3" step="0.5" value="${s.typography?.letterSpacing || 0}" style="flex:1">
        </div>
        <div id="typo-preview" class="typo-preview">The quick brown fox jumps over the lazy dog.</div>
      </div>

      <div class="settings-block">
        <div class="settings-block-head">Animations & Motion</div>
        <div class="settings-toggle-row">
          <label>Enable animations</label>
          <input type="checkbox" id="set-anim" ${s.animations !== false ? 'checked' : ''}>
        </div>
        <div class="settings-toggle-row">
          <label>Reduce motion (accessibility)</label>
          <input type="checkbox" id="set-reduce-motion" ${s.reduceMotion ? 'checked' : ''}>
        </div>
      </div>

      <div class="settings-block">
        <div class="settings-block-head">Sounds</div>
        <div class="settings-toggle-row">
          <label>Sound effects</label>
          <input type="checkbox" id="set-sound" ${s.sounds ? 'checked' : ''}>
        </div>
        <div class="settings-toggle-row" style="padding-left:12px">
          <label>Keystroke sounds</label>
          <input type="checkbox" id="set-keystroke" ${s.keystrokeSounds ? 'checked' : ''}>
        </div>
        <div class="settings-toggle-row" style="padding-left:12px">
          <label>Notification chimes</label>
          <input type="checkbox" id="set-chimes" ${s.notifyChimes ? 'checked' : ''}>
        </div>
      </div>

      <div class="settings-block">
        <div class="settings-block-head">Accessibility</div>
        <div class="settings-toggle-row">
          <label>High contrast mode</label>
          <input type="checkbox" id="set-hc" ${s.highContrast ? 'checked' : ''}>
        </div>
        <div class="settings-toggle-row">
          <label>Focus indicators (always visible)</label>
          <input type="checkbox" id="set-focus-ring" ${s.focusRing !== false ? 'checked' : ''}>
        </div>
        <div class="settings-row">
          <label>Cursor size</label>
          <select id="set-cursor">
            <option value="default" ${s.cursorSize==='default'?'selected':''}>Default</option>
            <option value="large" ${s.cursorSize==='large'?'selected':''}>Large</option>
          </select>
        </div>
      </div>
    </div>
  `;

  // Theme card events
  el.querySelectorAll('.theme-apply-btn').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation(); applyTheme(btn.dataset.tid); _refreshActiveTab(); });
  });
  el.querySelectorAll('.theme-card').forEach(card => {
    card.addEventListener('click', () => { if (card.dataset.tid) { applyTheme(card.dataset.tid); _refreshActiveTab(); } });
  });
  el.querySelectorAll('.theme-export-btn').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation(); const json = exportThemeJSON(btn.dataset.tid); if (json) { navigator.clipboard.writeText(json); alert('Theme JSON copied to clipboard!'); } });
  });
  document.getElementById('theme-import-card')?.addEventListener('click', () => {
    const json = prompt('Paste theme JSON:');
    if (!json) return;
    try { const t = importThemeJSON(json); applyTheme(t.id); _refreshActiveTab(); }
    catch (e) { alert(e.message); }
  });

  // Token editor toggle
  el.querySelectorAll('.theme-card').forEach(card => {
    card.addEventListener('dblclick', () => _openTokenEditor(card.dataset.tid));
  });
  document.getElementById('token-close-btn')?.addEventListener('click', () => {
    document.getElementById('token-editor-block').style.display = 'none';
  });

  // Harmony
  document.getElementById('harmony-suggest')?.addEventListener('click', () => {
    const base = document.getElementById('harmony-base').value;
    const mode = document.getElementById('harmony-mode').value;
    const palette = suggestPalette(base, mode);
    document.getElementById('harmony-result').innerHTML = palette.map(c =>
      `<div style="width:36px;height:36px;border-radius:6px;background:${c};cursor:pointer;border:1px solid rgba(255,255,255,0.1)" title="${c}" onclick="navigator.clipboard.writeText('${c}')"></div>`
    ).join('');
  });

  document.getElementById('token-save-btn')?.addEventListener('click', () => {
    const name = prompt('Custom theme name:', 'My Theme'); if (!name) return;
    const tokens = _readTokenEditorValues();
    saveCustomTheme({ id: 'custom_' + Date.now(), name, desc: 'Custom theme', swatches: [tokens['--av-bg-primary']||'#111', tokens['--av-accent']||'#7c5cbf', tokens['--av-text-primary']||'#eee'], tokens });
    _refreshActiveTab();
  });

  // Typography
  ['font-ui','font-heading','font-editor'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', e => {
      if (!state.settings.typography) state.settings.typography = {};
      const key = id === 'font-ui' ? 'fontUi' : id === 'font-heading' ? 'fontHeading' : 'fontEditor';
      state.settings.typography[key] = e.target.value;
      _applyTypography();
    });
  });
  document.getElementById('font-size')?.addEventListener('input', e => {
    if (!state.settings.typography) state.settings.typography = {};
    state.settings.typography.fontSize = +e.target.value;
    document.getElementById('font-size-val').textContent = e.target.value + 'px';
    _applyTypography();
  });
  document.getElementById('line-height')?.addEventListener('input', e => {
    if (!state.settings.typography) state.settings.typography = {};
    state.settings.typography.lineHeight = +e.target.value;
    document.getElementById('line-height-val').textContent = e.target.value;
    _applyTypography();
  });
  document.getElementById('letter-spacing')?.addEventListener('input', e => {
    if (!state.settings.typography) state.settings.typography = {};
    state.settings.typography.letterSpacing = +e.target.value;
    document.getElementById('letter-spacing-val').textContent = e.target.value + 'px';
    _applyTypography();
  });

  // Toggles
  document.getElementById('set-anim')?.addEventListener('change',          e => { state.settings.animations  = e.target.checked; });
  document.getElementById('set-reduce-motion')?.addEventListener('change', e => { state.settings.reduceMotion = e.target.checked; document.documentElement.classList.toggle('reduce-motion', e.target.checked); });
  document.getElementById('set-sound')?.addEventListener('change',         e => { state.settings.sounds       = e.target.checked; });
  document.getElementById('set-keystroke')?.addEventListener('change',     e => { state.settings.keystrokeSounds = e.target.checked; });
  document.getElementById('set-chimes')?.addEventListener('change',        e => { state.settings.notifyChimes = e.target.checked; });
  document.getElementById('set-hc')?.addEventListener('change',            e => { state.settings.highContrast = e.target.checked; document.documentElement.classList.toggle('high-contrast', e.target.checked); });
  document.getElementById('set-focus-ring')?.addEventListener('change',    e => { state.settings.focusRing    = e.target.checked; });
  document.getElementById('set-cursor')?.addEventListener('change',        e => { state.settings.cursorSize    = e.target.value; });
}

function _openTokenEditor(themeId) {
  const block = document.getElementById('token-editor-block');
  if (!block) return;
  block.style.display = '';
  const editorEl = document.getElementById('token-editor');
  if (!editorEl) return;

  const TOKEN_GROUPS = {
    'Backgrounds': ['--av-bg-primary','--av-bg-secondary','--av-bg-elevated','--av-bg-surface','--av-bg-hover','--av-canvas-bg','--av-input-bg'],
    'Accent':      ['--av-accent','--av-accent-soft','--av-accent-hover'],
    'Text':        ['--av-text-primary','--av-text-secondary','--av-text-muted'],
    'Borders':     ['--av-border','--av-border-strong'],
  };

  editorEl.innerHTML = Object.entries(TOKEN_GROUPS).map(([group, vars]) => `
    <div style="margin-bottom:10px">
      <div style="font-size:10px;font-weight:700;color:var(--av-text-muted);text-transform:uppercase;margin-bottom:4px">${group}</div>
      ${vars.map(v => {
        const val = getComputedStyle(document.documentElement).getPropertyValue(v).trim() || '#888888';
        const isColor = val.startsWith('#') || val.startsWith('rgb') || val.startsWith('hsl');
        return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
          <span style="font-size:10px;color:var(--av-text-muted);min-width:140px;flex-shrink:0">${v.replace('--av-','')}</span>
          ${isColor ? `<input type="color" data-var="${v}" value="${_toHex(val)}" style="width:32px;height:24px;border:none;cursor:pointer;background:transparent;flex-shrink:0">` : ''}
          <input type="text" data-var-text="${v}" value="${val}" style="flex:1;font-size:11px;font-family:monospace">
        </div>`;
      }).join('')}
    </div>
  `).join('');

  editorEl.querySelectorAll('[data-var]').forEach(input => {
    input.addEventListener('input', e => {
      document.documentElement.style.setProperty(e.target.dataset.var, e.target.value);
      const textInput = editorEl.querySelector(`[data-var-text="${e.target.dataset.var}"]`);
      if (textInput) textInput.value = e.target.value;
    });
  });
  editorEl.querySelectorAll('[data-var-text]').forEach(input => {
    input.addEventListener('input', e => {
      document.documentElement.style.setProperty(e.target.dataset.varText, e.target.value);
    });
  });
}

function _readTokenEditorValues() {
  const tokens = {};
  document.querySelectorAll('[data-var]').forEach(el => {
    tokens[el.dataset.var] = el.value;
  });
  return tokens;
}

function _applyTypography() {
  const t = state.settings.typography || {};
  const root = document.documentElement;
  if (t.fontUi)      root.style.setProperty('--av-font-ui',      t.fontUi);
  if (t.fontHeading) root.style.setProperty('--av-font-heading',  t.fontHeading);
  if (t.fontSize)    root.style.setProperty('--av-font-size-base', t.fontSize + 'px');
  if (t.lineHeight)  root.style.setProperty('--av-line-height',   String(t.lineHeight));
  if (t.letterSpacing !== undefined) root.style.setProperty('--av-letter-spacing', t.letterSpacing + 'px');

  const preview = document.getElementById('typo-preview');
  if (preview) {
    preview.style.fontFamily    = t.fontUi || '';
    preview.style.fontSize      = (t.fontSize || 13) + 'px';
    preview.style.lineHeight    = String(t.lineHeight || 1.6);
    preview.style.letterSpacing = (t.letterSpacing || 0) + 'px';
  }
}

function _fontOptions(current) {
  const fonts = [
    { val: '', label: 'System default' },
    { val: '-apple-system, "Segoe UI", sans-serif', label: 'System Sans-serif' },
    { val: 'Georgia, serif',                         label: 'Georgia (Serif)' },
    { val: '"Times New Roman", serif',               label: 'Times New Roman' },
    { val: '"Courier New", monospace',               label: 'Courier New (Mono)' },
    { val: '"Palatino Linotype", serif',             label: 'Palatino' },
    { val: '"Comic Sans MS", cursive',               label: 'Comic Sans' },
    { val: 'Garamond, serif',                        label: 'Garamond' },
    { val: 'Verdana, sans-serif',                    label: 'Verdana' },
    { val: '"Consolas", monospace',                  label: 'Consolas' },
  ];
  return fonts.map(f => `<option value="${f.val}" ${current === f.val ? 'selected' : ''}>${f.label}</option>`).join('');
}

function _toHex(color) {
  if (color.startsWith('#') && color.length === 7) return color;
  if (color.startsWith('#') && color.length === 4) {
    return '#' + color[1]+color[1]+color[2]+color[2]+color[3]+color[3];
  }
  return '#888888';
}

// ── Assistant ─────────────────────────────────────────────────────────────────

function _pushAiSettings() {
  const c = state.companion || {};
  // Read from DOM elements first — they reflect what the user actually sees/typed
  const aiModeEl = document.querySelector('[name="ai-mode"]:checked');
  EventBus.emit('companion:settings-changed', {
    aiMode:       aiModeEl?.value                                          || c.aiMode       || 'none',
    aiProvider:   document.getElementById('ai-provider')?.value           || c.aiProvider   || 'anthropic',
    anthropicKey: document.getElementById('anthropic-key')?.value         || c.anthropicKey || '',
    openaiKey:    document.getElementById('openai-key')?.value            || c.openaiKey    || '',
    geminiKey:    document.getElementById('gemini-key')?.value            || c.geminiKey    || '',
    ollamaUrl:    document.getElementById('ollama-url')?.value            || c.ollamaUrl    || 'http://localhost:11434',
    ollamaModel:  document.getElementById('ollama-model')?.value          || c.ollamaModel  || 'llama3',
  });
}

function _renderAssistant(el) {
  const c = state.companion || {};
  el.innerHTML = `
    <div class="settings-scroll">
      <h2 class="settings-section-title">ARCtor</h2>

      <div class="settings-block privacy-block">
        <div class="privacy-title">🔒 Privacy Statement</div>
        <div class="privacy-text">
          ArcVeil is a <strong>local-first</strong> application.<br>
          Everything is stored on <strong>YOUR</strong> computer.<br>
          Your writing never touches our servers.<br>
          Your characters, worlds, and stories are yours.<br>
          <strong>No account required. Ever.</strong><br>
          No telemetry or usage tracking.<br>
          Works <strong>100% offline</strong>.<br><br>
          <em>If you enable Cloud AI: your messages go to OpenAI/Anthropic,
          subject to their privacy policies, using your API key, not ours.
          You can disable this at any time.</em>
        </div>
      </div>

      <div class="settings-block">
        <div class="settings-block-head">Companion</div>
        <div class="companion-selector-grid" id="companion-grid">
          ${_companionCards(c.activeCompanion)}
        </div>
        <div class="settings-row" style="margin-top:12px">
          <label>Companion name</label>
          <input type="text" id="companion-name" value="${esc(c.name||'Ciona')}" placeholder="What do you call them?">
        </div>
        <div class="settings-row">
          <label>Calls you</label>
          <select id="companion-calls-you">
            <option value="by name"   ${c.callsUser==='by name'  ?'selected':''}>By name</option>
            <option value="Writer"    ${c.callsUser==='Writer'   ?'selected':''}>Writer</option>
            <option value="Creator"   ${c.callsUser==='Creator'  ?'selected':''}>Creator</option>
            <option value="Senpai"    ${c.callsUser==='Senpai'   ?'selected':''}>Senpai</option>
            <option value="Boss"      ${c.callsUser==='Boss'     ?'selected':''}>Boss</option>
          </select>
        </div>
        <div class="settings-row">
          <label>Daily writing goal</label>
          <input type="number" id="daily-goal" value="${c.dailyGoal||1000}" min="100" max="50000" style="width:100px"> words
        </div>
        <div class="settings-row">
          <label>Your name</label>
          <input type="text" id="user-name" value="${esc(c.userName||'')}" placeholder="For companion to address you">
        </div>
        <button class="btn-sm" id="companion-import-vrm" style="margin-top:8px">📦 Import Custom VRM…</button>
      </div>

      <div class="settings-block">
        <div class="settings-block-head">AI Mode</div>
        <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:12px">
          <label class="settings-radio-row">
            <input type="radio" name="ai-mode" value="none" ${(c.aiMode||'none')==='none'?'checked':''}> <strong>No AI</strong> — Companion uses offline preset dialogue only
          </label>
          <label class="settings-radio-row">
            <input type="radio" name="ai-mode" value="local" ${c.aiMode==='local'?'checked':''}> <strong>Local AI</strong> — Ollama running on your machine
          </label>
          <div id="local-ai-config" style="${c.aiMode==='local'?'':'display:none'};padding:8px 12px;background:var(--av-bg-elevated);border-radius:var(--av-radius-md);font-size:12px">
            <div style="margin-bottom:6px;color:var(--av-text-secondary)">Ollama endpoint:</div>
            <input type="text" id="ollama-url" value="${esc(c.ollamaUrl||'http://localhost:11434')}" style="width:100%;margin-bottom:6px">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
              <span style="color:var(--av-text-secondary)">Model:</span>
              <button id="ollama-detect-btn" style="font-size:10px;padding:2px 7px;border-radius:4px;border:1px solid var(--av-border);background:var(--av-bg-base);color:var(--av-text-muted);cursor:pointer">↻ Detect</button>
              <span id="ollama-detect-status" style="font-size:10px;color:var(--av-text-muted)"></span>
            </div>
            <select id="ollama-model-select" style="width:100%;margin-bottom:4px;display:none"></select>
            <input type="text" id="ollama-model" value="${esc(c.ollamaModel||'')}" placeholder="e.g. llama3.2:3b" style="width:100%">
          </div>
          <label class="settings-radio-row">
            <input type="radio" name="ai-mode" value="cloud" ${c.aiMode==='cloud'?'checked':''}> <strong>Cloud AI</strong> — Claude, GPT, or Gemini
          </label>
          <div id="cloud-ai-config" style="${c.aiMode==='cloud'?'':'display:none'};padding:8px 12px;background:var(--av-bg-elevated);border-radius:var(--av-radius-md);font-size:12px">
            <div style="margin-bottom:6px;color:var(--av-text-secondary)">Active provider:</div>
            <select id="ai-provider" style="width:100%;margin-bottom:10px">
              <option value="anthropic" ${(c.aiProvider||'anthropic')==='anthropic'?'selected':''}>Anthropic (Claude Haiku)</option>
              <option value="openai"    ${c.aiProvider==='openai'   ?'selected':''}>OpenAI (GPT-4o mini)</option>
              <option value="gemini"    ${c.aiProvider==='gemini'   ?'selected':''}>Google (Gemini 1.5 Flash)</option>
            </select>
            <div style="margin-bottom:4px;color:var(--av-text-secondary)">Anthropic API key:</div>
            <input type="password" id="anthropic-key" value="${esc(c.anthropicKey||'')}" placeholder="sk-ant-..." style="width:100%;margin-bottom:8px">
            <div style="margin-bottom:4px;color:var(--av-text-secondary)">OpenAI API key:</div>
            <input type="password" id="openai-key" value="${esc(c.openaiKey||'')}" placeholder="sk-..." style="width:100%;margin-bottom:8px">
            <div style="margin-bottom:4px;color:var(--av-text-secondary)">Google API key:</div>
            <input type="password" id="gemini-key" value="${esc(c.geminiKey||'')}" placeholder="AIza..." style="width:100%">
          </div>
        </div>
      </div>

      <div class="settings-block">
        <div class="settings-block-head">Voice</div>
        <div class="settings-toggle-row">
          <label>Enable voice</label>
          <input type="checkbox" id="voice-enabled" ${c.voiceEnabled?'checked':''}>
        </div>
        <div class="settings-row">
          <label>Voice engine</label>
          <select id="voice-engine">
            <option value="system" ${(c.voiceEngine||'system')==='system'?'selected':''}>System TTS</option>
            <option value="elevenlabs" ${c.voiceEngine==='elevenlabs'?'selected':''}>ElevenLabs</option>
          </select>
        </div>
        <div class="settings-row">
          <label>Volume</label>
          <input type="range" id="voice-volume" min="0" max="100" value="${c.voiceVolume||70}" style="flex:1">
          <span id="voice-volume-val" style="font-size:11px;min-width:28px">${c.voiceVolume||70}%</span>
        </div>
      </div>

      <div class="settings-block">
        <div class="settings-block-head">Notifications & Behavior</div>
        <div class="settings-row">
          <label>Frequency</label>
          <select id="notify-freq">
            <option value="quiet"  ${c.notifyFrequency==='quiet' ?'selected':''}>Quiet (rarely)</option>
            <option value="normal" ${(c.notifyFrequency||'normal')==='normal'?'selected':''}>Normal</option>
            <option value="chatty" ${c.notifyFrequency==='chatty'?'selected':''}>Chatty (often)</option>
          </select>
        </div>
        <div class="settings-toggle-row">
          <label>Show companion in app</label>
          <input type="checkbox" id="companion-visible" ${c.enabled!==false?'checked':''}>
        </div>
        <div class="settings-row">
          <label>Active hours</label>
          <input type="time" id="active-start" value="${c.activeStart||'09:00'}" style="width:100px">
          <span style="font-size:12px;color:var(--av-text-muted)">to</span>
          <input type="time" id="active-end" value="${c.activeEnd||'23:00'}" style="width:100px">
        </div>
      </div>
      <div id="arcveil-companion-settings"></div>
    </div>
  `;

  // Companion selection
  el.querySelectorAll('.companion-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.dataset.cid;
      state.companion.activeCompanion = id;
      EventBus.emit('companion:switch', id);
      el.querySelectorAll('.companion-card').forEach(c => c.classList.toggle('active', c.dataset.cid === id));
    });
  });

  // Name / calls-you
  document.getElementById('companion-name')?.addEventListener('input', e => { state.companion.name = e.target.value; });
  document.getElementById('companion-calls-you')?.addEventListener('change', e => { state.companion.callsUser = e.target.value; });
  document.getElementById('daily-goal')?.addEventListener('change', e => { state.companion.dailyGoal = +e.target.value; });
  document.getElementById('user-name')?.addEventListener('input', e => { state.companion.userName = e.target.value; });

  // AI mode
  el.querySelectorAll('[name="ai-mode"]').forEach(radio => {
    radio.addEventListener('change', e => {
      state.companion.aiMode = e.target.value;
      document.getElementById('local-ai-config').style.display  = e.target.value === 'local'  ? '' : 'none';
      document.getElementById('cloud-ai-config').style.display  = e.target.value === 'cloud'  ? '' : 'none';
      _pushAiSettings();
      if (e.target.value === 'local') setTimeout(_detectOllamaModels, 100);
    });
  });
  document.getElementById('ollama-url')?.addEventListener('input', e => { state.companion.ollamaUrl = e.target.value; _pushAiSettings(); });
  document.getElementById('ollama-model')?.addEventListener('input', e => { state.companion.ollamaModel = e.target.value; _pushAiSettings(); });

  async function _detectOllamaModels() {
    const statusEl = document.getElementById('ollama-detect-status');
    const selectEl = document.getElementById('ollama-model-select');
    const inputEl  = document.getElementById('ollama-model');
    if (!statusEl || !selectEl || !inputEl) return;
    statusEl.textContent = 'detecting...';
    const url = document.getElementById('ollama-url')?.value || 'http://localhost:11434';
    const models = await window.api?.ollamaListModels?.(url) || [];
    if (models.length === 0) {
      statusEl.textContent = 'Ollama not running or no models found';
      return;
    }
    statusEl.textContent = '';
    selectEl.innerHTML = models.map(m => `<option value="${m}">${m}</option>`).join('');
    selectEl.style.display = '';
    // Auto-select: prefer currently saved model, else first model
    const saved = state.companion.ollamaModel;
    selectEl.value = models.includes(saved) ? saved : models[0];
    // Sync input + state
    inputEl.value = selectEl.value;
    state.companion.ollamaModel = selectEl.value;
    _pushAiSettings();
    selectEl.onchange = () => {
      inputEl.value = selectEl.value;
      state.companion.ollamaModel = selectEl.value;
      _pushAiSettings();
    };
  }

  document.getElementById('ollama-detect-btn')?.addEventListener('click', _detectOllamaModels);

  document.getElementById('ai-provider')?.addEventListener('change', e => { state.companion.aiProvider = e.target.value; _pushAiSettings(); });
  document.getElementById('anthropic-key')?.addEventListener('input', e => { state.companion.anthropicKey = e.target.value; _pushAiSettings(); });
  document.getElementById('openai-key')?.addEventListener('input', e => { state.companion.openaiKey = e.target.value; _pushAiSettings(); });
  document.getElementById('gemini-key')?.addEventListener('input', e => { state.companion.geminiKey = e.target.value; _pushAiSettings(); });

  if (c.aiMode === 'local') {
    // Let detect set the correct model first, then it calls _pushAiSettings internally
    _detectOllamaModels();
  } else {
    // No detect needed — push current state immediately
    _pushAiSettings();
  }

  // Voice
  document.getElementById('voice-enabled')?.addEventListener('change', e => { state.companion.voiceEnabled = e.target.checked; });
  document.getElementById('voice-engine')?.addEventListener('change', e => { state.companion.voiceEngine = e.target.value; });
  document.getElementById('voice-volume')?.addEventListener('input', e => {
    state.companion.voiceVolume = +e.target.value;
    document.getElementById('voice-volume-val').textContent = e.target.value + '%';
  });

  // Notifications
  document.getElementById('notify-freq')?.addEventListener('change', e => { state.companion.notifyFrequency = e.target.value; });
  document.getElementById('companion-visible')?.addEventListener('change', e => {
    state.companion.enabled = e.target.checked;
    EventBus.emit(e.target.checked ? 'companion:enable' : 'companion:disable');
  });
  document.getElementById('active-start')?.addEventListener('change', e => { state.companion.activeStart = e.target.value; });
  document.getElementById('active-end')?.addEventListener('change', e => { state.companion.activeEnd = e.target.value; });

  document.getElementById('companion-import-vrm')?.addEventListener('click', async () => {
    const path = await window.api?.openMedia?.();
    if (path && path.endsWith('.vrm')) {
      state.companion.customVRM = path;
      alert('Custom VRM loaded: ' + path);
    }
  });

  // Merge companion window settings below
  const companionInject = el.querySelector('#arcveil-companion-settings');
  if (companionInject) renderCompanionContent(companionInject);
}

function _companionCards(activeId) {
  const companions = [
    { id: 'ciona',   emoji: '🐲', name: 'Ciona',   species: 'Little Dragon Artist', personality: 'Energetic & sweet' },
    { id: 'somvora', emoji: '🌙', name: 'Somvora',  species: 'Dream-Eater',          personality: 'Chaotic & dramatic' },
  ];
  return companions.map(c => `
    <div class="companion-card${c.id === activeId ? ' active' : ''}" data-cid="${c.id}">
      <div class="cc-avatar">${c.emoji}</div>
      <div class="cc-name">${c.name}</div>
      <div class="cc-species">${c.species}</div>
      <div class="cc-personality">${c.personality}</div>
    </div>
  `).join('');
}

// ── Overlays ──────────────────────────────────────────────────────────────────

function _renderOverlays(el) {
  el.innerHTML = `
    <div class="settings-scroll">
      <h2 class="settings-section-title">Overlay Windows</h2>
      <div class="settings-block">
        <div class="settings-block-head">Floating HUD</div>
        <div class="settings-toggle-row">
          <label>Show HUD on launch</label>
          <input type="checkbox" id="hud-auto" ${state.settings.hudAutoShow?'checked':''}>
        </div>
        <div class="settings-row">
          <label>Default size</label>
          <select id="hud-size">
            <option value="micro"   ${state.settings.hudSize==='micro'  ?'selected':''}>Micro</option>
            <option value="compact" ${(state.settings.hudSize||'compact')==='compact'?'selected':''}>Compact</option>
            <option value="full"    ${state.settings.hudSize==='full'   ?'selected':''}>Full</option>
          </select>
        </div>
        <button class="btn-sm" id="hud-open-btn">Open HUD</button>
      </div>
      <div class="settings-block">
        <div class="settings-block-head">Quick Summon</div>
        <div class="settings-row"><label>Hotkey</label>
          <input type="text" id="hotkey-summon" value="${state.settings.hotkeys?.quickSummon||'CmdOrCtrl+Shift+Space'}" style="width:200px">
        </div>
      </div>
      <div class="settings-block">
        <div class="settings-block-head">Edge Panel</div>
        <div class="settings-toggle-row">
          <label>Show edge panel</label>
          <input type="checkbox" id="edge-auto" ${state.settings.edgeAutoShow?'checked':''}>
        </div>
        <button class="btn-sm" id="edge-open-btn">Open Edge Panel</button>
      </div>
      <div class="settings-block">
        <div class="settings-block-head">Clipboard Bridge <span style="font-size:10px;color:var(--av-text-muted)">(opt-in)</span></div>
        <div class="settings-toggle-row">
          <label>Monitor clipboard for entity names</label>
          <input type="checkbox" id="clipboard-enabled" ${state.settings.clipboardBridge?'checked':''}>
        </div>
        <div style="font-size:11px;color:var(--av-text-muted);margin-top:4px">
          Scans clipboard for character/location names from your project. Never sends data externally.
        </div>
      </div>
      <div class="settings-block">
        <div class="settings-block-head">Window Context <span style="font-size:10px;color:var(--av-text-muted)">(opt-in)</span></div>
        <div class="settings-toggle-row">
          <label>Detect active application</label>
          <input type="checkbox" id="winctx-enabled" ${state.settings.windowContext?'checked':''}>
        </div>
        <div style="font-size:11px;color:var(--av-text-muted);margin-top:4px">
          Lets companion react to your active app (art tools, browser, etc). Never reads window content.
        </div>
      </div>
    </div>
  `;

  document.getElementById('hud-open-btn')?.addEventListener('click',  () => window.api?.overlayHudToggle?.());
  document.getElementById('edge-open-btn')?.addEventListener('click', () => window.api?.overlayEdgeToggle?.());
  document.getElementById('hud-auto')?.addEventListener('change',  e => { state.settings.hudAutoShow = e.target.checked; });
  document.getElementById('hud-size')?.addEventListener('change',  e => { state.settings.hudSize = e.target.value; });
  document.getElementById('edge-auto')?.addEventListener('change', e => { state.settings.edgeAutoShow = e.target.checked; });
  document.getElementById('clipboard-enabled')?.addEventListener('change', e => {
    state.settings.clipboardBridge = e.target.checked;
    e.target.checked ? window.api?.clipboardEnable?.() : window.api?.clipboardDisable?.();
  });
  document.getElementById('winctx-enabled')?.addEventListener('change', e => {
    state.settings.windowContext = e.target.checked;
    e.target.checked ? window.api?.windowContextEnable?.() : window.api?.windowContextDisable?.();
  });
}

// ── General ───────────────────────────────────────────────────────────────────

function _renderGeneral(el) {
  el.innerHTML = `
    <div class="settings-scroll">
      <h2 class="settings-section-title">General</h2>
      <div class="settings-block">
        <div class="settings-block-head">Project</div>
        <div class="settings-toggle-row">
          <label>Auto-save (every 60s)</label>
          <input type="checkbox" id="auto-save" ${state.settings.autoSave!==false?'checked':''}>
        </div>
        <div class="settings-toggle-row">
          <label>Show unsaved indicator</label>
          <input type="checkbox" id="show-dirty" ${state.settings.showDirty!==false?'checked':''}>
        </div>
      </div>
      <div class="settings-block">
        <div class="settings-block-head">Canvas</div>
        <div class="settings-toggle-row">
          <label>Show grid</label>
          <input type="checkbox" id="show-grid" ${state.settings.showGrid?'checked':''}>
        </div>
        <div class="settings-toggle-row">
          <label>Snap to grid</label>
          <input type="checkbox" id="snap-grid" ${state.settings.snapToGrid?'checked':''}>
        </div>
        <div class="settings-row">
          <label>Grid size</label>
          <input type="number" id="grid-size" min="8" max="64" step="8" value="${state.settings.gridSize||20}" style="width:80px">
        </div>
      </div>
      <div class="settings-block">
        <div class="settings-block-head">App</div>
        <div class="settings-toggle-row">
          <label>Start in system tray</label>
          <input type="checkbox" id="start-tray" ${state.settings.startMinimized?'checked':''}>
        </div>
        <div class="settings-toggle-row">
          <label>Close to tray</label>
          <input type="checkbox" id="close-tray" ${state.settings.closeToTray?'checked':''}>
        </div>
      </div>
      <div class="settings-block">
        <div class="settings-block-head">Version</div>
        <div style="font-size:12px;color:var(--av-text-muted)" id="app-version">ArcVeil v0.1.0</div>
      </div>
    </div>
  `;

  document.getElementById('auto-save')?.addEventListener('change',  e => { state.settings.autoSave    = e.target.checked; });
  document.getElementById('show-dirty')?.addEventListener('change', e => { state.settings.showDirty   = e.target.checked; });
  document.getElementById('show-grid')?.addEventListener('change',  e => { state.settings.showGrid     = e.target.checked; EventBus.emit('canvas:show-grid', e.target.checked); });
  document.getElementById('snap-grid')?.addEventListener('change',  e => { state.settings.snapToGrid  = e.target.checked; });
  document.getElementById('grid-size')?.addEventListener('change',  e => { state.settings.gridSize     = +e.target.value; });
  document.getElementById('start-tray')?.addEventListener('change', e => { state.settings.startMinimized = e.target.checked; });
  document.getElementById('close-tray')?.addEventListener('change', e => { state.settings.closeToTray = e.target.checked; });

  window.api?.version?.().then(v => {
    const el2 = document.getElementById('app-version');
    if (el2 && v) el2.textContent = 'ArcVeil v' + v;
  });
}
