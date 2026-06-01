/* scale.js — draws the balance, animates the beam by weight, and handles
   dragging of blocks. The beam rotates about the fulcrum; pans hang from
   the beam ends. Tilt is driven by the weight difference the app feeds in. */

const Scale = {
  beam: null, panL: null, panR: null, stage: null, tray: null,
  onBlockClick: null,   // tap a block        -> app
  onDrag: null,         // block being dragged -> app (returns nothing)
  onDrop: null,         // block dropped       -> app (id, target)

  MAX: 12,              // biggest gentle tilt, degrees
  SCALE: 26,            // weight units that map to a strong tilt
  BEAM_TOP: 70, STRING: 64,

  _drag: null,
  _suppressClick: false,

  init() {
    this.beam  = document.getElementById('beam');
    this.panL  = document.getElementById('panL');
    this.panR  = document.getElementById('panR');
    this.stage = document.getElementById('stage');
    this.tray  = document.getElementById('tray');
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
    b.textContent = EQ.body(term);
    if (term.c < 0) {
      const tag = document.createElement('span');
      tag.className = 'tag';
      tag.textContent = 'take away';
      b.appendChild(tag);
    }
    b.addEventListener('pointerdown', (e) => this._down(e, term, b));
    b.addEventListener('pointermove', (e) => this._move(e));
    b.addEventListener('pointerup',   (e) => this._up(e));
    b.addEventListener('pointercancel', (e) => this._up(e));
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this._suppressClick) { this._suppressClick = false; return; }
      if (this.onBlockClick) this.onBlockClick(term.id);
    });
    return b;
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

  render(state, selId, angle) {
    this.renderSide(this.panL, state.L, selId);
    this.renderSide(this.panR, state.R, selId);
    requestAnimationFrame(() => this.position(angle || 0));
  },

  /* ---------- drag handling (mouse + touch via pointer events) ---------- */
  _down(e, term, el) {
    this._suppressClick = false;
    const r = el.getBoundingClientRect();
    this._drag = { id: term.id, el, sx: e.clientX, sy: e.clientY,
                   w: r.width, h: r.height, moved: false };
    try { el.setPointerCapture(e.pointerId); } catch (_) {}
  },

  _move(e) {
    const d = this._drag;
    if (!d) return;
    const dx = e.clientX - d.sx, dy = e.clientY - d.sy;
    if (!d.moved && Math.hypot(dx, dy) < 6) return;
    if (!d.moved) {
      d.moved = true;
      this._suppressClick = true;
      document.body.classList.add('dragging');
      d.el.classList.add('drag');
      d.el.style.width = d.w + 'px';
    }
    d.el.style.left = (e.clientX - d.w / 2) + 'px';
    d.el.style.top  = (e.clientY - d.h / 2) + 'px';
    this._highlight(e.clientX, e.clientY);
    if (this.onDrag) this.onDrag(d.id);
  },

  _up(e) {
    const d = this._drag;
    this._drag = null;
    if (!d) return;
    if (!d.moved) {                       // it was a tap, not a drag
      if (this.onBlockClick) this.onBlockClick(d.id);
      return;
    }
    const target = this._target(e.clientX, e.clientY);
    document.body.classList.remove('dragging');
    this._clearHighlight();
    if (this.onDrop) this.onDrop(d.id, target);   // app re-renders
  },

  _hit(el, x, y) {
    const r = el.getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  },
  _target(x, y) {
    if (this.tray && this._hit(this.tray, x, y)) return 'remove';
    if (this._hit(this.panL, x, y)) return 'L';
    if (this._hit(this.panR, x, y)) return 'R';
    return null;
  },
  _highlight(x, y) {
    const t = this._target(x, y);
    this.tray.classList.toggle('over', t === 'remove');
    this.panL.classList.toggle('over', t === 'L');
    this.panR.classList.toggle('over', t === 'R');
  },
  _clearHighlight() {
    this.tray.classList.remove('over');
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
