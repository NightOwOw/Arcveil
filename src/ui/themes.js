// ============================================
// themes.js — Theme engine: apply themes via CSS vars on <html>
// Imports: state.js
// Exports: initThemes, applyTheme
// Events: emits 'theme:changed'
// ============================================

import { state, EventBus } from '../state.js';

export const THEME_LIST = [
  { id: 'arcveil', name: 'Default', desc: 'Dark blue theme' },
  { id: 'light',   name: 'Light',   desc: 'Clean and bright' },
  { id: 'sketch',  name: 'Sketch',  desc: 'White notebook style' },
];

export function initThemes() {
  applyTheme(state.settings.theme || 'arcveil');
}

export function applyTheme(themeId) {
  document.documentElement.setAttribute('data-theme', themeId);
  state.settings.theme = themeId;
  EventBus.emit('theme:changed', themeId);

  // Update theme button indicator
  document.getElementById('tb-theme')?.setAttribute('title', 'Theme: ' + themeId);
}

export function cycleTheme() {
  const ids = THEME_LIST.map(t => t.id);
  const idx = ids.indexOf(state.settings.theme || 'arcveil');
  applyTheme(ids[(idx + 1) % ids.length]);
}
