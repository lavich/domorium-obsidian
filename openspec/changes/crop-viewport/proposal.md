## Why

A `CROP` is four numbers nobody can check. The preview draws the rectangle those
numbers name and nothing else, so a rectangle in the wrong place shows a wrong
but entirely plausible piece of the photograph — a shoulder, a hat, somebody
else's face — and the reader has no way to ask "did this land where I meant it
to". The one question a cropped preview raises is the one it cannot answer:
what is around this?

The same drawing decision makes the popover jump. The frame is sized to the
rectangle, so a 40×30 region gives a stamp and a 900×700 one fills the bound;
moving down a list of links reshapes the popover at every line.

## What Changes

- **BREAKING (to what is on screen, not to any API)** Where a media reference
  carries a `CROP`, the popover's picture area becomes a viewport of a fixed
  size — the bound the pane already allows — instead of a frame cut to the
  rectangle. One shape for every reference in the file.
- The rectangle is what the viewport opens on: clamped against the loaded image
  as it is today, then fitted into the viewport and centred. Fitting may
  magnify, which the current scaling never does, so a small region is legible
  rather than a stamp. The magnification is capped.
- The reader can pan the photograph inside the viewport and change the scale,
  out as far as the whole photograph fitted into it. That is the answer to
  "what is around this", at full size rather than in a thumbnail.
- One button beside the picture toggles between the region the line names and
  the whole photograph. A wheel gesture has to be guessed at; a button is the
  discoverable form of the same answer, and it takes the reader back to what the
  line actually says.
- A rectangle the image does not overlap at all is named. Today it silently
  falls back to the whole photograph, which is indistinguishable from a
  reference carrying no `CROP` — the one case where the numbers are certainly
  wrong is the one case the preview says nothing about.
- An image with **no** `CROP` is unchanged: fitted into the bound, the popover
  sized to the image, nothing interactive. Deliberately so — the whole snapshot
  is already the answer to "what is around this", and a click already opens the
  file in a tab.

This change belongs in **this repository**. `getMediaAt` already reports the
rectangle and `MediaCrop` already carries it; nothing here asks anything new of
`@domorium/language-service` or `@domorium/codemirror`, which stay at 2.1.0.
What to draw for a rectangle, and what a reader may do to it once drawn, is
Obsidian's side of the line.

## Capabilities

### New Capabilities

None. This is the media preview's behaviour and it has a spec.

### Modified Capabilities

- `media-preview`: the requirement that the rectangle is what the link shows
  becomes a requirement about where the preview *opens* — the rectangle is the
  initial state of a viewport the reader can move — and gains the degenerate
  rectangle being named rather than passed off as an uncropped image. New
  requirements cover the fixed viewport, panning, the scale and its two limits,
  the toggle, and the untouched uncropped case. The bounding requirement's
  cropped clause changes: a rectangle larger than the bound is no longer scaled
  down whole as a matter of sizing, it is the viewport's opening scale.

## Impact

- `src/editor/media.ts` — `cropScale` goes; `cropView`, the scale limits and the
  pan clamp arrive as pure functions. `drawnCrop` and `previewBounds` are
  untouched.
- `src/editor/media.test.ts` — `cropScale`'s five cases are replaced by the new
  functions', still numbers and no DOM.
- `src/editor/mediaPreviewView.ts` — `applyCrop` stops sizing the frame to the
  rectangle; the frame becomes the viewport, gains pointer and wheel handlers
  and the toggle button, and draws the note for a rectangle that misses.
- `src/editor/mediaPreviewView.test.ts` — the toggle, the note, and the
  handlers being installed only for a cropped reference.
- `styles.css` — the viewport's fixed size, the toggle's row, and the two
  properties a drag needs (`touch-action`, `user-select`).
- `tests/mediaPreview.spec.ts` — the two assertions on the frame's width move to
  what is drawn inside a frame that no longer changes size, read by sampling
  pixels; the drag, the wheel and the toggle are proved here.
- `harness/mount.ts` — the sample image needs a region distinguishable from the
  rest of the photograph at more than one scale, which the current two-tone
  bytes may not give.

## Non-goals

- **A minimap.** A whole-photograph thumbnail with the rectangle outlined
  answers the same question in 120 pixels that zooming out answers at full
  size, and two devices for one answer is one too many.
- **Interaction for an uncropped image.** See above: it poses no question, and a
  click already opens the file.
- **Pinch-zoom, and mobile as a criterion.** Touch drag arrives free with
  pointer events and is welcome; a second touch point is a gesture of its own.
  Issue #78 was closed as not planned, so no `Platform` branching is added and
  nothing here is designed from a guess about a phone.
- **Editing the `CROP`.** Dragging a rectangle a reader can then write back to
  the file is a different feature, and the GEDCOM file stays the source of
  truth for this one.
- **Keeping a reader's pan and scale.** Each popover opens at the rectangle the
  line names. A remembered viewport would make the same line show two different
  pictures on two hovers.
- **A second popover, a modal, or a lightbox.** The preview stays a hover
  popover.
