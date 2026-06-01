/* balloonlab.js — a tiny hands-on toy that lives in the balloon explainer.
   A −5 balloon: add +1 weights and watch it rise, hover, or sink so the kid
   FEELS that minus = lift and a matching weight cancels it to zero. */

const BalloonLab = {
  LIFT: 5,          // the balloon is −5  (pulls up with strength 5)
  weights: 0,       // how many +1 weights are hanging on it
  els: {},

  init() {
    this.els = {
      balloon: document.getElementById('labBalloon'),
      weights: document.getElementById('labWeights'),
      status:  document.getElementById('labStatus'),
      count:   document.getElementById('labCount'),
      plus:    document.getElementById('labPlus'),
      minus:   document.getElementById('labMinus'),
    };
    if (!this.els.balloon) return;
    this.els.plus.addEventListener('click', () => this.add(+1));
    this.els.minus.addEventListener('click', () => this.add(-1));
    this.render();
  },

  add(d) {
    this.weights = Math.max(0, Math.min(10, this.weights + d));
    this.render();
  },

  // net = weights pulling DOWN minus the balloon's LIFT up.
  // net < 0 -> floats up, net == 0 -> hovers, net > 0 -> sinks.
  render() {
    const net = this.weights - this.LIFT;        // -5 .. +5
    // map net (-5..+5) to a top position inside the sky (small=high, big=low).
    // net<0 floats UP (near top), net=0 hovers (middle), net>0 sinks (low).
    const t = (net + 5) / 10;                      // 0 .. 1
    const topPx = 10 + t * 96;                     // 10px (up) .. 106px (down)
    this.els.balloon.style.top = topPx + 'px';

    // draw the weights hanging under the balloon
    this.els.weights.innerHTML = '';
    for (let i = 0; i < this.weights; i++) {
      const w = document.createElement('span');
      w.className = 'lab-weight';
      w.textContent = '1';
      this.els.weights.appendChild(w);
    }

    this.els.count.textContent = `weights on it: ${this.weights}`;

    let msg, cls;
    if (net < 0) {
      msg = `🎈 The balloon wins! Lift ${this.LIFT} beats ${this.weights} weight${this.weights === 1 ? '' : 's'} → it floats <b>UP</b> ⬆️`;
      cls = 'up';
    } else if (net === 0) {
      msg = `⚖️ Tie! ${this.weights} weights and the −${this.LIFT} balloon cancel → <b>0</b>. It just floats still.`;
      cls = 'zero';
    } else {
      msg = `🪨 The weights win! ${this.weights} beats lift ${this.LIFT} → it sinks <b>DOWN</b> ⬇️`;
      cls = 'down';
    }
    this.els.status.innerHTML = msg;
    this.els.status.className = 'lab-status ' + cls;
    this.els.balloon.classList.toggle('lab-popped', net === 0);
  },

  reset() { this.weights = 0; if (this.els.balloon) this.render(); },
};

document.addEventListener('DOMContentLoaded', () => BalloonLab.init());
