// shortcuts.js — Keyboard shortcut registry with per-user customization
// Stored in localStorage so they persist across projects and sessions

export const SHORTCUTS = [
  { id: 'nav-dashboard',   group: 'Navigation', label: 'Dashboard',          default: '1' },
  { id: 'nav-canvas',      group: 'Navigation', label: 'Canvas',             default: '2' },
  { id: 'nav-characters',  group: 'Navigation', label: 'Characters',         default: '3' },
  { id: 'nav-writing',     group: 'Navigation', label: 'Writing',            default: '4' },
  { id: 'nav-world',       group: 'Navigation', label: 'World',              default: '5' },
  { id: 'nav-settings',    group: 'Navigation', label: 'Settings',           default: 'Ctrl+,' },
  { id: 'proj-new',        group: 'Project',    label: 'New project',        default: 'Ctrl+N' },
  { id: 'proj-open',       group: 'Project',    label: 'Open project',       default: 'Ctrl+O' },
  { id: 'proj-save',       group: 'Project',    label: 'Save project',       default: 'Ctrl+S' },
  { id: 'proj-save-as',    group: 'Project',    label: 'Save as…',          default: 'Ctrl+Shift+S' },
  { id: 'proj-undo',       group: 'Project',    label: 'Undo',               default: 'Ctrl+Z' },
  { id: 'proj-redo',       group: 'Project',    label: 'Redo',               default: 'Ctrl+Y' },
  { id: 'canvas-add-node', group: 'Canvas',     label: 'Add character node', default: 'N' },
  { id: 'canvas-fit',      group: 'Canvas',     label: 'Fit all nodes',      default: 'F' },
  { id: 'canvas-delete',   group: 'Canvas',     label: 'Delete selected',    default: 'Delete' },
];

const _LS_KEY = 'av-shortcuts';
let _custom = {};
try { _custom = JSON.parse(localStorage.getItem(_LS_KEY) || '{}'); } catch {}

export function getKey(id) {
  return _custom[id] ?? SHORTCUTS.find(s => s.id === id)?.default ?? '';
}

export function setKey(id, combo) {
  if (combo) _custom[id] = combo; else delete _custom[id];
  localStorage.setItem(_LS_KEY, JSON.stringify(_custom));
}

export function resetKey(id) {
  delete _custom[id];
  localStorage.setItem(_LS_KEY, JSON.stringify(_custom));
}

// Returns the SHORTCUT definition that already uses `combo`, excluding the given id.
// Returns null when there is no conflict.
export function findConflict(id, combo) {
  if (!combo) return null;
  const norm = combo.toLowerCase();
  return SHORTCUTS.find(s => s.id !== id && getKey(s.id).toLowerCase() === norm) ?? null;
}

// Saves combo for `id`; if another shortcut already owns that combo, swap keys so
// the caller's old key goes to the displaced shortcut (prevents dead assignments).
export function setKeySwap(id, combo) {
  const conflict = findConflict(id, combo);
  if (conflict) {
    const displaced = getKey(id); // current key we're vacating
    setKey(conflict.id, displaced);
  }
  setKey(id, combo);
}

// Returns true if the KeyboardEvent matches the registered combo for this shortcut id
export function matchShortcut(id, e) {
  const combo = getKey(id);
  if (!combo) return false;
  const parts = combo.split('+');
  const mainKey   = parts[parts.length - 1];
  const needCtrl  = parts.some(p => p.toLowerCase() === 'ctrl');
  const needShift = parts.some(p => p.toLowerCase() === 'shift');
  const needAlt   = parts.some(p => p.toLowerCase() === 'alt');
  // Single-char keys match case-insensitively; named keys (Delete, Enter…) match exactly
  const keyMatch = mainKey.length === 1
    ? e.key.toLowerCase() === mainKey.toLowerCase()
    : e.key === mainKey;
  return keyMatch &&
    !!(e.ctrlKey || e.metaKey) === needCtrl &&
    !!e.shiftKey               === needShift &&
    !!e.altKey                 === needAlt;
}

// Converts a KeyboardEvent into a combo string like "Ctrl+Shift+A"
export function recordEvent(e) {
  if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return null;
  const parts = [];
  if (e.ctrlKey || e.metaKey) parts.push('Ctrl');
  if (e.shiftKey) parts.push('Shift');
  if (e.altKey)   parts.push('Alt');
  parts.push(e.key === ' ' ? 'Space' : e.key);
  return parts.join('+');
}
