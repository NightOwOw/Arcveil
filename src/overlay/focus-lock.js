// focus-lock.js — Optional focus lock overlay (renderer, ES module)
// Shows semi-transparent overlay when user switches to a blocked app.
// Never blocks ArcVeil or system processes.

import { state, EventBus } from '../state.js';

let _enabled     = false;
let _blockedApps = [];
let _overlay     = null;
let _countdown   = null;
let _countdownN  = 10;

export function initFocusLock() {
  EventBus.on('focus-lock:enable',  () => enable());
  EventBus.on('focus-lock:disable', () => disable());
  EventBus.on('window-context',     ({ title, mode }) => _checkContext(title, mode));
}

export function enable() {
  _enabled     = true;
  _blockedApps = state.companion?.focusLockApps || [];
}

export function disable() {
  _enabled = false;
  _hideOverlay();
}

export function setBlockedApps(apps) {
  _blockedApps = apps || [];
  if (state.companion) state.companion.focusLockApps = _blockedApps;
}

function _checkContext(title, mode) {
  if (!_enabled || !_blockedApps.length) return;
  if (mode === 'arcveil') { _hideOverlay(); return; }

  const lower = title.toLowerCase();
  const blocked = _blockedApps.some(app => lower.includes(app.toLowerCase()));
  if (blocked) _showOverlay(title);
  else _hideOverlay();
}

function _showOverlay(appName) {
  if (_overlay) return; // already showing

  _overlay = document.createElement('div');
  _overlay.id = 'focus-lock-overlay';
  _overlay.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:99999;
    display:flex;flex-direction:column;align-items:center;justify-content:center;
    font-family:-apple-system,'Segoe UI',sans-serif;color:#eaeaea;gap:16px;
    backdrop-filter:blur(4px);
  `;
  _overlay.innerHTML = `
    <div style="font-size:48px">🔒</div>
    <div style="font-size:20px;font-weight:700">Focus Mode Active</div>
    <div style="font-size:13px;color:rgba(255,255,255,0.6);text-align:center;max-width:320px">
      You opened <strong>${_esc(appName)}</strong>.<br>
      Stay focused on your writing!
    </div>
    <button id="fl-break" style="margin-top:8px;padding:8px 24px;background:rgba(255,255,255,0.1);
      border:1px solid rgba(255,255,255,0.2);border-radius:8px;color:#eaeaea;cursor:pointer;font-size:13px">
      Break focus (10s)
    </button>
    <div id="fl-countdown" style="font-size:12px;color:rgba(255,255,255,0.4);display:none">
      Unlocking in <span id="fl-count">10</span>s — <button id="fl-cancel"
        style="background:none;border:none;color:#9b7fd4;cursor:pointer;font-size:12px">Cancel</button>
    </div>
  `;
  document.body.appendChild(_overlay);

  document.getElementById('fl-break')?.addEventListener('click', _startCountdown);
  document.getElementById('fl-cancel')?.addEventListener('click', _cancelCountdown);
}

function _startCountdown() {
  _countdownN = 10;
  document.getElementById('fl-break').style.display    = 'none';
  document.getElementById('fl-countdown').style.display = 'block';
  _countdown = setInterval(() => {
    _countdownN--;
    const el = document.getElementById('fl-count');
    if (el) el.textContent = _countdownN;
    if (_countdownN <= 0) {
      clearInterval(_countdown);
      _hideOverlay();
    }
  }, 1000);
}

function _cancelCountdown() {
  clearInterval(_countdown);
  _countdown = null;
  const breakBtn = document.getElementById('fl-break');
  const cdRow    = document.getElementById('fl-countdown');
  if (breakBtn) breakBtn.style.display = '';
  if (cdRow)    cdRow.style.display    = 'none';
}

function _hideOverlay() {
  clearInterval(_countdown);
  _countdown = null;
  if (_overlay) { _overlay.remove(); _overlay = null; }
}

function _esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
