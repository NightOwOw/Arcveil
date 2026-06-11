// timeline.js — Story Structure: timeline, arcs, beats, scenes
import { state, EventBus, esc, uid, saveHistory } from '../state.js';

export function renderStoryView() { initStory(); }

export function initStory() {
  const view = document.getElementById('view-story');
  if (!view) return;
  _render(view);
}

function _render(view) {
  const story = state.story;
  const activeTab = view.dataset.tab || 'timeline';

  view.innerHTML = `
    <div style="display:flex;flex-direction:column;height:100%">
      <div style="padding:0 16px;border-bottom:1px solid var(--av-border);display:flex;gap:2px;flex-shrink:0;background:var(--av-bg-secondary)">
        ${['timeline','arcs','beats','scenes','promises'].map(t => `
          <div class="story-tab${activeTab===t?' active':''}" data-tab="${t}" style="padding:10px 14px;font-size:12px;font-weight:600;cursor:pointer;border-bottom:2px solid ${activeTab===t?'var(--av-accent)':'transparent'};color:${activeTab===t?'var(--av-accent)':'var(--av-text-muted)'}">${_tabLabel(t)}</div>
        `).join('')}
      </div>
      <div id="story-body" style="flex:1;overflow-y:auto;padding:16px"></div>
    </div>
  `;

  view.querySelectorAll('.story-tab').forEach(el => {
    el.addEventListener('click', () => { view.dataset.tab = el.dataset.tab; _render(view); });
  });

  const body = document.getElementById('story-body');
  switch (activeTab) {
    case 'timeline': _renderTimeline(body, story); break;
    case 'arcs':     _renderArcs(body, story); break;
    case 'beats':    _renderBeats(body, story); break;
    case 'scenes':   _renderScenes(body, story); break;
    case 'promises': _renderPromises(body, story); break;
  }
}

// ── Timeline ─────────────────────────────────────────────────────────────────

function _renderTimeline(body, story) {
  const events = story.timeline || [];
  body.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px">
      <h3 style="font-size:14px;font-weight:700;flex:1">Story Timeline</h3>
      <button class="btn-primary" id="add-event" style="padding:5px 14px;font-size:12px">✦ Add Event</button>
    </div>
    <div id="timeline-list">
      ${events.length ? events.map((e,i) => _eventRow(e,i)).join('') :
        '<div style="text-align:center;color:var(--av-text-muted);font-size:12px;padding:40px">No events yet. Add your first story event.</div>'}
    </div>
  `;

  document.getElementById('add-event')?.addEventListener('click', () => {
    story.timeline = story.timeline || [];
    story.timeline.push({ id: uid(), title: 'New Event', when: '', type: 'event', desc: '' });
    _renderTimeline(body, story);
    saveHistory();
  });

  body.querySelectorAll('.ev-del').forEach(btn => {
    btn.onclick = () => { story.timeline.splice(+btn.dataset.i, 1); _renderTimeline(body, story); saveHistory(); };
  });
  let _storyDirtyTimer = null;
  body.querySelectorAll('.ev-title,.ev-when,.ev-type,.ev-desc').forEach(el => {
    el.addEventListener('input', e => {
      const i = +el.dataset.i;
      const field = el.classList.contains('ev-title')?'title':el.classList.contains('ev-when')?'when':el.classList.contains('ev-type')?'type':'desc';
      story.timeline[i][field] = e.target.value;
      clearTimeout(_storyDirtyTimer); _storyDirtyTimer = setTimeout(saveHistory, 1500);
    });
  });
}

function _eventRow(ev, i) {
  const TYPES = ['event','battle','revelation','turning-point','backstory','epilogue'];
  const TYPE_COLORS = { event:'#7c5cbf', battle:'#e74c3c', revelation:'#f39c12', 'turning-point':'#2ecc71', backstory:'#3498db', epilogue:'#888' };
  const col = TYPE_COLORS[ev.type] || '#888';
  return `<div style="display:flex;gap:10px;margin-bottom:10px;align-items:flex-start">
    <div style="width:4px;border-radius:2px;background:${col};flex-shrink:0;min-height:60px;margin-top:6px"></div>
    <div style="flex:1;background:var(--av-bg-elevated);border:1px solid var(--av-border);border-radius:var(--av-radius-md);padding:10px">
      <div style="display:flex;gap:6px;margin-bottom:6px">
        <input class="ev-title" data-i="${i}" value="${esc(ev.title||'')}" placeholder="Event title..." style="flex:1;padding:4px 7px;font-size:13px;font-weight:600;border-radius:var(--av-radius-sm)">
        <input class="ev-when" data-i="${i}" value="${esc(ev.when||'')}" placeholder="When..." style="width:90px;padding:4px 7px;font-size:11px;border-radius:var(--av-radius-sm)">
        <select class="ev-type" data-i="${i}" style="font-size:11px;padding:3px 5px;border-radius:var(--av-radius-sm)">
          ${TYPES.map(t=>`<option value="${t}" ${ev.type===t?'selected':''}>${t}</option>`).join('')}
        </select>
        <button class="btn-sm ev-del" data-i="${i}">✕</button>
      </div>
      <textarea class="ev-desc" data-i="${i}" placeholder="Description..." style="width:100%;min-height:44px;border:1px solid var(--av-border);border-radius:var(--av-radius-sm);padding:5px;font-size:11px;resize:vertical;background:var(--av-input-bg);color:var(--av-text-primary)">${esc(ev.desc||'')}</textarea>
    </div>
  </div>`;
}

// ── Arcs ─────────────────────────────────────────────────────────────────────

function _renderArcs(body, story) {
  const arcs = story.arcs || [];
  body.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px">
      <h3 style="font-size:14px;font-weight:700;flex:1">Story Arcs</h3>
      <button class="btn-primary" id="add-arc" style="padding:5px 14px;font-size:12px">✦ Add Arc</button>
    </div>
    <div id="arcs-list">
      ${arcs.map((arc,i) => `
        <div style="background:var(--av-bg-elevated);border:1px solid var(--av-border);border-radius:var(--av-radius-lg);padding:12px;margin-bottom:10px">
          <div style="display:flex;gap:6px;margin-bottom:8px">
            <input class="arc-title" data-i="${i}" value="${esc(arc.title||'')}" placeholder="Arc title..." style="flex:1;padding:5px 8px;font-size:13px;font-weight:600;border-radius:var(--av-radius-sm)">
            <input type="color" class="arc-color" data-i="${i}" value="${arc.color||'#7c5cbf'}" style="width:32px;height:30px;padding:2px;border-radius:4px">
            <button class="btn-sm arc-del" data-i="${i}">✕</button>
          </div>
          <textarea class="arc-desc" data-i="${i}" placeholder="What is this arc about? What is the central conflict?" style="width:100%;min-height:64px;border:1px solid var(--av-border);border-radius:var(--av-radius-sm);padding:6px;font-size:12px;resize:vertical;background:var(--av-input-bg);color:var(--av-text-primary)">${esc(arc.desc||'')}</textarea>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:8px">
            <div><div style="font-size:10px;color:var(--av-text-muted);margin-bottom:3px">Setup</div>
              <textarea class="arc-setup" data-i="${i}" style="width:100%;min-height:52px;border:1px solid var(--av-border);border-radius:4px;padding:4px;font-size:11px;resize:vertical;background:var(--av-input-bg);color:var(--av-text-primary)">${esc(arc.setup||'')}</textarea></div>
            <div><div style="font-size:10px;color:var(--av-text-muted);margin-bottom:3px">Confrontation</div>
              <textarea class="arc-conf" data-i="${i}" style="width:100%;min-height:52px;border:1px solid var(--av-border);border-radius:4px;padding:4px;font-size:11px;resize:vertical;background:var(--av-input-bg);color:var(--av-text-primary)">${esc(arc.confrontation||'')}</textarea></div>
            <div><div style="font-size:10px;color:var(--av-text-muted);margin-bottom:3px">Resolution</div>
              <textarea class="arc-res" data-i="${i}" style="width:100%;min-height:52px;border:1px solid var(--av-border);border-radius:4px;padding:4px;font-size:11px;resize:vertical;background:var(--av-input-bg);color:var(--av-text-primary)">${esc(arc.resolution||'')}</textarea></div>
          </div>
        </div>
      `).join('')}
    </div>
  `;

  document.getElementById('add-arc')?.addEventListener('click', () => {
    story.arcs = story.arcs || [];
    story.arcs.push({ id: uid(), title: 'New Arc', color: '#7c5cbf', desc: '', setup: '', confrontation: '', resolution: '' });
    _renderArcs(body, story);
    saveHistory();
  });

  body.querySelectorAll('.arc-del').forEach(btn => {
    btn.onclick = () => { story.arcs.splice(+btn.dataset.i, 1); _renderArcs(body, story); saveHistory(); };
  });
  const wireArc = (cls, field) => body.querySelectorAll(`.${cls}`).forEach(el => {
    el.addEventListener('input', e => { story.arcs[+el.dataset.i][field] = e.target.value; });
  });
  wireArc('arc-title','title'); wireArc('arc-color','color'); wireArc('arc-desc','desc');
  wireArc('arc-setup','setup'); wireArc('arc-conf','confrontation'); wireArc('arc-res','resolution');
}

// ── Beats ─────────────────────────────────────────────────────────────────────

const BEAT_SHEET = [
  { key:'opening',     label:'Opening Image',     pct:1,  desc:'A snapshot of the hero\'s world before the adventure begins.' },
  { key:'theme',       label:'Theme Stated',       pct:5,  desc:'The thematic argument of the story stated (often by a secondary character).' },
  { key:'setup',       label:'Set-Up',             pct:10, desc:'Introduce protagonist, flaws, and the world that needs to change.' },
  { key:'catalyst',    label:'Catalyst',           pct:12, desc:'Something happens that disrupts the status quo.' },
  { key:'debate',      label:'Debate',             pct:25, desc:'Hero resists the call to change. Should I go or not?' },
  { key:'break1',      label:'Break into Two',     pct:25, desc:'Hero makes an active choice and enters Act Two.' },
  { key:'bfun',        label:'B Story / Fun',      pct:30, desc:'New characters/romance introduce theme. "Fun and games" — the promise of the premise.' },
  { key:'midpoint',    label:'Midpoint',           pct:50, desc:'False victory or false defeat. Stakes rise.' },
  { key:'badguys',     label:'Bad Guys Close In',  pct:55, desc:'The opposition tightens. Internal conflicts deepen.' },
  { key:'allislost',   label:'All Is Lost',        pct:75, desc:'The lowest point. Opposite of the opening image.' },
  { key:'dark',        label:'Dark Night of Soul', pct:75, desc:'Hero digs deep. What did they learn? Eureka moment.' },
  { key:'break3',      label:'Break into Three',   pct:75, desc:'Hero finds solution using B story/theme.' },
  { key:'finale',      label:'Finale',             pct:90, desc:'Hero executes new plan. World is transformed.' },
  { key:'closing',     label:'Closing Image',      pct:99, desc:'Mirror of the opening image — shows how much changed.' },
];

function _renderBeats(body, story) {
  const beats = story.beats || {};
  body.innerHTML = `
    <div style="margin-bottom:16px">
      <h3 style="font-size:14px;font-weight:700;margin-bottom:4px">Beat Sheet</h3>
      <div style="font-size:11px;color:var(--av-text-muted)">Based on Blake Snyder's Save the Cat structure. Fill in each beat to map your story.</div>
    </div>
    <div style="background:var(--av-bg-elevated);border-radius:var(--av-radius-md);padding:4px;margin-bottom:16px;height:16px;position:relative;border:1px solid var(--av-border)">
      ${BEAT_SHEET.map(b => `<div style="position:absolute;left:${b.pct}%;top:0;bottom:0;width:2px;background:var(--av-accent);opacity:.4" title="${b.label}"></div>`).join('')}
      <div style="position:absolute;inset:0;display:flex;align-items:center;padding:0 6px;font-size:9px;color:var(--av-text-muted)">
        Act 1 ···· Act 2A ···· Midpoint ···· Act 2B ···· Act 3
      </div>
    </div>
    ${BEAT_SHEET.map(b => `
      <div style="background:var(--av-bg-elevated);border:1px solid var(--av-border);border-radius:var(--av-radius-md);padding:10px;margin-bottom:8px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">
          <div style="font-size:10px;font-weight:700;color:var(--av-accent);min-width:28px">${b.pct}%</div>
          <div style="font-size:12px;font-weight:700;color:var(--av-text-primary)">${b.label}</div>
          <div style="font-size:10px;color:var(--av-text-muted);flex:1">${b.desc}</div>
        </div>
        <textarea class="beat-text" data-key="${b.key}" placeholder="What happens at this beat in your story?" style="width:100%;min-height:52px;border:1px solid var(--av-border);border-radius:var(--av-radius-sm);padding:5px 7px;font-size:12px;resize:vertical;background:var(--av-input-bg);color:var(--av-text-primary)">${esc(beats[b.key]||'')}</textarea>
      </div>
    `).join('')}
  `;

  let _beatTimer = null;
  body.querySelectorAll('.beat-text').forEach(el => {
    el.addEventListener('input', e => {
      story.beats = story.beats || {};
      story.beats[el.dataset.key] = e.target.value;
      clearTimeout(_beatTimer); _beatTimer = setTimeout(saveHistory, 1500);
    });
  });
}

// ── Scenes ────────────────────────────────────────────────────────────────────

function _renderScenes(body, story) {
  const scenes = story.scenes || [];
  body.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px">
      <h3 style="font-size:14px;font-weight:700;flex:1">Scenes (${scenes.length})</h3>
      <button class="btn-primary" id="add-scene" style="padding:5px 14px;font-size:12px">✦ Add Scene</button>
    </div>
    <div id="scene-list">
      ${scenes.map((sc,i) => `
        <div style="display:flex;gap:8px;margin-bottom:6px;background:var(--av-bg-elevated);border:1px solid var(--av-border);border-radius:var(--av-radius-md);padding:8px 10px;align-items:flex-start">
          <div style="font-size:11px;font-weight:700;color:var(--av-text-muted);min-width:24px;margin-top:6px">${i+1}</div>
          <div style="flex:1">
            <input class="sc-title" data-i="${i}" value="${esc(sc.title||'')}" placeholder="Scene title..." style="width:100%;margin-bottom:5px;padding:4px 7px;font-size:12px;font-weight:600;border-radius:var(--av-radius-sm)">
            <div style="display:flex;gap:6px">
              <input class="sc-loc" data-i="${i}" value="${esc(sc.location||'')}" placeholder="Location..." style="flex:1;padding:3px 6px;font-size:11px;border-radius:var(--av-radius-sm)">
              <select class="sc-pov" data-i="${i}" style="font-size:11px;padding:3px 5px;border-radius:var(--av-radius-sm)">
                <option value="">POV —</option>
                ${state.nodes.filter(n=>n.type==='character').map(c=>`<option value="${c.id}" ${sc.pov===c.id?'selected':''}>${c.name}</option>`).join('')}
              </select>
              <button class="btn-sm sc-del" data-i="${i}">✕</button>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `;

  document.getElementById('add-scene')?.addEventListener('click', () => {
    story.scenes = story.scenes || [];
    story.scenes.push({ id: uid(), title: 'New Scene', location: '', pov: '' });
    _renderScenes(body, story);
    saveHistory();
  });
  body.querySelectorAll('.sc-del').forEach(btn => {
    btn.onclick = () => { story.scenes.splice(+btn.dataset.i, 1); _renderScenes(body, story); saveHistory(); };
  });
  body.querySelectorAll('.sc-title,.sc-loc,.sc-pov').forEach(el => {
    el.addEventListener('input', e => {
      const i = +el.dataset.i;
      const f = el.classList.contains('sc-title')?'title':el.classList.contains('sc-loc')?'location':'pov';
      story.scenes[i][f] = e.target.value;
    });
  });
}

// ── Promises ──────────────────────────────────────────────────────────────────

function _renderPromises(body, story) {
  const promises = story.promises || [];
  body.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
      <h3 style="font-size:14px;font-weight:700;flex:1">Promises &amp; Payoffs</h3>
      <button class="btn-primary" id="add-promise" style="padding:5px 14px;font-size:12px">✦ Add</button>
    </div>
    <div style="font-size:11px;color:var(--av-text-muted);margin-bottom:14px">Every promise to the reader must be paid off. Track them here.</div>
    <div id="promise-list">
      ${promises.map((p,i) => `
        <div style="background:var(--av-bg-elevated);border:1px solid var(--av-border);border-radius:var(--av-radius-md);padding:10px;margin-bottom:8px">
          <div style="display:flex;gap:6px;margin-bottom:6px">
            <input class="pr-promise" data-i="${i}" value="${esc(p.promise||'')}" placeholder="The promise made (setup)..." style="flex:1;padding:4px 7px;font-size:12px;border-radius:var(--av-radius-sm)">
            <select class="pr-status" data-i="${i}" style="font-size:11px;padding:3px 5px;border-radius:var(--av-radius-sm)">
              ${['pending','paid-off','broken'].map(s=>`<option value="${s}" ${p.status===s?'selected':''}>${s}</option>`).join('')}
            </select>
            <button class="btn-sm pr-del" data-i="${i}">✕</button>
          </div>
          <input class="pr-payoff" data-i="${i}" value="${esc(p.payoff||'')}" placeholder="The payoff (resolution)..." style="width:100%;padding:4px 7px;font-size:12px;border-radius:var(--av-radius-sm)">
        </div>
      `).join('')}
    </div>
  `;

  document.getElementById('add-promise')?.addEventListener('click', () => {
    story.promises = story.promises || [];
    story.promises.push({ id: uid(), promise: '', payoff: '', status: 'pending' });
    _renderPromises(body, story);
    saveHistory();
  });
  body.querySelectorAll('.pr-del').forEach(btn => {
    btn.onclick = () => { story.promises.splice(+btn.dataset.i, 1); _renderPromises(body, story); saveHistory(); };
  });
  body.querySelectorAll('.pr-promise,.pr-payoff,.pr-status').forEach(el => {
    el.addEventListener('input', e => {
      const i = +el.dataset.i;
      const f = el.classList.contains('pr-promise')?'promise':el.classList.contains('pr-payoff')?'payoff':'status';
      story.promises[i][f] = e.target.value;
    });
  });
}

function _tabLabel(t) {
  return { timeline:'Timeline', arcs:'Arcs', beats:'Beat Sheet', scenes:'Scenes', promises:'Promises' }[t] || t;
}
