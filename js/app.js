/* app.js — wires the model + scale + UI together, and does the talking. */

const PROBLEMS = [
  { id: 'twins', title: 'x + 22 = 30 + 22   (the +22 trick)',
    def: { L: [['x', 1], ['n', 22]], R: [['n', 30], ['n', 22]] },
    intro: 'Both pans weigh the same — that is what = means. See the <b>22</b> on BOTH pans? <b>Drag one 22 to the 🗑️ tray</b> and watch the scale tip! Then take the OTHER 22 off and it balances again — leaving x all alone.' },
  { id: 'p1', title: 'x + 7 = 5 + 7',
    def: { L: [['x', 1], ['n', 7]], R: [['n', 5], ['n', 7]] },
    intro: 'There is a <b>7</b> on both pans. Drag both 7s to the 🗑️ tray — one at a time — and watch what happens. When only x is left, the scale tells you what x weighs!' },
  { id: 'p2', title: '9 + x = 9 + 6',
    def: { L: [['n', 9], ['x', 1]], R: [['n', 9], ['n', 6]] },
    intro: 'Same idea — there is a <b>9</b> on both pans. Take both 9s off to leave x on its own.' },
  { id: 'p3', title: 'x + 4 + 9 = 13 + 4 + 9',
    def: { L: [['x', 1], ['n', 4], ['n', 9]], R: [['n', 13], ['n', 4], ['n', 9]] },
    intro: 'This one has <b>two</b> matching pairs: a 4 on both pans and a 9 on both pans. Take each pair off (both 4s, both 9s) to leave x alone.' },
];

let state = null;
let currentDef = null;
let selId = null;
let solved = false;
let SOLUTION = 0;   // the true value of x for this puzzle (used to weigh the pans)

/* ---------- weight model ---------- */
// Solve the linear equation once so the scale knows what x "really weighs".
function solveX(def) {
  let Lc = 0, La = 0, Rc = 0, Ra = 0;
  def.L.forEach(([k, v]) => k === 'x' ? La += v : Lc += v);
  def.R.forEach(([k, v]) => k === 'x' ? Ra += v : Rc += v);
  const denom = La - Ra;
  return denom === 0 ? 0 : (Rc - Lc) / denom;
}
function termValue(t) { return t.isX ? t.c * SOLUTION : t.c; }
function weightSide(arr, skipId) {
  return arr.reduce((a, t) => a + (t.id === skipId ? 0 : termValue(t)), 0);
}
// signed weight difference (right − left); ~0 whenever the equation holds.
function weightDiff(skipId, skipSide) {
  const wL = weightSide(state.L, skipSide === 'L' ? skipId : null);
  const wR = weightSide(state.R, skipSide === 'R' ? skipId : null);
  return wR - wL;
}

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
  const diff = weightDiff();              // right − left
  const rel = Math.abs(diff) < 1e-9 ? '=' : (diff > 0 ? '<' : '>');
  addOp(eqBar, rel);
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
    addHint('👆 <b>Drag</b> a block to the 🗑️ tray to take it off the scale (watch it tip!), or tap a block to see helper buttons.');
    return;
  }
  const side = sideOf(sel.id);

  const twin = EQ.twin(state, sel, side);
  if (twin) {
    addBtn('both', `⚖️ Take ${EQ.body(sel)} off BOTH pans`, () => removeBoth(sel, side));
  }
  if (EQ.numbers(state[side]).length >= 2) {
    addBtn('add', '➕ Add the numbers on this pan', () => combineNumbers(side));
  }
  if (!twin && !sel.isX && EQ.numbers(state[side]).length < 2) {
    addHint('Hmm, this block has no match on the other pan. Look for a number that is on BOTH pans 🙂');
  }
  if (sel.isX) {
    addHint('That is the mystery <b>x</b>! Clear the other blocks off its pan to find out what it weighs.');
  }
}

/* ---------- the operations (physical balance) ---------- */

// Lift a block right off the scale. The pan it left gets lighter, so the
// scale tilts — unless an equal block is also gone from the other pan.
function takeOff(term, side) {
  state[side] = state[side].filter(t => t.id !== term.id);
  selId = null;
  const balanced = Math.abs(weightDiff()) < 1e-9;
  if (balanced) {
    say(`✅ Took <b>${EQ.body(term)}</b> off — and the scale stayed level!`,
        'Both pans lost the same amount, so it is still fair. That is the trick.');
  } else {
    say(`⚖️ Took <b>${EQ.body(term)}</b> off the ${side === 'L' ? 'left' : 'right'} pan — now that side is lighter, so the scale tips.`,
        'To keep it level, take the SAME amount off the OTHER pan too.');
  }
  refresh();
}

// Button version of the fair move: remove a matched pair from both pans at once.
function removeBoth(term, side) {
  const twin = EQ.twin(state, term, side);
  if (!twin) return;
  state[side] = state[side].filter(t => t.id !== term.id);
  const o = EQ.other(side);
  state[o] = state[o].filter(t => t.id !== twin.id);
  selId = null;
  say(`✅ Took <b>${EQ.body(term)}</b> off <b>both</b> pans.`,
      'Same amount removed from each side → it stays fair, so the scale stays level.');
  refresh();
}

// Move a block onto a pan. If it crosses to the other pan, weight really
// moves there (no sign trick) — so the scale leans that way.
function moveToPan(term, side, target) {
  if (target === side) { refresh(); return; }   // dropped back on its own pan
  state[side] = state[side].filter(t => t.id !== term.id);
  state[target].push(term);
  selId = null;
  say(`✋ Moved <b>${EQ.body(term)}</b> onto the ${target === 'L' ? 'left' : 'right'} pan.`,
      'That pan got heavier and the other got lighter — moving weight to one side tips the scale. To stay fair, change both pans the same way.');
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

/* ---------- win ---------- */
function checkWin() {
  const w = EQ.win(state);
  if (!w) return false;
  if (Math.abs(weightDiff()) > 1e-9) return false;   // only a win when level
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
  if (solved) {
    badge.textContent = '🎉 Solved!';
    badge.classList.remove('tipped');
    return;
  }
  const diff = weightDiff();              // right − left
  if (Math.abs(diff) < 1e-9) {
    badge.textContent = '⚖️ Balanced — both pans weigh the same';
    badge.classList.remove('tipped');
  } else {
    const heavy = diff > 0 ? 'right' : 'left';
    badge.textContent = `↕️ Not balanced — the ${heavy} pan is heavier`;
    badge.classList.add('tipped');
  }
}
function refresh() {
  renderEquationBar();
  Scale.render(state, selId, Scale.angleFor(weightDiff()));
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
  SOLUTION = solveX(p.def);
  state = EQ.build(p.def);
  selId = null;
  solved = false;
  winBanner.classList.remove('show');
  coachEl.innerHTML = '';
  say('🧮 ' + p.intro);
  refresh();
  Scale.wobble();
}

/* ---------- boot ---------- */
function boot() {
  Scale.init();
  Scale.onBlockClick = selectTerm;

  // live tilt while a block is being dragged off its pan
  Scale.onDrag = (id) => {
    if (solved) return;
    const side = sideOf(id);
    Scale.position(Scale.angleFor(weightDiff(id, side)));
  };

  // where the block was dropped — a real balance: the block STAYS there.
  Scale.onDrop = (id, target) => {
    if (solved) { refresh(); return; }
    const side = sideOf(id);
    const term = (state.L.concat(state.R)).find(t => t.id === id);
    if (!term || !side) { refresh(); return; }

    if (target === 'remove') {
      takeOff(term, side);                    // lift it off the scale entirely
    } else if (target === 'L' || target === 'R') {
      moveToPan(term, side, target);          // drop it on a pan (maybe the other)
    } else {
      refresh();                              // dropped in empty space -> snap home
    }
  };

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
