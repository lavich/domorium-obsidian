## Context

See proposal.md — Why. What shapes the approach is what is already here, and
one thing that had to be measured before any of it could be committed to.

Today's cropped preview, in `src/editor/mediaPreviewView.ts`:

```ts
function applyCrop(frame, image, crop, bounds) {
  const scale = cropScale(crop, bounds);          // min(1, w-ratio, h-ratio)
  frame.style.width = `${crop.width * scale}px`;  // the frame is the rectangle
  frame.style.height = `${crop.height * scale}px`;
  image.style.transform = `translate(...) scale(${scale})`;
}
```

`drawnCrop(crop, naturalWidth, naturalHeight)` clamps the rectangle on `load`
and returns `null` where the image does not overlap it at all; `previewBounds(
paneWidth, paneHeight)` gives the box the pane allows — 60% of its width and
40% of its height, ceilinged at 560×400. Both stay. `cropScale` goes.

Nothing needs `@domorium/language-service` or `@domorium/codemirror` to change.
`getMediaAt` already reports `crop?: MediaCrop` and that is the whole of the
input; both stay at 2.1.0.

Two constraints from the archived media-preview design still bind, and are
repeated here because the second one is a bug that hides itself:

- **The frame must not size the image.** The image sits behind the frame at its
  natural size and is moved by `transform`, with `transform-origin: 0 0`. The
  frame must not be a flex container: a flex line stretches its item to the
  line's height, an item with a negative cross margin is stretched again, and
  the image then renders at a size the arithmetic was never measured against.
  Every cropped preview draws the wrong part of the picture while every
  assertion about the container's size still passes. That is why the browser
  specs sample pixels.
- **`load` outlives the popover.** `host.isCurrent()` guards every handler that
  runs after the popover is built. The initial framing needs the natural size,
  so it is computed in the `load` handler and sits behind that same guard. The
  pan and zoom handlers need it too — they close over the popover they were
  installed in, and a stale one must not be moved.

### The risk that had to be settled first

The popover has to survive the pointer being held on it for the seconds a drag
takes. The remote-images buttons prove it accepts a click, but a click is far
shorter than a drag, and three things could end one: the editor's `mousemove`
handler resolving a position that is not media and closing the session, the
editor's `mouseleave`, and the popover's own close-on-leave.

Measured in the harness with a throwaway Playwright spec, in Chromium — the
engine Obsidian runs on — and in both preview gestures:

| | popover after a 2 s drag off the popover and across the editor |
| --- | --- |
| `setPointerCapture` on the frame, `dragstart` prevented | **open**, 41 of 41 `pointermove` delivered to the frame |
| no pointer capture, same drag | **closed** after 400 ms |

So the shape holds, and the control shows the measurement is not vacuous: it is
the capture that saves it. Pointer capture retargets the compatibility mouse
events to the capture element, so for the length of the drag the editor sees no
`mousemove` and the popover sees no `mouseleave` — which is exactly the
mechanism the real `HoverPopover` closes on, and the same mechanism the harness
stub imitates with a `mouseleave` listener on the popover element. The stub is
not Obsidian's `HoverPopover` — `obsidian` is a types-only package and the
harness mounts no plugin — so this is evidence rather than proof; task 1.1
repeats it in `demo-vault`, as the remote-images change did for the click.

Two further findings from the same spike, both of which the implementation has
to carry:

- **The `<img>` starts a native drag.** An image is draggable by default. Left
  alone, `dragstart` fires on the first movement and HTML drag-and-drop takes
  over: exactly 2 `pointermove` events arrived and then silence, with the
  popover still open and the picture not moving. `dragstart` must be prevented
  (or `draggable = false` set).
- **In the held-modifier gesture, releasing the modifier mid-drag closes the
  popover** — `closePreviewOnRelease` in `src/editor/composition.ts` listens on
  the document, which pointer capture does not shield. Measured: the popover was
  gone 300 ms after `keyup`. See the decision below.

## Goals / Non-Goals

**Goals:**

- The geometry is pure functions in `src/editor/media.ts`, unit-tested with
  numbers and no DOM: what the viewport opens on, what the scale may be, and
  where the picture may sit.
- One popover shape for every cropped reference in a file.
- Every listener the interaction needs lives on the frame element, so the
  popover's removal ends them and no teardown hook is needed.

**Non-Goals:**

- Any change to `drawnCrop`, `previewBounds`, `mediaPreviewContent`, or the
  hover/session machinery in `src/editor/mediaPreviewHover.ts`. The interaction
  is inside the popover; nothing about when a popover opens changes.
- Canvas, `createImageBitmap`, or any decode. The rendering mechanism is
  unchanged: an `<img>` at natural size inside an `overflow: hidden` frame,
  positioned with `transform: translate(...) scale(...)`.
- `Platform` branching. #78 is closed as not planned.

## Decisions

### A fixed viewport replaces a frame sized to the region

The frame becomes a box of `previewBounds(paneWidth, paneHeight)` — the existing
function, so a narrow pane is still respected — and its size no longer depends
on the rectangle. It takes that size when it is created, before the image
arrives, which is what removes the reshaping: today the popover is one shape per
reference and jumps again on `load` when the clamp runs.

The cost is an empty box for as long as the image takes. That latency exists
today; only what occupies it changes, from a small empty box to a large one. It
is the price of a popover that does not move under the reader, and worth paying.

_Alternative — keep the frame at the rectangle's size and let the reader pan
inside it._ Panning a 40×30 box is not an answer to "what is around this", and
the jumpiness stays. Rejected.

### The initial state is the region, fitted, and fitting may magnify

`cropScale` is replaced by

```ts
cropView(crop: MediaCrop, geometry: MediaGeometry): MediaView
// MediaView     = { scale: number; tx: number; ty: number }
// MediaGeometry = { naturalWidth: number; naturalHeight: number;
//                   bounds: PreviewBounds }
```

taking the rectangle **already clamped by `drawnCrop`**, and returning the
transform that puts it in the middle of the viewport:

- `fit(w, h, bounds) = min(bounds.width / w, bounds.height / h)` — not capped at
  1, which is the whole difference from `cropScale`. A 40×30 region today draws
  at 40×30 in a 40×30 box; fitted into a 560×400 viewport it asks for 13×,
  which the clamp below then takes down to the magnification cap.
- `scale = clamp(fit(crop.width, crop.height, bounds), scaleMin, scaleMax)`.
- `tx`, `ty` centre the scaled rectangle in the viewport and are then put
  through the pan clamp, so a rectangle against an edge of the photograph is not
  centred by leaving a gap.

`MediaGeometry` is the image's own size and the box it is drawn in — the same
three arguments every one of these functions needs, passed as one value so
`zoomTo` does not take seven of them and no call site can pair one image's size
with another's bound. `MediaView` is the one value the renderer needs;
`applyCrop` becomes `applyView(frame, image, view)` writing
`translate(${tx}px, ${ty}px) scale(${scale})` and nothing to the frame's size.

**The viewport is not the rectangle's shape, so the rectangle rarely fills it.**
`fit` binds on one axis; along the other the viewport shows the photograph
around the rectangle. A 130×240 region of the demo vault's 480×320 photograph
opens at 1.33× and occupies 173 of the viewport's 560 pixels, the rest being
picture the reference did not ask for. That is the feature working — it is the
answer to "what is around this", given without a gesture — but it means the
old promise that the popover shows *the rectangle and nothing else* is gone,
and the spec says so instead of repeating it.

What does still hold, and what the tests pin, is that the rectangle is **wholly
visible and centred**: the pan clamp moves the picture only when centring the
rectangle would leave the viewport short of photograph, and it can only move it
by less than the slack, so the rectangle never leaves the box. Non-obvious
enough to be worth a unit case per edge.

### The magnification cap is 4

`MEDIA_PREVIEW_MAX_MAGNIFY = 4`, and `scaleMax` is that number flat.

Unbounded fitting turns a 20×15 rectangle into a 28× wall of four colours. Four
is chosen because at that point a JPEG's own artifacts are larger than anything
they might be hiding — the reader is being shown the compressor's work, not the
photograph's — while a face of 80×100 pixels out of an old scan, which is the
case this cap exists for, still reaches 320×400 and is legible.

Nothing guards the cap from below, because the limit below it is never above 1
— see the next decision. Two constants that cannot cross are worth more than an
arithmetic guard that hides the case where they would have.

_Alternative — no cap, or a cap on the resulting pixel size rather than the
factor._ A pixel-size cap makes the limit depend on the pane, so the same
reference magnifies differently in a narrow pane and a wide one. Rejected: the
factor is the property the reader can reason about.

### Out as far as the whole photograph, and no further

```
scaleLimits(geometry) ->
scaleMin = min(1, fit(naturalWidth, naturalHeight, bounds))
scaleMax = MEDIA_PREVIEW_MAX_MAGNIFY
```

`scaleMin` is the whole photograph fitted into the viewport, and never
magnified to get there. Further out is a picture adrift in an empty box, which
answers nothing; and stopping exactly there means the zoom-out limit and the
toggle's whole-photograph state are the same view, reached two ways, rather
than two views a pixel apart.

For a photograph larger than the viewport — the case the feature is for — `fit`
is below 1 and the `min` does nothing. It bites on a photograph *smaller* than
the viewport, and it has to: without it the whole of a small photograph would
be magnified to fill the box, and both limits would be driven up together. A
120×80 scan in a 560×288 viewport fits at 3.5×, which as a floor leaves the
range [3.5, 4] — 14% of a range, no zooming worth the name — and, worse,
`cropView`'s clamp then forces **every rectangle in that file to open on the
whole photograph**, the cap being below the floor's own view. `min(1, …)` gives
[1, 4] instead: the rectangle opens magnified up to the cap, and zooming out
ends at the photograph's own pixels, centred, which is exactly what an
uncropped preview of the same file shows.

_Alternative — `scaleMin = fit`, the photograph always filling the viewport._
It keeps the box full, and it is what the first draft of this design said. It
costs the collapse above, and it magnifies a thumbnail 3–5× to do it. Rejected.
The empty ground around a small photograph at the zoom-out limit is the honest
picture: the box is a fixed size because the popover must not jump, and a small
photograph is small.

### The pan clamp is per axis: cover if larger, centre if smaller

`clampPan(view, geometry): MediaView`, applied to every result — the initial
framing, every drag, every zoom:

- Where `naturalWidth * scale >= bounds.width`, `tx` is clamped to
  `[bounds.width - naturalWidth * scale, 0]`: the photograph covers the
  viewport, and dragging stops when its edge meets the viewport's.
- Otherwise `tx = (bounds.width - naturalWidth * scale) / 2`: it is centred and
  cannot be dragged off centre. There is nothing to reveal, so movement would
  only lose the picture.
- The same for `ty`, independently. A panorama in a square viewport pans
  sideways and is pinned vertically, which is right.

At `scaleMin` neither axis can move: the one `fit` was taken from is covered
exactly, the other is smaller than the viewport and therefore centred — as are
both of them for a photograph smaller than the viewport, where `scaleMin` is 1.
So the whole photograph is centred and immovable, and the zoom-out limit needs
no separate rule about position.

### Zoom keeps the point under the pointer still

`zoomTo(view, factor, px, py, geometry): MediaView`, where `px`/`py` are in the
frame's own coordinates: the new scale is
`clamp(scale * factor, scaleMin, scaleMax)`, and `tx`/`ty` are adjusted so the
image point under the pointer stays under it, then clamped. Zooming about the
viewport's corner instead makes the picture run away from the pointer, and
zooming about its centre makes a reader repeat zoom-drag-zoom to reach a corner.

The wheel step is a factor per event rather than a step of the scale, so the
same gesture covers the same proportion of the range wherever it starts —
`Math.exp(-deltaY * 0.002)`, clamped per event so one flick of a trackpad's
inertia does not cross the whole range. The step is a constant in
`mediaPreviewView.ts`, not in the pure functions: it is a feel, and the
arithmetic it feeds is what is tested.

### Pointer events on the frame, with the capture

`pointerdown` on the frame calls `frame.setPointerCapture(event.pointerId)` and
records the pointer's position and the view it started from; `pointermove`
applies the delta to `tx`/`ty` and clamps; `pointerup` and `pointercancel`
release. Every listener is on the frame element, so the popover's removal takes
them all — no teardown hook, and nothing to forget on the path where the
popover is replaced rather than closed. All of them are behind
`host.isCurrent()`.

Three things come with this and are easy to leave out:

- `dragstart` on the frame must be prevented, or the native image drag takes
  the gesture on the first movement. Measured; see Context.
- The `wheel` listener must be non-passive and call `preventDefault`, or the
  page under the popover scrolls as well.
- `touch-action: none` on the frame in `styles.css`, or a touch drag scrolls
  instead of arriving as `pointermove`; and `user-select: none`, or the drag
  selects the caption.

Touch drag then comes free. Pinch-zoom does not, and is out of scope.

### One button, saying which of the two it will show

A single button beside the picture, drawn the way `drawOffer` draws the
remote-images buttons — a row under the frame, one `<button>`, the same
`gedcom-media-*` class family and Obsidian's own variables in `styles.css`.

It reads **Show the whole photograph** while the region is on screen and
**Show the region** while the whole photograph is, naming what taking it will
do, which is the form the two existing buttons take (*Show this image*, *Always
show images from the web*). A label naming the current state instead would need
the reader to work out which way it points.

Taking it does not toggle a stored mode; it recomputes one of the two views —
`cropView(...)` for the region, and for the whole photograph the zoom-out limit
centred, which is `scaleMin` and not a `fit` of its own, so the button's state
and the end of the wheel's travel are one view rather than two a pixel apart.
"Show the region again" therefore means the rectangle as the popover opened on
it, whatever was dragged in between, and needs nothing remembered but which of
the two was asked for last.

That is the label's whole state, and it does not follow the picture: a
reader who reaches the whole photograph with the wheel instead of the button is
still offered *Show the whole photograph*, and taking it changes little. The
alternative is deriving the label from the current view, which means deciding
how near `scaleMin` counts as "the whole photograph" — a threshold on a float,
in a popover, to relabel a button. Not worth it; the spec asks only that each
press names what the next one will do.

It is not drawn for a reference with no rectangle, nor for a rectangle that
falls outside the image, and it does not survive an image that could not be
drawn: in each case there is no second view to move to.

_Rejected — a minimap._ A whole-photograph thumbnail with the rectangle
outlined, beside or over the picture. It answers "what is around this" in 120
pixels, where zooming out answers it at full size; it needs its own scaling,
its own layout in a popover already tight, and its own outline arithmetic; and
having built it there would be two devices for one answer, which is one too
many. Rejected in favour of the zoom-out limit and the button that reaches it.

### Nothing marks the region inside the viewport

The rectangle rarely fills the viewport (see above), so a reader looking at an
opened preview cannot tell by eye where the four numbers put its edges. What
answers that is position and the button: the rectangle is centred when the
popover opens, and the button takes the picture between that view and the whole
photograph, so the difference between the two presses is the rectangle.

_Rejected — outlining the rectangle inside the viewport._ A one-pixel border on
the region, drawn as an absolutely positioned box over the image, would say
exactly which part the link named. It is cheap, it is not a minimap, and it is
the strongest candidate for a follow-up. It is left out here because it needs
its own arithmetic (the outline moves and scales with every drag and zoom, a
second thing to keep in step with `MediaView`), its own decision about the
degenerate cases, and its own place in both themes — and because the whole
point of this change is to stop treating the rectangle as the only picture in
the popover. Shipping the viewport first says whether the outline is missed.

### A rectangle that misses the image is named

`drawnCrop` returning `null` today drops the crop class and every style and
shows the whole image, which is byte-for-byte the uncropped preview. The one
case in which the numbers are certainly wrong is the one case that says nothing
about them, and a spec asserts it (`tests/mediaPreview.spec.ts:446`).

It keeps showing the whole photograph — there is nothing else to show — and
gains a note above the picture reading **Rectangle outside the image**. Terse,
like *File not found* and *Image could not be drawn* beside it; the fact is the
whole message, and the reader can see for themselves what is being shown
instead. `gedcom-media-note` is the class those two already use and it is
already styled, but the renderer only ever creates it inside a `drawRow`, with
an icon and a name; here it is that class on its own, put before the frame by
the `element(parent, tag, cls, before)` helper.

Beyond the note it renders exactly as the uncropped case: fitted, popover sized
to the image, no interaction, no button. Making it interactive would offer to
navigate away from a picture that is already whole, and the button would have no
second view to name.

This is the one case where the popover **does** change shape on `load`: the
viewport-sized box is given up for a box the size of the image, because the
alternative is a small photograph adrift in a large frame with a note over it
saying the numbers were wrong. Nothing is left of the cropped rendering — the
class, the size, the listeners and the button all go — so the case is the
uncropped one plus a note, and the spec carries the exception rather than
leaving the two requirements to contradict each other.

**A rectangle merely overhanging an edge gets no note.** The clamped part is
picture the reference asked for, the overhang is one number too large rather
than four numbers wrong, and a rectangle at the edge of a photograph is
ordinary. The reader who wants to know zooms out and sees the edge. A note here
would fire on the common case and teach the reader to ignore notes.

### Until the image loads there is no view, and the gesture says nothing

The frame takes the viewport's size when it is built, but `MediaView` cannot be
computed before `load`: it needs the natural size. So between the popover
opening and the image arriving there is a sized empty box with listeners on it
and a button under it, and both have to do nothing rather than something
undefined. The view is the state: it starts absent, every handler returns while
it is absent, and the button — drawn with the frame, so the popover does not
gain a row on `load` and change shape twice — is `disabled` until the view
exists. One flag, checked in the same breath as `host.isCurrent()`.

The same state answers the `error` path, which today draws a row and removes
the frame. It removes the button with it and leaves the view absent, so a file
that exists and will not decode says *Image could not be drawn* and offers
nothing beside it: there is no picture to move and no second view to name.

### The held-modifier gesture still ends on release, mid-drag included

Measured: with media preview set to hold-and-hover, releasing the modifier
during a drag closes the popover — `closePreviewOnRelease` listens on the
document, which the pointer capture does not shield.

This is left as it is. In that gesture the modifier is what keeps the popover
alive at all, so a reader in it already holds it to reach anything inside the
popover; the remote-images buttons shipped under the same constraint. Hover
alone, which is the default for both preview settings, is unaffected. Making the
drag suppress the release would mean the drag's state reaching
`closePreviewOnRelease` across two modules for a case a held finger already
solves, and it would leave the reader dragging a popover they can no longer
dismiss with the gesture they opened it with.

### The harness needs a photograph with more than one thing in it

The specs must assert that a drag brings something *else* into view and that
zooming out shows the whole photograph. `harness/mount.ts` can already draw
that: `painted(width, height, left, top, region, tall)` puts a red rectangle on
a plain ground, and `target` (600×400), `scan` (3000×2000) and `wide` (1600×400)
are already built from it — the pixel-sampling spec at
`tests/mediaPreview.spec.ts:811` reads one of them today.

What cannot carry the new assertions is the image the *crop fixtures* point at:
`media/family.jpg` maps to `photo`, a flat 120×80 field of one colour. Two
things are wrong with it. It has no region to tell from its surroundings; and it
is a fraction of the viewport, so the cap stops every rectangle in it at 4×
while the whole photograph is 480×320 in a box of 560×288 — most of the picture
is on screen whatever the `CROP` says, and a spec asserting that the popover
opened on a region could not fail if the arithmetic were wrong. The fixtures
move to a `painted` image larger than the bound — `target`, at 600×400, is one
— which moves the `CROP` numbers in `tests/harness.ts` that were written
against a 120×80 image, the overhanging rectangle among them, and the offsets
in `tests/mediaPreview.spec.ts` that are keyed by those numbers.

This is harness data, not plugin behaviour, and no spec requirement rests on the
particular bytes — but a spec that cannot fail is worse than no spec, and at
120×80 several of these cannot.

## Risks / Trade-offs

- **Obsidian's real `HoverPopover` closes the drag** where the harness stub did
  not → the mechanism that saves it (pointer capture suppressing the
  compatibility mouse events) is not the stub's own, so this is unlikely; task
  1.1 confirms it in `demo-vault` before anything is built on it, and it is the
  one finding that would send the change back to the drawing board rather than
  being worked around.
- **An empty viewport-sized box while a large image loads** → it is the same
  wait as today in a larger box, and the alternative is the reshaping this
  change exists to remove.
- **A cropped preview is no longer a picture of the shape of the rectangle**, so
  a portrait region sits in a landscape box with empty space around it at the
  opening scale → the space is filled by the rest of the photograph, which is
  the point; only a region at the very edge shows the viewport's own background.
- **The reader cannot see where the rectangle's edges are**, the region rarely
  filling the viewport → it is centred on opening and the button moves between
  the two views, which is the answer this change makes; an outline is the
  follow-up if that turns out not to be enough. See the decision above.
- **A photograph smaller than the picture area can be zoomed out until it sits
  small in a large box** → its own pixels are the floor, which is what an
  uncropped preview of the same file shows; the alternative magnifies a
  thumbnail 3–5× and collapses the zoom range with it.
- **Seven browser assertions were written against a frame the size of the
  rectangle** and every one of them is now false → they are the specs that
  proved the old behaviour, so each is rewritten rather than deleted: the
  rectangle is *contained in* and centred within what is on screen, where it
  used to *be* what was on screen. Task 7.2 names all seven.
- **The pixel-sampling assertions are the only ones that can catch the flex
  bug** described in Context → they are also slower and fussier than reading a
  width. Kept anyway; a green suite over a preview drawing the wrong part of the
  picture is the failure mode this whole rendering approach has already had
  once.
- **Four functions where there was one** (`cropView`, `scaleLimits`,
  `clampPan`, `zoomTo`) → each is arithmetic over numbers with no DOM and no
  vault, which is where this repository can afford tests, and they share one
  `MediaGeometry` argument rather than passing three numbers around. `drawnCrop`
  and `previewBounds` are untouched, so the two behaviours already specified do
  not move.
- **No keyboard way to pan or zoom** → the button is focusable and reaches the
  whole photograph, which is the answer the feature exists to give; a hover
  popover that vanishes when the pointer leaves it is not a place to build a
  keyboard interaction, and doing so properly is its own change.
