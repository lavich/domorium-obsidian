## Context

See proposal.md for the measurements. The code in question is `GraphCanvas` in
`src/desk/graphCanvas.ts`; the file graph is its only user (`src/desk/fileGraphView.ts`).

- `draw(window, around?)` keeps the items whose box meets a range — the window widened by one
  window each side, or by a quarter of one when zoomed out beyond `ZOOM.far` — adds the missing
  ones and removes those outside it, then records the range as `drawnWindow`.
- `needsDraw(window)` is true only when the window has left `drawnWindow`, or the far/near state
  has flipped. It is never true because the range has become too large.
- A glide whose ends lie within `GLIDE_REACH` of a window calls `drawBetween`, which draws the
  union of the window it starts from and the one it ends on, widened by a quarter, so the path is
  there while the view travels. A longer move jumps and draws the window alone. On `Habsburg.ged`
  the first draws 31 498 cards and the second 9 482; after either, nothing is ever removed.
- The view is `viewEl.style.transform = translate() scale()` on the SVG group
  `.gedcom-fg-view`; a glide is a CSS transition of that transform (`.is-gliding`).
- `highlight(id)` adds `is-on` to every drawn card of the branch and toggles `has-hl` on the SVG
  root, and `.gedcom-fg-svg.has-hl .gedcom-fg-person:not(.is-on)` fades the rest. `draw` runs it
  again with `force`, after `mapDrawn`, and `highlight` begins by cancelling a pending hover.
- A search fades what does not match with `is-dim`, apart from the light; that stays.

## Goals / Non-Goals

**Goals:**
- A view that has come in from a wider one holds the shapes of a view of its size.
- Lighting a branch costs in proportion to the branch's drawn cards.
- Dragging, the wheel and a glide move the drawn shapes without painting them again.

**Non-Goals:**
- An index of items by position. At 70 211 items a redraw measured 3 to 13 ms, the scan of it about
  8 ms at a readable zoom, and the longest draw 12.8 ms against stalls of 34 to 63 ms seen in the
  frames: the scan is not what stutters. Revisit if a profile of the changed code says otherwise.
- Drawing the far zoom on a canvas, and the layout time: separate changes.
- Changing what reaches a glide: `GLIDE_REACH` stays.

## Decisions

**1. Remove what the view no longer needs, once a glide is at rest.** `needsDraw` also answers true
when the drawn range is more than twice as wide or as tall as the range the view would draw now,
unless the view is gliding. The range the view would draw now is the one `draw` computes, taken into
a helper both use. The redraw is asked for where a glide ends — the `transitionend` listener and the
glide timer — so the union a glide drew goes as soon as it has come to rest; `apply` and
`stopGlide` already ask for one. Twice, not once: a wheel step changes the window by 12%, and a
redraw each step would build and remove elements for nothing; a redraw every few steps costs 3 to
13 ms. A redraw always records the range it drew, so the prune cannot repeat.
`draw` keeps the item holding the keyboard focus and re-applies selected, armed and current marks
from state, so a prune takes away nothing the reader holds; ghosts of a scope change live outside
the drawn set.
*Rejected:* drawing a glide's path from its two ends only — the spec scenario *Gliding to a match*
asks for the cards of the whole path, so a long glide would show empty space; and clearing the drawn
shapes on every zoom change — it throws away what the view still needs.

**2. A fade up to 3 000 drawn cards, an outline above it, with a hysteresis.** The count is the
cards drawn (`cardOf.size`), not the people in the file or the branch; in `draw` it is read after
`mapDrawn`, so it is current. Measured against the cards drawn, a fade took 29 ms at 1 540, 42 ms
at 2 868 and 139–155 ms at 4 461; the outline took 24–31 ms at 4 461. 3 000 is where the fade is
still within about three frames. The canvas remembers its mode: it outlines once more than 3 000
cards are drawn and goes back to the fade once 2 500 or fewer are, and between the two keeps what it
had, so panning near the limit does not start 150 ms transitions on 3 000 cards at each redraw.
Outlining leaves `has-hl` off and puts `is-outlined` on each lit card, so no element outside the
branch changes; every place that clears the light clears `is-outlined`, and so does the switch from
outline to fade. The outline is an accent stroke of a fixed width on the screen
(`vector-effect: non-scaling-stroke`), since a stroke of 2 units is a tenth of a pixel at 0.05.
The rings the reader already knows — the card under the pointer (`is-hl`), the selected card
(`is-selected`) and the current match (`is-current`) — are written in units and would be thinner
than the outline at a far zoom, so with `is-outlined` each is given a non-scaling width of its own,
in the order outline, pointer, selected and current from thinnest to widest, and their rules come
after the outline's so the cascade is explicit. The pending hover is not cancelled by the forced
call `draw` makes: a redraw that lands while the pointer rests would otherwise drop the light until
the next movement.
*Rejected:* a contour round the branch — its cards stand in every row and any outline would hold
others; a cap on the number of cards lit — the branch is what the reader asked to see; the fade at
every size with the opacity moved to a veil — a new element order and a new hit-test for no gain.

**3. A layer while the view moves.** `.gedcom-fg-view` gets `will-change: transform` while it
glides and while it moves: `apply` sets `is-moving` and (re)starts a rest timer of 200 ms that
clears it, so the browser keeps the painted shapes and moves them, and paints them again at the
scale the view stands once it has rested. Measured in Chromium on a 2× display, a 3.4 s drag cost
2.6 s of raster at 0.6 and 3.9 s at 0.15 as it is, and 0.13 s and 0.6 s with the layer.
*Rejected:* `will-change` always on — a layer is not repainted when the scale changes, so a zoom
would stay blurred; a canvas for the readable zoom — the cards there carry focus, labels, tooltips and
the theme's variables, which the DOM gives.

## Risks / Trade-offs

- [Blurred while a zoom runs] → standard for a moved layer; sharp 200 ms after the last step. Checked
  by eye in the harness at 0.15 and 3, and in the PR's test plan in Obsidian.
- [WebKit may not give an SVG group a layer, so the gain may not reach iOS] → measure on a phone;
  if it does not, move the transform to an HTML element that holds the SVG, which every engine
  promotes. That change touches `apply`, `visibleTransform` and the glide's transition and is its own
  task, not a part of this one.
- [A branch of 17 000 cards drawn in a view of 31 000] → decision 1 keeps the drawn count to a view's
  worth; worst case is then the lit cards drawn, about 25 µs each, measured again in task 4.3.
- [Measured under software rasterisation in headless Chromium] → the ratio, not the absolute time,
  is what the numbers show; a look in Obsidian on desktop, on the demo vault with `Habsburg.ged`,
  is part of the PR's test plan.
- [A mode chosen at the last `highlight` while the search steps to a card the view is still gliding
  to] → the glide's redraw forces `highlight` again with the count of the cards drawn for the path;
  at worst one frame shows the other mode.

## Open Questions

- The widths and the exact accent of the outline and of the three rings, settled with a screenshot
  at desktop and phone width in both schemes, shown to the user, since it is what the reader sees.

## Implementation

Deviations from the plan above, found while building it:

- The fade limits are a `fade` option of `GraphCanvas` (default `FADE`, 3 000 and 2 500), so a test with
  a few dozen cards crosses them; nothing else reads it.
- Coming in from Fit to a readable zoom already cleared the drawn shapes, because it crosses `ZOOM.far`
  and `draw` redraws on a flip. The excess lives inside the far range, so the browser spec zooms to 0.15.
- No generated file reached 3 000 drawn cards at **Fit** (376 to 542), so `tests/generated.ts` gained
  `lineages(chains, depth)`, which does: `lineages(150, 20)` draws 6 049 cards at Fit.
- On a phone-sized view (390 by 844) the same file draws 1 457 cards at Fit, so the outline does not
  appear there; the light fades as before. The limit counts cards drawn, and a phone draws few.
- At a zoom of 0.05 a card is about 6 by 3 screen pixels, so the 2 px outline covers it and the 4, 5 and
  6 px rings of the pointer, the selected card and the current match read as blobs wider than the card.
  They stay distinguishable by colour and size; the widths are the open question above.
- `highlight(id, true)` no longer cancels a pending hover; `highlight(id)` still does.
