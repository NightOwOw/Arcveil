// ============================================
// nodes.js — Node types, rendering, CRUD, drag
// Imports: state.js, canvas.js
// Exports: renderNodes, addNode, startDrag, addMediaNode
// Events: emits 'node:clicked', 'node:dblclicked', 'nodes:updated'
// ============================================

import { state, EventBus, uid, addNode as stateAddNode, updateNode, deleteNode } from '../state.js';
import { screenToCanvas, applyTransform, getZoom } from './canvas.js';

const NODE_TYPES = {
  character: { shape: 'circle',  defaultColor: '#7c5cbf', size: 52 },
  location:  { shape: 'rounded', defaultColor: '#2ecc71', size: 50 },
  faction:   { shape: 'hex',     defaultColor: '#e67e22', size: 52 },
  item:      { shape: 'diamond', defaultColor: '#e74c3c', size: 48 },
  concept:   { shape: 'cloud',   defaultColor: '#3498db', size: 50 },
  event:     { shape: 'flag',    defaultColor: '#f39c12', size: 52 },
  media:     { shape: 'rounded', defaultColor: '#666680', size: 60 },
};

let _container = null;

export function initNodes(container) {
  _container = container;
  EventBus.on('nodes:updated', renderNodes);
}

export function renderNodes() {
  if (!_container) return;
  const existing = new Map([..._container.querySelectorAll('.node')].map(el => [el.dataset.id, el]));
  const keep = new Set();

  for (const n of state.nodes) {
    keep.add(n.id);
    let el = existing.get(n.id);
    if (!el) {
      el = _createElement(n);
      _container.appendChild(el);
    }
    _updateElement(el, n);
  }

  // Remove stale elements
  existing.forEach((el, id) => { if (!keep.has(id)) el.remove(); });
}

function _createElement(n) {
  const el = document.createElement('div');
  el.className = 'node';
  el.dataset.id = n.id;
  _bindNodeEvents(el, n.id);
  return el;
}

function _updateElement(el, n) {
  el.style.left = n.x + 'px';
  el.style.top  = n.y + 'px';
  el.classList.toggle('selected', state.selectedNodes.has(n.id));

  if (n.type === 'media') {
    el.innerHTML = _mediaInner(n);
    return;
  }

  const cfg = NODE_TYPES[n.type] || NODE_TYPES.concept;
  const size = n.size || cfg.size;
  const color = n.color || cfg.defaultColor;
  const letter = n.letter || (n.name || '?').charAt(0).toUpperCase();

  el.innerHTML = `
    <div class="node-shape node-${cfg.shape}" style="width:${size}px;height:${size}px;background:${color};">
      <span class="node-letter" style="font-size:${Math.round(size*0.36)}px">${letter}</span>
    </div>
    <div class="node-name">${n.name || ''}</div>
  `;
}

function _mediaInner(n) {
  let content = `<div style="font-size:28px;color:var(--av-text-muted)">📎</div>`;
  if (n.mediaData && n.mediaData.startsWith('data:image'))
    content = `<img src="${n.mediaData}" style="max-width:160px;max-height:100px"/>`;
  else if (n.mediaPath && /\.(mp4|webm)$/i.test(n.mediaPath))
    content = `<video src="${n.mediaPath}" style="max-width:160px;max-height:100px" muted></video>`;
  return `<div class="node-media-wrap" style="min-width:80px;min-height:60px;max-width:160px">${content}</div>
          <div class="node-name">${n.name || 'Media'}</div>`;
}

// ── Events ────────────────────────────────────────────────────────────────────

function _bindNodeEvents(el, id) {
  el.addEventListener('mousedown', e => {
    if (e.button !== 0) return;
    e.stopPropagation();
    if (window._avCanvasMode === 'connect') {
      EventBus.emit('canvas:connect-drag-start', { fromId: id, clientX: e.clientX, clientY: e.clientY });
      return;
    }
    _startDrag(el, id, e);
  });
  el.addEventListener('click', e => {
    e.stopPropagation();
    if (window._avCanvasMode === 'connect') {
      window._avCanvasMode = 'select';
      EventBus.emit('canvas:start-connect', id);
    } else {
      EventBus.emit('node:clicked', id);
    }
  });
  el.addEventListener('dblclick', e => {
    e.stopPropagation();
    EventBus.emit('node:dblclicked', id);
  });
  el.addEventListener('contextmenu', e => {
    e.preventDefault();
    e.stopPropagation();
    EventBus.emit('node:right-clicked', { id, x: e.clientX, y: e.clientY });
  });
}

// ── Drag ──────────────────────────────────────────────────────────────────────

function _startDrag(el, id, startE) {
  const node = state.nodes.find(n => n.id === id);
  if (!node) return;

  const zoom = getZoom();
  let startX = startE.clientX, startY = startE.clientY;
  let nx = node.x, ny = node.y;
  let moved = false;

  el.classList.add('dragging');

  function onMove(e) {
    moved = true;
    const dx = (e.clientX - startX) / zoom;
    const dy = (e.clientY - startY) / zoom;
    node.x = Math.round(nx + dx);
    node.y = Math.round(ny + dy);
    el.style.left = node.x + 'px';
    el.style.top  = node.y + 'px';
    EventBus.emit('canvas:node-moved', id);
  }

  function onUp() {
    el.classList.remove('dragging');
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    if (moved) {
      const { saveHistory } = require('../state.js');
      import('../state.js').then(m => m.saveHistory());
    }
  }

  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}

// ── Add node ──────────────────────────────────────────────────────────────────

export function addNodeAt(type, x, y, name) {
  const cfg = NODE_TYPES[type] || NODE_TYPES.concept;
  const node = {
    id:    uid(),
    type,
    name:  name || _defaultName(type),
    letter: (name || _defaultName(type)).charAt(0).toUpperCase(),
    color: cfg.defaultColor,
    x, y,
    size:  cfg.size,
  };
  stateAddNode(node);
  return node.id;
}

function _defaultName(type) {
  const names = { character:'New Character', location:'New Location',
                  faction:'New Faction', item:'New Item',
                  concept:'New Concept', event:'New Event', media:'Media' };
  return names[type] || 'New Node';
}

export async function addMediaNode(x, y) {
  const filePath = await window.api.openMedia();
  if (!filePath) return;

  let mediaData = null;
  if (/\.(png|jpe?g|gif|webp|svg)$/i.test(filePath)) {
    const b64 = await window.api.fsReadBinary(filePath);
    if (b64) {
      const ext = filePath.split('.').pop().toLowerCase();
      const mime = ext === 'svg' ? 'image/svg+xml' : ext === 'gif' ? 'image/gif' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
      mediaData = `data:${mime};base64,${b64}`;
    }
  }

  const node = {
    id: uid(), type: 'media',
    name: filePath.split(/[\\/]/).pop(),
    color: '#666680', x, y, size: 60,
    mediaPath: filePath, mediaData,
  };
  stateAddNode(node);
}
