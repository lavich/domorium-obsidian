## Why

On `Habsburg.ged` (34 020 people, 15 411 families) the graph of the whole file is not smooth:
dragging, the wheel and pointing at a card stutter, and pointing at a card at a far zoom stalls
for seconds. Measured in Chromium on the harness with that file:

- **Fit leaves 9 482 cards and 58 201 elements in the DOM, and 31 498 cards and 171 953 where it
  glides.** Nothing is ever taken away again: `needsDraw` asks only whether the view has left the
  drawn area, never whether the drawn area has become far larger than the view. After Fit the reader
  zooms in to 0.15 or pans, and all of it stays. A Fit that glides makes it worse, because a glide
  draws both ends and the path between them, as the spec requires; one whose ends are further apart
  than a glide can show jumps and draws the window alone.
- **Every pan and zoom step re-rasterises the drawn shapes.** The view is a CSS transform on an
  SVG group, which Chromium paints again at each step. In a 3.4 s drag on a 2× display the
  rasteriser spent 2.6 s of CPU at 0.6 and 3.9 s at 0.15; with the group promoted to a layer it spent
  0.13 s and 0.6 s.
- **Pointing at a card costs the whole view.** The fade of every card outside the branch is a
  class on the SVG root and an `opacity` on each card: 29 ms with 1 540 cards drawn, 144 ms with
  4 461, 0.6 to 3.5 s with 31 498.

The pointer's light fades what it does not light, so its cost grows with what is drawn and not with
the branch it lights.

## What Changes

User requirement, 2026-11-08, verbatim:
«Может быть, не делать подсветку после какого-то порога, после какого-то лимита?», then
«А что насчёт того, чтобы не заглушать, не затемнять карточки, которые не входят в бранч, а
наоборот, хмм, как-нибудь делать бордер либо контур вокруг бранча, который ты выделяешь?» and
«у меня еще и при скролле нет плавности», «и при перетаскивании тоже». Approved to go ahead with
the plan below on 2026-11-08: «Да, приступай.»

Proposed scope:

- **The drawn shapes follow the view.** Once a glide has come to rest, and as a zoom comes in, the
  shapes far outside the area the view now needs are removed, so a view that has come in from Fit
  holds what a view of that size holds.
- **Lighting a branch costs the branch.** While no more than 3 000 cards are drawn the pointer's
  light fades the cards outside the branch, as it does. Above that, the light fades no card: every
  card of the branch carries an outline in the accent colour that is as wide on the screen at every
  zoom, and the rest stand as they are. Between 2 500 and 3 000 the light keeps the mode it had, so
  a view near the limit does not flip with each redraw. The card under the pointer, the selected
  card and the current match of a search stay distinguishable from the outline.
- **The drawn shapes move as one layer.** While the view is dragged, wheeled, pinched or gliding, and
  for a moment after, the drawn shapes are kept as a layer that is moved and scaled, not painted again
  at each step; once the view has rested the drawing is painted again, sharp at the scale it stands.

This change is in this repository: it moves cards on a canvas and no parser or language-service
behavior is involved. No API above `minAppVersion` is used.

## Capabilities

### Modified Capabilities

- `genealogy-file-graph`: Pointing at a person lights their family; The graph holds up at size.

## Impact

- `src/desk/graphCanvas.ts` (`needsDraw`, `draw`, `highlight`, `apply`, `endGlide`), `styles.css`
  (the outline, the layer), `README.md` (the sentence about pointing at a person).
- Unit tests `src/desk/fileGraphView.test.ts`; Playwright specs `tests/fileGraph.spec.ts`.
- The timeline keeps its own light and is not touched. No new setting, command or string.

## Non-goals

- The time to lay out the whole file (about 1.6 s for 34 020 people, all of it on the main thread,
  with the parse and the model before it): a change of its own, either a budget for the stages after
  the optimisation or a worker.
- A level of detail for far zooms, with the far layer drawn on one canvas. Measured at 55 ms a frame
  on Fit with every card and line, against 58 000 to 172 000 elements; it is the next change and does
  not need this one's decisions.
- An index of the shapes by position. A redraw costs 3 to 13 ms with 70 211 items in the scene, of
  which the scan is about 8 ms at a readable zoom; it does not explain the stutter and is left until a
  profile asks for it.
- A contour drawn around the whole branch as one shape: the cards of a branch are spread over every
  row of the graph and any outline round them would enclose cards that are not in it.
- The graph's rows, order, lines and the rest of what a card says or looks like.
