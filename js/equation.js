/* equation.js — the maths model. No DOM here, pure data + helpers. */

const EQ = {
  _uid: 0,
  term(c, isX) { return { id: ++this._uid, c: c, isX: !!isX }; },

  /* Build a fresh state from a problem definition.
     def = { L: [['n',28],['n',22]], R: [['n',30],['n',22],['x',-1]] }      */
  build(def) {
    const side = (arr) => arr.map(([k, v]) => this.term(v, k === 'x'));
    return { L: side(def.L), R: side(def.R) };
  },

  other(side) { return side === 'L' ? 'R' : 'L'; },

  /* ----- text helpers ----- */
  sign(t) { return t.c < 0 ? '−' : '+'; },
  body(t) {
    if (t.isX) { const a = Math.abs(t.c); return (a === 1 ? '' : a) + 'x'; }
    return String(Math.abs(t.c));
  },
  // signed body for a standalone block label, e.g. "−22", "x", "30"
  label(t) { return (t.c < 0 ? '−' : '') + this.body(t); },

  kind(t) {
    if (t.c < 0) return 'balloon';   // negative = a balloon that pulls UP
    return t.isX ? 'x' : 'num';
  },

  /* Does `term` (living on `side`) have an identical twin on the other side?
     Identical = same isX and same coefficient (incl. sign).
     Returns the twin term object or null. */
  twin(state, term, side) {
    const o = state[this.other(side)];
    return o.find(t => t.isX === term.isX && t.c === term.c) || null;
  },

  numbers(side) { return side.filter(t => !t.isX); },

  /* Win = one side is exactly [ +x ] and the other is exactly [ one number ]. */
  win(state) {
    const check = (a, b) => a.length === 1 && b.length === 1 &&
      a[0].isX && a[0].c === 1 && !b[0].isX;
    if (check(state.L, state.R)) return { x: state.R[0].c };
    if (check(state.R, state.L)) return { x: state.L[0].c };
    return null;
  },

  /* A lone −x on one side (needs sign flip to finish). */
  loneNegX(state) {
    const isNegX = (s) => s.length === 1 && s[0].isX && s[0].c === -1;
    return isNegX(state.L) || isNegX(state.R);
  },
};
