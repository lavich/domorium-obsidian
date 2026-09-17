## Context

See proposal.md — Why. What the code gives this change, and where the fault sits:

- `renderMediaPreview` in `src/editor/mediaPreviewView.ts` appends one
  `.gedcom-media-preview` root into the container it is handed and draws the
  content into it. It does not clear the container; each host does that first —
  `popover.hoverEl.empty()` in `GedcomView.drawMediaPreview`, and
  `host.replaceChildren()` in the harness's `draw` in `harness/mount.ts`. The
  `allow` callback each host supplies calls that same redraw.
- The image path sets `img.src` and lets the picture size itself, bounded by the
  two custom properties the root carries. An uncropped frame is therefore
  0 × 0 until `load`; a cropped one is sized by `applyCrop` from the rectangle
  and is not affected.
- Both hosts close the popover on its `mouseleave`. Obsidian's `HoverPopover`
  does so on its own; the harness stands in for it with a listener. Neither can
  tell a pointer that moved out from a popover that moved out from under the
  pointer, and Chromium 153 reports both the same way.
- The root is `box-sizing: content-box` on purpose (see `styles.css`): its
  `max-width` is the bound of the picture, not of the box.
- `src/editor/mediaPreviewView.test.ts` runs in happy-dom, which lays nothing
  out: every box measures zero. Painting and geometry belong to
  `tests/mediaPreview.spec.ts`.

## Goals / Non-Goals

**Goals:**

- One redraw, owned by the renderer, so that measuring what is replaced is not
  a step each host can forget.
- A hold that is a minimum, not a size: the picture is still bounded by the same
  rule and still grows the popover where it is larger.
- Nothing that fires on a timer or waits for the network to decide anything.

**Non-Goals:**

- Teaching the hosts to distinguish a pointer that left from a popover that
  shrank. That is the browser's boundary-event semantics, and both hosts
  rightly leave it alone.
- Any change to `mediaPreviewHover`, `previewGesture`, or the spec's rules for
  when a popover closes.

## Decisions

### The renderer replaces the container's content and measures first

`renderMediaPreview` looks for an existing `.gedcom-media-preview` in
`host.container`, measures it, and then replaces the container's children with
the new root. `GedcomView.drawMediaPreview` and the harness's `draw` stop
emptying the container.

The measurement is the extent of the old root's children — the widest child,
and from the top of the first to the bottom of the last — which is the root's
content box without reading padding from computed style. Measuring the root's
own rectangle would include padding, and the root is content-box, so the
padding would be counted twice.

*Alternative considered:* each host measures before it empties and passes the
size in. Two hosts, two places to get it wrong, and the harness would prove its
own measuring rather than the view's.

*Alternative considered:* the redraw keeps the old root and swaps its children.
That keeps the box, but the root also carries the bound properties, which the
host may have re-measured in between; a fresh root is simpler than reconciling
one.

### The hold is `min-width` and `min-height` on the new root, for its lifetime

The measured content size goes onto the new root as `min-width` and
`min-height`, in the root's own content-box terms. A hold is applied only where
an old root was found and measured to something: a first draw, or a redraw in
an environment that lays nothing out, sets nothing.

It is never released. A picture that arrives smaller than the question — a
thumbnail, a one-pixel image — would otherwise shrink the popover under the
pointer at `load`, which is the same fault one event later. A picture larger
than the question grows the popover exactly as it does today, since a minimum
does not bound. The error row is covered the same way, and so is the frame
before either arrives. The cost is blank room around a small picture in a
popover that asked a question, which is the spec's stated trade.

*Alternative considered:* release the hold on `load` and `error`. Rejected for
the small-picture case above, and for adding a second late handler to a path
that already guards against a popover the gesture has moved on from.

*Alternative considered:* a `min-height` on the frame from a fixed constant.
It would not know how wide the question was, and the offer's width is the
question's, set by the URL and two labels.

### The proof is in the browser, the plumbing in the unit test

happy-dom measures every box as zero, so the hold's arithmetic cannot be
checked there, but the plumbing can: a redraw into a container that holds a
preview whose children report a size — `getBoundingClientRect` stubbed on them
— sets `min-width` and `min-height` on the new root; a first draw sets neither;
a redraw replaces the old root rather than appending beside it.

The two specs that fail on Chromium 153 are the proof that the popover stays.
One more measures the popover before and after taking the offer, with the
harness holding the image (`holdImages`) so that the between-state is on
screen, and asserts it is no smaller. `npm run test:browser` runs on the
Chromium 1.62 ships; the failing cases are confirmed against 1.63's Chromium
with `@playwright/test@1.63.0` installed without saving, since #135 is what
brings that version in.

## Risks / Trade-offs

- [A hold wider than the bound] → The old root was already inside its own
  `max-width`, so its content cannot have been wider than the bound; the
  minimum never exceeds the maximum.
- [The popover is redrawn while the pane has been resized between question and
  answer] → The new root still takes the bounds the host measures at redraw;
  the minimum is the old content's, which was within the old bound. A pane made
  narrower than the question was could show a popover wider than its new
  bound for the life of that popover. Accepted: a resize mid-answer is rare,
  and the next gesture opens a fresh popover.
- [The harness redraw no longer clears `calls.requested` bookkeeping the way
  it did] → The harness reads the images after `renderMediaPreview` returns,
  which is unchanged; only the `replaceChildren()` call moves.
- [`getBoundingClientRect` on children of a popover that Obsidian has already
  detached] → `isCurrent` guards the late handlers, and the redraw is
  synchronous from the click, while the popover is on screen.
