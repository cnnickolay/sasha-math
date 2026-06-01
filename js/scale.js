/* scale.js — draws the balance + the blocks, and animates tilts.
   Pans always hang level (like real scales); the beam rotates. */

const Scale = {
  beam:  null, panL: null, panR: null, stage: null,
  onBlockClick: null,        // set by app.js
  HALF: 0,                   // half-length of beam in px (depends on width)

  init() {
    this.beam  = document.getElementById('beam');
    this.panL  = document.getElementById('panL');
    this.panR  = document.getElementById('panR');
    this.stage = document.getElementById('stage');
    window.addEventListener('resize', () => this.position(0));
  },

  /* place pans at the beam ends for a given tilt angle (degrees). */
  position(angleDeg) {
    const a = angleDeg * Math.PI / 180;
    const rect = this.beam.getBoundingClientRect();
    const half = (rect.width / 2);
    this.HALF = half;
    const beamTop = 70;            // matches css .beam top
    const cx = this.stage.clientWidth / 2;
    const cy = beamTop + 7;        // beam vertical centre
    const stringLen = 64;

    const lx = cx - half * Math.cos(a);
    const ly = cy - half * Math.sin(a);
    const rx = cx + half * Math.cos(a);
    const ry = cy + half * Math.sin(a);

    this.beam.style.transform = `rotate(${angleDeg}deg)`;

    const place = (pan, x, y) => {
      pan.style.left = (x - pan.offsetWidth / 2) + 'px';
      pan.style.top  = (y + stringLen) + 'px';
    };
    place(this.panL, lx, ly);
    place(this.panR, rx, ry);
  },

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
    b.addEventListener('click', (e) => {
      e.stopPropagation();
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

  render(state, selId) {
    this.renderSide(this.panL, state.L, selId);
    this.renderSide(this.panR, state.R, selId);
    // let layout settle, then position pans
    requestAnimationFrame(() => this.position(0));
  },

  /* Tilt the beam to `deg`, hold, then return to level. Visual only. */
  demoTilt(deg, holdMs, done) {
    this.position(deg);
    setTimeout(() => {
      this.position(0);
      if (done) setTimeout(done, 700);
    }, holdMs);
  },
};
