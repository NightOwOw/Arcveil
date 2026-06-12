// ============================================
// storage.js — Save/load .arcveil project files
// Imports: state.js
// Exports: saveProject, saveProjectAs, openProject, newProject, autoSave
// Events: emits 'project:saved', 'project:loaded'
// ============================================

import { state, getExportData, loadProject, EventBus, saveHistory } from './state.js';

let _autoSaveTimer = null;
const AUTO_SAVE_MS = 30_000;

// ── Save ──────────────────────────────────────────────────────────────────────

export async function saveProject() {
  if (!state.project.filePath) return saveProjectAs();
  await _writeToDisk(state.project.filePath);
}

export async function saveProjectAs() {
  const defaultName = (state.project.name || 'My Project') + '.arcveil';
  const fp = await window.api.saveDialog(defaultName);
  if (!fp) return;
  state.project.filePath = fp;
  state.project.name = fp.split(/[\\/]/).pop().replace('.arcveil', '');
  await _writeToDisk(fp);
}

async function _writeToDisk(fp) {
  const data = JSON.stringify(getExportData(), null, 2);
  const ok = await window.api.fsWrite(fp, data);
  if (ok) {
    state.project.isDirty = false;
    state.project.lastSaved = Date.now();
    EventBus.emit('project:saved', { filePath: fp });
    _updateTitlebar();
  }
}

// ── Open ──────────────────────────────────────────────────────────────────────

export async function openProject(filePath) {
  const fp = filePath || await window.api.openDialog();
  if (!fp) return;
  const raw = await window.api.fsRead(fp);
  if (!raw) return;
  try {
    const data = JSON.parse(raw);
    data.project.filePath = fp;
    loadProject(data);
    _updateTitlebar();
    _startAutoSave();
  } catch (e) {
    console.error('Failed to open project:', e);
  }
}

// ── New ───────────────────────────────────────────────────────────────────────

export async function newProject() {
  const name = prompt('Project name:', 'My New Story') || 'My New Story';
  const fp = await window.api.saveDialog(name + '.arcveil');
  if (!fp) return;
  loadProject({
    project: { name, filePath: fp },
    nodes: _demoNodes(),
    edges: _demoEdges(),
  });
  await _writeToDisk(fp);
  _startAutoSave();
}

// ── Auto-save ─────────────────────────────────────────────────────────────────

export function startAutoSave() { _startAutoSave(); }

function _startAutoSave() {
  if (_autoSaveTimer) clearInterval(_autoSaveTimer);
  _autoSaveTimer = setInterval(() => {
    if (state.project.filePath && state.project.isDirty) saveProject();
  }, AUTO_SAVE_MS);
}

// ── Titlebar sync ──────────────────────────────────────────────────────────────

function _updateTitlebar() {
  const name = state.project.name || 'Untitled';
  const nameEl = document.getElementById('titlebar-project-name');
  if (nameEl) nameEl.textContent = name;
  document.title = `ArcVeil — ${name}`;
}

// ── Demo project ──────────────────────────────────────────────────────────────

export function loadDemoProject() {
  loadProject({
    project: { name: 'My Story', filePath: '' },
    nodes: _demoNodes(),
    edges: _demoEdges(),
  });
  // Reset view to show all demo nodes when user first opens canvas
  state.view.x = 0;
  state.view.y = 0;
  state.view.scale = 1;
}

// ── Last file (on startup) ─────────────────────────────────────────────────────

export async function loadLastFile() {
  const settings = await window.api.loadSettings();
  if (settings?.lastFile) {
    const exists = await window.api.fsExists(settings.lastFile);
    if (exists) { await openProject(settings.lastFile); return; }
  }
  // Fall back: open first .arcveil found in the projects folder
  const projectFiles = await window.api.listDefaultProjects?.();
  if (projectFiles?.length) await openProject(projectFiles[0]);
}

EventBus.on('project:saved', async ({ filePath }) => {
  const settings = await window.api.loadSettings();
  await window.api.saveSettings({ ...settings, lastFile: filePath });
});

// ── Demo content for new projects ─────────────────────────────────────────────

function _demoNodes() {
  const { uid } = { uid: () => Date.now().toString(36) + Math.random().toString(36).slice(2,7) };
  return [
    { id: 'demo1', type: 'character', name: 'Your Hero', letter: 'H', color: '#7c5cbf', x: 400, y: 260, size: 52 },
    { id: 'demo2', type: 'character', name: 'The Mentor', letter: 'M', color: '#3498db', x: 620, y: 180, size: 48 },
    { id: 'demo3', type: 'location',  name: 'The City',  letter: 'C', color: '#2ecc71', x: 250, y: 380, size: 48 },
    { id: 'demo4', type: 'faction',   name: 'The Guild', letter: 'G', color: '#e67e22', x: 580, y: 360, size: 48 },
  ];
}

function _demoEdges() {
  return [
    { id: 'de1', from: 'demo1', to: 'demo2', label: 'trained by', style: 'animated', color: '#7c5cbf', dir: 'forward', thick: 2 },
    { id: 'de2', from: 'demo1', to: 'demo3', label: 'lives in',   style: 'animated', color: '#2ecc71', dir: 'none',    thick: 2 },
    { id: 'de3', from: 'demo2', to: 'demo4', label: 'leads',      style: 'animated', color: '#3498db', dir: 'forward', thick: 2 },
  ];
}
