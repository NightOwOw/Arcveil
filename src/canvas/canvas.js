// ============================================
// canvas.js — Pan, zoom, grid, viewport management
// Imports: state.js
// Exports: initCanvas, screenToCanvas, canvasToScreen, fitAll, getZoom
// Events: listens 'project:loaded'
// ============================================

import { state, EventBus } from '../state.js';

let _container = null;
let _inner = null;

export function initCanvas(container, inner) {
  _container = container;
  _inner = inner;

  _bindPanZoom();
  _bindKeyboard();
  _bindMinimap();
  EventBus.on('project:loaded', () => { fitAll(); });
  EventBus.on('nodes:updated', _updateMinimap);
  EventBus.on('canvas:node-moved', _updateMinimap);
  EventBus.on('canvas:focus-node', focusNode);
}

export function focusNode(nodeId) {
  if (!_container) return;
  const node = state.nodes.find(n => n.id === nodeId);
  if (!node) return;
  const cx = node.x + (node.size || 52) / 2;
  const cy = node.y + (node.size || 52) / 2;
  state.view.x = _container.clientWidth  / 2 - cx * state.view.scale;
  state.view.y = _container.clientHeight / 2 - cy * state.view.scale;
  applyTransform();
  EventBus.emit('canvas:zoom-changed', state.view.scale);
}

export function applyTransform() {
  if (_inner) _inner.style.transform = `translate(${state.view.x}px, ${state.view.y}px) scale(${state.view.scale})`;
  _updateMinimap();
}

export function screenToCanvas(sx, sy) {
  return {
    x: (sx - state.view.x) / state.view.scale,
    y: (sy - state.view.y) / state.view.scale,
  };
}

export function canvasToScreen(cx, cy) {
  return {
    x: cx * state.view.scale + state.view.x,
    y: cy * state.view.scale + state.view.y,
  };
}

export function getZoom() { return state.view.scale; }

export function fitAll() {
  if (!state.nodes.length || !_container) return;
  const pad = 80;
  const xs = state.nodes.map(n => n.x), ys = state.nodes.map(n => n.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs) + 60;
  const minY = Math.min(...ys), maxY = Math.max(...ys) + 60;
  const cw = _container.clientWidth, ch = _container.clientHeight;
  const fw = cw - pad * 2, fh = ch - pad * 2;
  const scale = Math.min(fw / (maxX - minX || 1), fh / (maxY - minY || 1), 2);
  state.view.scale = Math.max(0.15, scale);
  state.view.x = pad + (fw - (maxX - minX) * state.view.scale) / 2 - minX * state.view.scale;
  state.view.y = pad + (fh - (maxY - minY) * state.view.scale) / 2 - minY * state.view.scale;
  applyTransform();
  EventBus.emit('canvas:zoom-changed', state.view.scale);
}

// ── Pan & Zoom ────────────────────────────────────────────────────────────────

function _bindPanZoom() {
  if (!_container) return;

  _container.addEventListener('wheel', e => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.12 : 0.9;
    const rect = _container.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    state.view.x = mx - (mx - state.view.x) * factor;
    state.view.y = my - (my - state.view.y) * factor;
    state.view.scale = Math.max(0.1, Math.min(8, state.view.scale * factor));
    applyTransform();
    EventBus.emit('canvas:zoom-changed', state.view.scale);
  }, { passive: false });
}

// ── Minimap ───────────────────────────────────────────────────────────────────

function _bindMinimap() {
  const el = document.getElementById('minimap');
  if (!el) return;
  el.addEventListener('click', e => {
    if (!state.nodes.length || !_container) return;
    const rect = el.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const mw = 120, mh = 80;
    const { scale: ms, ox, oy } = _minimapTransform(mw, mh);
    const canvasX = (mx - ox) / ms;
    const canvasY = (my - oy) / ms;
    state.view.x = _container.clientWidth  / 2 - canvasX * state.view.scale;
    state.view.y = _container.clientHeight / 2 - canvasY * state.view.scale;
    applyTransform();
  });
}

function _minimapTransform(mw, mh) {
  if (!state.nodes.length) return { scale: 1, ox: 0, oy: 0 };
  const xs = state.nodes.map(n => n.x), ys = state.nodes.map(n => n.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs) + 60;
  const minY = Math.min(...ys), maxY = Math.max(...ys) + 60;
  const bw = maxX - minX || 1, bh = maxY - minY || 1;
  const scale = Math.min(mw / bw, mh / bh) * 0.85;
  const ox = (mw - bw * scale) / 2 - minX * scale;
  const oy = (mh - bh * scale) / 2 - minY * scale;
  return { scale, ox, oy };
}

function _updateMinimap() {
  const canvas = document.getElementById('minimap-canvas');
  const viewport = document.getElementById('minimap-viewport');
  if (!canvas) return;
  const mw = canvas.width, mh = canvas.height;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, mw, mh);

  if (!state.nodes.length) return;
  const { scale: ms, ox, oy } = _minimapTransform(mw, mh);

  for (const n of state.nodes) {
    const nx = n.x * ms + ox, ny = n.y * ms + oy;
    const nr = Math.max(2.5, (n.size || 52) * ms * 0.4);
    ctx.fillStyle = n.color || '#888';
    ctx.beginPath();
    ctx.arc(nx, ny, nr, 0, Math.PI * 2);
    ctx.fill();
  }

  if (viewport && _container) {
    const cw = _container.clientWidth, ch = _container.clientHeight;
    const vx = (-state.view.x / state.view.scale) * ms + ox;
    const vy = (-state.view.y / state.view.scale) * ms + oy;
    const vw = (cw / state.view.scale) * ms;
    const vh = (ch / state.view.scale) * ms;
    viewport.style.left   = vx + 'px';
    viewport.style.top    = vy + 'px';
    viewport.style.width  = vw + 'px';
    viewport.style.height = vh + 'px';
  }
}

// ── Keyboard shortcuts ────────────────────────────────────────────────────────

function _bindKeyboard() {
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.key === 'f' || e.key === 'F') fitAll();
  });
}
