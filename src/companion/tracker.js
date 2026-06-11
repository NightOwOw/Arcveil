// tracker.js — Writing session tracker: time, words, streaks
import { state, EventBus } from '../state.js';

const PAUSE_MS = 3 * 60 * 1000; // 3min inactivity = pause
const DAY_MS   = 24 * 60 * 60 * 1000;

let _sessionStart  = null;
let _sessionActive = false;
let _pauseTimer    = null;
let _lastWordCount = 0;
let _sessionWords  = 0;

export function initTracker() {
  if (!state.companion.sessions)  state.companion.sessions  = [];
  if (!state.companion.todayWords) state.companion.todayWords = 0;
  if (!state.companion.streak)     state.companion.streak    = 0;
  if (!state.companion.bestDay)    state.companion.bestDay   = 0;
  if (!state.companion.allTimeWords) state.companion.allTimeWords = 0;

  _updateStreak();
  _lastWordCount = _totalWords();

  // Listen for editor keystrokes
  document.addEventListener('keydown', _onKey, { passive: true });

  // Periodic stats sync (every minute)
  setInterval(_syncStats, 60_000);
}

function _onKey(e) {
  const tag = e.target?.tagName;
  if (tag !== 'INPUT' && tag !== 'TEXTAREA' && !e.target?.isContentEditable) return;

  if (!_sessionActive) _startSession();
  _resetPauseTimer();
}

function _startSession() {
  _sessionActive = true;
  _sessionStart  = Date.now();
  _sessionWords  = 0;
  EventBus.emit('tracker:session-start');
}

function _pauseSession() {
  if (!_sessionActive || !_sessionStart) return;
  _sessionActive = false;

  const session = {
    date:         new Date().toISOString().slice(0, 10),
    startTime:    _sessionStart,
    endTime:      Date.now(),
    wordsWritten: _sessionWords,
    docId:        state.writing?.activeDocId || null,
  };

  state.companion.sessions.push(session);
  state.companion.allTimeWords = (state.companion.allTimeWords || 0) + _sessionWords;
  _sessionStart = null;
  EventBus.emit('tracker:session-end', session);
  EventBus.emit('state:changed');
}

function _resetPauseTimer() {
  clearTimeout(_pauseTimer);
  _pauseTimer = setTimeout(_pauseSession, PAUSE_MS);
}

function _syncStats() {
  const now = _totalWords();
  const delta = Math.max(0, now - _lastWordCount);
  if (delta > 0) {
    _sessionWords += delta;
    state.companion.todayWords = (state.companion.todayWords || 0) + delta;
    if (state.companion.todayWords > (state.companion.bestDay || 0)) {
      state.companion.bestDay = state.companion.todayWords;
    }
    EventBus.emit('tracker:words-changed', state.companion.todayWords);
  }
  _lastWordCount = now;
}

function _totalWords() {
  return (state.writing?.documents || []).reduce((s, d) => s + _wc(d.text || ''), 0);
}

function _wc(text) {
  return (text || '').trim().split(/\s+/).filter(Boolean).length;
}

function _updateStreak() {
  const today = new Date().toISOString().slice(0, 10);
  const lastDay = state.companion.lastWriteDay || null;
  if (!lastDay) { state.companion.streak = 0; return; }

  const diff = (new Date(today) - new Date(lastDay)) / DAY_MS;
  if (diff <= 1) {
    // same day or yesterday — streak continues (don't double increment today)
    if (diff === 0) return; // same day, no change
    state.companion.streak = (state.companion.streak || 0) + 1;
  } else {
    // missed a day — break streak
    const wasStreak = state.companion.streak > 1;
    state.companion.streak = 0;
    if (wasStreak) EventBus.emit('tracker:streak-broken');
  }
}

export function markWritingDay() {
  const today = new Date().toISOString().slice(0, 10);
  if (state.companion.lastWriteDay === today) return;
  _updateStreak();
  state.companion.lastWriteDay = today;
  if (state.companion.streak > 1) EventBus.emit('tracker:streak-continue', state.companion.streak);
  EventBus.emit('state:changed');
}

export function getStats() {
  const today = new Date().toISOString().slice(0, 10);
  const todaySessions = (state.companion.sessions || []).filter(s => s.date === today);
  const todayMs = todaySessions.reduce((s, sess) => s + (sess.endTime - sess.startTime), 0);
  const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - 7);
  const weekSessions = (state.companion.sessions || []).filter(s => new Date(s.date) >= weekStart);
  const weekMs = weekSessions.reduce((s, sess) => s + (sess.endTime - sess.startTime), 0);

  return {
    todayWords:   state.companion.todayWords   || 0,
    todayMinutes: Math.floor(todayMs / 60_000),
    weekWords:    weekSessions.reduce((s, sess) => s + sess.wordsWritten, 0),
    weekMinutes:  Math.floor(weekMs / 60_000),
    allTimeWords: state.companion.allTimeWords || 0,
    streak:       state.companion.streak       || 0,
    bestDay:      state.companion.bestDay      || 0,
    sessionActive: _sessionActive,
  };
}
