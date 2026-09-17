## 1. Make the redraw the renderer's

- [x] 1.1 In `src/editor/mediaPreviewView.ts`, have `renderMediaPreview` find an existing `.gedcom-media-preview` in `host.container`, measure the extent of its children (widest child; top of the first to bottom of the last), and replace the container's children with the new root instead of appending beside them. Verify in `src/editor/mediaPreviewView.test.ts`: drawing twice into one container leaves one root
- [x] 1.2 Put the measured content size on the new root as `min-width` and `min-height`, only where an old root was found and measured above zero. Verify in `src/editor/mediaPreviewView.test.ts`: a first draw sets neither property; a redraw over a preview whose children have `getBoundingClientRect` stubbed to a size sets both to that size; a redraw over children measuring zero sets neither
- [x] 1.3 Remove `popover.hoverEl.empty()` from `GedcomView.drawMediaPreview` in `src/GedcomView.ts` and `host.replaceChildren()` from `draw` in `harness/mount.ts`, the renderer now doing both. Verify with `npm run typecheck` and the existing `tests/mediaPreview.spec.ts` cases that redraw — the offer, and the setting turned off again — still passing

## 2. Prove the popover stays

- [x] 2.1 Add a spec to `tests/mediaPreview.spec.ts` under "an image the reader asks for" that mounts with `holdImages`, measures the popover with the offer showing, takes the offer, and asserts the popover is still on screen and no smaller in either dimension while the image is held back; then releases the image and asserts the same once it has drawn. Verify by running the spec
- [x] 2.2 Install `@playwright/test@1.63.0` without saving (`npm i --no-save @playwright/test@1.63.0 && npx playwright install chromium`), run `tests/mediaPreview.spec.ts`, and confirm the two cases at "draws it, and asks the host only then" and "does not ask again for the next remote file in the session" pass on Chromium 153; then restore the lockfile's version with `npm ci`. Verify by the run's output, and record the result in the PR description

## 3. Check

- [x] 3.1 Run `npm run check` and `npm run test:browser`, both green
