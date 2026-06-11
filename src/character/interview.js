// interview.js — Interview tab
import { esc, getOrCreateProfile, updateProfile, uid } from '../state.js';

const QUESTIONS = [
  'What is your earliest memory?',
  'What do you want more than anything?',
  'What are you most afraid of?',
  'What makes you laugh?',
  'What is your greatest regret?',
  'How do you treat people who can do nothing for you?',
  'What would you die for?',
  'If you could change one thing about yourself, what would it be?',
  'What do people misunderstand about you?',
  'What is the one thing you would never forgive?',
];

export function renderInterview(nodeId) {
  const body = document.getElementById('rp-body');
  if (!body) return;
  const p = getOrCreateProfile(nodeId);
  const answers = p.interview || {};
  const custom = p.interviewCustom || [];

  body.innerHTML = `
    <div style="font-size:11px;color:var(--av-text-muted);margin-bottom:10px">Answer as the character — in their voice.</div>
    ${QUESTIONS.map((q, i) => `
      <div class="interview-q" style="margin-bottom:12px">
        <div class="int-question" style="font-size:11px;color:var(--av-accent);font-style:italic;margin-bottom:3px">"${q}"</div>
        <textarea class="int-answer" data-qi="${i}" placeholder="..." style="width:100%;min-height:52px;border:1px solid var(--av-border);border-radius:var(--av-radius-sm);padding:5px 7px;font-size:12px;resize:vertical;background:var(--av-input-bg);color:var(--av-text-primary)">${esc(answers[i]||'')}</textarea>
      </div>
    `).join('')}

    <div class="panel-section-head" style="margin-top:6px">Custom Questions
      <button class="btn-sm" id="add-custom-q" style="float:right">✦ Add</button>
    </div>
    <div id="custom-qs">
      ${custom.map((c,i) => `
        <div style="margin-bottom:10px">
          <div style="display:flex;gap:4px;margin-bottom:3px">
            <input type="text" class="cq-text" data-ci="${i}" value="${esc(c.q||'')}" placeholder="Your question..." style="flex:1;padding:3px 6px;font-size:11px;border-radius:var(--av-radius-sm)">
            <button class="btn-sm cq-del" data-ci="${i}">✕</button>
          </div>
          <textarea class="cq-answer" data-ci="${i}" placeholder="..." style="width:100%;min-height:44px;border:1px solid var(--av-border);border-radius:var(--av-radius-sm);padding:5px 7px;font-size:12px;resize:vertical;background:var(--av-input-bg);color:var(--av-text-primary)">${esc(c.a||'')}</textarea>
        </div>
      `).join('')}
    </div>
  `;

  body.querySelectorAll('.int-answer').forEach(el => {
    el.addEventListener('input', e => {
      const qi = +e.target.dataset.qi;
      const a = { ...(getOrCreateProfile(nodeId).interview || {}) };
      a[qi] = e.target.value;
      updateProfile(nodeId, { interview: a });
    });
  });

  document.getElementById('add-custom-q')?.addEventListener('click', () => {
    const cust = [...(getOrCreateProfile(nodeId).interviewCustom || []), { id: uid(), q:'', a:'' }];
    updateProfile(nodeId, { interviewCustom: cust });
    renderInterview(nodeId);
  });

  body.querySelectorAll('.cq-text, .cq-answer').forEach(el => {
    el.addEventListener('input', e => {
      const ci = +e.target.dataset.ci, field = el.classList.contains('cq-text') ? 'q' : 'a';
      const cust = [...(getOrCreateProfile(nodeId).interviewCustom || [])];
      if (cust[ci]) { cust[ci][field] = e.target.value; updateProfile(nodeId, { interviewCustom: cust }); }
    });
  });

  body.querySelectorAll('.cq-del').forEach(btn => {
    btn.onclick = () => {
      const cust = (getOrCreateProfile(nodeId).interviewCustom || []).filter((_,i) => i !== +btn.dataset.ci);
      updateProfile(nodeId, { interviewCustom: cust });
      renderInterview(nodeId);
    };
  });
}
