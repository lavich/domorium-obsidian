## Context

See proposal.md. In the code on this branch (stacked on `family-cluster-layout`):

- A card is `<g class="gedcom-fg-person" transform="translate(x,y)">`
  (`cardRender.ts:107-114`); lines are `path` elements in their own layer and family
  nodes are groups in the items layer, all with absolute coordinates.
- `GraphCanvas.show(scene, opening)` (`graphCanvas.ts:207`) replaces every drawn
  element, then `settle()` applies the opening; for a scope change the opening is
  `{ centre }` and `centreOn(..., glide = this.transform !== null)` glides the camera
  by a CSS transition of 400 ms, `cubic-bezier(0.2, 0.7, 0.2, 1)` (`styles.css`
  `.gedcom-fg-view.is-gliding`), drawing both ends of the glide first (`drawBetween`).
- Only the items in the window and near it are drawn (`draw`, `place`), so the
  number of elements is bounded by the view, not by the file.
- Reduced motion is read by `prefersReducedMotion(doc)` (`dom.ts:137`).

## Goals / Non-Goals

**Goals:** motion that matches the camera's, costs a bounded number of elements
whatever the file, and leaves nothing behind (no stale element, no focus trap).

**Non-Goals:** animating lines; animating anything but a change of scope.

## Decisions

### D1. Web Animations, not CSS classes

Each moving card is animated with `element.animate({ transform: [from, to] }, …)`,
a fade with `{ opacity: [0, 1] }`. The element's own `transform` attribute is the
final place, so nothing needs cleaning up when the animation ends, and a second
change of scope during one simply starts new animations from the new elements.
`Element.prototype.animate` is feature-detected; without it (the unit tests'
DOM) nothing animates and everything behaves as before.

### D2. What moves, fades, waits

- A card drawn before and after: moves from its old place to its new one, 400 ms,
  the camera's easing. Cards that did not change place are not animated.
- A card drawn after but not before (it was out of view, or new to the scope):
  fades in, 250 ms after 150 ms.
- A card drawn before and not in the new layout: its element is kept where it
  stood, made unreachable (`pointer-events: none`, `inert`, `aria-hidden`), faded
  out in 150 ms and removed.
- Lines and family nodes drawn after: `opacity` 0 until the cards have arrived
  (delay 400 ms), then a 200 ms fade in (`fill: backwards` holds them at 0). The
  old ones are removed at once.

### D3. The limit

Motion is skipped when more than 400 cards are drawn before the change, or more
than 400 after it. Both counts are of drawn elements, so on a file of 10 000
people the check is against what is in view. When skipped, nothing is animated and
the change is immediate as now.

### D4. When it runs

Only for a scope change: `show` is given the opening `{ centre }`; the opening of
the tab, an edit and the like give other openings or none. Reduced motion skips
it, as it does for the camera.

### Alternatives considered

- *CSS transitions by classes* — needs a reflow between setting the old and the new
  place and a cleanup pass; Web Animations need neither.
- *Redrawing lines every frame* — tens or hundreds of path rebuilds per frame; the
  fade avoids it.

## Risks / Trade-offs

- [Many cards in view at a far zoom → heavy] → the 400-card limit, counted on
  drawn elements.
- [A ghost card left in the DOM] → removed on the end of its fade, and also when
  the next scope change begins.
- [The camera and the cards move at once] → same duration and easing, so the
  motion reads as one.

## Implementation

- **Not a CSS class.** As designed, each card is animated with `Element.animate`; a
  leaving card's element is kept and marked `inert`, `aria-hidden` and
  `is-leaving` (the last only for `pointer-events: none`, in `styles.css`, since the
  lint rule forbids inline styles).
- **Tests in the DOM of the unit tests.** happy-dom has `Element.animate` but never
  finishes an animation, so leaving cards stay until a test calls `onfinish`; the
  `all()` helper of `fileGraphView.test.ts` leaves out anything inside `[inert]`.
- **The limit counts drawn cards**, before the change (in `beginMotion`) and after it
  (in `runMotion`); on a file of 10 000 people that is what is in view.
- **Lines and nodes** of the old picture are removed at once; those of the new one
  fade in after the cards (delay 400 ms).
- **No plan cross-review before the code**, as the flow asks: the change is small
  and was reviewed together with its code, after the implementation.
- **`inert` is not enough on SVG** (found in review, checked in Chromium: a child
  with `tabindex=0` still takes the focus). A leaving card's focusable parts get
  `tabindex="-1"`, the focus is let go if it was inside, and the group is moved to
  the front of its layer so that it paints under the new cards.
- **Lines wait only if something changed.** A scope change that moves, adds and removes
  no card does not blink the lines.
- **Known:** a second change of scope during a motion starts from the cards' layout
  coordinates, not from where they are drawn mid-flight, so they snap before they
  glide; cards drawn after `runMotion` (a later glide) appear without motion.
