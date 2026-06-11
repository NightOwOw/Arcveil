// settings-companion.js — Companion settings tab
import { state, EventBus, esc } from '../state.js';

const DEFAULTS = {
  activationMode:   'hold',
  holdDuration:     350,
  headTracking:     true,
  headTrackRange:   'medium',
  dizzyReaction:    true,
  clickThrough:     true,
  bubbleEnabled:    true,
  bubblePosition:   'auto',
  typewriter:       true,
  typeSpeed:        'normal',
  autoDismiss:      true,
  dismissDelay:     8000,
  bubbleStyle:      'default',
  bubbleSound:      false,
  bubbleSoundVol:   0.2,
  notifyFrequency:  'normal',
  notifyTopics: {
    wordGoal: true, longSession: true, idle: true, flowState: false,
    continuity: true, streak: true, encouragement: false, lateNight: true, dizzy: true,
  },
  voiceEnabled: false,
  voiceEngine:  'system',
  voiceId:      '',
  voiceSpeed:   1.0,
  voicePitch:   0,
  voiceVol:     0.7,
  voiceOn:      ['goals', 'greeting'],
  aiMode:       'none',
  activeHours:  { from: '09:00', to: '23:00' },
  greetOnOpen:  true,
  goodbyeOnClose: true,
  modelScale:   1.0,
  modelOffsetY: 0,
  modelFlip:    false,
  lighting:     'neutral',
};

function _cs() {
  if (!state.companion.settings) state.companion.settings = {};
  return Object.assign({}, DEFAULTS, state.companion.settings);
}

function _save(patch) {
  state.companion.settings = Object.assign(_cs(), patch);
  EventBus.emit('companion:settings-changed', state.companion.settings);
  EventBus.emit('state:changed');
}

function _saveNested(key, patch) {
  const cs = _cs();
  cs[key] = Object.assign({}, cs[key], patch);
  _save(cs);
}

export function renderCompanionTab(el) {
  if (!el) return;
  el.innerHTML = `<div class="settings-scroll"><h2 class="settings-section-title">Companion</h2><div id="companion-tab-inner"></div></div>`;
  renderCompanionContent(el.querySelector('#companion-tab-inner'));
}

export function renderCompanionContent(el) {
  if (!el) return;
  const cs = _cs();
  const nt = cs.notifyTopics;

  el.innerHTML = `

      <!-- MODEL -->
      <div class="settings-block">
        <div class="settings-block-head">Model</div>
        <div class="settings-row">
          <label>Scale <span id="cs-scale-val">${cs.modelScale.toFixed(1)}x</span></label>
          <input type="range" id="cs-scale" min="0.6" max="1.8" step="0.05" value="${cs.modelScale}" style="flex:1">
        </div>
        <div class="settings-row">
          <label>Vertical offset <span id="cs-offset-val">${cs.modelOffsetY}px</span></label>
          <input type="range" id="cs-offset" min="-60" max="60" step="4" value="${cs.modelOffsetY}" style="flex:1">
        </div>
        <div class="settings-row">
          <label>Flip horizontal</label>
          <label class="toggle-label"><input type="checkbox" id="cs-flip" ${cs.modelFlip ? 'checked' : ''}><span class="toggle-track"></span></label>
        </div>
        <div class="settings-row">
          <label>Lighting</label>
          <select id="cs-lighting">
            ${['warm','neutral','cool','dramatic'].map(v => `<option value="${v}"${cs.lighting===v?' selected':''}>${v.charAt(0).toUpperCase()+v.slice(1)}</option>`).join('')}
          </select>
        </div>
      </div>

      <!-- BEHAVIOR -->
      <div class="settings-block">
        <div class="settings-block-head">Behavior</div>
        <div class="settings-row">
          <label>Activation</label>
          <select id="cs-activation">
            <option value="hold"${cs.activationMode==='hold'?' selected':''}>Hold (350ms)</option>
            <option value="click"${cs.activationMode==='click'?' selected':''}>Single click</option>
            <option value="always"${cs.activationMode==='always'?' selected':''}>Always on</option>
            <option value="never"${cs.activationMode==='never'?' selected':''}>Never</option>
          </select>
        </div>
        <div class="settings-row">
          <label>Hold duration <span id="cs-hold-val">${cs.holdDuration}ms</span></label>
          <input type="range" id="cs-hold" min="150" max="800" step="50" value="${cs.holdDuration}" style="flex:1">
        </div>
        <div class="settings-row">
          <label>Head tracking</label>
          <label class="toggle-label"><input type="checkbox" id="cs-headtrack" ${cs.headTracking?'checked':''}><span class="toggle-track"></span></label>
        </div>
        <div class="settings-row">
          <label>Track range</label>
          <select id="cs-trackrange">
            ${['low','medium','high'].map(v=>`<option value="${v}"${cs.headTrackRange===v?' selected':''}>${v.charAt(0).toUpperCase()+v.slice(1)}</option>`).join('')}
          </select>
        </div>
        <div class="settings-row">
          <label>Dizzy reaction</label>
          <label class="toggle-label"><input type="checkbox" id="cs-dizzy" ${cs.dizzyReaction?'checked':''}><span class="toggle-track"></span></label>
        </div>
        <div class="settings-row">
          <label>Click-through</label>
          <label class="toggle-label"><input type="checkbox" id="cs-clickthrough" ${cs.clickThrough?'checked':''}><span class="toggle-track"></span></label>
        </div>
      </div>

      <!-- SPEECH BUBBLE -->
      <div class="settings-block">
        <div class="settings-block-head">Speech Bubble</div>
        <div class="settings-row">
          <label>Show bubbles</label>
          <label class="toggle-label"><input type="checkbox" id="cs-bubble" ${cs.bubbleEnabled?'checked':''}><span class="toggle-track"></span></label>
        </div>
        <div class="settings-row">
          <label>Style</label>
          <select id="cs-bstyle">
            <option value="default"${cs.bubbleStyle==='default'?' selected':''}>Default</option>
            <option value="comic"${cs.bubbleStyle==='comic'?' selected':''}>Comic / Manga</option>
            <option value="minimal"${cs.bubbleStyle==='minimal'?' selected':''}>Minimal</option>
            <option value="terminal"${cs.bubbleStyle==='terminal'?' selected':''}>Terminal</option>
          </select>
        </div>
        <div class="settings-row">
          <label>Typewriter</label>
          <label class="toggle-label"><input type="checkbox" id="cs-typewriter" ${cs.typewriter?'checked':''}><span class="toggle-track"></span></label>
        </div>
        <div class="settings-row">
          <label>Type speed</label>
          <select id="cs-tspeed">
            ${['slow','normal','fast','instant'].map(v=>`<option value="${v}"${cs.typeSpeed===v?' selected':''}>${v.charAt(0).toUpperCase()+v.slice(1)}</option>`).join('')}
          </select>
        </div>
        <div class="settings-row">
          <label>Auto-dismiss</label>
          <label class="toggle-label"><input type="checkbox" id="cs-autodismiss" ${cs.autoDismiss?'checked':''}><span class="toggle-track"></span></label>
        </div>
        <div class="settings-row">
          <label>Dismiss after <span id="cs-delay-val">${cs.dismissDelay/1000}s</span></label>
          <input type="range" id="cs-delay" min="3000" max="20000" step="1000" value="${cs.dismissDelay}" style="flex:1">
        </div>
        <div class="settings-row">
          <label>Sound on appear</label>
          <label class="toggle-label"><input type="checkbox" id="cs-bsound" ${cs.bubbleSound?'checked':''}><span class="toggle-track"></span></label>
        </div>
        <div class="settings-row">
          <label>Sound volume <span id="cs-bvol-val">${Math.round(cs.bubbleSoundVol*100)}%</span></label>
          <input type="range" id="cs-bvol" min="0" max="1" step="0.05" value="${cs.bubbleSoundVol}" style="flex:1">
        </div>
      </div>

      <!-- NOTIFICATIONS -->
      <div class="settings-block">
        <div class="settings-block-head">Notifications</div>
        <div class="settings-row">
          <label>Frequency</label>
          <select id="cs-freq">
            <option value="chatty"${cs.notifyFrequency==='chatty'?' selected':''}>Chatty</option>
            <option value="normal"${cs.notifyFrequency==='normal'?' selected':''}>Normal</option>
            <option value="minimal"${cs.notifyFrequency==='minimal'?' selected':''}>Minimal</option>
            <option value="silent"${cs.notifyFrequency==='silent'?' selected':''}>Silent</option>
          </select>
        </div>
        <div style="margin-top:8px;display:grid;grid-template-columns:1fr 1fr;gap:4px 12px">
          ${[
            ['wordGoal','Word count goals'],['longSession','Long sessions'],
            ['idle','Idle too long'],['flowState','Flow state'],
            ['continuity','Character continuity'],['streak','Writing streak'],
            ['encouragement','Encouragement'],['lateNight','Late night'],
            ['dizzy','Dizzy reaction'],
          ].map(([k,label])=>`
            <label style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--av-text-secondary);cursor:pointer">
              <input type="checkbox" data-nt="${k}" ${nt[k]?'checked':''} style="accent-color:var(--av-accent)">
              ${esc(label)}
            </label>
          `).join('')}
        </div>
      </div>

      <!-- SCHEDULE -->
      <div class="settings-block">
        <div class="settings-block-head">Schedule</div>
        <div class="settings-row">
          <label>Active hours</label>
          <input type="time" id="cs-from" value="${cs.activeHours.from}" style="width:80px">
          <span style="font-size:11px;color:var(--av-text-muted);margin:0 4px">to</span>
          <input type="time" id="cs-to"   value="${cs.activeHours.to}"   style="width:80px">
        </div>
        <div class="settings-row">
          <label>Greet on open</label>
          <label class="toggle-label"><input type="checkbox" id="cs-greet" ${cs.greetOnOpen?'checked':''}><span class="toggle-track"></span></label>
        </div>
        <div class="settings-row">
          <label>Say goodbye on close</label>
          <label class="toggle-label"><input type="checkbox" id="cs-goodbye" ${cs.goodbyeOnClose?'checked':''}><span class="toggle-track"></span></label>
        </div>
      </div>

      <!-- AI MODE -->
      <div class="settings-block">
        <div class="settings-block-head">AI Mode</div>
        ${[
          ['none','No AI — offline, preset lines only'],
          ['local','Local AI (Ollama)'],
          ['cloud','Cloud AI (your API key)'],
        ].map(([v,label])=>`
          <label style="display:flex;align-items:center;gap:8px;margin-bottom:7px;cursor:pointer;font-size:12px;color:var(--av-text-secondary)">
            <input type="radio" name="cs-aimode" value="${v}" ${cs.aiMode===v?'checked':''} style="accent-color:var(--av-accent)">
            ${esc(label)}
          </label>
        `).join('')}
        <div style="margin-top:4px;font-size:10px;color:var(--av-text-muted)">
          🔒 Your data stays on your computer
        </div>
      </div>
  `;

  _wireCompanionTab(el);
}

function _wireCompanionTab(el) {
  // Range sliders with live labels
  const rangeMap = {
    'cs-scale':  (v) => { _save({ modelScale: +v }); el.querySelector('#cs-scale-val').textContent = (+v).toFixed(1) + 'x'; },
    'cs-offset': (v) => { _save({ modelOffsetY: +v }); el.querySelector('#cs-offset-val').textContent = v + 'px'; },
    'cs-hold':   (v) => { _save({ holdDuration: +v }); el.querySelector('#cs-hold-val').textContent = v + 'ms'; },
    'cs-delay':  (v) => { _save({ dismissDelay: +v }); el.querySelector('#cs-delay-val').textContent = (+v/1000).toFixed(0) + 's'; },
    'cs-bvol':   (v) => { _save({ bubbleSoundVol: +v }); el.querySelector('#cs-bvol-val').textContent = Math.round(+v*100) + '%'; },
  };
  Object.entries(rangeMap).forEach(([id, fn]) => {
    el.querySelector('#' + id)?.addEventListener('input', (e) => fn(e.target.value));
  });

  // Checkboxes
  const checks = {
    'cs-flip':        v => _save({ modelFlip: v }),
    'cs-headtrack':   v => _save({ headTracking: v }),
    'cs-dizzy':       v => _save({ dizzyReaction: v }),
    'cs-clickthrough':v => _save({ clickThrough: v }),
    'cs-bubble':      v => _save({ bubbleEnabled: v }),
    'cs-typewriter':  v => _save({ typewriter: v }),
    'cs-autodismiss': v => _save({ autoDismiss: v }),
    'cs-bsound':      v => _save({ bubbleSound: v }),
    'cs-greet':       v => _save({ greetOnOpen: v }),
    'cs-goodbye':     v => _save({ goodbyeOnClose: v }),
  };
  Object.entries(checks).forEach(([id, fn]) => {
    el.querySelector('#' + id)?.addEventListener('change', (e) => fn(e.target.checked));
  });

  // Selects
  const selects = {
    'cs-activation': v => _save({ activationMode: v }),
    'cs-lighting':   v => _save({ lighting: v }),
    'cs-trackrange': v => _save({ headTrackRange: v }),
    'cs-bstyle':     v => _save({ bubbleStyle: v }),
    'cs-tspeed':     v => _save({ typeSpeed: v }),
    'cs-freq':       v => _save({ notifyFrequency: v }),
  };
  Object.entries(selects).forEach(([id, fn]) => {
    el.querySelector('#' + id)?.addEventListener('change', (e) => fn(e.target.value));
  });

  // Notification topic checkboxes
  el.querySelectorAll('[data-nt]').forEach(cb => {
    cb.addEventListener('change', (e) => {
      _saveNested('notifyTopics', { [e.target.dataset.nt]: e.target.checked });
    });
  });

  // Radio — AI mode
  el.querySelectorAll('[name="cs-aimode"]').forEach(r => {
    r.addEventListener('change', (e) => { if (e.target.checked) _save({ aiMode: e.target.value }); });
  });

  // Time pickers
  el.querySelector('#cs-from')?.addEventListener('change', (e) => {
    const cs = _cs(); _save({ activeHours: { ...cs.activeHours, from: e.target.value } });
  });
  el.querySelector('#cs-to')?.addEventListener('change', (e) => {
    const cs = _cs(); _save({ activeHours: { ...cs.activeHours, to: e.target.value } });
  });
}
