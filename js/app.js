/* app.js — wires the model + scale + UI together, and does the talking. */

const PROBLEMS = [
  { id: 'twins', title: 'x + 22 = 30 + 22   (the +22 trick)',
    def: { L: [['x', 1], ['n', 22]], R: [['n', 30], ['n', 22]] },
    intro: 'Both pans weigh the same — that is what = means. See the <b>22</b> on BOTH pans? <b>Drag one 22 onto the 🧺 shelf</b> and watch the scale tip! Then set the OTHER 22 aside and it balances again — leaving x all alone.' },
  { id: 'p1', title: 'x + 7 = 5 + 7',
    def: { L: [['x', 1], ['n', 7]], R: [['n', 5], ['n', 7]] },
    intro: 'There is a <b>7</b> on both pans. Drag both 7s onto the 🧺 shelf — one at a time — and watch what happens. When only x is left, the scale tells you what x weighs!' },
  { id: 'p2', title: '9 + x = 9 + 6',
    def: { L: [['n', 9], ['x', 1]], R: [['n', 9], ['n', 6]] },
    intro: 'Same idea — there is a <b>9</b> on both pans. Take both 9s off to leave x on its own.' },
  { id: 'p3', title: 'x + 4 + 9 = 13 + 4 + 9',
    def: { L: [['x', 1], ['n', 4], ['n', 9]], R: [['n', 13], ['n', 4], ['n', 9]] },
    intro: 'This one has <b>two</b> matching pairs: a 4 on both pans and a 9 on both pans. Take each pair off (both 4s, both 9s) to leave x alone.' },
  { id: 'neg', title: 'x − 3 = 5   (meet the balloon!)',
    def: { L: [['x', 1], ['n', -3]], R: [['n', 5]] },
    intro: 'A <b>−3 is a balloon</b> 🎈 — it pulls the pan UP instead of down (you cannot put negative weight on a scale, but a balloon lifts!). To get rid of it, drag a <b>+3 weight from the bin</b> onto the SAME pan: the weight and the balloon cancel out and float away — that is <b>+3 and −3 = 0</b>. Then add a 3 to the OTHER pan too, to keep it fair!' },
  { id: 'neg2', title: 'x − 5 = 2',
    def: { L: [['x', 1], ['n', -5]], R: [['n', 2]] },
    intro: 'Another balloon 🎈. Drag a <b>+5 weight</b> onto the balloon to pop the pair (−5 and +5 = 0), then add a 5 to the other pan too.' },
  { id: 'neg3', title: '8 = x − 2   (balloon on the right)',
    def: { L: [['n', 8]], R: [['x', 1], ['n', -2]] },
    intro: 'This time the balloon 🎈 is on the <b>right</b>, with x. Drop a <b>+2 weight</b> on the right to cancel it, then add a 2 to the left to stay fair.' },
  { id: 'neg4', title: 'x − 4 = 3 − 4   (a balloon on EACH pan)',
    def: { L: [['x', 1], ['n', -4]], R: [['n', 3], ['n', -4]] },
    intro: 'There is a balloon 🎈 on <b>both</b> pans! Drop a <b>+4 weight</b> on each pan to pop both balloons. Same change to both sides → it stays fair, and x is left alone.' },
  { id: 'neg5', title: 'x − 6 = 5 + 3   (balloon + adding up)',
    def: { L: [['x', 1], ['n', -6]], R: [['n', 5], ['n', 3]] },
    intro: 'First tidy the right pan: tap a number and press ➕ to add 5 + 3 = 8. Then pop the balloon 🎈 with a <b>+6 weight</b>, and add a 6 to the other pan too — then ➕ add those up to find x.' },
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
function deskTerm(id) {
  const p = state.desk.find(d => d.term.id === id);
  return p ? p.term : null;
}
function termById(id) {
  return state.L.find(t => t.id === id) ||
         state.R.find(t => t.id === id) ||
         deskTerm(id) || null;
}
function selectedTerm() {
  if (selId == null) return null;
  return state.L.find(t => t.id === selId) ||
         state.R.find(t => t.id === selId) ||
         deskTerm(selId) || null;
}
// 'L', 'R', 'desk', or null — where the block with this id currently lives.
function sideOf(id) {
  if (state.L.some(t => t.id === id)) return 'L';
  if (state.R.some(t => t.id === id)) return 'R';
  if (state.desk.some(d => d.term.id === id)) return 'desk';
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
    addHint('👆 <b>Drag</b> a block to the 🧺 shelf to set it aside (watch the scale tip!), then drag its partner off too. You can drag shelf blocks back any time. Tap a block for helper buttons.');
    return;
  }
  const side = sideOf(sel.id);

  if (side === 'desk') {
    addHint('This block is on the 🧺 shelf. <b>Drag it back onto a pan</b> whenever you want.');
    return;
  }

  const twin = EQ.twin(state, sel, side);
  if (twin) {
    addBtn('both', `⚖️ Set ${EQ.body(sel)} aside from BOTH pans`, () => removeBoth(sel, side));
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

// pull a block out of wherever it lives (a pan or the shelf).
function detach(id, from) {
  if (from === 'desk') state.desk = state.desk.filter(d => d.term.id !== id);
  else state[from] = state[from].filter(t => t.id !== id);
}
// keep a parked block fully inside the shelf box.
function clampToDesk(info) {
  const maxX = Math.max(0, (info.deskW || 9999) - info.w);
  const maxY = Math.max(0, (info.deskH || 9999) - info.h);
  return { x: Math.min(Math.max(0, info.x), maxX),
           y: Math.min(Math.max(0, info.y), maxY) };
}

// Set a block aside on the shelf. If it came off a pan, that pan gets lighter
// (the scale tips) unless its partner is gone too.
function setAside(term, from, info) {
  if (from === 'desk') { reparkLoose(term, info); return; }  // just moved on shelf
  detach(term.id, from);
  const pos = clampToDesk(info);
  state.desk.push({ term, x: pos.x, y: pos.y });
  selId = null;
  const balanced = Math.abs(weightDiff()) < 1e-9;
  if (balanced) {
    say(`✅ Set <b>${EQ.body(term)}</b> aside — and the scale stayed level!`,
        'Both pans lost the same amount, so it is still fair. That is the trick.');
  } else {
    say(`⚖️ Set <b>${EQ.body(term)}</b> aside from the ${from === 'L' ? 'left' : 'right'} pan — now that side is lighter, so the scale tips.`,
        'To keep it level, take the SAME amount off the OTHER pan too. (Set-aside blocks wait on the shelf — drag one back any time.)');
  }
  refresh();
}

// move an already-parked block to a new spot on the shelf.
function reparkLoose(term, info) {
  const pos = clampToDesk(info);
  const p = state.desk.find(d => d.term.id === term.id);
  if (p) { p.x = pos.x; p.y = pos.y; }
  selId = null;
  refresh();
}

// Button version of the fair move: set a matched pair aside from both pans.
function removeBoth(term, side) {
  const twin = EQ.twin(state, term, side);
  if (!twin) return;
  detach(term.id, side);
  detach(twin.id, EQ.other(side));
  // tuck the pair onto the shelf, side by side
  stash(term);
  stash(twin);
  selId = null;
  say(`✅ Set <b>${EQ.body(term)}</b> aside from <b>both</b> pans.`,
      'Same amount removed from each side → it stays fair, so the scale stays level.');
  refresh();
}

// place a block on the shelf at an auto-chosen free-ish spot.
function stash(term) {
  const n = state.desk.length;
  state.desk.push({ term, x: 14 + (n % 6) * 64, y: 30 + Math.floor(n / 6) * 56 });
}

// Move a block onto a pan (from the other pan or from the shelf). Weight
// really moves there (no sign trick) — so the scale leans that way.
function moveToPan(term, from, target) {
  if (target === from) { refresh(); return; }   // dropped back where it was
  detach(term.id, from);
  state[target].push(term);
  selId = null;
  if (from === 'desk') {
    say(`✋ Put <b>${EQ.body(term)}</b> back onto the ${target === 'L' ? 'left' : 'right'} pan.`,
        'That pan got heavier — adding to one side alone tips the scale.');
  } else {
    say(`✋ Moved <b>${EQ.body(term)}</b> onto the ${target === 'L' ? 'left' : 'right'} pan.`,
        'That pan got heavier and the other got lighter — moving weight to one side tips the scale. To stay fair, change both pans the same way.');
  }
  refresh();
}

// Drop a fresh +val weight onto a pan. If that pan has a matching −val
// balloon, the two cancel and float away (a "zero pair"). Otherwise the
// weight simply joins the pan and it gets heavier.
function dropWeight(val, side) {
  const balloon = state[side].find(t => !t.isX && t.c === -val);
  if (balloon) {
    state[side] = state[side].filter(t => t.id !== balloon.id);   // balloon gone
    selId = null;
    const balanced = Math.abs(weightDiff()) < 1e-9;
    say(`🎈 The <b>+${val}</b> weight and the <b>−${val}</b> balloon cancelled out — <b>+${val} and −${val} make 0</b>! They floated away together.`,
        balanced
          ? 'Both pans changed by the same amount, so the scale is level again — fair!'
          : 'That pan changed — now add a ' + val + ' to the OTHER pan too, to keep it fair.');
  } else {
    state[side].push(EQ.term(val, false));   // just an added weight
    selId = null;
    say(`➕ Added a <b>${val}</b> weight to the ${side === 'L' ? 'left' : 'right'} pan.`,
        'That pan got heavier. To stay fair, add the same to the other pan.');
  }
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
// the weights the supply bin should offer: one for each distinct balloon
// (negative) value anywhere in the starting puzzle.
function supplyValues(def) {
  const vals = new Set();
  [...def.L, ...def.R].forEach(([k, v]) => { if (k === 'n' && v < 0) vals.add(-v); });
  return [...vals].sort((a, b) => a - b);
}

function loadProblem(p) {
  currentDef = p.def;
  SOLUTION = solveX(p.def);
  state = EQ.build(p.def);
  state.desk = [];                 // blocks set aside off the scale: {term,x,y}
  state.supply = supplyValues(p.def);  // infinite +weights to cancel balloons
  // the balloon explainer (and its try-it lab) ride along on balloon puzzles
  document.getElementById('explain').classList.toggle('hidden', state.supply.length === 0);
  if (window.BalloonLab) BalloonLab.reset();
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

  // where the block was dropped — a real balance: the block STAYS where you
  // put it. Pans hold weight; the shelf holds set-aside blocks at free spots.
  Scale.onDrop = (id, target, info) => {
    if (solved) { refresh(); return; }
    const from = sideOf(id);
    const term = termById(id);
    if (!term || !from) { refresh(); return; }

    if (target === 'desk') {
      // a balloon can't be set aside — the only way to remove it is to cancel
      // it with its opposite weight. Snap it back and explain.
      if (term.c < 0) {
        say('🎈 You cannot just take a balloon off — it floats! To get rid of <b>−' +
            EQ.body(term) + '</b>, drag a <b>+' + EQ.body(term) +
            ' weight from the bin</b> onto its pan so they cancel out.');
        refresh();
      } else {
        setAside(term, from, info);           // park it on the shelf
      }
    } else if (target === 'L' || target === 'R') {
      moveToPan(term, from, target);          // drop onto a pan
    } else {
      // dropped in empty space: if it came from the shelf, re-park it where
      // it landed (so it doesn't jump home); otherwise snap back.
      if (from === 'desk' && info) { reparkLoose(term, info); }
      else refresh();
    }
  };

  // a fresh +weight from the supply bin was dropped on a pan
  Scale.onDropSupply = (val, target) => {
    if (solved) { refresh(); return; }
    if (target === 'L' || target === 'R') dropWeight(val, target);
    else refresh();
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
