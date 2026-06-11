// speech-bubble.js — Speech bubble overlay for companion messages

const DISMISS_MS = 8000;
const GAP_MS     = 3000;

let _queue   = [];
let _showing = false;
let _el      = null;
let _timer   = null;
let _paused  = false;

export function initSpeechBubble(container) {
  _el = document.createElement('div');
  _el.id = 'companion-bubble';
  _el.className = 'companion-bubble hidden';
  _el.innerHTML = `
    <div class="bubble-text" id="bubble-text"></div>
    <button class="bubble-close" id="bubble-close" title="Dismiss">×</button>
  `;
  container.appendChild(_el);

  document.getElementById('bubble-close')?.addEventListener('click', dismissBubble);
  _el.addEventListener('mouseenter', () => { _paused = true; clearTimeout(_timer); });
  _el.addEventListener('mouseleave', () => {
    _paused = false;
    if (_showing) _startDismissTimer();
  });
  _el.addEventListener('click', e => {
    if (e.target.id === 'bubble-close') return;
    _el.classList.toggle('expanded');
  });
}

export function showMessage(text) {
  _queue.push(text);
  if (!_showing) _dequeue();
}

export function dismissBubble() {
  clearTimeout(_timer);
  _el?.classList.remove('visible', 'expanded');
  _el?.classList.add('hidden');
  _showing = false;
  setTimeout(_dequeue, GAP_MS);
}

function _dequeue() {
  if (!_queue.length) { _showing = false; return; }
  const text = _queue.shift();
  _showBubble(text);
}

function _showBubble(text) {
  if (!_el) return;
  _showing = true;
  const textEl = document.getElementById('bubble-text');
  if (textEl) textEl.textContent = text;
  _el.classList.remove('hidden', 'expanded');
  // Force reflow for animation
  void _el.offsetHeight;
  _el.classList.add('visible');
  _startDismissTimer();
}

function _startDismissTimer() {
  clearTimeout(_timer);
  if (_paused) return;
  _timer = setTimeout(dismissBubble, DISMISS_MS);
}
