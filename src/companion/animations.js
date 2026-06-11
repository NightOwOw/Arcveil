// animations.js — Animation state machine for VRM companion
// States: idle → thinking → happy → sad → surprised → sleeping → pointing → cheering → writing

const STATES = ['idle','thinking','happy','sad','surprised','sleeping','pointing','cheering','writing'];
const FADE_TIME = 0.3; // seconds

let _vrm = null;
let _mixer = null;
let _current = 'idle';
let _actions = {};
let _weights = {};

export function initAnimations(vrm, mixer, animationClips = {}) {
  _vrm    = vrm;
  _mixer  = mixer;
  _actions = {};

  // Map clip names to states
  for (const [name, clip] of Object.entries(animationClips)) {
    if (_mixer && clip) {
      const action = _mixer.clipAction(clip);
      action.play();
      action.weight = name === 'idle' ? 1 : 0;
      _actions[name] = action;
    }
  }

  setState('idle');
}

export function setWeights(companionWeights) {
  _weights = companionWeights || {};
}

export function setState(newState, force = false) {
  if (newState === _current && !force) return;
  if (!STATES.includes(newState)) return;

  const prev = _current;
  _current = newState;

  // Cross-fade
  if (_actions[prev]) _actions[prev].weight = 0;
  if (_actions[newState]) _actions[newState].weight = _weights[newState] || 1;

  // Apply VRM expression
  if (_vrm?.expressionManager) {
    _applyExpression(newState);
  }
}

export function getState() { return _current; }

export function triggerOnce(state, durationMs = 2000) {
  const prev = _current;
  setState(state);
  setTimeout(() => setState(prev), durationMs);
}

function _applyExpression(state) {
  if (!_vrm?.expressionManager) return;
  const em = _vrm.expressionManager;

  // Reset all
  ['happy','sad','surprised','angry','neutral'].forEach(e => {
    try { em.setValue(e, 0); } catch {}
  });

  const map = {
    idle:      { neutral: 1 },
    thinking:  { neutral: 0.7 },
    happy:     { happy: 1 },
    sad:       { sad: 1 },
    surprised: { surprised: 1 },
    sleeping:  { neutral: 0.5 },
    pointing:  { neutral: 0.8 },
    cheering:  { happy: 1 },
    writing:   { neutral: 0.6 },
  };

  const expr = map[state] || { neutral: 1 };
  for (const [key, val] of Object.entries(expr)) {
    try { em.setValue(key, val); } catch {}
  }
}

export function update(delta) {
  if (_mixer) _mixer.update(delta);
  if (_vrm)   _vrm.update(delta);
}

// Map companion trigger → animation state
export function triggerFromMessage(trigger) {
  const triggerMap = {
    greeting_morning:  'cheering',
    greeting_return:   'happy',
    goal_reached:      'cheering',
    flow_state:        'writing',
    idle_long:         'sleeping',
    idle_short:        'thinking',
    dark_scene:        'surprised',
    react_to_dark_scene: 'cheering',
    happy_scene:       'happy',
    react_to_happy_scene: 'sad',
    character_missing: 'pointing',
    session_long:      'pointing',
    late_night:        'sleeping',
    chapter_done:      'cheering',
    streak_continue:   'cheering',
    streak_broken:     'sad',
    writing_start:     'writing',
    new_character:     'surprised',
  };
  const target = triggerMap[trigger] || 'happy';
  triggerOnce(target, 3000);
}
