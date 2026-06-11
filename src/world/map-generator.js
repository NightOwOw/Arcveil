// map-generator.js — Fantasy map generation: seeded RNG, continent shape, region flood-fill, rivers.
// Pure algorithm, no DOM. Export: generateMap(config) → mapData object.

const CHAIKIN = { smooth: 4, jagged: 1, 'island-heavy': 2 };

export function generateMap(cfg) {
  const {
    seed = Date.now() | 0,
    sizeKey = 'large',
    regions: defs = [],
    includeRivers = false,
    includeProvinces = false,
    coastlineStyle = 'jagged',
  } = cfg;

  const DIMS = { small: [52, 40], medium: [72, 54], large: [92, 70] };
  const [W, H] = DIMS[sizeKey] || DIMS.large;
  const rng = _mkRng(seed);

  // 1. Continent polygon (perturbed circle + Chaikin smoothing)
  const N = 40;
  const cx = W / 2, cy = H / 2;
  const baseR = Math.min(W, H) * (coastlineStyle === 'island-heavy' ? 0.29 : 0.38);
  let poly = Array.from({ length: N }, (_, i) => {
    const a = (i / N) * 2 * Math.PI;
    const noise = coastlineStyle === 'smooth' ? 0.85 + rng() * 0.28 : 0.62 + rng() * 0.76;
    return { x: cx + baseR * noise * Math.cos(a), y: cy + baseR * noise * Math.sin(a) };
  });
  for (let s = 0; s < (CHAIKIN[coastlineStyle] ?? 1); s++) {
    const nx = [];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      nx.push({ x: .75*a.x + .25*b.x, y: .75*a.y + .25*b.y });
      nx.push({ x: .25*a.x + .75*b.x, y: .25*a.y + .75*b.y });
    }
    poly = nx;
  }

  // 2. Grid cells
  const cells = [];
  for (let row = 0; row < H; row++)
    for (let col = 0; col < W; col++)
      cells.push({ id: row*W+col, col, row, isLand: _pip(col+.5, row+.5, poly), regionId: null });

  const land = cells.filter(c => c.isLand);
  if (!land.length) return { seed, width: W, height: H, cells, regions: [], rivers: [], provinces: [] };

  // 3. Normalise region sizes
  const total = defs.reduce((s, r) => s + (parseFloat(r.sizePercent) || 10), 0);
  const regions = defs.map(r => ({
    ...r,
    id: r.id || _rid(rng),
    normPct: (parseFloat(r.sizePercent) || 10) / total,
  }));

  // 4. Competitive flood-fill — one seed cell per region near position hint
  const used = new Set();
  const queues = regions.map(r => {
    const hint = _hintXY(r.positionHint || 'random', W, H, rng);
    let best = null, bestD = Infinity;
    for (const c of land) {
      if (used.has(c.id)) continue;
      const d = (c.col - hint.x) ** 2 + (c.row - hint.y) ** 2;
      if (d < bestD) { bestD = d; best = c; }
    }
    if (!best) best = land[Math.floor(rng() * land.length)];
    used.add(best.id);
    best.regionId = r.id;
    return { rid: r.id, target: Math.ceil(land.length * r.normPct), count: 1, q: [best] };
  });

  // Interleaved BFS with light randomisation for organic borders
  let anyActive = true;
  while (anyActive) {
    anyActive = false;
    for (const qe of queues) {
      if (!qe.q.length || qe.count >= qe.target) continue;
      if (qe.q.length > 1 && rng() < 0.4) {
        const j = 1 + Math.floor(rng() * Math.min(6, qe.q.length-1));
        [qe.q[0], qe.q[j]] = [qe.q[j], qe.q[0]];
      }
      const cell = qe.q.shift();
      for (const nb of _nbrs(cell.col, cell.row, W, H, cells)) {
        if (nb.regionId !== null || !nb.isLand) continue;
        nb.regionId = qe.rid; qe.count++;
        qe.q.push(nb);
        if (qe.count >= qe.target) break;
      }
      anyActive = true;
    }
  }
  land.forEach(c => { if (c.regionId === null) c.regionId = '__wild__'; });

  // 5. Centroids & cell counts
  const byRegion = {};
  regions.forEach(r => { byRegion[r.id] = []; });
  byRegion['__wild__'] = [];
  land.forEach(c => { (byRegion[c.regionId] || (byRegion[c.regionId] = [])).push(c); });

  const finalRegions = regions.map(r => {
    const rc = byRegion[r.id] || [];
    const cen = rc.length
      ? { x: rc.reduce((s, c) => s + c.col, 0) / rc.length, y: rc.reduce((s, c) => s + c.row, 0) / rc.length }
      : { x: W / 2, y: H / 2 };
    return { ...r, centroid: cen, cellCount: rc.length };
  });

  // 6. Optional rivers
  const rivers = includeRivers ? _mkRivers(cells, land, W, H, rng) : [];

  // 7. Optional provinces
  const provinces = includeProvinces ? _mkProvinces(finalRegions, byRegion, rng) : [];

  return { seed, width: W, height: H, cells, regions: finalRegions, rivers, provinces };
}

// ── Private helpers ──────────────────────────────────────────────────────────

function _mkRng(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    s += 0x6D2B79F5;
    let t = Math.imul(s ^ (s >>> 15), s | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function _rid(rng) { return Math.floor(rng() * 0xFFFFFF).toString(16).padStart(6, '0'); }

function _pip(px, py, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const { x: xi, y: yi } = poly[i], { x: xj, y: yj } = poly[j];
    if (((yi > py) !== (yj > py)) && px < (xj - xi) * (py - yi) / (yj - yi) + xi)
      inside = !inside;
  }
  return inside;
}

function _nbrs(col, row, W, H, cells) {
  const out = [];
  if (col > 0)   out.push(cells[row*W + col-1]);
  if (col < W-1) out.push(cells[row*W + col+1]);
  if (row > 0)   out.push(cells[(row-1)*W + col]);
  if (row < H-1) out.push(cells[(row+1)*W + col]);
  return out;
}

function _hintXY(hint, W, H, rng) {
  const m = 0.1;
  const ZX = { north:[.3,.7], south:[.3,.7], east:[.62,.9], west:[m,.38], center:[.35,.65],
                northeast:[.6,.9], northwest:[m,.4], southeast:[.6,.9], southwest:[m,.4],
                'north-coast':[.2,.8], 'south-coast':[.2,.8], island:[.1,.9], random:[m,1-m] };
  const ZY = { north:[m,.38], south:[.62,1-m], east:[.3,.7], west:[.3,.7], center:[.35,.65],
                northeast:[m,.4], northwest:[m,.4], southeast:[.6,.9], southwest:[.6,.9],
                'north-coast':[m,.22], 'south-coast':[.78,1-m], island:[.1,.9], random:[m,1-m] };
  const zx = ZX[hint] || ZX.random, zy = ZY[hint] || ZY.random;
  return { x: (zx[0] + rng()*(zx[1]-zx[0]))*W, y: (zy[0] + rng()*(zy[1]-zy[0]))*H };
}

function _mkRivers(cells, land, W, H, rng) {
  const rivers = [];
  const interior = land.filter(c => _nbrs(c.col, c.row, W, H, cells).every(n => n.isLand));
  const used = new Set();
  for (let ri = 0; ri < 4 && interior.length; ri++) {
    const si = Math.floor(rng() * interior.length);
    const start = interior.splice(si, 1)[0];
    if (used.has(start.id)) continue;
    const pts = [{ x: start.col+.5, y: start.row+.5 }];
    const vis = new Set([start.id]);
    let cur = start;
    for (let step = 0; step < 100; step++) {
      const nbs = _nbrs(cur.col, cur.row, W, H, cells).filter(n => !vis.has(n.id));
      if (!nbs.length) break;
      nbs.sort((a, b) => _nbrs(a.col, a.row, W, H, cells).filter(n => n.isLand).length
                       - _nbrs(b.col, b.row, W, H, cells).filter(n => n.isLand).length);
      const next = nbs[0];
      vis.add(next.id); pts.push({ x: next.col+.5, y: next.row+.5 }); cur = next;
      if (!cur.isLand) break;
    }
    if (pts.length >= 8) { rivers.push({ id: _rid(rng), name: '', points: pts }); used.add(start.id); }
  }
  return rivers;
}

function _mkProvinces(regions, byRegion, rng) {
  const SFX = ['North','South','East','West','Upper','Lower','Inner','Outer','Old','New'];
  return regions.flatMap(r => {
    const rc = byRegion[r.id] || [];
    if (rc.length < 30) return [];
    return [0, 1].map(pi => {
      const batch = rc.slice(pi * Math.floor(rc.length/3), (pi+1) * Math.floor(rc.length/3));
      if (!batch.length) return null;
      return {
        id: _rid(rng), parentId: r.id,
        name: SFX[Math.floor(rng()*SFX.length)] + ' ' + r.name,
        centroid: { x: batch.reduce((s,c)=>s+c.col,0)/batch.length, y: batch.reduce((s,c)=>s+c.row,0)/batch.length },
      };
    }).filter(Boolean);
  });
}
