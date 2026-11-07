## Why

Choosing **Branch** (or returning to the whole file) redraws the graph at once: the
cards that stay jump to their new places, and the reader loses track of who went
where. The camera already glides to the new view; the cards should move with it.

## User requirement (verbatim, 2026-11-07)

- "а можно сделать анимацию движения карточек при выборе branch? будет ли это
  тормозить на больших файлах?"
- Decision on the option offered: **"1 вариант"** — the cards that stay move to
  their new places; the lines and family nodes fade out and come back once the
  cards have arrived; cards that join fade in, cards that leave fade out; with
  neither motion for reduced motion nor when too many cards would move.

## Proposed scope

- On a change of scope, the cards that stand in both the old and the new layout
  and are in view glide from the old place to the new over the time of the camera's
  glide, with its easing; cards new to the layout fade in after a moment, cards
  leaving fade out where they stood; lines and family nodes are not drawn while
  the cards move and fade in as they arrive.
- No motion for a reader who asks for reduced motion, nor when more than 400 cards
  would be drawn before or after the change; the change is then immediate, as now.
- Only a change of scope moves cards: opening the graph, an edit of the file, the
  search and the zoom do not.

## Where it belongs

**This repository**, in the rendering of the graph (`src/desk/graphCanvas.ts`, a
new `src/desk/graphMotion.ts`). Nothing in the parser, the language service or the
layout changes.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `genealogy-file-graph`: a new requirement on how a change of scope is shown.

## Impact

- Code: `src/desk/graphCanvas.ts` (calls the motion before and after drawing a new
  scope), new `src/desk/graphMotion.ts`; `README.md` (one sentence).
- Tests: `src/desk/graphMotion.test.ts`, `src/desk/fileGraphView.test.ts`, and a
  Playwright spec in `tests/fileGraph.spec.ts` on a large file.
- No new string, setting or dependency; no API above `minAppVersion`
  (`Element.animate` is a web platform API and is feature-detected).

## Non-goals

- Lines are not morphed between layouts and not redrawn on every frame.
- No setting for the duration or to turn the motion off beyond the system's
  reduced-motion preference.
- No motion on opening, on an edit, on search or on zoom, and none in the timeline.
