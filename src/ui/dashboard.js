// dashboard.js — Dashboard: project stats, quick actions, recent items, writing streak
import { state, EventBus } from '../state.js';

let _rendered = false;

export function renderDashboard(container) {
  const view = container || document.getElementById('view-dashboard');
  if (!view) return;
  _render(view);
  if (!_rendered) {
    _rendered = true;
    EventBus.on('state:changed', () => { if (state.activeView === 'dashboard') _render(view); });
    EventBus.on('project:loaded',  () => { _rendered = false; _render(view); });
  }
}

function _render(view) {
  const chars    = state.nodes.filter(n => n.type === 'character');
  const locs     = state.nodes.filter(n => n.type === 'location');
  const docs     = (state.writing?.documents || []);
  const maps     = (state.world?.maps || []);
  const lore     = (state.world?.lore || []);
  const todos    = (state.companion?.todos || []).filter(t => !t.completed);
  const goals    = (state.story?.scenes || []).filter(s => s.type === 'scene').length;
  const streak   = state.companion?.streak || 0;
  const today    = state.companion?.todayWords || 0;
  const goal     = state.companion?.dailyGoal || 1000;
  const goalPct  = Math.min(100, Math.round((today / goal) * 100));
  const lastSaved = state.project?.lastSaved ? new Date(state.project.lastSaved).toLocaleString() : '—';
  const recentChars = chars.slice(-4).reverse();
  const recentDocs  = docs.slice(-4).reverse();

  view.innerHTML = `
    <div class="dash-layout">
      <div class="dash-hero">
        <div>
          <div class="dash-project-name">${state.project?.name || 'Untitled Project'}</div>
          <div class="dash-project-sub">Last saved ${lastSaved}</div>
        </div>
        <div class="dash-hero-actions">
          <button class="btn-primary btn-sm" data-action="new-char">✦ New Character</button>
          <button class="btn-sm" data-action="open-canvas">🕸 Canvas</button>
          <button class="btn-sm" data-action="new-doc">📝 Write</button>
        </div>
      </div>

      <div class="dash-stats-row">
        ${_stat('👤', chars.length, 'Characters', 'characters')}
        ${_stat('📍', locs.length, 'Locations', 'world')}
        ${_stat('📄', docs.length, 'Documents', 'writing')}
        ${_stat('🗺', maps.length, 'Maps', 'world')}
        ${_stat('📚', lore.length, 'Lore', 'lore')}
        ${_stat('🔗', state.edges?.length || 0, 'Connections', 'canvas')}
      </div>

      <div class="dash-body">
        <div class="dash-col">
          <div class="dash-card">
            <div class="dash-card-head">✍ Today's Session</div>
            <div class="dash-writing-row">
              <div class="dash-writing-stat">
                <div class="dash-big-num">${today.toLocaleString()}</div>
                <div class="dash-num-label">words today</div>
              </div>
              <div class="dash-writing-stat">
                <div class="dash-big-num">${streak}</div>
                <div class="dash-num-label">day streak 🔥</div>
              </div>
            </div>
            <div class="dash-goal-bar-wrap">
              <div class="dash-goal-bar-track">
                <div class="dash-goal-bar-fill" style="width:${goalPct}%"></div>
              </div>
              <span class="dash-goal-pct">${goalPct}% of ${goal.toLocaleString()} word goal</span>
            </div>
          </div>

          <div class="dash-card">
            <div class="dash-card-head">📋 Pending Todos <span class="dash-badge">${todos.length}</span></div>
            ${todos.length ? todos.slice(0, 5).map(t => `
              <div class="dash-todo-row">
                <span class="dash-todo-icon">${t.auto ? '🤖' : '✏'}</span>
                <span class="dash-todo-text">${_esc(t.text)}</span>
              </div>
            `).join('') : '<div class="dash-empty">No pending todos — you\'re on top of things!</div>'}
            ${todos.length > 5 ? `<div class="dash-more">+${todos.length - 5} more…</div>` : ''}
          </div>
        </div>

        <div class="dash-col">
          <div class="dash-card">
            <div class="dash-card-head">👤 Recent Characters</div>
            ${recentChars.length ? recentChars.map(c => `
              <div class="dash-char-row" data-node-id="${c.id}">
                <div class="dash-char-avatar" style="background:${c.color||'#7c5cbf'}">${(c.letter||c.name||'?')[0].toUpperCase()}</div>
                <div class="dash-char-info">
                  <div class="dash-char-name">${_esc(c.name || 'Unnamed')}</div>
                  <div class="dash-char-role">${_esc(c.role || c.species || '')}</div>
                </div>
                <div class="dash-char-emoji">${c.emoji || ''}</div>
              </div>
            `).join('') : '<div class="dash-empty">No characters yet. <button class="dash-inline-btn" data-action="new-char">Create one</button></div>'}
          </div>

          <div class="dash-card">
            <div class="dash-card-head">📄 Recent Documents</div>
            ${recentDocs.length ? recentDocs.map(d => {
              const wc = _wc(d.text || '');
              return `<div class="dash-doc-row" data-doc-id="${d.id}">
                <div class="dash-doc-icon">📄</div>
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

  // Actions
  view.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const a = btn.dataset.action;
      if (a === 'new-char')    { EventBus.emit('nav:changed', 'canvas'); setTimeout(() => EventBus.emit('canvas:add-node', { type: 'character', x: 300, y: 280 }), 200); }
      if (a === 'open-canvas') EventBus.emit('nav:changed', 'canvas');
      if (a === 'new-doc')     EventBus.emit('nav:changed', 'writing');
    });
  });

  // Stat cards nav
  view.querySelectorAll('[data-nav]').forEach(el => {
    el.addEventListener('click', () => EventBus.emit('nav:changed', el.dataset.nav));
  });

  // Character rows
  view.querySelectorAll('[data-node-id]').forEach(el => {
    el.addEventListener('click', () => EventBus.emit('node:open-profile', { nodeId: el.dataset.nodeId }));
  });

  // Doc rows
  view.querySelectorAll('[data-doc-id]').forEach(el => {
    el.addEventListener('click', () => {
      EventBus.emit('nav:changed', 'writing');
      setTimeout(() => EventBus.emit('writing:open-doc', el.dataset.docId), 150);
    });
  });
}

function _stat(icon, count, label, nav) {
  return `<div class="dash-stat-card" data-nav="${nav}">
    <div class="dash-stat-icon">${icon}</div>
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
