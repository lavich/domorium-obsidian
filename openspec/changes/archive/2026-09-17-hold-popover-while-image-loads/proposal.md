## Why

A reader who presses **Show this image** can watch the popover vanish under
their pointer. The answer redraws the popover in place, and a remote image has
no size until it arrives, so for the length of the request the popover is an
empty frame a few pixels wide. The pointer that was on the button is now outside
it. Chromium 153 reports that as the pointer leaving the popover — the hovered
node was removed, and it recomputes what is under the pointer — and a hover
popover that the pointer has left closes. Chromium 151 stayed quiet until the
pointer actually moved, which is the only reason this has not been seen: the
Chromium that Playwright 1.63 brings (dependabot #135) fails the two specs that
take the offer, and the Electron under Obsidian will bring the same behaviour in
its own time. A question the reader has just answered must not close on the
answer.

## What Changes

- A popover redrawn by the reader's answer keeps the footprint it had when the
  question was asked, as a minimum, for as long as that popover lives. The
  picture grows it where the picture is larger; nothing shrinks it under the
  pointer. This holds for the picture that arrives, for the row that says it did
  not, and for the moment in between.
- The redraw becomes the renderer's own: `renderMediaPreview` replaces what its
  container holds and measures the preview it is replacing, rather than each
  host emptying the container first. The Obsidian view and the browser harness
  then redraw the same way, which is the only way the harness proves anything
  about the view.
- The two specs in `tests/mediaPreview.spec.ts` that take the offer pass on the
  Chromium Playwright 1.63 ships, and go on passing on the one 1.62 ships.

This change belongs in **this repository**. Nothing about the document or the
language service is involved; it is the popover's lifetime under a pointer, which
is Obsidian's side of the line.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `media-preview`: the requirement that a remote image is drawn only after the
  reader asks gains what the answer must not do — close the popover it was given
  in — with a scenario for the popover between the answer and the image, and one
  for a picture smaller than the question was.

## Impact

- `src/editor/mediaPreviewView.ts` — `renderMediaPreview` takes over replacing
  the container's content, measures the preview it replaces, and carries that
  size onto the new one as a minimum.
- `src/GedcomView.ts` — `drawMediaPreview` stops calling `hoverEl.empty()`.
- `harness/mount.ts` — the harness's `draw` stops calling `replaceChildren()`.
- `src/editor/mediaPreviewView.test.ts` — the hold is applied from a measured
  preview and not from an empty container.
- `tests/mediaPreview.spec.ts` — the two specs that fail today are the proof;
  one more checks the popover is no smaller after the answer than before it.
- Dependabot #135 (`@playwright/test` 1.62.1 → 1.63.0) can land once this has.

## Non-goals

- **Changing when a popover closes.** The pointer leaving the popover still
  closes it, and the popover still keeps itself while the pointer is inside; the
  spec's lifetime rules stand. Only the popover's size under an answer changes.
- **A placeholder, a spinner, or a "loading" row.** The request is usually
  short, and a state drawn for it would be a third thing the popover can show.
  Holding the size is enough to keep the pointer inside.
- **Reserving the picture's eventual size.** The image's extent is not knowable
  from the document; what is knowable is the size of the question, and that is
  what is held.
- **Working around the browser in the spec.** Moving the pointer, waiting, or
  clicking elsewhere in `tests/mediaPreview.spec.ts` would make the spec pass and
  leave the reader's popover closing.
- **Bumping Playwright inside this change.** That is #135's job; this change
  makes it mergeable.
