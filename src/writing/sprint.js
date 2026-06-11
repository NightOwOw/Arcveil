// sprint.js — Writing sprint timer: countdown + word count goal
import { state, EventBus } from '../state.js';

let _timer = null;
let _endTime = 0;
let _startWords = 0;
let _goalWords = 0;
let _running = false;
let _el = null;

export function initSprintUI(container) {
  _el = container;
  _renderSprint();
}

export function startSprint(durationMinutes, goalWords) {
  if (_running) stopSprint();
  _running   = true;
  _endTime   = Date.now() + durationMinutes * 60_000;
  _goalWords = goalWords || 0;
  _startWords = _currentWords();

  clearInterval(_timer);
  _timer = setInterval(_tick, 1000);
  _tick();

  EventBus.emit('sprint:started', { durationMinutes, goalWords });
  window.api?.overlayStatePush?.({ sprint: { running: true, durationMinutes, goalWords } });
}

export function stopSprint() {
  _running = false;
  clearInterval(_timer);
  _timer = null;
  const wordsWritten = _currentWords() - _startWords;
  EventBus.emit('sprint:ended', { wordsWritten });
  window.api?.overlayStatePush?.({ sprint: { running: false } });
  _renderSprint();
}

export function isRunning() { return _running; }

function _tick() {
  const remaining = Math.max(0, _endTime - Date.now());
  if (remaining === 0) { stopSprint(); return; }
  const wordsWritten = _currentWords() - _startWords;
  EventBus.emit('sprint:tick', { remaining, wordsWritten, goalWords: _goalWords });
  _updateUI(remaining, wordsWritten);
}

function _currentWords() {
  return (state.writing?.documents || [])
    .reduce((s, d) => s + _wc(d.text || ''), 0);
}

function _wc(text) {
  return (text || '').trim().split(/\s+/).filter(Boolean).length;
}

function _updateUI(remaining, wordsWritten) {
  if (!_el) return;
  const mins = Math.floor(remaining / 60_000);
  const secs = Math.floor((remaining % 60_000) / 1000);
  const pct  = _goalWords > 0 ? Math.min(100, Math.round(wordsWritten / _goalWords * 100)) : 0;
  const el = _el.querySelector('.sprint-time');
  if (el) el.textContent = `${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
  const words = _el.querySelector('.sprint-words');
  if (words) words.textContent = `${wordsWritten.toLocaleString()} words`;
  const bar = _el.querySelector('.sprint-bar-fill');
  if (bar) bar.style.width = pct + '%';
}

function _renderSprint() {
  if (!_el) return;
  _el.innerHTML = `
    <div class="sprint-panel">
      <div class="sprint-head">⚡ Writing Sprint</div>
      ${_running ? `
        <div class="sprint-time-display">
          <div class="sprint-time">00:00</div>
          <div class="sprint-words">0 words</div>
        </div>
        ${_goalWords ? `
          <div class="sprint-bar-track"><div class="sprint-bar-fill"></div></div>
          <div class="sprint-goal-label">Goal: ${_goalWords.toLocaleString()} words</div>
        ` : ''}
        <button class="btn-sm sprint-stop-btn">Stop Sprint</button>
      ` : `
        <div class="sprint-setup">
          <div class="sprint-setup-row">
            <label>Duration</label>
            <select id="sprint-dur">
              <option value="5">5 min</option>
              <option value="10">10 min</option>
              <option value="15" selected>15 min</option>
              <option value="20">20 min</option>
              <option value="30">30 min</option>
              <option value="45">45 min</option>
              <option value="60">1 hour</option>
            </select>
          </div>
          <div class="sprint-setup-row">
            <label>Word goal</label>
            <input type="number" id="sprint-goal" value="250" min="0" style="width:80px"> <span style="font-size:11px;color:var(--av-text-muted)">(0 = no goal)</span>
          </div>
          <button class="btn-primary sprint-start-btn" style="width:100%;margin-top:8px">⚡ Start Sprint</button>
        </div>
      `}
    </div>
  `;

  _el.querySelector('.sprint-start-btn')?.addEventListener('click', () => {
    const dur  = +(_el.querySelector('#sprint-dur')?.value  || 15);
    const goal = +(_el.querySelector('#sprint-goal')?.value || 0);
    startSprint(dur, goal);
    _renderSprint();
  });

  _el.querySelector('.sprint-stop-btn')?.addEventListener('click', () => {
    stopSprint();
  });
}
