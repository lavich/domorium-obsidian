## 1. Confirm the drag survives a real popover

- [ ] 1.1 In `demo-vault`, open a `.ged` with a cropped `OBJE` link, open the preview, and hold the primary button down on the picture for several seconds while moving the pointer off the popover and across the editor. Verified by the observation itself: if Obsidian's `HoverPopover` closes mid-drag, stop and say so rather than building the rest on top — the harness spike says it should not, but the harness stubs `HoverPopover`
- [ ] 1.2 In the same session, confirm the picture does not start a native image drag once `dragstart` is prevented, and that a wheel over the popover does not scroll the note behind it. Verified by observation; both were measured in the harness and both need the real popover's chrome around them

## 2. The geometry, as numbers

- [ ] 2.1 Add `MediaView = { scale; tx; ty }`, `MEDIA_PREVIEW_MAX_MAGNIFY = 4`, and `scaleLimits(naturalWidth, naturalHeight, bounds) -> { min, max }` to `src/editor/media.ts`, with `min` the whole photograph fitted and `max` the greater of the cap and `min`. Verify in `src/editor/media.test.ts`: a large photograph gives `min` below 1 and `max` 4; a photograph small enough to fit at more than 4× gives `max === min`, so the range is never empty; a pane of zero falls back to the ceiling bound as `previewBounds` already does
- [ ] 2.2 Add `clampPan(view, naturalWidth, naturalHeight, bounds) -> MediaView`, clamping each axis independently: cover the viewport where the scaled photograph is at least as large, centre it where it is smaller. Verify in `src/editor/media.test.ts`: a drag past each of the four edges stops at it, a photograph smaller than the viewport is centred whatever `tx`/`ty` asked for, and at `scaleLimits(...).min` both axes are pinned
- [ ] 2.3 Add `cropView(crop, naturalWidth, naturalHeight, bounds) -> MediaView`, fitting the (already clamped) rectangle into the viewport, centring it, and putting the result through `clampPan`. Verify in `src/editor/media.test.ts`: a rectangle larger than the bound scales down as `cropScale` did, a rectangle smaller than it magnifies — the case `cropScale` capped at 1 — a tiny rectangle stops at 4×, and a rectangle against an edge of the photograph is pushed inside rather than centred with a gap
- [ ] 2.4 Add `zoomTo(view, factor, px, py, naturalWidth, naturalHeight, bounds) -> MediaView`, keeping the image point under `px`/`py` fixed, clamping the scale to `scaleLimits` and the result through `clampPan`. Verify in `src/editor/media.test.ts`: the point under the pointer is unmoved, a factor beyond either limit lands exactly on it, and a repeated zoom out ends at the whole photograph centred
- [ ] 2.5 Delete `cropScale` and its five cases from `src/editor/media.test.ts`, and confirm nothing else imports it (`grep -rn cropScale src harness tests`). Verify `npm run test` and `npm run lint` are clean; `drawnCrop` and `previewBounds` keep their tests unchanged

## 3. The viewport

- [ ] 3.1 In `src/editor/mediaPreviewView.ts`, replace `applyCrop` with `applyView(frame, image, view)` that writes only the image's `transform`, and give the frame the bound's width and height once when it is created — before the image loads, so the popover does not change shape on `load`. Verify in `src/editor/mediaPreviewView.test.ts` that a cropped frame's inline width is the bound's for two rectangles of different sizes, and that the frame is neither sized to the rectangle nor given `display: flex`
- [ ] 3.2 Compute the opening view in the `load` handler from `drawnCrop` and `cropView`, behind the existing `host.isCurrent()` guard, and keep the existing `error` path untouched. Verify in `src/editor/mediaPreviewView.test.ts` by firing `load` with a stubbed `naturalWidth`/`naturalHeight`: the transform matches `cropView`'s numbers, and a `load` fired after `isCurrent()` goes false writes nothing
- [ ] 3.3 Move the viewport's fixed size into `styles.css` beside the existing `--gedcom-media-max-w`/`--gedcom-media-max-h` properties, and add `touch-action: none` and `user-select: none` to the cropped frame. Verify in `tests/mediaPreview.spec.ts` that the frame's box is the bound in both themes and that a cropped popover is not cut off at its edge, which the bounding specs already assert

## 4. The drag and the wheel

- [ ] 4.1 Install `pointerdown`/`pointermove`/`pointerup`/`pointercancel` on the frame for a cropped reference only, taking `setPointerCapture` on down and applying the delta through `clampPan`, every handler behind `host.isCurrent()` and every listener on the frame so the popover's removal ends them. Verify in `src/editor/mediaPreviewView.test.ts` that the handlers are installed for a cropped reference and not for an uncropped one, and that a synthesised drag moves the transform by the delta
- [ ] 4.2 Prevent `dragstart` on the frame, or the native image drag takes the gesture on the first movement — measured in the spike, where exactly two `pointermove` events arrived and then none. Verify in `src/editor/mediaPreviewView.test.ts` that a dispatched `dragstart` is defaultPrevented
- [ ] 4.3 Add the non-passive `wheel` listener calling `preventDefault` and `zoomTo` with the pointer's position in the frame's coordinates, with the per-event factor and its clamp. Verify in `src/editor/mediaPreviewView.test.ts`: the event is defaultPrevented, the scale moves in the right direction, and a run of large events stops at each limit rather than passing it

## 5. The button

- [ ] 5.1 Draw a single button beside the picture for a cropped reference, following `drawOffer`'s shape, reading **Show the whole photograph** while the region is on screen and **Show the region** while the whole photograph is, and recomputing the view rather than restoring a remembered one. Verify in `src/editor/mediaPreviewView.test.ts`: the label after each press, the view returning to `cropView`'s numbers after a drag and two presses, and no button for an uncropped reference or for a rectangle `drawnCrop` rejects
- [ ] 5.2 Style the button's row in `styles.css` from Obsidian's own variables, as the remote-images offer is styled. Verify in `tests/mediaPreview.spec.ts` in both themes, beside the existing offer-row check

## 6. The rectangle that misses

- [ ] 6.1 Where `drawnCrop` returns `null`, keep showing the whole image and add a `gedcom-media-note` reading **Rectangle outside the image** above the picture, and render the rest exactly as the uncropped case: no handlers, no button. Verify in `src/editor/mediaPreviewView.test.ts` that the note is present, the crop class is gone, and neither the button nor the pointer handlers are installed
- [ ] 6.2 Leave a rectangle that merely overhangs an edge without a note, as decided in `design.md`. Verify in `src/editor/mediaPreviewView.test.ts` that a clamped-but-overlapping rectangle draws no note

## 7. Prove it in the browser

- [ ] 7.1 Give `harness/mount.ts` a sample image with a region distinguishable from its surroundings at more than one scale, keeping the `120×80` size the existing crop fixtures in `tests/harness.ts` address. Verify by sampling two known points in `tests/mediaPreview.spec.ts` and finding different colours
- [ ] 7.2 Rewrite the two frame-width assertions in `tests/mediaPreview.spec.ts` — the 40-wide rectangle at `:387` and the 20×40 overhanging one at `:442` — as assertions about what is drawn inside a frame that is now a constant size, by sampling pixels and by the existing `shownRegion` helper. Verify `npm run test:browser` passes and that the specs still fail if the image is stretched by a flex frame
- [ ] 7.3 Add a spec for the drag: press on the picture, move off the popover, hold for two seconds, and assert the popover is still open and the region on screen has moved. Verify in `tests/mediaPreview.spec.ts`, and include the no-capture control case as a guard that the assertion can fail
- [ ] 7.4 Add specs for the wheel — the scale changes and the page behind does not scroll — and for both limits, zooming out to the whole photograph and in to 4×. Verify in `tests/mediaPreview.spec.ts` by `shownRegion`, the whole photograph being `0,0` to `120,80`
- [ ] 7.5 Add specs for the button: the whole photograph in one press, the rectangle back in two, and the label naming the other state each time. Verify in `tests/mediaPreview.spec.ts`
- [ ] 7.6 Add a spec for the rectangle that misses the image, replacing the fall-back-silently assertion at `:446`: the note is shown, the whole photograph is drawn, and a preview with no `CROP` beside it carries no note. Verify in `tests/mediaPreview.spec.ts`
- [ ] 7.7 Add a spec that two rectangles of different sizes give picture areas of the same size, and that the area does not change when the image loads. Verify in `tests/mediaPreview.spec.ts` with the harness's held-image option

## 8. Check

- [ ] 8.1 Run `npm run check` and `npm run test:browser`
