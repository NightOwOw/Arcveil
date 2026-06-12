// ============================================
// timeline.js — Story Structure: full planning suite
// Tabs: Overview | Timeline | Arcs | Beats | Scenes | Subplots | Promises
// ============================================

import { state, EventBus, esc, uid, saveHistory } from '../state.js';

export function renderStoryView() { initStory(); }

export function initStory() {
  const view = document.getElementById('view-story');
  if (!view) return;
  _render(view);
  EventBus.off('project:loaded', () => _render(view));
  EventBus.on('project:loaded', () => _render(view));
}

const TABS = ['overview','timeline','arcs','beats','scenes','subplots','promises'];
const TAB_LABELS = { overview:'Overview', timeline:'Timeline', arcs:'Arcs', beats:'Beats', scenes:'Scenes', subplots:'Subplots', promises:'Promises' };

function _render(view) {
  const active = view.dataset.tab || 'overview';
  view.innerHTML = `
    <div style="display:flex;flex-direction:column;height:100%">
      <div style="padding:0 16px;border-bottom:1px solid var(--av-border);display:flex;gap:0;flex-shrink:0;background:var(--av-bg-secondary);overflow-x:auto">
        ${TABS.map(t => `
          <div class="story-tab" data-tab="${t}" style="
            padding:10px 14px;font-size:11.5px;font-weight:600;cursor:pointer;white-space:nowrap;
            border-bottom:2px solid ${active===t?'var(--av-accent)':'transparent'};
            color:${active===t?'var(--av-accent)':'var(--av-text-muted)'};
            transition:color .15s;
          ">${TAB_LABELS[t]}</div>
        `).join('')}
      </div>
      <div id="story-body" style="flex:1;overflow-y:auto;padding:16px"></div>
    </div>
  `;
  view.querySelectorAll('.story-tab').forEach(el => {
    el.addEventListener('click', () => { view.dataset.tab = el.dataset.tab; _render(view); });
  });
  const body = document.getElementById('story-body');
  const s = state.story;
  switch (active) {
    case 'overview':  _renderOverview(body, s);  break;
    case 'timeline':  _renderTimeline(body, s);  break;
    case 'arcs':      _renderArcs(body, s);      break;
    case 'beats':     _renderBeats(body, s);     break;
    case 'scenes':    _renderScenes(body, s);    break;
    case 'subplots':  _renderSubplots(body, s);  break;
    case 'promises':  _renderPromises(body, s);  break;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function _inp(cls, di, val, ph, style='') {
  return `<input class="${cls}" data-i="${di}" value="${esc(val)}" placeholder="${ph}" style="${style}">`;
}
function _debounce(fn, ms=1400) {
  let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}
const _save = _debounce(saveHistory);

function _charOptions(selId='') {
  return state.nodes.filter(n=>n.type==='character').map(c =>
    `<option value="${c.id}" ${selId===c.id?'selected':''}>${esc(c.name)}</option>`).join('');
}
function _arcOptions(selId='') {
  return (state.story.arcs||[]).map(a =>
    `<option value="${a.id}" ${selId===a.id?'selected':''}>${esc(a.title||'Untitled')}</option>`).join('');
}

const SC_STATUS = { planned:'#8888a0', drafting:'#f4a97c', drafted:'#2d8cf0', revised:'#7c5cbf', final:'#3aaf85' };
const SC_STATUS_LABELS = { planned:'Planned', drafting:'Drafting', drafted:'Drafted', revised:'Revised', final:'Final' };

// ── Overview ─────────────────────────────────────────────────────────────────

function _renderOverview(body, s) {
  s.conflict = s.conflict || {};
  s.theme    = s.theme    || {};
  s.theme.motifs = s.theme.motifs || [];

  body.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">

      <!-- Conflict & Stakes -->
      <div style="background:var(--av-bg-elevated);border:1px solid var(--av-border);border-radius:var(--av-radius-lg);padding:14px">
        <div style="font-size:13px;font-weight:700;color:var(--av-text-primary);margin-bottom:12px">⚔ Conflict &amp; Stakes</div>
        ${_ovField('Central conflict',   'ov-central',   s.conflict.central||'',   'What is the story fundamentally about?', true)}
        ${_ovField('Internal conflict',  'ov-internal',  s.conflict.internal||'',  'The protagonist\'s inner struggle', true)}
        ${_ovField('External conflict',  'ov-external',  s.conflict.external||'',  'The antagonistic force / situation', true)}
        ${_ovField('What\'s at stake',   'ov-stakes',    s.conflict.stakes||'',    'What does the protagonist lose if they fail?', true)}
        ${_ovField('Ticking clock',      'ov-clock',     s.conflict.clock||'',     'Optional urgency / deadline', false)}
      </div>

      <!-- Theme & Motifs -->
      <div style="background:var(--av-bg-elevated);border:1px solid var(--av-border);border-radius:var(--av-radius-lg);padding:14px">
        <div style="font-size:13px;font-weight:700;color:var(--av-text-primary);margin-bottom:12px">◎ Theme &amp; Motifs</div>
        ${_ovField('Theme statement',  'ov-theme-stmt', s.theme.statement||'', 'What is this story saying about the world?', true)}
        ${_ovField('Central question', 'ov-theme-q',    s.theme.question||'',  'The dramatic question the story must answer', false)}
        <div style="margin-top:10px">
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--av-text-muted);margin-bottom:6px">Motifs &amp; Symbols</div>
          <div id="motif-list">
            ${(s.theme.motifs).map((m,i) => `
              <div style="display:flex;gap:6px;margin-bottom:5px">
                <input class="motif-sym" data-i="${i}" value="${esc(m.symbol||'')}" placeholder="Symbol..."
                  style="width:90px;font-size:11px;padding:3px 6px;border-radius:var(--av-radius-sm)">
                <input class="motif-mean" data-i="${i}" value="${esc(m.meaning||'')}" placeholder="What it represents..."
                  style="flex:1;font-size:11px;padding:3px 6px;border-radius:var(--av-radius-sm)">
                <button class="motif-del btn-sm" data-i="${i}" style="font-size:11px;color:var(--av-danger)">✕</button>
              </div>
            `).join('')}
          </div>
          <button class="btn-sm" id="motif-add" style="font-size:11px;margin-top:4px">+ Motif</button>
        </div>
      </div>

    </div>
  `;

  // Wire conflict fields
  const cf = { 'ov-central':'central','ov-internal':'internal','ov-external':'external','ov-stakes':'stakes','ov-clock':'clock' };
  Object.entries(cf).forEach(([cls,key]) => {
    body.querySelectorAll(`.${cls}`).forEach(el => {
      el.addEventListener('input', e => { s.conflict[key] = e.target.value; _save(); });
    });
  });

  // Wire theme fields
  body.querySelector('.ov-theme-stmt')?.addEventListener('input', e => { s.theme.statement = e.target.value; _save(); });
  body.querySelector('.ov-theme-q')?.addEventListener('input', e => { s.theme.question = e.target.value; _save(); });

  // Motifs
  body.querySelectorAll('.motif-sym').forEach(el => {
    el.addEventListener('input', e => { s.theme.motifs[+el.dataset.i].symbol = e.target.value; _save(); });
  });
  body.querySelectorAll('.motif-mean').forEach(el => {
    el.addEventListener('input', e => { s.theme.motifs[+el.dataset.i].meaning = e.target.value; _save(); });
  });
  body.querySelectorAll('.motif-del').forEach(btn => {
    btn.addEventListener('click', () => { s.theme.motifs.splice(+btn.dataset.i, 1); saveHistory(); _renderOverview(body, s); });
  });
  document.getElementById('motif-add')?.addEventListener('click', () => {
    s.theme.motifs.push({ symbol:'', meaning:'' }); _renderOverview(body, s);
  });
}

function _ovField(label, cls, val, ph, isTextarea) {
  return `
    <div style="margin-bottom:8px">
      <div style="font-size:10px;font-weight:600;color:var(--av-text-muted);margin-bottom:3px">${label}</div>
      ${isTextarea
        ? `<textarea class="${cls}" placeholder="${ph}" style="width:100%;min-height:44px;font-size:11px;padding:5px 7px;border-radius:var(--av-radius-sm);resize:vertical;border:1px solid var(--av-border);background:var(--av-input-bg);color:var(--av-text-primary)">${esc(val)}</textarea>`
        : `<input class="${cls}" value="${esc(val)}" placeholder="${ph}" style="width:100%;font-size:11px;padding:5px 7px;border-radius:var(--av-radius-sm)">`
      }
    </div>
  `;
}

// ── Timeline ─────────────────────────────────────────────────────────────────

const EV_TYPES = ['event','battle','revelation','turning-point','backstory','epilogue'];
const EV_COLORS = { event:'#7c5cbf', battle:'#e74c3c', revelation:'#f39c12', 'turning-point':'#2ecc71', backstory:'#3498db', epilogue:'#888' };

function _renderTimeline(body, s) {
  const events = s.timeline || [];
  body.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px">
      <h3 style="font-size:14px;font-weight:700;flex:1">Story Timeline</h3>
      <button class="btn-primary" id="add-ev" style="padding:5px 14px;font-size:12px">+ Event</button>
    </div>
    ${events.length ? `
      <div style="background:var(--av-bg-elevated);border:1px solid var(--av-border);border-radius:var(--av-radius-md);height:18px;position:relative;margin-bottom:14px;overflow:hidden">
        ${events.map((e,i) => `<div title="${esc(e.title||'')}" style="position:absolute;left:${Math.round(i/(events.length||1)*100)}%;top:0;bottom:0;width:3px;background:${EV_COLORS[e.type]||'var(--av-accent)'};opacity:.6"></div>`).join('')}
        <div style="position:absolute;inset:0;display:flex;align-items:center;padding:0 8px;font-size:9px;color:var(--av-text-muted);pointer-events:none">
          Beginning ·················· Middle ·················· End
        </div>
      </div>
    ` : ''}
    <div id="ev-list">
      ${events.length ? events.map((e,i) => _evRow(e,i,s)).join('') :
        '<div style="text-align:center;padding:40px;color:var(--av-text-muted);font-size:12px">No events yet.</div>'}
    </div>
  `;
  document.getElementById('add-ev')?.addEventListener('click', () => {
    s.timeline = s.timeline||[]; s.timeline.push({ id:uid(), title:'New Event', when:'', type:'event', desc:'', arcId:'', chars:[] });
    _renderTimeline(body, s); saveHistory();
  });
  _wireTimeline(body, s);
}

function _evRow(ev, i, s) {
  const col = EV_COLORS[ev.type] || '#888';
  return `
    <div class="ev-row" data-i="${i}" style="display:flex;gap:10px;margin-bottom:10px;align-items:flex-start">
      <div style="width:4px;border-radius:2px;background:${col};flex-shrink:0;min-height:60px;margin-top:6px"></div>
      <div style="flex:1;background:var(--av-bg-elevated);border:1px solid var(--av-border);border-radius:var(--av-radius-md);padding:10px">
        <div style="display:flex;gap:6px;margin-bottom:6px;flex-wrap:wrap">
          ${_inp('ev-title',i,ev.title||'','Event title...','flex:1;min-width:120px;padding:4px 7px;font-size:12px;font-weight:600;border-radius:var(--av-radius-sm)')}
          ${_inp('ev-when',i,ev.when||'','When...','width:88px;padding:4px 7px;font-size:11px;border-radius:var(--av-radius-sm)')}
          <select class="ev-type" data-i="${i}" style="font-size:11px;padding:3px 5px;border-radius:var(--av-radius-sm)">
            ${EV_TYPES.map(t=>`<option value="${t}" ${ev.type===t?'selected':''}>${t}</option>`).join('')}
          </select>
          <select class="ev-arc" data-i="${i}" style="font-size:11px;padding:3px 5px;border-radius:var(--av-radius-sm)">
            <option value="">Arc —</option>${_arcOptions(ev.arcId||'')}
          </select>
          <button class="ev-del btn-sm" data-i="${i}" style="color:var(--av-danger)">✕</button>
        </div>
        <textarea class="ev-desc" data-i="${i}" placeholder="Description..." style="width:100%;min-height:44px;border:1px solid var(--av-border);border-radius:var(--av-radius-sm);padding:5px;font-size:11px;resize:vertical;background:var(--av-input-bg);color:var(--av-text-primary)">${esc(ev.desc||'')}</textarea>
        <div style="margin-top:6px;display:flex;align-items:center;gap:6px">
          <span style="font-size:10px;color:var(--av-text-muted)">Characters:</span>
          ${state.nodes.filter(n=>n.type==='character').map(c => `
            <label style="display:flex;align-items:center;gap:3px;font-size:10px;color:var(--av-text-secondary);cursor:pointer">
              <input type="checkbox" class="ev-char-cb" data-i="${i}" data-cid="${c.id}" ${(ev.chars||[]).includes(c.id)?'checked':''}>
              ${esc(c.name)}
            </label>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

function _wireTimeline(body, s) {
  const wire = (cls,field) => body.querySelectorAll(`.${cls}`).forEach(el => {
    el.addEventListener('input', e => { (s.timeline||[])[+el.dataset.i][field] = e.target.value; _save(); });
  });
  wire('ev-title','title'); wire('ev-when','when'); wire('ev-type','type');
  wire('ev-arc','arcId');   wire('ev-desc','desc');
  body.querySelectorAll('.ev-del').forEach(btn => {
    btn.onclick = () => { s.timeline.splice(+btn.dataset.i,1); _renderTimeline(body,s); saveHistory(); };
  });
  body.querySelectorAll('.ev-char-cb').forEach(cb => {
    cb.addEventListener('change', () => {
      const ev = s.timeline[+cb.dataset.i];
      ev.chars = ev.chars || [];
      if (cb.checked) { if (!ev.chars.includes(cb.dataset.cid)) ev.chars.push(cb.dataset.cid); }
      else ev.chars = ev.chars.filter(id => id !== cb.dataset.cid);
      _save();
    });
  });
}

// ── Arcs ─────────────────────────────────────────────────────────────────────

function _renderArcs(body, s) {
  const arcs = s.arcs || [];
  body.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px">
      <h3 style="font-size:14px;font-weight:700;flex:1">Story Arcs (${arcs.length})</h3>
      <button class="btn-primary" id="add-arc" style="padding:5px 14px;font-size:12px">+ Arc</button>
    </div>
    ${arcs.map((arc,i) => `
      <div style="background:var(--av-bg-elevated);border:1px solid var(--av-border);border-left:4px solid ${arc.color||'#7c5cbf'};border-radius:var(--av-radius-lg);padding:12px;margin-bottom:10px">
        <div style="display:flex;gap:6px;margin-bottom:8px;align-items:center">
          ${_inp('arc-title',i,arc.title||'','Arc title...','flex:1;padding:5px 8px;font-size:13px;font-weight:600;border-radius:var(--av-radius-sm)')}
          <select class="arc-status" data-i="${i}" style="font-size:11px;padding:3px 6px;border-radius:var(--av-radius-sm)">
            ${['active','resolved','dropped','planned'].map(s=>`<option value="${s}" ${arc.status===s?'selected':''}>${s}</option>`).join('')}
          </select>
          <input type="color" class="arc-color" data-i="${i}" value="${arc.color||'#7c5cbf'}" style="width:28px;height:28px;padding:2px;border-radius:4px;cursor:pointer">
          <button class="arc-del btn-sm" data-i="${i}" style="color:var(--av-danger)">✕</button>
        </div>
        <textarea class="arc-desc" data-i="${i}" placeholder="What is this arc about? Central conflict?" style="width:100%;min-height:54px;border:1px solid var(--av-border);border-radius:var(--av-radius-sm);padding:6px;font-size:12px;resize:vertical;background:var(--av-input-bg);color:var(--av-text-primary)">${esc(arc.desc||'')}</textarea>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:8px">
          ${['Setup','Confrontation','Resolution'].map((lbl,ci) => {
            const fk = ['setup','confrontation','resolution'][ci];
            return `<div>
              <div style="font-size:10px;color:var(--av-text-muted);margin-bottom:3px">${lbl}</div>
              <textarea class="arc-${fk}" data-i="${i}" style="width:100%;min-height:52px;border:1px solid var(--av-border);border-radius:4px;padding:4px;font-size:11px;resize:vertical;background:var(--av-input-bg);color:var(--av-text-primary)">${esc(arc[fk]||'')}</textarea>
            </div>`;
          }).join('')}
        </div>
        <!-- Characters in this arc -->
        <div style="margin-top:8px;display:flex;align-items:center;gap:6px;flex-wrap:wrap">
          <span style="font-size:10px;color:var(--av-text-muted)">Characters:</span>
          ${state.nodes.filter(n=>n.type==='character').map(c => `
            <label style="display:flex;align-items:center;gap:3px;font-size:10px;color:var(--av-text-secondary);cursor:pointer">
              <input type="checkbox" class="arc-char-cb" data-i="${i}" data-cid="${c.id}" ${(arc.chars||[]).includes(c.id)?'checked':''}>
              ${esc(c.name)}
            </label>
          `).join('')}
        </div>
      </div>
    `).join('')}
  `;

  document.getElementById('add-arc')?.addEventListener('click', () => {
    s.arcs = s.arcs||[]; s.arcs.push({ id:uid(), title:'New Arc', color:'#7c5cbf', desc:'', setup:'', confrontation:'', resolution:'', status:'planned', chars:[] });
    _renderArcs(body, s); saveHistory();
  });

  const wireArc = (cls,field) => body.querySelectorAll(`.${cls}`).forEach(el => {
    el.addEventListener('input', e => { (s.arcs||[])[+el.dataset.i][field] = e.target.value; _save(); });
  });
  wireArc('arc-title','title'); wireArc('arc-color','color'); wireArc('arc-desc','desc');
  wireArc('arc-setup','setup'); wireArc('arc-confrontation','confrontation'); wireArc('arc-resolution','resolution');
  wireArc('arc-status','status');
  body.querySelectorAll('.arc-del').forEach(btn => {
    btn.onclick = () => { s.arcs.splice(+btn.dataset.i,1); _renderArcs(body,s); saveHistory(); };
  });
  body.querySelectorAll('.arc-char-cb').forEach(cb => {
    cb.addEventListener('change', () => {
      const arc = s.arcs[+cb.dataset.i]; arc.chars = arc.chars||[];
      if (cb.checked) { if(!arc.chars.includes(cb.dataset.cid)) arc.chars.push(cb.dataset.cid); }
      else arc.chars = arc.chars.filter(id=>id!==cb.dataset.cid);
      _save();
    });
  });
}

// ── Beats ─────────────────────────────────────────────────────────────────────

const BEAT_TEMPLATES = {
  snyder: { name:"Save the Cat (Snyder)", beats:[
    {key:'opening',    label:'Opening Image',      pct:1,  desc:'A snapshot of the world before the change.'},
    {key:'theme',      label:'Theme Stated',        pct:5,  desc:'The thematic argument stated (often by a secondary character).'},
    {key:'setup',      label:'Set-Up',              pct:10, desc:'Introduce protagonist, flaws, and the world that needs to change.'},
    {key:'catalyst',   label:'Catalyst',            pct:12, desc:'Something happens that disrupts the status quo.'},
    {key:'debate',     label:'Debate',              pct:25, desc:'Hero resists the call. Should I go or not?'},
    {key:'break1',     label:'Break into Two',      pct:25, desc:'Hero makes an active choice and enters Act Two.'},
    {key:'bfun',       label:'Fun &amp; Games',     pct:30, desc:'The promise of the premise. "What if" fully explored.'},
    {key:'midpoint',   label:'Midpoint',            pct:50, desc:'False victory or false defeat. Stakes rise.'},
    {key:'badguys',    label:'Bad Guys Close In',   pct:55, desc:'The opposition tightens. Internal conflicts deepen.'},
    {key:'allislost',  label:'All Is Lost',         pct:75, desc:'The lowest point. Opposite of the opening image.'},
    {key:'dark',       label:'Dark Night of Soul',  pct:75, desc:'Hero digs deep. Eureka moment.'},
    {key:'break3',     label:'Break into Three',    pct:75, desc:'Hero finds the solution.'},
    {key:'finale',     label:'Finale',              pct:90, desc:'New plan executed. World transformed.'},
    {key:'closing',    label:'Closing Image',       pct:99, desc:'Mirror of opening — shows how much changed.'},
  ]},
  hero: { name:"Hero's Journey (Campbell)", beats:[
    {key:'ordinary',   label:'Ordinary World',           pct:5,  desc:"The hero's normal life before the adventure."},
    {key:'call',       label:'Call to Adventure',        pct:10, desc:'A challenge or quest is presented.'},
    {key:'refusal',    label:'Refusal of the Call',      pct:15, desc:'Hero hesitates or refuses.'},
    {key:'mentor',     label:'Meeting the Mentor',       pct:20, desc:'Receives guidance, gift, or wisdom.'},
    {key:'threshold',  label:'Crossing the Threshold',   pct:25, desc:'Commits to the adventure.'},
    {key:'tests',      label:'Tests, Allies, Enemies',   pct:40, desc:'Faces challenges and learns the rules.'},
    {key:'approach',   label:'Approach to Inmost Cave',  pct:50, desc:'Preparing for the central ordeal.'},
    {key:'ordeal',     label:'The Ordeal',               pct:55, desc:'The central life-or-death crisis.'},
    {key:'reward',     label:'Reward (Seizing the Sword)',pct:65,desc:'Survives and gains the reward.'},
    {key:'road_back',  label:'The Road Back',            pct:75, desc:'Chased or commits to return.'},
    {key:'resurrect',  label:'Resurrection',             pct:90, desc:'Climax, final test, transformation.'},
    {key:'return',     label:'Return with the Elixir',   pct:99, desc:'Returns transformed, bearing gifts.'},
  ]},
  harmon: { name:"Story Circle (Dan Harmon)", beats:[
    {key:'you',    label:'You',            pct:5,  desc:'Establish the protagonist in their comfort zone.'},
    {key:'need',   label:'Need',           pct:15, desc:'Something they need or want.'},
    {key:'go',     label:'Go',             pct:25, desc:'Enter an unfamiliar situation.'},
    {key:'search', label:'Search',         pct:40, desc:'Adapt and struggle in the new situation.'},
    {key:'find',   label:'Find',           pct:50, desc:'Get what they wanted.'},
    {key:'pay',    label:'Pay the Price',  pct:65, desc:'The cost of getting it.'},
    {key:'return', label:'Return',         pct:80, desc:'Return to familiarity, changed.'},
    {key:'change', label:'Changed',        pct:99, desc:'Apply the change to who they were.'},
  ]},
  threeact: { name:"Three-Act Structure", beats:[
    {key:'inciting', label:'Inciting Incident', pct:10, desc:'An event that sets the story in motion.'},
    {key:'plot1',    label:'Plot Point 1',       pct:25, desc:'End of Act 1 — protagonist commits to goal.'},
    {key:'midpoint', label:'Midpoint Shift',     pct:50, desc:'Something changes the game at the halfway point.'},
    {key:'plot2',    label:'Plot Point 2',       pct:75, desc:'End of Act 2 — all seems lost.'},
    {key:'climax',   label:'Climax',             pct:90, desc:'The final confrontation.'},
  ]},
  freytag: { name:"Freytag's Pyramid", beats:[
    {key:'exposition',label:'Exposition',    pct:10, desc:'Background, setting, and characters introduced.'},
    {key:'rising',    label:'Rising Action', pct:30, desc:'Complications build toward the climax.'},
    {key:'climax',    label:'Climax',        pct:50, desc:'The turning point. Highest tension.'},
    {key:'falling',   label:'Falling Action',pct:75, desc:'Consequences unfold after the climax.'},
    {key:'denouement',label:'Dénouement',    pct:95, desc:'Loose ends tied up. New equilibrium reached.'},
  ]},
  sevenpoint: { name:"Seven-Point Story Structure", beats:[
    {key:'hook',     label:'Hook',          pct:1,  desc:"Start at the opposite of the ending. Show the character's flaw."},
    {key:'plot1',    label:'Plot Turn 1',   pct:25, desc:'Something calls the hero into the story world.'},
    {key:'pinch1',   label:'Pinch Point 1', pct:37, desc:'Antagonist applies pressure. Show the real threat.'},
    {key:'midpoint', label:'Midpoint',      pct:50, desc:'The hero moves from reaction to action.'},
    {key:'pinch2',   label:'Pinch Point 2', pct:62, desc:'All hope lost. Remove all support.'},
    {key:'plot2',    label:'Plot Turn 2',   pct:75, desc:'The hero gets what they need to resolve things.'},
    {key:'resolution',label:'Resolution',  pct:99, desc:'The end state — opposite of the hook.'},
  ]},
  kishoten: { name:"Kishōtenketsu (4-Act)", beats:[
    {key:'ki',   label:'Ki — Introduction',    pct:25, desc:'Introduce characters and setting. No conflict yet.'},
    {key:'sho',  label:'Shō — Development',    pct:50, desc:'Develop the story. No conflict — just deepening.'},
    {key:'ten',  label:'Ten — Twist',          pct:75, desc:'An unexpected change or revelation. No villain needed.'},
    {key:'ketsu',label:'Ketsu — Reconciliation',pct:99,desc:'Bring all elements together to a harmonious conclusion.'},
  ]},
};

function _renderBeats(body, s) {
  const tmpl = BEAT_TEMPLATES[s.beatTemplate || 'snyder'] || BEAT_TEMPLATES.snyder;
  const beats = s.beats || {};
  body.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;flex-wrap:wrap">
      <h3 style="font-size:14px;font-weight:700;flex:1">Beat Sheet</h3>
      <select id="beat-tmpl" style="font-size:12px;padding:5px 10px;border-radius:var(--av-radius-sm)">
        ${Object.entries(BEAT_TEMPLATES).map(([k,t]) =>
          `<option value="${k}" ${(s.beatTemplate||'snyder')===k?'selected':''}>${t.name}</option>`).join('')}
      </select>
    </div>
    <!-- Progress bar -->
    <div style="background:var(--av-bg-elevated);border:1px solid var(--av-border);border-radius:var(--av-radius-md);height:18px;position:relative;margin-bottom:16px;overflow:hidden">
      ${tmpl.beats.map(b=>`<div style="position:absolute;left:${b.pct}%;top:0;bottom:0;width:2px;background:var(--av-accent);opacity:.35" title="${b.label}"></div>`).join('')}
      <div style="position:absolute;inset:0;display:flex;align-items:center;padding:0 8px;font-size:9px;color:var(--av-text-muted);pointer-events:none">
        Act 1 ············ Act 2 ············ Midpoint ············ Act 3
      </div>
    </div>
    ${tmpl.beats.map(b => `
      <div style="background:var(--av-bg-elevated);border:1px solid var(--av-border);border-radius:var(--av-radius-md);padding:10px;margin-bottom:8px">
        <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:5px">
          <span style="font-size:10px;font-weight:700;color:var(--av-accent);min-width:28px">${b.pct}%</span>
          <span style="font-size:12px;font-weight:700;color:var(--av-text-primary)">${b.label}</span>
          <span style="font-size:10px;color:var(--av-text-muted);flex:1">${b.desc}</span>
        </div>
        <textarea class="beat-text" data-key="${b.key}" placeholder="What happens at this beat in your story?"
          style="width:100%;min-height:54px;border:1px solid var(--av-border);border-radius:var(--av-radius-sm);padding:5px 7px;font-size:12px;resize:vertical;background:var(--av-input-bg);color:var(--av-text-primary)">${esc(beats[b.key]||'')}</textarea>
      </div>
    `).join('')}
  `;
  document.getElementById('beat-tmpl')?.addEventListener('change', e => {
    s.beatTemplate = e.target.value; _renderBeats(body, s);
  });
  body.querySelectorAll('.beat-text').forEach(el => {
    el.addEventListener('input', e => { s.beats = s.beats||{}; s.beats[el.dataset.key] = e.target.value; _save(); });
  });
}

// ── Scenes ────────────────────────────────────────────────────────────────────

function _renderScenes(body, s) {
  s.chapters = s.chapters || [];
  s.scenes   = s.scenes || [];
  const unassigned = s.scenes.filter(sc => !sc.chapterId);

  body.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px">
      <h3 style="font-size:14px;font-weight:700;flex:1">Scenes (${s.scenes.length})</h3>
      <button class="btn-sm" id="add-chap" style="font-size:11px">+ Chapter</button>
      <button class="btn-primary" id="add-scene" style="padding:5px 14px;font-size:12px">+ Scene</button>
    </div>

    ${s.chapters.map((ch,ci) => `
      <div class="chap-block" style="margin-bottom:14px">
        <div style="display:flex;align-items:center;gap:7px;margin-bottom:8px;padding:0 2px">
          <span style="font-size:11px;font-weight:700;color:var(--av-text-muted);min-width:18px">${ci+1}.</span>
          <input class="chap-title" data-ci="${ci}" value="${esc(ch.title||'')}" placeholder="Chapter title..."
            style="flex:1;font-size:13px;font-weight:700;color:var(--av-text-primary);background:none;border:none;border-bottom:1px solid var(--av-border);outline:none;padding:2px 4px">
          <button class="btn-sm chap-add-scene" data-ci="${ci}" data-cid="${ch.id}" style="font-size:11px">+ Scene</button>
          <button class="btn-sm chap-del" data-ci="${ci}" style="font-size:11px;color:var(--av-danger)">✕</button>
        </div>
        ${s.scenes.filter(sc=>sc.chapterId===ch.id).map((sc,si) => {
          const gsi = s.scenes.indexOf(sc);
          return _sceneCard(sc, gsi, s, ch.id);
        }).join('') || `<div style="font-size:11px;color:var(--av-text-muted);padding:8px 24px;font-style:italic">No scenes in this chapter yet.</div>`}
      </div>
    `).join('')}

    ${unassigned.length ? `
      <div style="margin-bottom:14px">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--av-text-muted);margin-bottom:8px">Unassigned Scenes</div>
        ${unassigned.map(sc => { const gsi = s.scenes.indexOf(sc); return _sceneCard(sc, gsi, s, null); }).join('')}
      </div>
    ` : ''}
    ${!s.chapters.length && !unassigned.length ? '<div style="text-align:center;padding:40px;color:var(--av-text-muted);font-size:12px">No scenes yet. Add a chapter or create a scene.</div>' : ''}
  `;

  // Chapters
  document.getElementById('add-chap')?.addEventListener('click', () => {
    s.chapters.push({ id:uid(), title:'Chapter '+(s.chapters.length+1) }); _renderScenes(body,s);
  });
  body.querySelectorAll('.chap-del').forEach(btn => {
    btn.onclick = () => { s.chapters.splice(+btn.dataset.ci,1); _renderScenes(body,s); saveHistory(); };
  });
  body.querySelectorAll('.chap-title').forEach(el => {
    el.addEventListener('input', () => { s.chapters[+el.dataset.ci].title = el.value; _save(); });
  });

  // Add scene (global)
  document.getElementById('add-scene')?.addEventListener('click', () => {
    s.scenes.push({ id:uid(), title:'New Scene', chapterId:'', location:'', pov:'', goal:'', conflict:'', outcome:'', status:'planned', notes:'', targetWords:0, arcId:'' });
    _renderScenes(body,s); saveHistory();
  });

  // Add scene to chapter
  body.querySelectorAll('.chap-add-scene').forEach(btn => {
    btn.onclick = () => {
      s.scenes.push({ id:uid(), title:'New Scene', chapterId:btn.dataset.cid, location:'', pov:'', goal:'', conflict:'', outcome:'', status:'planned', notes:'', targetWords:0, arcId:'' });
      _renderScenes(body,s); saveHistory();
    };
  });

  // Scene wire
  _wireSceneCards(body, s);
}

function _sceneCard(sc, i, s, chapterId) {
  const scCol = SC_STATUS[sc.status] || '#888';
  return `
    <div class="sc-card" data-i="${i}" style="
      background:var(--av-bg-elevated);border:1px solid var(--av-border);
      border-left:3px solid ${scCol};
      border-radius:var(--av-radius-md);padding:10px 12px;margin-bottom:7px;
    ">
      <div style="display:flex;gap:6px;margin-bottom:7px;flex-wrap:wrap;align-items:center">
        ${_inp('sc-title',i,sc.title||'','Scene title...','flex:1;min-width:100px;padding:4px 7px;font-size:12px;font-weight:600;border-radius:var(--av-radius-sm)')}
        <select class="sc-status" data-i="${i}" style="font-size:10px;padding:3px 5px;border-radius:var(--av-radius-sm);color:${scCol}">
          ${Object.entries(SC_STATUS_LABELS).map(([k,l])=>`<option value="${k}" ${sc.status===k?'selected':''}>${l}</option>`).join('')}
        </select>
        <select class="sc-arc" data-i="${i}" style="font-size:10px;padding:3px 5px;border-radius:var(--av-radius-sm)">
          <option value="">Arc —</option>${_arcOptions(sc.arcId||'')}
        </select>
        <select class="sc-pov" data-i="${i}" style="font-size:10px;padding:3px 5px;border-radius:var(--av-radius-sm)">
          <option value="">POV —</option>${_charOptions(sc.pov||'')}
        </select>
        <button class="sc-del btn-sm" data-i="${i}" style="font-size:11px;color:var(--av-danger)">✕</button>
      </div>
      <div style="display:flex;gap:6px;margin-bottom:6px">
        ${_inp('sc-loc',i,sc.location||'','Location...','flex:1;padding:3px 6px;font-size:11px;border-radius:var(--av-radius-sm)')}
        <input class="sc-words" data-i="${i}" type="number" min="0" value="${sc.targetWords||0}" placeholder="Target words"
          style="width:90px;padding:3px 6px;font-size:11px;border-radius:var(--av-radius-sm)">
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:6px">
        ${['goal','conflict','outcome'].map((f,fi) => `
          <div>
            <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;color:var(--av-text-muted);margin-bottom:3px">${['Goal','Conflict','Outcome'][fi]}</div>
            <textarea class="sc-${f}" data-i="${i}" placeholder="${['What does the POV character want?','What stands in the way?','How does the scene end?'][fi]}"
              style="width:100%;min-height:46px;border:1px solid var(--av-border);border-radius:4px;padding:4px;font-size:10px;resize:vertical;background:var(--av-input-bg);color:var(--av-text-primary)">${esc(sc[f]||'')}</textarea>
          </div>
        `).join('')}
      </div>
      <textarea class="sc-notes" data-i="${i}" placeholder="Additional notes..." style="width:100%;min-height:36px;border:1px solid var(--av-border);border-radius:4px;padding:4px;font-size:10px;resize:vertical;background:var(--av-input-bg);color:var(--av-text-primary)">${esc(sc.notes||'')}</textarea>
    </div>
  `;
}

function _wireSceneCards(body, s) {
  const wireField = (cls,field) => body.querySelectorAll(`.${cls}`).forEach(el => {
    el.addEventListener('input', e => { const sc=(s.scenes||[])[+el.dataset.i]; if(sc) sc[field]=e.target.value; _save(); });
  });
  wireField('sc-title','title'); wireField('sc-loc','location'); wireField('sc-pov','pov');
  wireField('sc-status','status'); wireField('sc-arc','arcId'); wireField('sc-words','targetWords');
  wireField('sc-goal','goal'); wireField('sc-conflict','conflict'); wireField('sc-outcome','outcome');
  wireField('sc-notes','notes');
  body.querySelectorAll('.sc-del').forEach(btn => {
    btn.onclick = () => { s.scenes.splice(+btn.dataset.i,1); _renderScenes(body,s); saveHistory(); };
  });
}

// ── Subplots ──────────────────────────────────────────────────────────────────

const SP_TYPES = ['romance','rivalry','redemption','mentor','comic-relief','mystery','parallel','other'];
const SP_STATUS = ['active','resolved','dropped','planned'];

function _renderSubplots(body, s) {
  const subs = s.subplots || [];
  body.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px">
      <h3 style="font-size:14px;font-weight:700;flex:1">Subplots (${subs.length})</h3>
      <button class="btn-primary" id="add-sub" style="padding:5px 14px;font-size:12px">+ Subplot</button>
    </div>
    ${subs.length ? subs.map((sub,i) => _subCard(sub,i)).join('') :
      '<div style="text-align:center;padding:40px;color:var(--av-text-muted);font-size:12px">No subplots yet. Subplots track secondary storylines, romances, and character arcs running alongside the main plot.</div>'}
  `;

  document.getElementById('add-sub')?.addEventListener('click', () => {
    s.subplots = s.subplots||[];
    s.subplots.push({ id:uid(), title:'New Subplot', charId:'', type:'romance', status:'planned', desc:'', moments:[] });
    _renderSubplots(body,s); saveHistory();
  });

  body.querySelectorAll('.sub-del').forEach(btn => {
    btn.onclick = () => { s.subplots.splice(+btn.dataset.i,1); _renderSubplots(body,s); saveHistory(); };
  });

  const wireSub = (cls,field) => body.querySelectorAll(`.${cls}`).forEach(el => {
    el.addEventListener('input', e => { (s.subplots||[])[+el.dataset.i][field] = e.target.value; _save(); });
  });
  wireSub('sub-title','title'); wireSub('sub-char','charId'); wireSub('sub-type','type');
  wireSub('sub-status','status'); wireSub('sub-desc','desc');

  // Moments
  body.querySelectorAll('.moment-add').forEach(btn => {
    btn.onclick = () => {
      const sub = s.subplots[+btn.dataset.i];
      sub.moments = sub.moments||[]; sub.moments.push({ id:uid(), text:'' });
      _renderSubplots(body,s);
    };
  });
  body.querySelectorAll('.moment-del').forEach(btn => {
    btn.onclick = () => {
      const sub = s.subplots[+btn.dataset.si];
      sub.moments.splice(+btn.dataset.mi,1); _renderSubplots(body,s); saveHistory();
    };
  });
  body.querySelectorAll('.moment-text').forEach(el => {
    el.addEventListener('input', () => {
      const sub = s.subplots[+el.dataset.si];
      if (sub) sub.moments[+el.dataset.mi].text = el.value; _save();
    });
  });
}

function _subCard(sub, i) {
  return `
    <div style="background:var(--av-bg-elevated);border:1px solid var(--av-border);border-radius:var(--av-radius-lg);padding:12px;margin-bottom:10px">
      <div style="display:flex;gap:6px;margin-bottom:8px;align-items:center">
        ${_inp('sub-title',i,sub.title||'','Subplot title...','flex:1;padding:5px 8px;font-size:13px;font-weight:600;border-radius:var(--av-radius-sm)')}
        <select class="sub-type" data-i="${i}" style="font-size:11px;padding:3px 6px;border-radius:var(--av-radius-sm)">
          ${SP_TYPES.map(t=>`<option value="${t}" ${sub.type===t?'selected':''}>${t}</option>`).join('')}
        </select>
        <select class="sub-status" data-i="${i}" style="font-size:11px;padding:3px 6px;border-radius:var(--av-radius-sm)">
          ${SP_STATUS.map(s=>`<option value="${s}" ${sub.status===s?'selected':''}>${s}</option>`).join('')}
        </select>
        <button class="sub-del btn-sm" data-i="${i}" style="color:var(--av-danger)">✕</button>
      </div>
      <div style="display:flex;gap:8px;margin-bottom:8px">
        <select class="sub-char" data-i="${i}" style="font-size:11px;padding:3px 7px;border-radius:var(--av-radius-sm)">
          <option value="">Primary character —</option>${_charOptions(sub.charId||'')}
        </select>
        <textarea class="sub-desc" data-i="${i}" placeholder="What is this subplot about?" style="flex:1;min-height:40px;border:1px solid var(--av-border);border-radius:4px;padding:4px;font-size:11px;resize:vertical;background:var(--av-input-bg);color:var(--av-text-primary)">${esc(sub.desc||'')}</textarea>
      </div>
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--av-text-muted);margin-bottom:6px">Key Moments</div>
      ${(sub.moments||[]).map((m,mi) => `
        <div style="display:flex;gap:5px;margin-bottom:5px">
          <div style="width:4px;border-radius:2px;background:var(--av-accent);flex-shrink:0;margin-top:5px"></div>
          <input class="moment-text" data-si="${i}" data-mi="${mi}" value="${esc(m.text||'')}" placeholder="What happens..."
            style="flex:1;padding:3px 7px;font-size:11px;border-radius:var(--av-radius-sm)">
          <button class="moment-del btn-sm" data-si="${i}" data-mi="${mi}" style="color:var(--av-danger);font-size:10px">✕</button>
        </div>
      `).join('')}
      <button class="moment-add btn-sm" data-i="${i}" style="font-size:11px;margin-top:4px">+ Moment</button>
    </div>
  `;
}

// ── Promises & Payoffs ─────────────────────────────────────────────────────────

const PR_STATUS_COLORS = { pending:'#f4a97c', 'paid-off':'#3aaf85', broken:'#e74c3c', deferred:'#7c5cbf' };

function _renderPromises(body, s) {
  const promises = s.promises || [];
  const dangling  = promises.filter(p => p.status === 'pending').length;
  body.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
      <h3 style="font-size:14px;font-weight:700;flex:1">Promises &amp; Payoffs</h3>
      ${dangling ? `<span style="font-size:10px;font-weight:700;background:rgba(244,169,124,.18);color:#f4a97c;padding:2px 8px;border-radius:999px">${dangling} open</span>` : ''}
      <button class="btn-primary" id="add-pr" style="padding:5px 14px;font-size:12px">+ Add</button>
    </div>
    <div style="font-size:11px;color:var(--av-text-muted);margin-bottom:14px">Every promise to the reader must be paid off. Track them here.</div>
    ${promises.length ? promises.map((p,i) => _prCard(p,i)).join('') :
      '<div style="text-align:center;padding:40px;color:var(--av-text-muted);font-size:12px">No promises tracked yet.</div>'}
  `;
  document.getElementById('add-pr')?.addEventListener('click', () => {
    s.promises = s.promises||[]; s.promises.push({ id:uid(), promise:'', payoff:'', where_promise:'', where_payoff:'', status:'pending' });
    _renderPromises(body,s); saveHistory();
  });
  body.querySelectorAll('.pr-del').forEach(btn => {
    btn.onclick = () => { s.promises.splice(+btn.dataset.i,1); _renderPromises(body,s); saveHistory(); };
  });
  const wirePr = (cls,field) => body.querySelectorAll(`.${cls}`).forEach(el => {
    el.addEventListener('input', e => { (s.promises||[])[+el.dataset.i][field] = e.target.value; _save(); });
  });
  wirePr('pr-promise','promise'); wirePr('pr-payoff','payoff');
  wirePr('pr-where-p','where_promise'); wirePr('pr-where-po','where_payoff');
  wirePr('pr-status','status');
}

function _prCard(p, i) {
  const col = PR_STATUS_COLORS[p.status] || '#888';
  return `
    <div style="background:var(--av-bg-elevated);border:1px solid var(--av-border);border-left:3px solid ${col};border-radius:var(--av-radius-md);padding:10px 12px;margin-bottom:8px">
      <div style="display:flex;gap:6px;margin-bottom:7px;align-items:center">
        ${_inp('pr-promise',i,p.promise||'','The promise made to the reader (setup)...','flex:1;padding:4px 7px;font-size:12px;border-radius:var(--av-radius-sm)')}
        <select class="pr-status" data-i="${i}" style="font-size:11px;padding:3px 6px;border-radius:var(--av-radius-sm);color:${col}">
          ${['pending','paid-off','broken','deferred'].map(s=>`<option value="${s}" ${p.status===s?'selected':''}>${s}</option>`).join('')}
        </select>
        <button class="pr-del btn-sm" data-i="${i}" style="color:var(--av-danger)">✕</button>
      </div>
      ${_inp('pr-payoff',i,p.payoff||'','The payoff (how it resolves)...','width:100%;margin-bottom:6px;padding:4px 7px;font-size:12px;border-radius:var(--av-radius-sm)')}
      <div style="display:flex;gap:6px">
        ${_inp('pr-where-p',i,p.where_promise||'','Where promised (scene/chapter)...','flex:1;padding:3px 6px;font-size:10px;border-radius:var(--av-radius-sm)')}
        ${_inp('pr-where-po',i,p.where_payoff||'','Where paid off...','flex:1;padding:3px 6px;font-size:10px;border-radius:var(--av-radius-sm)')}
      </div>
    </div>
  `;
}
