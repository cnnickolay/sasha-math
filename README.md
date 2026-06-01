# Balance the Equation

An interactive math toy for kids (~9–11) that teaches the idea behind solving
equations: **both sides of an `=` must stay equal, so whatever you do, you do to
both sides.**

Built with plain HTML + CSS + JavaScript — no build step, no dependencies.
Open `index.html` in any browser, or play the hosted version.

## The idea

An equation is a **real balance scale**. The `=` means the two pans weigh the
same. The blocks are weights — drop them and they stay put, and the heavier pan
sinks.

- **Drag a block onto the 🧺 shelf** to set it aside off the scale (it stays
  there where you drop it, and you can drag it back onto a pan any time). Take a
  block off ONE pan and that pan gets lighter, so the scale **tips** (the relation
  in the equation bar becomes `<` or `>`). Set the matching block aside from the
  OTHER pan and it **balances again** — that is the whole lesson: *do the same to
  both sides.*
- **Drag a block to the other pan** — the weight really moves, so the scale leans
  that way (it does **not** keep the equation true; you feel that it is unfair).
- **➕ Add the numbers** — tidy up a pan by adding its numbers together.

Every puzzle is solved by removing matched pairs from both pans until only `x`
is left — then the scale shows what `x` weighs and you win.

## Files

| File              | Responsibility                                         |
|-------------------|--------------------------------------------------------|
| `index.html`      | Page structure                                         |
| `css/style.css`   | Kid-friendly theme + the scale layout                  |
| `js/equation.js`  | The maths model (terms, sides, win check) — no DOM     |
| `js/scale.js`     | Draws the balance + blocks, animates tilts             |
| `js/app.js`       | Wires it together, the operations, and the coach text  |

## Adding puzzles

Edit the `PROBLEMS` array in `js/app.js`. Each problem lists the terms on each
side: `['n', 28]` is the number 28, `['x', 1]` is `+x`, `['x', -1]` is `−x`.
