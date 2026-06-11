// companion.js — Companion system main controller
// Runs in the main renderer. Manages companion window, loads active companion def,
// wires awareness + tracker + todos.

import { state, EventBus } from '../state.js';
import { initTracker, markWritingDay } from './tracker.js';
import { initTodos, rescanTodos } from './todos.js';
import { initAwareness, setCompanion } from './awareness.js';

let _booted = false;
let _companionDef = null;
let _companionEnabled = false;

export async function initCompanion() {
  if (_booted) return;
  _booted = true;

  // Ensure companion state structure exists
  if (!state.companion) state.companion = {};
  if (!state.companion.sessions)      state.companion.sessions      = [];
  if (!state.companion.todos)         state.companion.todos         = [];
  if (!state.companion.dailyGoal)     state.companion.dailyGoal     = 1000;
  if (!state.companion.todayWords)    state.companion.todayWords    = 0;
  if (!state.companion.streak)        state.companion.streak        = 0;
  if (!state.companion.bestDay)       state.companion.bestDay       = 0;
  if (!state.companion.allTimeWords)  state.companion.allTimeWords  = 0;
  if (!state.companion.activeCompanion) state.companion.activeCompanion = 'ciona';

  _companionEnabled = state.companion.enabled !== false;

  // Load companion definition
  await _loadCompanionDef(state.companion.activeCompanion || 'ciona');

  // Start subsystems
  initTracker();
  initTodos();
  if (_companionDef) initAwareness(_companionDef);

  // Wire events
  EventBus.on('companion:message', _onMessage);
  EventBus.on('companion:enable',  () => { _companionEnabled = true; state.companion.enabled = true; });
  EventBus.on('companion:disable', () => { _companionEnabled = false; state.companion.enabled = false; });
  EventBus.on('companion:switch',  (id) => _switchCompanion(id));
  EventBus.on('tracker:words-changed', () => markWritingDay());
  // Forward settings changes to the companion window renderer
  EventBus.on('companion:settings-changed', (settings) => {
    if (window.api?.companionSettingsUpdate) window.api.companionSettingsUpdate(settings);
  });

  // Notify companion window of project state every 60s
  setInterval(_pushStateToCompanion, 60_000);
}

async function _loadCompanionDef(id) {
  try {
    const mod = id === 'somvora'
      ? await import('./companions/somvora.js')
      : await import('./companions/ciona.js');
    _companionDef = mod.default || mod[id] || mod.ciona || mod.somvora;
    if (_companionDef) setCompanion(_companionDef);
  } catch (e) {
    console.warn('[companion] Failed to load companion def:', e);
  }
}

async function _switchCompanion(id) {
  await _loadCompanionDef(id);
  state.companion.activeCompanion = id;
  // Notify companion window to reload
  if (window.api?.companionSwitch) window.api.companionSwitch(id);
  EventBus.emit('state:changed');
}

function _onMessage({ text, trigger }) {
  if (!_companionEnabled || !text) return;

  if (window.api?.companionSay) {
    // Companion window is the primary display
    window.api.companionSay({ text, trigger });
  } else {
    // Fallback: show in main window when companion window is unavailable
    _showInAppBubble(text);
  }
}

function _showInAppBubble(text) {
  let bubble = document.getElementById('companion-inapp-bubble');
  if (!bubble) {
    bubble = document.createElement('div');
    bubble.id = 'companion-inapp-bubble';
    bubble.className = 'companion-inapp-bubble';
    document.body.appendChild(bubble);
  }

  bubble.innerHTML = `
    <div class="cib-avatar">${_companionDef?.emoji || '✨'}</div>
    <div class="cib-text">${_escHtml(text)}</div>
    <button class="cib-close" title="Dismiss">×</button>
  `;
  bubble.classList.remove('hidden');
  bubble.classList.add('visible');

  const close = bubble.querySelector('.cib-close');
  close?.addEventListener('click', () => _hideBubble(bubble));

  clearTimeout(bubble._timer);
  bubble._timer = setTimeout(() => _hideBubble(bubble), 8000);
}

function _hideBubble(bubble) {
  bubble.classList.remove('visible');
  setTimeout(() => bubble.classList.add('hidden'), 400);
}

function _pushStateToCompanion() {
  if (!window.api?.companionStateUpdate) return;
  window.api.companionStateUpdate({
    nodeCount:    (state.nodes || []).length,
    docCount:     (state.writing?.documents || []).length,
    todayWords:   state.companion?.todayWords || 0,
    dailyGoal:    state.companion?.dailyGoal  || 1000,
    projectName:  state.project?.name || '',
  });
}

function _escHtml(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

export function getCompanionDef() { return _companionDef; }

export function isEnabled() { return _companionEnabled; }
