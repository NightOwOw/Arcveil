// ============================================
// state.js — ALL app state + EventBus + undo/redo
// Imports: nothing (root module)
// Exports: state, EventBus, uid, esc, saveHistory,
//          getOrCreateProfile, updateProfile
// Events: emits 'state:changed' on every mutation
// ============================================

// ── EventBus ─────────────────────────────────────────────────────────────────

export const EventBus = {
  _l: {},
  on(ev, cb)  { (this._l[ev] = this._l[ev] || []).push(cb); },
  off(ev, cb) { this._l[ev] = (this._l[ev] || []).filter(f => f !== cb); },
  emit(ev, d) { (this._l[ev] || []).forEach(f => { try { f(d); } catch(e) { console.error('EventBus', ev, e); } }); },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── State ─────────────────────────────────────────────────────────────────────

export const state = {
  project: {
    name: 'Untitled Project',
    filePath: '',
    lastSaved: null,
    version: '1.0.0',
    isDirty: false,
  },

  nodes:    [],   // relationship map nodes
  edges:    [],   // relationship map edges
  profiles: {},   // keyed by nodeId

  world: {
    maps:       [],
    locations:  [],
    factions:   [],
    lore:       [],
    bestiary:   [],
    items:      [],
    calendar:   {},
    cultures:   [],
  },

  story: {
    timeline:     [],
    chapters:     [],
    scenes:       [],
    arcs:         [],
    subplots:     [],
    branches:     [],
    promises:     [],
    beats:        {},
    beatTemplate: 'snyder',
    theme:        { statement: '', question: '', motifs: [] },
    conflict:     { central: '', internal: '', external: '', stakes: '', clock: '' },
  },

  writing: {
    documents:      [],
    activeDocId:    null,
    searchHistory:  [],
    openFolderPath: null,
    openFilePaths:  [],
  },

  aus:         [],
  activeAuId:  null,

  view:          { x: 0, y: 0, scale: 1 },
  activeView:    'dashboard',
  selectedNodes: new Set(),

  settings: {
    theme:       'arcveil',
    customTheme: {},
    font:        {},
    layout:      {},
    animations:  true,
    sounds:      true,
    soundPack:   'soft',
    accessibility: {},
  },

  companion: {
    enabled:          true,
    activeCompanion:  'ciona',
    name:             'Ciona',
    callsUser:        'by name',
    userName:         '',
    personality:      'energetic',
    position:         'bottom-right',
    size:             180,
    notifyFrequency:  'normal',
    aiMode:           'none',
    ollamaUrl:        'http://localhost:11434',
    ollamaModel:      'llama3',
    aiProvider:       'anthropic',
    anthropicKey:     '',
    openaiKey:        '',
    geminiKey:        '',
    voiceEnabled:     false,
    voiceEngine:      'system',
    sessions:         [],
    todos:            [],
    triggers:         {},
    achievements:     [],
  },

  history:      [],
  historyIndex: -1,
};

// ── History ───────────────────────────────────────────────────────────────────

export function saveHistory() {
  const snap = _serialise();
  state.history = state.history.slice(0, state.historyIndex + 1);
  state.history.push(snap);
  if (state.history.length > 100) state.history.shift();
  state.historyIndex = state.history.length - 1;
  state.project.isDirty = true;
  EventBus.emit('state:changed', null);
}

export function undo() {
  if (state.historyIndex <= 0) return;
  state.historyIndex--;
  _deserialise(state.history[state.historyIndex]);
  EventBus.emit('state:changed', null);
  EventBus.emit('nodes:updated', null);
}

export function redo() {
  if (state.historyIndex >= state.history.length - 1) return;
  state.historyIndex++;
  _deserialise(state.history[state.historyIndex]);
  EventBus.emit('state:changed', null);
  EventBus.emit('nodes:updated', null);
}

// ── Profile helpers ───────────────────────────────────────────────────────────

export function getOrCreateProfile(nodeId) {
  if (!state.profiles[nodeId]) state.profiles[nodeId] = {};
  return state.profiles[nodeId];
}

export function updateProfile(nodeId, data) {
  state.profiles[nodeId] = { ...(state.profiles[nodeId] || {}), ...data };
  saveHistory();
}

// ── Node CRUD ─────────────────────────────────────────────────────────────────

export function addNode(node) {
  state.nodes.push(node);
  saveHistory();
  EventBus.emit('nodes:updated', null);
}

export function updateNode(id, data) {
  const n = state.nodes.find(n => n.id === id);
  if (!n) return;
  Object.assign(n, data);
  saveHistory();
  EventBus.emit('nodes:updated', null);
}

export function deleteNode(id) {
  state.nodes = state.nodes.filter(n => n.id !== id);
  state.edges = state.edges.filter(e => e.from !== id && e.to !== id);
  delete state.profiles[id];
  saveHistory();
  EventBus.emit('nodes:updated', null);
}

// ── Edge CRUD ─────────────────────────────────────────────────────────────────

export function addEdge(edge) {
  state.edges.push(edge);
  saveHistory();
  EventBus.emit('edges:updated', null);
}

export function updateEdge(id, data) {
  const e = state.edges.find(e => e.id === id);
  if (!e) return;
  Object.assign(e, data);
  saveHistory();
  EventBus.emit('edges:updated', null);
}

export function deleteEdge(id) {
  state.edges = state.edges.filter(e => e.id !== id);
  saveHistory();
  EventBus.emit('edges:updated', null);
}

// ── Serialise / deserialise ───────────────────────────────────────────────────

function _serialise() {
  return JSON.stringify({
    nodes: state.nodes,
    edges: state.edges,
    profiles: state.profiles,
    world: state.world,
    story: state.story,
    writing: state.writing,
    view: state.view,
  });
}

function _deserialise(snap) {
  const d = JSON.parse(snap);
  Object.assign(state, d);
  state.selectedNodes = new Set();
}

export function getExportData() {
  return {
    version:   '1.0.0',
    project:   state.project,
    nodes:     state.nodes,
    edges:     state.edges,
    profiles:  state.profiles,
    world:     state.world,
    story:     state.story,
    writing:   state.writing,
    settings:  state.settings,
    companion: state.companion,
    aus:       state.aus,
    activeAuId: state.activeAuId,
  };
}

export function loadProject(data) {
  if (!data) return;
  if (data.project)  Object.assign(state.project, data.project);
  if (data.nodes)    state.nodes    = data.nodes;
  if (data.edges)    state.edges    = data.edges;
  if (data.profiles) state.profiles = data.profiles;
  if (data.world)    Object.assign(state.world, data.world);
  if (data.story)    Object.assign(state.story, data.story);
  if (data.writing)  Object.assign(state.writing, data.writing);
  if (data.settings)  Object.assign(state.settings, data.settings);
  if (data.companion) Object.assign(state.companion, data.companion);
  if (data.aus)       state.aus = data.aus;
  if (data.activeAuId !== undefined) state.activeAuId = data.activeAuId;
  state.selectedNodes = new Set();
  state.history = [_serialise()];
  state.historyIndex = 0;
  state.project.isDirty = false;
  EventBus.emit('project:loaded', null);
  EventBus.emit('nodes:updated', null);
  EventBus.emit('state:changed', null);
}
