/* scale.js — draws the balance, animates the beam by weight, and handles
   dragging of blocks. The beam rotates about the fulcrum; pans hang from
   the beam ends. Tilt is driven by the weight difference the app feeds in. */

const Scale = {
  beam: null, panL: null, panR: null, stage: null, desk: null, supply: null,
  onBlockClick: null,   // tap a block        -> app
  onDrag: null,         // block being dragged -> app (returns nothing)
  onDrop: null,         // block dropped       -> app (id, target, info)
  onDropSupply: null,   // supply weight dropped -> app (val, target)

  MAX: 12,              // biggest gentle tilt, degrees
  SCALE: 26,            // weight units that map to a strong tilt
  BEAM_TOP: 70, STRING: 64,

  _drag: null,
  _ac: null,

  init() {
    this.beam  = document.getElementById('beam');
    this.panL  = document.getElementById('panL');
    this.panR  = document.getElementById('panR');
    this.stage = document.getElementById('stage');
    this.desk  = document.getElementById('desk');
    this.supply = document.getElementById('supply');
    window.addEventListener('resize', () => this.position(this._lastAngle || 0));
  },

  angleFor(diff) { return this.MAX * Math.tanh(diff / this.SCALE); },

  /* place beam + pans for a tilt angle (degrees). +ve = right side down. */
  position(angleDeg) {
    this._lastAngle = angleDeg;
    const a = angleDeg * Math.PI / 180;
    const half = this.beam.offsetWidth / 2;
    const cx = this.stage.clientWidth / 2;
    const cy = this.BEAM_TOP + 7;

    this.beam.style.transform = `rotate(${angleDeg}deg)`;

    const place = (pan, sign) => {
      const x = cx + sign * half * Math.cos(a);
      const y = cy + sign * half * Math.sin(a);
      pan.style.left = (x - pan.offsetWidth / 2) + 'px';
      pan.style.top  = (y + this.STRING) + 'px';
    };
    place(this.panL, -1);
    place(this.panR, +1);
  },

  /* ---------- blocks ---------- */
  blockEl(term) {
    const b = document.createElement('div');
    b.className = 'block ' + EQ.kind(term);
    b.dataset.id = term.id;
    if (term.c < 0) {
      // a balloon: shows −n, pulls the pan UP
      b.textContent = '';
      const num = document.createElement('span');
      num.className = 'bnum';
      num.textContent = '−' + EQ.body(term);
      b.appendChild(num);
    } else {
      b.textContent = EQ.body(term);
    }
    b.addEventListener('pointerdown', (e) => this._down(e, term, b));
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.onBlockClick) this.onBlockClick(term.id);
    });
    return b;
  },

  /* a draggable supply weight (infinite): dragging it spawns a +val weight. */
  supplyEl(val) {
    const b = document.createElement('div');
    b.className = 'block num supply';
    b.dataset.supply = val;
    b.textContent = String(val);
    b.addEventListener('pointerdown', (e) => this._down(e, { supply: val, c: val }, b));
    return b;
  },

  renderSupply(vals) {
    if (!this.supply) return;
    this.supply.querySelectorAll('.block').forEach(b => b.remove());
    const has = vals && vals.length;
    this.supply.classList.toggle('hidden', !has);
    if (has) vals.forEach(v => this.supply.appendChild(this.supplyEl(v)));
  },

  renderSide(pan, side, selId) {
    pan.innerHTML = '';
    const blocks = document.createElement('div');
    blocks.className = 'blocks';
    side.forEach(t => {
      const el = this.blockEl(t);
      if (t.id === selId) el.classList.add('sel');
      blocks.appendChild(el);
    });
    const dish = document.createElement('div');
    dish.className = 'dish';
    pan.appendChild(blocks);
    pan.appendChild(dish);
  },

  /* draw the set-aside blocks, each at its stored {x,y} (px relative to the
     desk). Blocks here are the same draggable elements as on the pans. */
  renderDesk(parked, selId) {
    // keep the label, remove old parked blocks
    this.desk.querySelectorAll('.block').forEach(b => b.remove());
    this.desk.classList.toggle('has-blocks', parked.length > 0);
    parked.forEach(p => {
      const el = this.blockEl(p.term);
      el.classList.add('parked');
      if (p.term.id === selId) el.classList.add('sel');
      el.style.left = p.x + 'px';
      el.style.top  = p.y + 'px';
      this.desk.appendChild(el);
    });
  },

  render(state, selId, angle) {
    this.renderSide(this.panL, state.L, selId);
    this.renderSide(this.panR, state.R, selId);
    this.renderDesk(state.desk || [], selId);
    this.renderSupply(state.supply || []);
    requestAnimationFrame(() => this.position(angle || 0));
  },

  /* ---------- drag handling (mouse + touch via pointer events) ----------
     We never drag the live block (a re-render would destroy it). Instead we
     hide the source block and drag a position:fixed *ghost* clone. Drag state
     holds only the term id + the ghost, so re-renders are harmless. Pointer
     ownership is locked to one pointerId via setPointerCapture + AbortController. */
  _down(e, term, el) {
    if (e.button != null && e.button !== 0) return;   // primary button / touch only
    if (this._drag) return;                            // ignore re-entrant down
    const r = el.getBoundingClientRect();
    this._drag = {
      id: term.id, supply: term.supply, src: el, ghost: null,
      pid: e.pointerId,
      sx: e.clientX, sy: e.clientY,        // where the grab started
      gx: e.clientX - r.left,              // grab offset inside the block
      gy: e.clientY - r.top,
      w: r.width, h: r.height, moved: false,
    };
    this._ac = new AbortController();
    const sig = { signal: this._ac.signal };
    document.addEventListener('pointermove', (ev) => this._move(ev), sig);
    document.addEventListener('pointerup', (ev) => this._up(ev), sig);
    document.addEventListener('pointercancel', (ev) => this._up(ev), sig);
    try { el.setPointerCapture(e.pointerId); } catch (_) {}
  },

  _move(e) {
    const d = this._drag;
    if (!d || e.pointerId !== d.pid) return;
    const dx = e.clientX - d.sx, dy = e.clientY - d.sy;
    if (!d.moved && Math.hypot(dx, dy) < 6) return;
    e.preventDefault();                    // no scroll/text-selection while dragging
    if (!d.moved) {
      d.moved = true;
      document.body.classList.add('dragging');
      // build the ghost from the source, then hide the source in place
      const g = d.src.cloneNode(true);
      g.classList.add('drag');
      g.style.width = d.w + 'px';
      g.style.height = d.h + 'px';
      document.body.appendChild(g);
      d.ghost = g;
      // supply weights are infinite — leave the source visible so a fresh one
      // appears to stay in the bin; real blocks hide their slot while dragging.
      if (d.supply == null) d.src.classList.add('ghosted');
    }
    d.ghost.style.left = (e.clientX - d.gx) + 'px';
    d.ghost.style.top  = (e.clientY - d.gy) + 'px';
    this._highlight(e.clientX, e.clientY);
    if (this.onDrag && d.supply == null) this.onDrag(d.id);
  },

  _up(e) {
    const d = this._drag;
    if (!d || e.pointerId !== d.pid) return;   // only the owning pointer ends it
    this._drag = null;
    if (this._ac) { this._ac.abort(); this._ac = null; }
    if (d.ghost) d.ghost.remove();
    if (!d.moved) return;                  // a tap: native click handles select

    // it was a real drag: swallow the synthetic click that follows, once.
    this._armClickGuard();
    document.body.classList.remove('dragging');
    this._clearHighlight();
    const cancelled = (e.type === 'pointercancel');
    const target = cancelled ? null : this._target(e.clientX, e.clientY);
    if (d.supply != null) {                 // a fresh weight from the supply bin
      if (this.onDropSupply) this.onDropSupply(d.supply, target);
      return;
    }
    // drop position relative to the desk box (block top-left), so the app can
    // park it exactly where the finger let go.
    const dr = this.desk.getBoundingClientRect();
    const info = { x: (e.clientX - d.gx) - dr.left, y: (e.clientY - d.gy) - dr.top,
                   w: d.w, h: d.h, deskW: dr.width, deskH: dr.height };
    if (this.onDrop) this.onDrop(d.id, target, info);   // app re-renders
  },

  /* one-shot capture-phase guard: eats the click that a drag-release fires,
     without depending on the (now re-rendered) source block's own handler. */
  _armClickGuard() {
    const guard = (ev) => {
      ev.stopPropagation();
      ev.preventDefault();
      window.removeEventListener('click', guard, true);
    };
    window.addEventListener('click', guard, true);
    // safety: if no click arrives, drop the guard on the next frame
    setTimeout(() => window.removeEventListener('click', guard, true), 350);
  },

  _hit(el, x, y) {
    const r = el.getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  },
  _target(x, y) {
    // pans win over the desk when they overlap (you're putting it back on)
    if (this._hit(this.panL, x, y)) return 'L';
    if (this._hit(this.panR, x, y)) return 'R';
    if (this.desk && this._hit(this.desk, x, y)) return 'desk';
    return null;
  },
  _highlight(x, y) {
    const t = this._target(x, y);
    this.desk.classList.toggle('over', t === 'desk');
    this.panL.classList.toggle('over', t === 'L');
    this.panR.classList.toggle('over', t === 'R');
  },
  _clearHighlight() {
    this.desk.classList.remove('over');
    this.panL.classList.remove('over');
    this.panR.classList.remove('over');
  },

  /* a little life when a puzzle loads */
  wobble() {
    this.position(4);
    setTimeout(() => this.position(0), 260);
  },

  /* Tilt to `deg`, hold, then return to level (used by the "Why both?" demo). */
  demoTilt(deg, holdMs, done) {
    this.position(deg);
    setTimeout(() => {
      this.position(0);
      if (done) setTimeout(done, 700);
    }, holdMs);
  },
};
