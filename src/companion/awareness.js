// awareness.js — Awareness engine: monitors project state, fires companion triggers
import { state, EventBus } from '../state.js';
import { pickLine, buildVars } from './preset-lines.js';
import { getPendingTodos } from './todos.js';
import { getStats, markWritingDay } from './tracker.js';

// Cooldown map: trigger → last fired timestamp
const _cooldowns = {};

const COOLDOWN = {
  IDLE_DETECTED:    30 * 60_000,
  FLOW_STATE:        2 * 60 * 60_000,
  GOAL_REACHED:     24 * 60 * 60_000,
  GOAL_CLOSE:        4 * 60 * 60_000,
  SESSION_LONG:      2 * 60 * 60_000,
  LATE_NIGHT:        3 * 60 * 60_000,
  CHARACTER_MISSING:24 * 60 * 60_000,
  OPEN_QUESTIONS:   12 * 60 * 60_000,
  DARK_SCENE:        1 * 60 * 60_000,
  HAPPY_SCENE:       1 * 60 * 60_000,
  CHAPTER_DONE:      6 * 60 * 60_000,
  STREAK_CONTINUE:  24 * 60 * 60_000,
  STREAK_BROKEN:    24 * 60 * 60_000,
  TODO_REMINDER:     3 * 60 * 60_000,
  WRITING_START:     5 * 60_000,
  NEW_CHARACTER:    10 * 60_000,   // 10 min — only fire for genuinely new ones
  GREETING:          4 * 60 * 60_000, // once per 4-hour session at most
};

let _companion = null;
let _lastTypingTime = 0;
let _sessionStart   = 0;
let _lastTodayWords = 0;
let _nodeCount      = 0;

export function initAwareness(companionDef) {
  _companion     = companionDef;
  _lastTodayWords = state.companion?.todayWords || 0;
  _nodeCount      = (state.nodes || []).filter(n => n.type === 'character').length;
  _sessionStart   = Date.now();

  // Listen for typing to track idle/flow
  document.addEventListener('keydown', _onKey, { passive: true });

  // Sync _nodeCount after project/demo loads so startup nodes don't
  // look like newly-added characters to _checkNewCharacter
  EventBus.on('project:loaded', () => {
    _nodeCount = (state.nodes || []).filter(n => n.type === 'character').length;
  });

  // Listen for new nodes (only fires for user-added chars after project load)
  EventBus.on('nodes:updated', _checkNewCharacter);

  // Periodic awareness checks (every 60s)
  setInterval(_tick, 60_000);

  // Greet once per session (4-hour cooldown stored in localStorage)
  setTimeout(_greet, 3000);
}

export function setCompanion(def) {
  _companion = def;
}

function _onKey(e) {
  const tag = e.target?.tagName;
  if (tag !== 'INPUT' && tag !== 'TEXTAREA' && !e.target?.isContentEditable) return;
  _lastTypingTime = Date.now();
}

function _tick() {
  if (!_companion) return;

  const stats     = getStats();
  const now       = Date.now();
  const hour      = new Date().getHours();
  const idleMs    = now - _lastTypingTime;
  const sessionMs = now - _sessionStart;
  const dailyGoal = state.companion?.dailyGoal || 1000;

  // Check triggers in priority order

  // Goal reached (first time today)
  if (stats.todayWords >= dailyGoal && _ok('GOAL_REACHED')) {
    _fire('goal_reached', 'GOAL_REACHED');
    markWritingDay();
    return;
  }

  // Goal close (80%)
  if (stats.todayWords >= dailyGoal * 0.8 && stats.todayWords < dailyGoal && _ok('GOAL_CLOSE')) {
    _fire('goal_close', 'GOAL_CLOSE');
    return;
  }

  // Flow state (typing last 20 min, not idle)
  if (_lastTypingTime > 0 && idleMs < 2 * 60_000 && sessionMs > 20 * 60_000 && _ok('FLOW_STATE')) {
    _fire('flow_state', 'FLOW_STATE');
    return;
  }

  // Idle detected (8+ min no typing)
  if (_lastTypingTime > 0 && idleMs > 8 * 60_000 && _ok('IDLE_DETECTED')) {
    _fire(idleMs > 20 * 60_000 ? 'idle_long' : 'idle_short', 'IDLE_DETECTED');
    return;
  }

  // Session long (90+ min)
  if (sessionMs > 90 * 60_000 && _ok('SESSION_LONG')) {
    _fire('session_long', 'SESSION_LONG');
    return;
  }

  // Late night
  if (hour >= 23 && _ok('LATE_NIGHT')) {
    _fire('late_night', 'LATE_NIGHT');
    return;
  }

  // Open questions
  const openQ = _countOpenQuestions();
  if (openQ > 2 && _ok('OPEN_QUESTIONS')) {
    _fire('open_questions', 'OPEN_QUESTIONS');
    return;
  }

  // Character missing (char not mentioned in last 3 docs)
  const missingChar = _findMissingCharacter();
  if (missingChar && _ok('CHARACTER_MISSING')) {
    _fire('character_missing', 'CHARACTER_MISSING', { character: missingChar });
    return;
  }

  // Todo reminder (if pending todos exist)
  const topTodo = getPendingTodos(1)[0];
  if (topTodo && _ok('TODO_REMINDER')) {
    _fire('todo_reminder', 'TODO_REMINDER', { todo: topTodo.text });
    return;
  }
}

function _greet() {
  if (!_ok('GREETING')) return;
  const hour = new Date().getHours();
  const trigger = hour < 12 ? 'greeting_morning' : 'greeting_return';
  _fire(trigger, 'GREETING');
}

function _checkNewCharacter() {
  const current = (state.nodes || []).filter(n => n.type === 'character').length;
  if (current > _nodeCount && _ok('NEW_CHARACTER')) {
    _fire('new_character', 'NEW_CHARACTER');
  }
  _nodeCount = current;
}

function _fire(trigger, cooldownKey, extras = {}) {
  if (!_companion) return;
  const vars = buildVars(state, extras);
  const line = pickLine(_companion.lines, trigger, vars);
  if (!line) return;

  if (cooldownKey) _setCooldown(cooldownKey);

  EventBus.emit('companion:message', { text: line, trigger, companion: _companion.id });
}

const _LS_PREFIX = 'arcveil_awareness_';

function _ok(key) {
  const cd = COOLDOWN[key] || 60_000;
  // In-memory check (resets on restart for most triggers)
  const memTs = _cooldowns[key] || 0;
  // Persistent check for GREETING so it survives restarts
  const lsTs = key === 'GREETING' ? +(localStorage.getItem(_LS_PREFIX + key) || 0) : 0;
  const last = Math.max(memTs, lsTs);
  return Date.now() - last > cd;
}

function _setCooldown(key) {
  _cooldowns[key] = Date.now();
  if (key === 'GREETING') localStorage.setItem(_LS_PREFIX + key, String(_cooldowns[key]));
}

function _countOpenQuestions() {
  let count = 0;
  for (const doc of (state.writing?.documents || [])) {
    const matches = (doc.html || '').match(/❓/g) || [];
    count += matches.length;
  }
  return count;
}

function _findMissingCharacter() {
  const chars = (state.nodes || []).filter(n => n.type === 'character' && n.label);
  if (!chars.length) return null;

  // Get recent text (last 3 docs combined)
  const docs = (state.writing?.documents || []).slice(-3);
  const recentText = docs.map(d => (d.text || '').toLowerCase()).join(' ');

  for (const ch of chars) {
    const name = (ch.label || '').toLowerCase();
    if (name.length < 3) continue;
    if (!recentText.includes(name)) return ch.label;
  }
  return null;
}

// Called when dark/happy scene pacing detected
export function detectSceneMood(mood) {
  if (!_companion) return;
  if (mood === 'dark') {
    const trigger = _companion.id === 'somvora' ? 'react_to_dark_scene' : 'dark_scene';
    if (_ok('DARK_SCENE')) _fire(trigger, 'DARK_SCENE');
  } else if (mood === 'happy') {
    const trigger = _companion.id === 'somvora' ? 'react_to_happy_scene' : 'happy_scene';
    if (_ok('HAPPY_SCENE')) _fire(trigger, 'HAPPY_SCENE');
  }
}
