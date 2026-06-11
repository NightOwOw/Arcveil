// theme-engine.js — Applies themes by setting CSS variables on <html>
import { state, EventBus } from '../state.js';
import PRESET_THEMES from './preset-themes.js';

let _customThemes = [];

export function initThemeEngine() {
  _customThemes = state.settings?.customThemes || [];
  applyThemeById(state.settings?.theme || 'arcveil');
}

export function applyThemeById(id) {
  // First set the data-theme attribute (picks up themes.css blocks)
  document.documentElement.setAttribute('data-theme', id);
  state.settings.theme = id;

  // Then overlay any token overrides from preset-themes.js
  const preset = [...PRESET_THEMES, ..._customThemes].find(t => t.id === id);
  if (preset?.tokens) {
    applyTokens(preset.tokens);
  } else {
    // Remove any previously applied inline tokens
    clearCustomTokens();
  }

  EventBus.emit('theme:changed', id);
}

export function applyTokens(tokens) {
  const root = document.documentElement;
  for (const [key, val] of Object.entries(tokens || {})) {
    root.style.setProperty(key, val);
  }
}

export function clearCustomTokens() {
  const root = document.documentElement;
  // Remove inline styles we might have set
  const allVars = [
    '--av-bg-primary','--av-bg-secondary','--av-bg-elevated','--av-bg-surface',
    '--av-bg-hover','--av-canvas-bg','--av-input-bg',
    '--av-accent','--av-accent-soft','--av-accent-hover',
    '--av-text-primary','--av-text-secondary','--av-text-muted',
    '--av-border','--av-border-strong',
    '--av-radius-md','--av-radius-lg','--av-radius-sm',
    '--av-font-ui','--av-font-heading','--av-success',
  ];
  allVars.forEach(v => root.style.removeProperty(v));
}

export function getToken(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function saveCustomTheme(theme) {
  // { id, name, desc, swatches, tokens }
  _customThemes = _customThemes.filter(t => t.id !== theme.id);
  _customThemes.push(theme);
  if (!state.settings.customThemes) state.settings.customThemes = [];
  state.settings.customThemes = _customThemes;
  EventBus.emit('state:changed');
}

export function exportThemeJSON(id) {
  const theme = [...PRESET_THEMES, ..._customThemes].find(t => t.id === id);
  if (!theme) return null;
  return JSON.stringify(theme, null, 2);
}

export function importThemeJSON(json) {
  try {
    const theme = JSON.parse(json);
    if (!theme.id || !theme.name) throw new Error('Invalid theme: missing id or name');
    // Don't overwrite built-in presets
    if (PRESET_THEMES.find(t => t.id === theme.id)) {
      theme.id = theme.id + '_custom_' + Date.now();
    }
    saveCustomTheme(theme);
    return theme;
  } catch (e) {
    throw new Error('Invalid theme JSON: ' + e.message);
  }
}

export function suggestPalette(baseHex, mode = 'complementary') {
  const [h, s, l] = _hexToHsl(baseHex);
  switch (mode) {
    case 'complementary':
      return [baseHex, _hslToHex((h + 180) % 360, s, l), _hslToHex(h, s * 0.5, l * 1.3)];
    case 'analogous':
      return [_hslToHex((h - 30 + 360) % 360, s, l), baseHex, _hslToHex((h + 30) % 360, s, l)];
    case 'triadic':
      return [baseHex, _hslToHex((h + 120) % 360, s, l), _hslToHex((h + 240) % 360, s, l)];
    case 'monochrome':
      return [_hslToHex(h, s, l * 0.5), baseHex, _hslToHex(h, s * 0.4, l * 1.4)];
    default:
      return [baseHex];
  }
}

function _hexToHsl(hex) {
  let r = parseInt(hex.slice(1,3),16)/255, g = parseInt(hex.slice(3,5),16)/255, b = parseInt(hex.slice(5,7),16)/255;
  const max = Math.max(r,g,b), min = Math.min(r,g,b);
  let h, s, l = (max+min)/2;
  if (max === min) { h = s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch(max) {
      case r: h = ((g-b)/d + (g<b?6:0)) / 6; break;
      case g: h = ((b-r)/d + 2) / 6; break;
      case b: h = ((r-g)/d + 4) / 6; break;
    }
  }
  return [Math.round(h*360), Math.round(s*100), Math.round(l*100)];
}

function _hslToHex(h, s, l) {
  s = Math.min(100, Math.max(0, s)); l = Math.min(100, Math.max(0, l));
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1-l);
  const f = n => { const k = (n + h/30) % 12; const c = l - a*Math.max(Math.min(k-3,9-k,1),-1); return Math.round(255*c).toString(16).padStart(2,'0'); };
  return '#' + f(0) + f(8) + f(4);
}
