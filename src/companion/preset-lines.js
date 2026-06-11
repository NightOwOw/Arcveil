// preset-lines.js — Template variable resolver for companion dialogue lines

/**
 * Pick a random line from a trigger key, resolving template variables.
 * @param {object} lines - companion's lines object
 * @param {string} trigger - key like 'greeting_morning'
 * @param {object} vars - template vars: { name, userName, wordCount, goal, character, ... }
 * @returns {string|null}
 */
export function pickLine(lines, trigger, vars = {}) {
  const pool = lines[trigger];
  if (!pool || !pool.length) return null;
  const raw = pool[Math.floor(Math.random() * pool.length)];
  return resolveLine(raw, vars);
}

export function resolveLine(raw, vars = {}) {
  return raw.replace(/\{(\w+)\}/g, (_, key) => {
    if (key in vars) return vars[key];
    return `{${key}}`;
  });
}

/**
 * Build template vars from current state snapshot.
 */
export function buildVars(state, extras = {}) {
  const totalWords = state.writing?.documents?.reduce((s, d) => s + (_wordCount(d.text || '')), 0) || 0;
  const todayWords = state.companion?.todayWords || 0;
  const dailyGoal  = state.companion?.dailyGoal  || 1000;
  const streak     = state.companion?.streak      || 0;
  const projectName = state.project?.name || 'your story';

  return {
    name:        state.companion?.companionName || 'I',
    userName:    state.companion?.userName      || 'Writer',
    projectName,
    wordCount:   todayWords,
    totalWords,
    goal:        dailyGoal,
    remaining:   Math.max(0, dailyGoal - todayWords),
    streak,
    character:   extras.character || 'that character',
    chapter:     extras.chapter   || 'this chapter',
    todo:        extras.todo      || 'something important',
    ...extras,
  };
}

function _wordCount(text) {
  return (text || '').trim().split(/\s+/).filter(Boolean).length;
}
