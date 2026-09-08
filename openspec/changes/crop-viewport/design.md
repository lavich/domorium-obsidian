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
cropView(crop: MediaCrop, naturalWidth, naturalHeight, bounds): MediaView
// MediaView = { scale: number; tx: number; ty: number }
```

taking the rectangle **already clamped by `drawnCrop`**, and returning the
transform that puts it in the middle of the viewport:

- `fit(w, h, bounds) = min(bounds.width / w, bounds.height / h)` — not capped at
  1, which is the whole difference from `cropScale`. A 40×30 region today draws
  at 40×30 in a 40×30 box; fitted into a 560×400 viewport it draws at 13×.
- `scale = clamp(fit(crop.width, crop.height, bounds), scaleMin, scaleMax)`.
- `tx`, `ty` centre the scaled rectangle in the viewport and are then put
  through the pan clamp, so a rectangle against an edge of the photograph is not
  centred by leaving a gap.

`MediaView` is the one value the renderer needs; `applyCrop` becomes
`applyView(frame, image, view)` writing `translate(${tx}px, ${ty}px)
scale(${scale})` and nothing to the frame's size.

### The magnification cap is 4

`MEDIA_PREVIEW_MAX_MAGNIFY = 4`, so `scaleMax = max(4, scaleMin)`.

Unbounded fitting turns a 20×15 rectangle into a 28× wall of four colours. Four
is chosen because at that point a JPEG's own artifacts are larger than anything
they might be hiding — the reader is being shown the compressor's work, not the
photograph's — while a face of 80×100 pixels out of an old scan, which is the
case this cap exists for, still reaches 320×400 and is legible. The `max(4,
scaleMin)` is not cosmetic: a photograph small enough that the whole of it fits
at more than 4× must still reach its own zoom-out limit, or the two limits cross
and the range is empty.

_Alternative — no cap, or a cap on the resulting pixel size rather than the
factor._ A pixel-size cap makes the limit depend on the pane, so the same
reference magnifies differently in a narrow pane and a wide one. Rejected: the
factor is the property the reader can reason about.

### Out as far as the whole photograph, and no further

```
scaleMin = fit(naturalWidth, naturalHeight, bounds)
scaleMax = max(MEDIA_PREVIEW_MAX_MAGNIFY, scaleMin)
```

`scaleMin` is the whole photograph fitted into the viewport. Further out is a
picture adrift in an empty box, which answers nothing; and stopping exactly
there means the zoom-out limit and the toggle's whole-photograph state are the
same view, reached two ways, rather than two views a pixel apart.

### The pan clamp is per axis: cover if larger, centre if smaller

`clampPan(view, naturalWidth, naturalHeight, bounds): MediaView`, applied to
every result — the initial framing, every drag, every zoom:

- Where `naturalWidth * scale >= bounds.width`, `tx` is clamped to
  `[bounds.width - naturalWidth * scale, 0]`: the photograph covers the
  viewport, and dragging stops when its edge meets the viewport's.
- Otherwise `tx = (bounds.width - naturalWidth * scale) / 2`: it is centred and
  cannot be dragged off centre. There is nothing to reveal, so movement would
  only lose the picture.
- The same for `ty`, independently. A panorama in a square viewport pans
  sideways and is pinned vertically, which is right.

At `scaleMin` both axes are at the boundary, so the whole photograph is centred
and immovable. The zoom-out limit needs no separate rule about position.

### Zoom keeps the point under the pointer still

`zoomTo(view, factor, px, py, naturalWidth, naturalHeight, bounds): MediaView`,
where `px`/`py` are in the frame's own coordinates: the new scale is
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
`cropView(...)` for the region, `fit`-and-centre for the whole photograph — so
"show the region again" means the rectangle as the popover opened on it,
whatever was dragged in between, and needs nothing remembered but which of the
two was asked for last.

It is not drawn for a reference with no rectangle, nor for a rectangle that
falls outside the image: in both cases there is no second view to move to.

_Rejected — a minimap._ A whole-photograph thumbnail with the rectangle
outlined, beside or over the picture. It answers "what is around this" in 120
pixels, where zooming out answers it at full size; it needs its own scaling,
its own layout in a popover already tight, and its own outline arithmetic; and
having built it there would be two devices for one answer, which is one too
many. Rejected in favour of the zoom-out limit and the button that reaches it.

### A rectangle that misses the image is named

`drawnCrop` returning `null` today drops the crop class and every style and
shows the whole image, which is byte-for-byte the uncropped preview. The one
case in which the numbers are certainly wrong is the one case that says nothing
about them, and a spec asserts it (`tests/mediaPreview.spec.ts:446`).

It keeps showing the whole photograph — there is nothing else to show — and
gains a note above the picture in the `gedcom-media-note` element the renderer
already has, reading **Rectangle outside the image**. Terse, like *File not
found* and *Image could not be drawn* beside it; the fact is the whole message,
and the reader can see for themselves what is being shown instead.

Beyond the note it renders exactly as the uncropped case: fitted, popover sized
to the image, no interaction, no button. Making it interactive would offer to
navigate away from a picture that is already whole, and the button would have no
second view to name.

**A rectangle merely overhanging an edge gets no note.** The clamped part is
picture the reference asked for, the overhang is one number too large rather
than four numbers wrong, and a rectangle at the edge of a photograph is
ordinary. The reader who wants to know zooms out and sees the edge. A note here
would fire on the common case and teach the reader to ignore notes.

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
zooming out shows the whole photograph. The harness's current sample bytes
cannot carry that: the assertions have to distinguish region from surroundings
at several scales, by sampling pixels. `harness/mount.ts` gets a generated
image with a distinguishable region — a marked block inside a differently
coloured field, at a size the existing `120×80` crop fixtures still address —
and the specs sample it. This is harness data, not plugin behaviour, and no
spec requirement rests on the particular bytes.

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
- **The pixel-sampling assertions are the only ones that can catch the flex
  bug** described in Context → they are also slower and fussier than reading a
  width. Kept anyway; a green suite over a preview drawing the wrong part of the
  picture is the failure mode this whole rendering approach has already had
  once.
- **Four functions where there was one** (`cropView`, `scaleLimits`,
  `clampPan`, `zoomTo`) → each is arithmetic over numbers with no DOM and no
  vault, which is where this repository can afford tests. `drawnCrop` and
  `previewBounds` are untouched, so the two behaviours already specified do not
  move.
- **No keyboard way to pan or zoom** → the button is focusable and reaches the
  whole photograph, which is the answer the feature exists to give; a hover
  popover that vanishes when the pointer leaves it is not a place to build a
  keyboard interaction, and doing so properly is its own change.
