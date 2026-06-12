// appearance.js — Appearance tab: colors, body, outfits, markings
import { state, esc, getOrCreateProfile, updateProfile } from '../state.js';

const HAIR_PRESETS = [
  '#1a0a00','#3b1f0a','#6b3a2a','#8b5e3c','#c8a97e','#e8d5a3','#f5f0e0',
  '#f0c040','#c08020','#e0603c','#b02840','#800020','#600080','#204080',
  '#006040','#808080','#c0c0c0','#ffffff',
];
const EYES_PRESETS = [
  '#1a0a00','#4a2800','#6b4020','#40681c','#207040','#2060a0','#6040c0',
  '#a03060','#808080','#a09050','#c0b060','#e0d090',
];
const SKIN_PRESETS = [
  '#fde8d0','#f5c9a0','#e8b080','#d09060','#b87048','#9a5830','#7a4020',
  '#5a2810','#3a1808','#ffe8f0','#fff0e0','#e8f0ff',
];
const BODY_TYPES = ['Petite','Average','Tall','Muscular','Curvy','Slim'];
const OUTFIT_SLOTS = ['Casual','Battle','Formal','Disguise','Other'];

export function renderAppearance(nodeId) {
  const body = document.getElementById('rp-body');
  if (!body) return;
  const p = getOrCreateProfile(nodeId);
  const app = p.appearance || {};
  const outfits = app.outfits || {};
  let activeOutfit = app._activeOutfit || 0;

  body.innerHTML = `
    <div class="panel-section-head">Color Palette</div>
    ${_colorRow('Hair', 'hair', app.hair || HAIR_PRESETS[1], HAIR_PRESETS)}
    ${_colorRow('Eyes', 'eyes', app.eyes || EYES_PRESETS[4], EYES_PRESETS)}
    ${_colorRow('Skin', 'skin', app.skin || SKIN_PRESETS[0], SKIN_PRESETS)}

    <div style="display:flex;gap:6px;margin:6px 0 10px;align-items:center">
      <label style="font-size:11px;color:var(--av-text-secondary);min-width:72px">Accent 1</label>
      <input type="color" class="col-wheel" id="a-acc1" value="${app.accent1||'#7c5cbf'}">
      <label style="font-size:11px;color:var(--av-text-secondary)">Accent 2</label>
      <input type="color" class="col-wheel" id="a-acc2" value="${app.accent2||'#e74c3c'}">
      <button class="btn-sm" id="a-copy-pal" style="margin-left:auto">📋 Copy</button>
    </div>

    <div class="panel-section-head">Body Type</div>
    <div class="body-type-grid">
      ${BODY_TYPES.map(bt => `
        <div class="body-type-opt${app.bodyType===bt.toLowerCase()?' sel':''}" data-bt="${bt.toLowerCase()}">${bt}</div>
      `).join('')}
    </div>

    <div class="panel-section-head">Outfits</div>
    <div class="outfit-tabs">
      ${OUTFIT_SLOTS.map((s,i) => `<div class="outfit-tab${i===activeOutfit?' active':''}" data-oi="${i}">${s}</div>`).join('')}
    </div>
    <div id="outfit-slot-body">${_outfitSlotHTML(outfits, activeOutfit)}</div>

    <div class="panel-section-head">Markings & Scars</div>
    <textarea id="a-marks" placeholder="Describe any markings, scars, tattoos, birthmarks..." style="width:100%;min-height:64px;border:1px solid var(--av-border);border-radius:var(--av-radius-sm);padding:6px;font-size:12px;resize:vertical;background:var(--av-input-bg);color:var(--av-text-primary);box-sizing:border-box">${esc(app.markings||'')}</textarea>
  `;

  // Color wheels for hair/eyes/skin
  ['hair','eyes','skin'].forEach(group => {
    const wheel = body.querySelector(`#col-${group}`);
    if (!wheel) return;
    wheel.addEventListener('input', e => {
      body.querySelectorAll(`.color-swatch[data-group="${group}"]`).forEach(s => s.classList.remove('sel'));
      _saveColor(nodeId, group, e.target.value);
    });
    // Preset swatches
    body.querySelectorAll(`.color-swatch[data-group="${group}"]`).forEach(sw => {
      sw.onclick = () => {
        body.querySelectorAll(`.color-swatch[data-group="${group}"]`).forEach(s => s.classList.remove('sel'));
        sw.classList.add('sel');
        wheel.value = sw.dataset.color;
        _saveColor(nodeId, group, sw.dataset.color);
      };
    });
  });

  // Body type
  body.querySelectorAll('.body-type-opt').forEach(opt => {
    opt.onclick = () => {
      body.querySelectorAll('.body-type-opt').forEach(o => o.classList.remove('sel'));
      opt.classList.add('sel');
      updateProfile(nodeId, { appearance: { ...(getOrCreateProfile(nodeId).appearance||{}), bodyType: opt.dataset.bt } });
    };
  });

  // Outfit tabs
  body.querySelectorAll('.outfit-tab').forEach(tab => {
    tab.onclick = () => {
      activeOutfit = +tab.dataset.oi;
      body.querySelectorAll('.outfit-tab').forEach(t => t.classList.toggle('active', t === tab));
      updateProfile(nodeId, { appearance: { ...(getOrCreateProfile(nodeId).appearance||{}), _activeOutfit: activeOutfit } });
      document.getElementById('outfit-slot-body').innerHTML = _outfitSlotHTML(getOrCreateProfile(nodeId).appearance?.outfits || {}, activeOutfit);
      _wireOutfit(nodeId, activeOutfit);
    };
  });
  _wireOutfit(nodeId, activeOutfit);

  // Accents
  document.getElementById('a-acc1')?.addEventListener('input', e => _saveColor(nodeId, 'accent1', e.target.value));
  document.getElementById('a-acc2')?.addEventListener('input', e => _saveColor(nodeId, 'accent2', e.target.value));

  // Copy palette
  document.getElementById('a-copy-pal')?.addEventListener('click', () => {
    const ap = getOrCreateProfile(nodeId).appearance || {};
    navigator.clipboard?.writeText(`Hair: ${ap.hair||'?'}\nEyes: ${ap.eyes||'?'}\nSkin: ${ap.skin||'?'}\nAccent1: ${ap.accent1||'?'}\nAccent2: ${ap.accent2||'?'}`);
  });

  // Markings
  document.getElementById('a-marks')?.addEventListener('input', e => {
    updateProfile(nodeId, { appearance: { ...(getOrCreateProfile(nodeId).appearance||{}), markings: e.target.value } });
  });
}

function _saveColor(nodeId, key, value) {
  const ap = getOrCreateProfile(nodeId).appearance || {};
  ap[key] = value;
  updateProfile(nodeId, { appearance: ap });
}

function _colorRow(label, group, current, presets) {
  return `
    <div class="swatch-row" style="align-items:flex-start;margin-bottom:10px">
      <label style="margin-top:6px">${label}</label>
      <div style="flex:1">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">
          <input type="color" class="col-wheel" id="col-${group}" value="${current}">
          <span style="font-size:10px;color:var(--av-text-muted)">Or pick a preset:</span>
        </div>
        <div class="swatch-list">
          ${presets.map(c => `<div class="color-swatch${current===c?' sel':''}" data-group="${group}" data-color="${c}" style="background:${c}" title="${c}"></div>`).join('')}
        </div>
      </div>
    </div>
  `;
}

function _outfitSlotHTML(outfits, idx) {
  const o = outfits[idx] || {};
  // Migrate legacy single imgData → images array
  let images = o.images || [];
  if (!images.length && o.imgData) images = [{ data: o.imgData, caption: '' }];

  return `
    <div class="profile-row"><label>Name</label><input type="text" id="oa-name" value="${esc(o.name||'')}" placeholder="Outfit name..."></div>
    <div style="margin:6px 0">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:5px">
        <label style="font-size:10px;color:var(--av-text-muted)">Images (${images.length})</label>
        <button id="oa-img-add" style="font-size:10px;padding:1px 8px;border-radius:999px;background:var(--av-bg-surface);border:1px solid var(--av-border);cursor:pointer;color:var(--av-text-secondary)">＋ Add</button>
      </div>
      <div id="oa-img-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(90px,1fr));gap:6px">
        ${images.map((img, ii) => `
          <div class="oa-img-item" data-ii="${ii}" style="position:relative;border-radius:var(--av-radius-md);overflow:hidden;border:1px solid var(--av-border);background:var(--av-bg-surface)">
            <img src="${img.data}" style="width:100%;height:80px;object-fit:cover;display:block;cursor:pointer" class="oa-img-preview" data-ii="${ii}">
            <button class="oa-img-del" data-ii="${ii}" style="
              position:absolute;top:2px;right:2px;width:16px;height:16px;
              background:rgba(0,0,0,.6);color:#fff;border:none;border-radius:50%;
              cursor:pointer;font-size:9px;line-height:1;display:flex;align-items:center;justify-content:center">×</button>
            <input class="oa-img-caption" data-ii="${ii}" value="${esc(img.caption||'')}" placeholder="Caption..."
              style="width:100%;font-size:9px;padding:2px 4px;border:none;border-top:1px solid var(--av-border);background:var(--av-bg-surface);color:var(--av-text-secondary);box-sizing:border-box">
          </div>
        `).join('')}
        ${images.length === 0 ? `<div style="font-size:11px;color:var(--av-text-muted);font-style:italic;padding:4px 0;grid-column:1/-1">No images yet</div>` : ''}
      </div>
    </div>
    <div class="profile-row"><label>Description</label><textarea id="oa-desc" style="flex:1;min-height:52px;padding:5px;font-size:12px" placeholder="Describe the outfit...">${esc(o.desc||'')}</textarea></div>
  `;
}

function _wireOutfit(nodeId, idx) {
  const body = document.getElementById('outfit-slot-body');
  if (!body) return;

  body.querySelector('#oa-name')?.addEventListener('input', e => _saveOutfitField(nodeId, idx, 'name', e.target.value));
  body.querySelector('#oa-desc')?.addEventListener('input', e => _saveOutfitField(nodeId, idx, 'desc', e.target.value));

  // Add image button
  body.querySelector('#oa-img-add')?.addEventListener('click', async () => {
    const fp = await window.api?.openMedia?.();
    if (!fp || !/\.(png|jpe?g|gif|webp|svg)$/i.test(fp)) return;
    const b64 = await window.api?.fsReadBinary?.(fp);
    if (!b64) return;
    const ext = fp.split('.').pop().toLowerCase();
    const mime = ext === 'svg' ? 'image/svg+xml' : ext === 'gif' ? 'image/gif' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
    const ap = getOrCreateProfile(nodeId).appearance || {};
    const outfits = ap.outfits || {};
    const o = outfits[idx] || {};
    let images = o.images || [];
    if (!images.length && o.imgData) images = [{ data: o.imgData, caption: '' }];
    images.push({ data: `data:${mime};base64,${b64}`, caption: '' });
    _saveOutfitField(nodeId, idx, 'images', images);
    _saveOutfitField(nodeId, idx, 'imgData', '');
    body.innerHTML = _outfitSlotHTML(getOrCreateProfile(nodeId).appearance?.outfits || {}, idx);
    _wireOutfit(nodeId, idx);
  });

  // Delete image
  body.querySelectorAll('.oa-img-del').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const ii = parseInt(btn.dataset.ii);
      const ap = getOrCreateProfile(nodeId).appearance || {};
      const outfits = ap.outfits || {};
      const o = outfits[idx] || {};
      let images = o.images || [];
      if (!images.length && o.imgData) images = [{ data: o.imgData, caption: '' }];
      images.splice(ii, 1);
      _saveOutfitField(nodeId, idx, 'images', images);
      _saveOutfitField(nodeId, idx, 'imgData', '');
      body.innerHTML = _outfitSlotHTML(getOrCreateProfile(nodeId).appearance?.outfits || {}, idx);
      _wireOutfit(nodeId, idx);
    });
  });

  // Caption edit
  body.querySelectorAll('.oa-img-caption').forEach(input => {
    input.addEventListener('input', () => {
      const ii = parseInt(input.dataset.ii);
      const ap = getOrCreateProfile(nodeId).appearance || {};
      const outfits = ap.outfits || {};
      const o = outfits[idx] || {};
      let images = o.images ? [...o.images] : (o.imgData ? [{ data: o.imgData, caption: '' }] : []);
      if (images[ii]) { images[ii] = { ...images[ii], caption: input.value }; }
      _saveOutfitField(nodeId, idx, 'images', images);
    });
  });

  // Preview image on click (open full)
  body.querySelectorAll('.oa-img-preview').forEach(img => {
    img.addEventListener('click', () => {
      const w = window.open('', '_blank', 'width=800,height=600');
      if (w) { w.document.write(`<body style="margin:0;background:#000"><img src="${img.src}" style="max-width:100%;max-height:100vh;display:block;margin:auto"></body>`); }
    });
  });
}

function _saveOutfitField(nodeId, idx, field, value) {
  const ap = getOrCreateProfile(nodeId).appearance || {};
  const outfits = ap.outfits || {};
  outfits[idx] = { ...(outfits[idx]||{}), [field]: value };
  updateProfile(nodeId, { appearance: { ...ap, outfits } });
}
