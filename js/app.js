/* app.js — wires the model + scale + UI together, and does the talking. */

const PROBLEMS = [
  { id: 'twins', title: '28 + 22 = 30 + 22 − x   (the +22 trick)',
    def: { L: [['n', 28], ['n', 22]], R: [['n', 30], ['n', 22], ['x', -1]] },
    intro: 'Both pans are equal — that is what the = means. See the +22 on BOTH sides? Tap a <b>22</b> to find out the trick.' },
  { id: 'p1', title: 'x + 7 = 12',
    def: { L: [['x', 1], ['n', 7]], R: [['n', 12]] },
    intro: 'Get x on its own. Tap the <b>7</b>, then send it across the =.' },
  { id: 'p2', title: '18 = x + 6',
    def: { L: [['n', 18]], R: [['x', 1], ['n', 6]] },
    intro: 'This time x is on the right. Get it by itself.' },
  { id: 'p3', title: '9 + x = 4 + 11',
    def: { L: [['n', 9], ['x', 1]], R: [['n', 4], ['n', 11]] },
    intro: 'Tip: tap a number on the right and add the numbers up first.' },
];

let state = null;
let currentDef = null;
let selId = null;
let solved = false;

/* ---------- DOM ---------- */
const eqBar    = document.getElementById('equationBar');
const actionsEl= document.getElementById('actions');
const coachEl  = document.getElementById('coach');
const badge    = document.getElementById('balanceBadge');
const winBanner= document.getElementById('winBanner');
const picker   = document.getElementById('puzzle');

/* ---------- helpers on state ---------- */
function selectedTerm() {
  if (selId == null) return null;
  return state.L.find(t => t.id === selId) || state.R.find(t => t.id === selId) || null;
}
function sideOf(id) {
  if (state.L.some(t => t.id === id)) return 'L';
  if (state.R.some(t => t.id === id)) return 'R';
  return null;
}

/* ---------- coach ---------- */
function say(text, why) {
  coachEl.querySelectorAll('.msg.new').forEach(m => m.classList.remove('new'));
  const m = document.createElement('div');
  m.className = 'msg new';
  m.innerHTML = text + (why ? ` <span class="why">${why}</span>` : '');
  coachEl.appendChild(m);
  coachEl.scrollTop = coachEl.scrollHeight;
}

/* ---------- equation bar (clickable chips) ---------- */
function addOp(parent, ch) {
  const s = document.createElement('span');
  s.className = (ch === '=') ? 'eq' : 'op';
  s.textContent = ch;
  parent.appendChild(s);
}
function addChip(parent, t) {
  const c = document.createElement('span');
  c.className = 'chip ' + (t.isX ? 'x' : 'num') + (t.id === selId ? ' sel' : '');
  c.textContent = EQ.body(t);
  c.onclick = () => selectTerm(t.id);
  parent.appendChild(c);
}
function renderSideChips(side) {
  side.forEach((t, i) => {
    if (i === 0) { if (t.c < 0) addOp(eqBar, '−'); }
    else addOp(eqBar, t.c < 0 ? '−' : '+');
    addChip(eqBar, t);
  });
}
function renderEquationBar() {
  eqBar.innerHTML = '';
  renderSideChips(state.L);
  addOp(eqBar, '=');
  renderSideChips(state.R);
}

/* ---------- actions ---------- */
function addBtn(cls, label, fn) {
  const b = document.createElement('button');
  b.className = 'btn ' + cls;
  b.innerHTML = label;
  b.onclick = fn;
  actionsEl.appendChild(b);
}
function addHint(text) {
  const h = document.createElement('div');
  h.className = 'hint-row';
  h.innerHTML = text;
  actionsEl.appendChild(h);
}
function buildActions() {
  actionsEl.innerHTML = '';
  if (solved) return;

  const sel = selectedTerm();
  if (!sel) {
    addHint('👆 Tap a number or the <b>x</b> to choose what to work with.');
    return;
  }
  const side = sideOf(sel.id);

  const twin = EQ.twin(state, sel, side);
  if (twin) {
    addBtn('both', `⚖️ Take ${EQ.body(sel)} off BOTH sides`, () => removeBoth(sel, side));
    addBtn('ghost tiny', '🤔 Why both?', whyBoth);
  }
  if (state[side].length > 1) {
    addBtn('cross', `↔️ Send ${EQ.body(sel)} across the =`, () => sendAcross(sel, side));
  }
  if (EQ.numbers(state[side]).length >= 2) {
    addBtn('add', '➕ Add the numbers on this side', () => combineNumbers(side));
  }
  if (EQ.loneNegX(state)) {
    addBtn('ghost', '± Flip the sign on both sides', flipBoth);
  }
  if (!twin && state[side].length === 1 && EQ.numbers(state[side]).length < 2) {
    addHint('That pan has just one piece. Try working on the other pan 🙂');
  }
}

/* ---------- the operations ---------- */
function removeBoth(term, side) {
  const twin = EQ.twin(state, term, side);
  if (!twin) return;
  state[side] = state[side].filter(t => t.id !== term.id);
  const o = EQ.other(side);
  state[o] = state[o].filter(t => t.id !== twin.id);
  selId = null;
  say(`✅ Took <b>${EQ.body(term)}</b> off <b>both</b> pans.`,
      'Same amount removed from each side → it stays fair, so the scale stays balanced.');
  refresh();
}

function sendAcross(term, side) {
  if (state[side].length <= 1) return;
  const before = (term.c < 0 ? '−' : '+') + EQ.body(term);
  state[side] = state[side].filter(t => t.id !== term.id);
  term.c = -term.c;
  state[EQ.other(side)].push(term);
  const after = (term.c < 0 ? '−' : '+') + EQ.body(term);
  selId = null;
  say(`↔️ Moved <b>${EQ.body(term)}</b> across the =. It changed from <b>${before}</b> to <b>${after}</b>.`,
      'Moving to the other side flips + and −. (It is the same as doing the opposite to both sides.)');
  refresh();
}

function combineNumbers(side) {
  const nums = EQ.numbers(state[side]);
  if (nums.length < 2) return;
  const sum = nums.reduce((a, t) => a + t.c, 0);
  const expr = nums.map((t, i) =>
    (i === 0 ? (t.c < 0 ? '−' : '') : (t.c < 0 ? ' − ' : ' + ')) + Math.abs(t.c)).join('');
  const hasX = state[side].some(t => t.isX);
  state[side] = state[side].filter(t => t.isX);   // keep x, drop numbers
  if (!(sum === 0 && hasX)) state[side].push(EQ.term(sum, false));
  selId = null;
  say(`➕ Added the numbers on that side: <b>${expr} = ${sum}</b>.`);
  refresh();
}

function flipBoth() {
  ['L', 'R'].forEach(s => state[s].forEach(t => { t.c = -t.c; }));
  selId = null;
  say('± Flipped + and − on <b>both</b> sides at once — still fair.');
  refresh();
}

/* the teaching moment the whole tool is built around */
function whyBoth() {
  say('👀 Watch what happens if we take it off only ONE pan…');
  Scale.demoTilt(11, 1500, () => {
    say('See? One pan got lighter and the scale <b>tipped over</b> — not fair anymore!',
        'That is why we always take the same amount off BOTH sides. Then it stays balanced.');
  });
}

/* ---------- win ---------- */
function checkWin() {
  const w = EQ.win(state);
  if (!w) return false;
  solved = true;
  const N = w.x;
  const lv = sideValue(currentDef.L, N);
  const rv = sideValue(currentDef.R, N);
  winBanner.innerHTML = `x = ${N} 🎉<small>You solved it!</small>`;
  winBanner.classList.add('show');
  say(`🎉 <b>x = ${N}</b>. You did it!`,
      `Check: put x = ${N} back in. The left side makes ${lv} and the right side makes ${rv}. They match!`);
  return true;
}
function sideValue(defSide, x) {
  return defSide.reduce((a, [k, v]) => a + (k === 'x' ? v * x : v), 0);
}

/* ---------- render cycle ---------- */
function setBadge() {
  if (solved) { badge.textContent = '🎉 Solved!'; badge.classList.remove('tipped'); return; }
  badge.textContent = '⚖️ Balanced — both sides are equal';
  badge.classList.remove('tipped');
}
function refresh() {
  renderEquationBar();
  Scale.render(state, selId);
  setBadge();
  if (!solved) checkWin();
  buildActions();
}

function selectTerm(id) {
  if (solved) return;
  selId = (selId === id) ? null : id;
  refresh();
}

/* ---------- load a puzzle ---------- */
function loadProblem(p) {
  currentDef = p.def;
  state = EQ.build(p.def);
  selId = null;
  solved = false;
  winBanner.classList.remove('show');
  coachEl.innerHTML = '';
  say('🧮 ' + p.intro);
  refresh();
}

/* ---------- boot ---------- */
function boot() {
  Scale.init();
  Scale.onBlockClick = selectTerm;

  PROBLEMS.forEach((p, i) => {
    const o = document.createElement('option');
    o.value = i; o.textContent = p.title;
    picker.appendChild(o);
  });
  picker.onchange = () => loadProblem(PROBLEMS[picker.value]);
  document.getElementById('resetBtn').onclick = () => loadProblem(PROBLEMS[picker.value]);
  document.getElementById('stage').addEventListener('click', () => { if (selId != null) { selId = null; refresh(); } });

  loadProblem(PROBLEMS[0]);
}
document.addEventListener('DOMContentLoaded', boot);
