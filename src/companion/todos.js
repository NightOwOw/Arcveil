// todos.js — Todo system: auto-generated + manual todos
import { state, EventBus, uid } from '../state.js';

export function initTodos() {
  if (!state.companion.todos) state.companion.todos = [];
  EventBus.on('project:loaded', rescanTodos);
  EventBus.on('state:changed', _debouncedRescan);
}

let _rescanTimer = null;
function _debouncedRescan() {
  clearTimeout(_rescanTimer);
  _rescanTimer = setTimeout(rescanTodos, 5000);
}

export function rescanTodos() {
  const manual = (state.companion.todos || []).filter(t => t.type === 'manual');
  const auto   = _generateAutoTodos();
  // Merge: keep manual todos, replace auto ones
  state.companion.todos = [...manual, ...auto];
  EventBus.emit('todos:updated', state.companion.todos);
}

function _generateAutoTodos() {
  const todos = [];

  // ❓ annotations in writing docs
  for (const doc of (state.writing?.documents || [])) {
    const matches = (doc.html || '').match(/❓[^<\n]*/g) || [];
    for (const m of matches) {
      todos.push(_auto('question', `Resolve: ${m.replace('❓','').trim() || 'annotation'}`, doc.id, 'document'));
    }
  }

  // Characters with no profile (no name or no backstory)
  for (const node of (state.nodes || []).filter(n => n.type === 'character')) {
    const p = node.profile || {};
    if (!p.name && !p.fullName) {
      todos.push(_auto('profile', `Create profile: ${node.label || 'unnamed character'}`, node.id, 'character'));
    }
  }

  // Empty scene cards
  for (const scene of (state.story?.scenes || [])) {
    if (!scene.content && !scene.body) {
      todos.push(_auto('scene', `Write scene: ${scene.title || 'untitled scene'}`, scene.id, 'scene'));
    }
  }

  // Incomplete lore entries (no body/description)
  for (const entry of (state.world?.lore || [])) {
    if (!entry.body && !entry.description) {
      todos.push(_auto('lore', `Finish lore: ${entry.title || 'untitled entry'}`, entry.id, 'lore'));
    }
  }

  // Pending promises/payoffs
  for (const p of (state.story?.promises || [])) {
    if (p.status === 'pending') {
      todos.push(_auto('promise', `Pay off promise: ${p.promise || 'untitled promise'}`, p.id, 'promise'));
    }
  }

  return todos;
}

function _auto(type, text, linkedEntityId, linkedEntityType) {
  return {
    id: uid(),
    text,
    type,
    linkedEntityId:   linkedEntityId   || null,
    linkedEntityType: linkedEntityType || null,
    dueDate:     null,
    completed:   false,
    completedAt: null,
    priority:    'normal',
    auto:        true,
  };
}

export function addTodo(text, opts = {}) {
  const todo = {
    id:          uid(),
    text,
    type:        'manual',
    linkedEntityId:   opts.linkedEntityId   || null,
    linkedEntityType: opts.linkedEntityType || null,
    dueDate:     opts.dueDate    || null,
    completed:   false,
    completedAt: null,
    priority:    opts.priority   || 'normal',
    auto:        false,
  };
  if (!state.companion.todos) state.companion.todos = [];
  state.companion.todos.push(todo);
  EventBus.emit('todos:updated', state.companion.todos);
  EventBus.emit('state:changed');
  return todo;
}

export function completeTodo(id) {
  const todo = (state.companion.todos || []).find(t => t.id === id);
  if (!todo) return;
  todo.completed   = true;
  todo.completedAt = Date.now();
  EventBus.emit('todos:updated', state.companion.todos);
  EventBus.emit('state:changed');
}

export function deleteTodo(id) {
  if (!state.companion.todos) return;
  state.companion.todos = state.companion.todos.filter(t => t.id !== id);
  EventBus.emit('todos:updated', state.companion.todos);
  EventBus.emit('state:changed');
}

export function getPendingTodos(limit = 3) {
  return (state.companion.todos || [])
    .filter(t => !t.completed)
    .sort((a, b) => (a.priority === 'high' ? -1 : 1))
    .slice(0, limit);
}

export function getTodos() {
  return state.companion.todos || [];
}
