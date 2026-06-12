// dashboard.js — Dashboard: project stats, quick actions, recent items, todos
import { state, uid, EventBus } from '../state.js';
import { IC } from './icons.js';

let _view = null;

export function renderDashboard(container) {
  _view = container || document.getElementById('view-dashboard');
  if (!_view) return;
  _render();
  EventBus.off('project:loaded',  _onReload);
  EventBus.on('project:loaded',  _onReload);
}

function _onReload() { _render(); }

function _render() {
  if (!_view) return;
  const chars    = state.nodes.filter(n => n.type === 'character');
  const locs     = state.nodes.filter(n => n.type === 'location');
  const docs     = (state.writing?.documents || []);
  const maps     = (state.world?.maps || []);
  const lore     = (state.world?.lore || []);
  const streak   = state.companion?.streak || 0;
  const today    = state.companion?.todayWords || 0;
  const goal     = state.companion?.dailyGoal || 1000;
  const goalPct  = Math.min(100, Math.round((today / goal) * 100));
  const lastSaved = state.project?.lastSaved ? new Date(state.project.lastSaved).toLocaleString() : '—';
  const recentChars = chars.slice(-4).reverse();
  const recentDocs  = docs.slice(-4).reverse();

  _view.innerHTML = `
    <div class="dash-layout">
      <div class="dash-hero">
        <div>
          <div class="dash-project-name">${state.project?.name || 'Untitled Project'}</div>
          <div class="dash-project-sub">Last saved ${lastSaved}</div>
        </div>
        <div class="dash-hero-actions">
          <button class="btn-primary btn-sm" data-action="new-char">+ New Character</button>
          <button class="btn-sm" data-action="open-canvas"><span class="av-icon">${IC.canvas}</span> Canvas</button>
          <button class="btn-sm" data-action="new-doc"><span class="av-icon">${IC.write}</span> Write</button>
        </div>
      </div>

      <div class="dash-stats-row">
        ${_stat(IC.char,    chars.length, 'Characters', 'characters')}
        ${_stat(IC.loc,     locs.length,  'Locations',  'world')}
        ${_stat(IC.doc,     docs.length,  'Documents',  'writing')}
        ${_stat(IC.map,     maps.length,  'Maps',       'world')}
        ${_stat(IC.lore,    lore.length,  'Lore',       'lore')}
        ${_stat(IC.link,    state.edges?.length || 0, 'Connections', 'canvas')}
      </div>

      <div class="dash-body">
        <div class="dash-col">
          <div class="dash-card">
            <div class="dash-card-head"><span class="av-icon">${IC.write}</span> Today's Session</div>
            <div class="dash-writing-row">
              <div class="dash-writing-stat">
                <div class="dash-big-num">${today.toLocaleString()}</div>
                <div class="dash-num-label">words today</div>
              </div>
              <div class="dash-writing-stat">
                <div class="dash-big-num">${streak}</div>
                <div class="dash-num-label">day streak</div>
              </div>
            </div>
            <div class="dash-goal-bar-wrap">
              <div class="dash-goal-bar-track">
                <div class="dash-goal-bar-fill" style="width:${goalPct}%"></div>
              </div>
              <span class="dash-goal-pct">${goalPct}% of ${goal.toLocaleString()} word goal</span>
            </div>
          </div>

          <div class="dash-card" id="dash-todo-card">
            ${_buildTodoHtml()}
          </div>
        </div>

        <div class="dash-col">
          <div class="dash-card">
            <div class="dash-card-head"><span class="av-icon">${IC.char}</span> Recent Characters</div>
            ${recentChars.length ? recentChars.map(c => `
              <div class="dash-char-row" data-node-id="${c.id}" title="Jump to canvas">
                <div class="dash-char-avatar" style="background:${c.color||'#7c5cbf'}">
                  ${c.nodeImage ? `<img src="${c.nodeImage}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">` : (c.letter||c.name||'?')[0].toUpperCase()}
                </div>
                <div class="dash-char-info">
                  <div class="dash-char-name">${_esc(c.name || 'Unnamed')}</div>
                  <div class="dash-char-role">${_esc(c.role || c.species || '')}</div>
                </div>
                <span class="dash-char-jump" title="Jump to canvas">⊙</span>
              </div>
            `).join('') : '<div class="dash-empty">No characters yet. <button class="dash-inline-btn" data-action="new-char">Create one</button></div>'}
          </div>

          <div class="dash-card">
            <div class="dash-card-head"><span class="av-icon">${IC.doc}</span> Recent Documents</div>
            ${recentDocs.length ? recentDocs.map(d => {
              const wc = _wc(d.text || '');
              return `<div class="dash-doc-row" data-doc-id="${d.id}">
                <span class="av-icon dash-doc-icon">${IC.doc}</span>
                <div class="dash-doc-info">
                  <div class="dash-doc-title">${_esc(d.title || 'Untitled')}</div>
                  <div class="dash-doc-wc">${wc.toLocaleString()} words</div>
                </div>
              </div>`;
            }).join('') : '<div class="dash-empty">No documents yet. <button class="dash-inline-btn" data-action="new-doc">Start writing</button></div>'}
          </div>
        </div>
      </div>
    </div>
  `;

  _wireAll();
}

function _buildTodoHtml() {
  const todos = state.companion?.todos || [];
  const pending = todos.filter(t => !t.completed);
  return `
    <div class="dash-card-head"><span class="av-icon">${IC.check}</span> Todos <span class="dash-badge">${pending.length}</span></div>
    <div class="dash-todo-list">
      ${todos.length ? todos.map(t => `
        <div class="dash-todo-row${t.completed ? ' done' : ''}" data-todo-id="${t.id}">
          <button class="dash-todo-check${t.completed ? ' checked' : ''}" data-action="todo-toggle" data-id="${t.id}" title="Mark done">
            ${t.completed ? IC.check : ''}
          </button>
          <span class="dash-todo-text">${_esc(t.text)}</span>
          <button class="dash-todo-del" data-action="todo-delete" data-id="${t.id}" title="Delete">×</button>
        </div>
      `).join('') : '<div class="dash-empty" style="padding:6px 0">No todos yet</div>'}
    </div>
    <form class="dash-todo-form" id="dash-add-todo">
      <input type="text" class="dash-todo-input" id="dash-todo-input" placeholder="Add a todo…" maxlength="200" autocomplete="off">
      <button type="submit" class="dash-todo-add-btn" title="Add">${IC.plus}</button>
    </form>
  `;
}

function _refreshTodoCard() {
  const card = _view?.querySelector('#dash-todo-card');
  if (!card) return;
  card.innerHTML = _buildTodoHtml();
  _wireTodos();
}

function _wireAll() {
  if (!_view) return;

  // Action buttons
  _view.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const a = btn.dataset.action;
      if (a === 'new-char')    { EventBus.emit('nav:changed', 'canvas'); setTimeout(() => EventBus.emit('canvas:add-node', { type: 'character', x: 300, y: 280 }), 200); }
      if (a === 'open-canvas') EventBus.emit('nav:changed', 'canvas');
      if (a === 'new-doc')     EventBus.emit('nav:changed', 'writing');
    });
  });

  // Stat cards nav
  _view.querySelectorAll('[data-nav]').forEach(el => {
    el.addEventListener('click', () => EventBus.emit('nav:changed', el.dataset.nav));
  });

  // Character rows → navigate to canvas AND focus node
  _view.querySelectorAll('[data-node-id]').forEach(el => {
    el.addEventListener('click', () => {
      const nodeId = el.dataset.nodeId;
      EventBus.emit('nav:changed', 'canvas');
      setTimeout(() => EventBus.emit('canvas:focus-node', nodeId), 150);
    });
  });

  // Doc rows
  _view.querySelectorAll('[data-doc-id]').forEach(el => {
    el.addEventListener('click', () => {
      EventBus.emit('nav:changed', 'writing');
      setTimeout(() => EventBus.emit('writing:open-doc', el.dataset.docId), 150);
    });
  });

  _wireTodos();
}

function _wireTodos() {
  const card = _view?.querySelector('#dash-todo-card');
  if (!card) return;

  // Toggle done
  card.querySelectorAll('[data-action="todo-toggle"]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const t = _findTodo(btn.dataset.id);
      if (t) { t.completed = !t.completed; _saveTodos(); _refreshTodoCard(); }
    });
  });

  // Delete
  card.querySelectorAll('[data-action="todo-delete"]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      if (!state.companion) state.companion = {};
      state.companion.todos = (state.companion.todos || []).filter(t => t.id !== btn.dataset.id);
      _saveTodos(); _refreshTodoCard();
    });
  });

  // Add form
  const form = card.querySelector('#dash-add-todo');
  const input = card.querySelector('#dash-todo-input');
  form?.addEventListener('submit', e => {
    e.preventDefault();
    const text = input?.value.trim();
    if (!text) return;
    if (!state.companion) state.companion = {};
    if (!state.companion.todos) state.companion.todos = [];
    state.companion.todos.push({ id: uid(), text, completed: false });
    _saveTodos(); _refreshTodoCard();
  });
}

function _findTodo(id) {
  return (state.companion?.todos || []).find(t => t.id === id);
}

function _saveTodos() {
  state.project.isDirty = true;
  EventBus.emit('state:changed');
}

function _stat(icon, count, label, nav) {
  return `<div class="dash-stat-card" data-nav="${nav}">
    <div class="dash-stat-icon av-icon">${icon}</div>
    <div class="dash-stat-count">${count}</div>
    <div class="dash-stat-label">${label}</div>
  </div>`;
}

function _wc(text) {
  return (text || '').trim().split(/\s+/).filter(Boolean).length;
}

function _esc(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
