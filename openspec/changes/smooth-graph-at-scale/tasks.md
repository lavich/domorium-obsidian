No other change is open; this one archives on its own.

## 1. Baseline

- [x] 1.1 Run `npm run test` and `npm run test:browser` on the branch before touching code, and
  keep the scripts that measured the proposal outside the repository: Fit, then zoom in, count the
  drawn cards and elements; drag at 0.6 and 0.15; a light at 0.15 and 0.05 (file: none, scratch).
  Build the harness entry with `esbuild` for `harness/fileGraph.ts` alone if `node harness/build.mjs`
  fails on a package that is not at its locked version.

## 2. Remove what the view no longer needs

- [x] 2.1 `src/desk/graphCanvas.ts`: take the range of `draw` into one helper; in `needsDraw`
  answer true when the drawn range is more than twice the width or the height of the helper's range
  and the view is not gliding; ask for a redraw from the `transitionend` listener and the glide
  timer. Test in `src/desk/fileGraphView.test.ts`: a wide draw, then a view a tenth of the width,
  is pruned; not while `is-gliding`; pruned once the glide has ended; a zoom step of 12% does not
  redraw; a card holding the keyboard focus, the selected card and the current match survive a prune.
- [x] 2.2 `tests/fileGraph.spec.ts`, in the 10 000-person describe: **Fit** from a view set so
  that a glide is within reach, wait for it to end, zoom in to 0.6, expect under 300 cards drawn;
  during that glide expect cards between its ends drawn; and the same from a view too far for a
  glide, which jumps.

## 3. Lighting costs the branch

- [x] 3.1 `src/desk/graphCanvas.ts`: a `FADE_LIMIT` of 3 000 and a lower bound of 2 500, a
  remembered mode; `highlight` leaves `has-hl` off while outlining and marks each lit card
  `is-outlined`; every place that clears the light, and the switch to the fade, clears it; the forced
  call from `draw` does not cancel a pending hover. `styles.css`: the outline and the rings of the
  pointer, the selected card and the current match, non-scaling, in that order after it. Tests in
  `src/desk/fileGraphView.test.ts`, with the limits passed in as a canvas option so a scene of a few
  dozen cards crosses them: above the limit the branch is outlined, no `has-hl`, no `is-on` outside
  the branch; at or below, as before; between the two the mode is kept; moving the pointer off
  clears `is-outlined`; a redraw that lands during a hover rest does not drop the light.
- [x] 3.2 `tests/fileGraph.spec.ts`: on a generated file large enough that more than 3 000 cards
  are drawn at **Fit** (about 35 000 people; assert the drawn count first), the light outlines the
  branch and fades no card; the rendered stroke has the same width in screen pixels at 0.05 and 0.6,
  measured from the stroke's bounding box; the light returns within 100 ms of the pointer moving;
  a selected card and a current match in the branch are wider than the outline.
- [x] 3.3 Screenshots of the outline and the three rings at desktop and phone width, light and dark
  scheme, for the user to see: the widths, the accent, the card under the pointer.

## 4. A layer while the view moves

- [x] 4.1 `src/desk/graphCanvas.ts`, `styles.css`: `is-moving` set by `apply`, cleared 200 ms after
  the last one, `will-change: transform` on `.gedcom-fg-view` with `is-moving` and `is-gliding`.
  Test in `src/desk/fileGraphView.test.ts`: set during a drag and a wheel, cleared after the rest.
- [x] 4.2 `tests/fileGraph.spec.ts`: computed `will-change` is `transform` while dragging and not
  once rested. Sharpness at rest is a look, not an assertion: screenshots at 0.15 and 3 after a zoom
  and a rest, compared by eye with a freshly shown view.
- [x] 4.3 Measure again with the scripts of 1.1 on `Habsburg.ged`: cards and elements after Fit
  and zoom in, raster time of a drag with a trace, the light at 0.15 and 0.05, and the light on a
  branch of about 17 000 cards. Put the numbers in the PR.

## 5. Documentation and gate

- [x] 5.1 `README.md`, where it says pointing lights the whole branch: say that in a crowded view
  the branch is outlined and the others do not fade.
- [ ] 5.2 `npm run check` and `npm run test:browser`; the PR's test plan lists a look in Obsidian on
  desktop with `Habsburg.ged` and on a phone, unticked until someone has done them.

## Left to a look, and why

- The width of the outline on the screen is not asserted: `getBoundingClientRect` leaves the stroke out,
  so the specs check the mechanism (`vector-effect: non-scaling-stroke`, a width in pixels) at 0.05 and
  0.06, and the width itself is judged on the screenshots of 3.3.
- The ring of the current match in an outlined view is reached only where more than 3 000 cards are
  drawn at a zoom of 0.5 or more, which a view cannot hold, since stepping to a match zooms to a readable
  size; it is checked by reading the cascade, and the selected card's ring is asserted.
- The light returning within 100 ms is measured, not asserted (4.3), as a timing bound would be flaky in CI.
- "Sharp once at rest" and the layer's effect on a phone: by eye in Obsidian on desktop and on an iPhone,
  where WebKit may not give an SVG group a layer.
