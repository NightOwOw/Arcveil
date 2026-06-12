// ============================================
// themes.js — Theme engine: apply themes via CSS vars on <html>
// Imports: state.js
// Exports: initThemes, applyTheme
// Events: emits 'theme:changed'
// ============================================

import { state, EventBus } from '../state.js';

export const THEME_LIST = [
  { id: 'arcveil',   name: 'Default',    desc: 'Dark blue theme' },
  { id: 'light',     name: 'Light',      desc: 'Clean and bright' },
  { id: 'sketch',    name: 'Sketch',     desc: 'White notebook style' },
  { id: 'sakura',    name: 'Sakura',     desc: 'Soft pink blossom' },
  { id: 'parchment', name: 'Manuscript', desc: 'Vintage ink on paper' },
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

  // Swap titlebar logo — white variant for dark themes, colour variant for light themes
  const logoEl = document.getElementById('titlebar-logo-img');
  if (logoEl) {
    const darkThemes = ['arcveil', 'parchment'];
    logoEl.src = darkThemes.includes(themeId)
      ? 'assets/icons/app_logo_white.png'
      : 'assets/icons/app_logo.png';
  }
}

export function cycleTheme() {
  const ids = THEME_LIST.map(t => t.id);
  const idx = ids.indexOf(state.settings.theme || 'arcveil');
  applyTheme(ids[(idx + 1) % ids.length]);
}
