// map-canvas.js — SVG map canvas: render, tools, pan/zoom, layers, export.
import { uid, EventBus } from '../state.js';

const CS = 8; // pixels per grid cell

const PIN = { capital:'🏰', city:'🏘', village:'🏚', temple:'⛩', dungeon:'🗝', landmark:'⛰', magic:'✨' };
const PIN_TYPES = Object.keys(PIN);

let _svg = null, _inner = null, _data = null, _mapId = null;
let _tool = 'select', _zoom = 1, _panX = 0, _panY = 0;
const _L = { terrain:true, borders:true, provinces:false, labels:true, provLabels:false, cities:true, rivers:true };

export function renderMapCanvas(container, mapData, mapId) {
  _data = mapData; _mapId = mapId;
  _zoom = 1; _panX = 0; _panY = 0; _tool = 'select';

  const SW = mapData.width * CS, SH = mapData.height * CS;

  container.innerHTML = `
    <div class="mctoolbar" id="mctoolbar">
      <button class="mctool active" data-t="select"  title="Select (click region)">🖱</button>
      <button class="mctool"        data-t="city"    title="Add location pin">📍</button>
      <button class="mctool"        data-t="repaint" title="Repaint region color">🎨</button>
      <button class="mctool"        data-t="rename"  title="Rename region">✏️</button>
      <div class="mctool-sep"></div>
      <button class="mctool"        data-t="regen"   title="Regenerate map">🔀</button>
      <button class="mctool"        data-t="export"  title="Export SVG">📤</button>
    </div>
    <div class="mccanvas-outer" id="mccanvas-outer">
      <div class="mccanvas-inner" id="mccanvas-inner">
        <svg id="mc-svg" xmlns="http://www.w3.org/2000/svg" width="${SW}" height="${SH}" viewBox="0 0 ${SW} ${SH}"></svg>
      </div>
    </div>
    <div class="mclayers" id="mclayers">
      <div class="mclayers-title">Layers</div>
      ${_lrow('terrain','Terrain fill')}
      ${_lrow('borders','Region borders')}
      ${_lrow('labels','Region labels')}
      ${_lrow('provinces','Province borders')}
      ${_lrow('provLabels','Province labels')}
      ${_lrow('cities','City pins')}
      ${_lrow('rivers','Rivers')}
      <div style="border-top:1px solid var(--av-border);margin:8px 0 4px"></div>
      <button class="btn-sm" id="mc-export-btn" style="width:100%;margin:0;font-size:10px">📤 Export SVG</button>
    </div>
  `;

  _svg   = document.getElementById('mc-svg');
  _inner = document.getElementById('mccanvas-inner');
  _drawMap();

  container.querySelectorAll('.mctool').forEach(btn => {
    btn.onclick = () => {
      const t = btn.dataset.t;
      if (t === 'regen')  { EventBus.emit('map:regenerate', mapId); return; }
      if (t === 'export') { _exportSVG(); return; }
      _tool = t;
      container.querySelectorAll('.mctool').forEach(b => b.classList.toggle('active', b === btn));
    };
  });

  container.querySelectorAll('.mc-lcb').forEach(cb => {
    cb.onchange = () => { _L[cb.dataset.l] = cb.checked; _drawMap(); };
  });

  document.getElementById('mc-export-btn')?.addEventListener('click', _exportSVG);
  _bindPanZoom(document.getElementById('mccanvas-outer'));
  _svg.addEventListener('click', _onClick);
  _svg.addEventListener('contextmenu', e => { e.preventDefault(); _onRClick(e); });
}

export function refreshMapCanvas(mapData) {
  _data = mapData;
  _drawMap();
}

// ── SVG rendering ─────────────────────────────────────────────────────────

function _drawMap() {
  if (!_svg || !_data) return;
  const { width: W, height: H, cells, regions, rivers = [], provinces = [] } = _data;
  const SW = W * CS, SH = H * CS;
  const ns = (_data.seed || 1) % 9973;

  const cm = Object.fromEntries(regions.map(r => [r.id, r.color || '#b8a882']));
  cm['__wild__'] = '#7d9060';

  let s = `
<defs>
  <filter id="mn" x="-20%" y="-20%" width="140%" height="140%">
    <feTurbulence type="fractalNoise" baseFrequency="0.044" numOctaves="3" seed="${ns}"/>
    <feDisplacementMap in="SourceGraphic" xChannelSelector="R" yChannelSelector="G" scale="${CS}"/>
  </filter>
  <filter id="bn" x="-10%" y="-10%" width="120%" height="120%">
    <feTurbulence type="fractalNoise" baseFrequency="0.075" numOctaves="2" seed="${(ns+31)%9973}"/>
    <feDisplacementMap in="SourceGraphic" xChannelSelector="R" yChannelSelector="G" scale="${CS*0.6}"/>
  </filter>
</defs>
<rect width="${SW}" height="${SH}" fill="#2a5a7c"/>`;

  if (_L.terrain) {
    s += `<g filter="url(#mn)">`;
    for (const c of cells) {
      if (!c.isLand) continue;
      s += `<rect x="${c.col*CS}" y="${c.row*CS}" width="${CS+1}" height="${CS+1}" fill="${cm[c.regionId]||'#b8a882'}"/>`;
    }
    s += `</g>`;
  }

  s += `<g filter="url(#bn)" stroke="#1a140a" stroke-width="2.2" fill="none" opacity="0.55">`;
  for (const c of cells) {
    if (!c.isLand) continue;
    const x0 = c.col*CS, y0 = c.row*CS;
    if (c.col < W-1 && !cells[c.row*W+c.col+1].isLand) s += `<line x1="${x0+CS}" y1="${y0}" x2="${x0+CS}" y2="${y0+CS}"/>`;
    if (c.row < H-1 && !cells[(c.row+1)*W+c.col].isLand) s += `<line x1="${x0}" y1="${y0+CS}" x2="${x0+CS}" y2="${y0+CS}"/>`;
    if (c.col > 0   && !cells[c.row*W+c.col-1].isLand) s += `<line x1="${x0}" y1="${y0}" x2="${x0}" y2="${y0+CS}"/>`;
    if (c.row > 0   && !cells[(c.row-1)*W+c.col].isLand) s += `<line x1="${x0}" y1="${y0}" x2="${x0+CS}" y2="${y0}"/>`;
  }
  s += `</g>`;

  if (_L.borders) {
    s += `<g filter="url(#bn)" stroke="#1f180a" stroke-width="1.8" fill="none" opacity="0.7">`;
    for (const c of cells) {
      if (!c.isLand) continue;
      const x0 = c.col*CS, y0 = c.row*CS;
      if (c.col < W-1) { const r = cells[c.row*W+c.col+1]; if (r?.isLand && r.regionId !== c.regionId) s += `<line x1="${x0+CS}" y1="${y0}" x2="${x0+CS}" y2="${y0+CS}"/>`; }
      if (c.row < H-1) { const b = cells[(c.row+1)*W+c.col]; if (b?.isLand && b.regionId !== c.regionId) s += `<line x1="${x0}" y1="${y0+CS}" x2="${x0+CS}" y2="${y0+CS}"/>`; }
    }
    s += `</g>`;
  }

  if (_L.rivers && rivers.length) {
    s += `<g stroke="#3b7bbf" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="0.75">`;
    for (const r of rivers) {
      if (r.points.length < 2) continue;
      const d = r.points.map((p, i) => `${i?'L':'M'}${(p.x*CS).toFixed(1)} ${(p.y*CS).toFixed(1)}`).join(' ');
      s += `<path d="${d}"/>`;
    }
    s += `</g>`;
  }

  if (_L.labels) {
    s += `<g class="rlabels">`;
    for (const r of regions) {
      if (!r.centroid || !r.name) continue;
      const x = (r.centroid.x * CS).toFixed(1), y = (r.centroid.y * CS).toFixed(1);
      const sz = Math.max(8, Math.min(20, 7 + (r.cellCount || 0) / 30));
      s += `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle"
        font-size="${sz.toFixed(1)}" font-family="Georgia,serif" font-style="italic"
        fill="#160d02" stroke="#f0e2b4" stroke-width="3.5" paint-order="stroke" style="cursor:pointer"
        data-rid="${r.id}">${_esc(r.name)}</text>`;
    }
    s += `</g>`;
  }

  if (_L.provLabels && provinces.length) {
    s += `<g class="plabels">`;
    for (const p of provinces) {
      if (!p.centroid) continue;
      s += `<text x="${(p.centroid.x*CS).toFixed(1)}" y="${(p.centroid.y*CS).toFixed(1)}"
        text-anchor="middle" dominant-baseline="middle" font-size="5.5"
        font-family="serif" fill="#2a1a06" opacity="0.65">${_esc(p.name)}</text>`;
    }
    s += `</g>`;
  }

  if (_L.cities && _data.cities?.length) {
    s += `<g class="cpins">`;
    for (const c of _data.cities) {
      const px = (c.x * CS).toFixed(1), py = (c.y * CS).toFixed(1);
      s += `<g class="cpin" data-cid="${c.id}" style="cursor:pointer">
        <text x="${px}" y="${py}" text-anchor="middle" font-size="13">${PIN[c.type]||'📍'}</text>
        <text x="${px}" y="${(+py+13).toFixed(1)}" text-anchor="middle" font-size="7"
          fill="#160d02" stroke="#f0e2b4" stroke-width="2" paint-order="stroke">${_esc(c.name)}</text>
      </g>`;
    }
    s += `</g>`;
  }

  _svg.innerHTML = s;
}

// ── Interaction ───────────────────────────────────────────────────────────

function _onClick(e) {
  const { col, row } = _cellAt(e);
  if (!_data || col < 0 || row < 0 || col >= _data.width || row >= _data.height) return;
  const cell = _data.cells[row * _data.width + col];

  if (_tool === 'select') {
    if (cell?.isLand && cell.regionId && cell.regionId !== '__wild__')
      EventBus.emit('map:select-region', { mapId: _mapId, regionId: cell.regionId });
    return;
  }
  if (_tool === 'city') {
    if (!cell?.isLand) return;
    const name = prompt('Location name:'); if (!name) return;
    const typeStr = prompt('Type: ' + PIN_TYPES.map((t,i)=>`${i}=${t}`).join(', '), '1');
    const type = PIN_TYPES[parseInt(typeStr)] || 'city';
    if (!_data.cities) _data.cities = [];
    _data.cities.push({ id: uid(), name, type, x: col+.5, y: row+.5, description: '' });
    EventBus.emit('map:updated', { mapId: _mapId, mapData: _data });
    _drawMap(); return;
  }
  if (_tool === 'repaint') {
    const region = _data.regions.find(r => r.id === cell?.regionId); if (!region) return;
    const c = prompt('New color (hex):', region.color || '#c8aa7a');
    if (c) { region.color = c; EventBus.emit('map:updated', { mapId: _mapId, mapData: _data }); _drawMap(); }
    return;
  }
  if (_tool === 'rename') {
    const region = _data.regions.find(r => r.id === cell?.regionId); if (!region) return;
    const n = prompt('New name:', region.name || '');
    if (n !== null) { region.name = n; EventBus.emit('map:updated', { mapId: _mapId, mapData: _data }); _drawMap(); }
  }
}

function _onRClick(e) {
  const { col, row } = _cellAt(e);
  const cell = _data?.cells?.[row * _data.width + col];
  if (cell?.isLand && cell.regionId && cell.regionId !== '__wild__')
    EventBus.emit('map:select-region', { mapId: _mapId, regionId: cell.regionId });
}

function _cellAt(e) {
  const rect = _svg.getBoundingClientRect();
  const vbW = _data?.width * CS || 1, vbH = _data?.height * CS || 1;
  const sx = vbW / rect.width, sy = vbH / rect.height;
  const x = (e.clientX - rect.left) * sx, y = (e.clientY - rect.top) * sy;
  return { col: Math.floor(x / CS), row: Math.floor(y / CS) };
}

// ── Pan/zoom ──────────────────────────────────────────────────────────────

function _bindPanZoom(outer) {
  let pan = false, lx = 0, ly = 0;
  outer.addEventListener('wheel', e => {
    e.preventDefault();
    _zoom = Math.max(0.2, Math.min(8, _zoom * (e.deltaY > 0 ? 0.88 : 1.14)));
    _applyTf();
  }, { passive: false });
  outer.addEventListener('mousedown', e => {
    if (e.button !== 0) return;
    const t = e.target;
    if (t === outer || t === _inner || t === _svg || t.tagName === 'rect' || t.tagName === 'svg') {
      pan = true; lx = e.clientX; ly = e.clientY;
    }
  });
  document.addEventListener('mousemove', e => {
    if (!pan) return;
    _panX += e.clientX - lx; _panY += e.clientY - ly; lx = e.clientX; ly = e.clientY;
    _applyTf();
  });
  document.addEventListener('mouseup', () => { pan = false; });
}

function _applyTf() {
  if (_inner) _inner.style.transform = `translate(${_panX}px,${_panY}px) scale(${_zoom})`;
}

// ── Helpers ───────────────────────────────────────────────────────────────

function _lrow(key, label) {
  return `<label class="mc-lrow"><input type="checkbox" class="mc-lcb" data-l="${key}" ${_L[key]?'checked':''}><span>${label}</span></label>`;
}

function _exportSVG() {
  if (!_svg) return;
  const xml = new XMLSerializer().serializeToString(_svg);
  const blob = new Blob([xml], { type: 'image/svg+xml' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${_data?.name || 'map'}.svg`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1500);
}

function _esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
