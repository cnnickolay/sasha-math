# Balance the Equation

An interactive math toy for kids (~9–11) that teaches the idea behind solving
equations: **both sides of an `=` must stay equal, so whatever you do, you do to
both sides.**

Built with plain HTML + CSS + JavaScript — no build step, no dependencies.
Open `index.html` in any browser, or play the hosted version.

## The idea

An equation is a balance scale. The `=` means the two pans weigh the same.

- **Take off both sides** — remove an equal amount from each pan and it stays
  balanced. (Tap "Why both?" to *see* the scale tip when you cheat and only
  take from one side.)
- **Send across the =** — move a piece to the other pan and its `+`/`−` flips.
- **Add the numbers** — tidy up a pan by adding its numbers together.

Keep going until you reach `x = ?`.

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
