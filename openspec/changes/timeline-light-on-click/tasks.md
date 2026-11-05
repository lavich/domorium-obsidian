## 1. The board

No open change precedes this one.

- [x] 1.1 In `src/desk/fileTimelineView.ts` remove the `HoverDelay`, `resting`, `cancelHover` and the rest/leave calls in the pointer handlers (the tooltip and the year cursor stay), and the `focusin` and re-focus lights; `activate` lights the person on a mouse, pen or keyboard click before `host.select`, puts the light out on a click or a touch on empty space, and keeps the touch rule; add `unlight()`; `select` puts the light out for a person other than the lit one; `setScope` puts it out; add an Escape `keydown` on the root. Test in `src/desk/fileTimelineView.test.ts`: pointer moves and a rest of `HOVER_DELAY` and more light nothing (no `is-on`, `is-hl`, `has-hl`, kin or row band); a click on a name and on a lifeline lights and calls the host's `select`; a click on another person moves the light; a click on empty board and Escape put it out and the host is not called; Enter on a name lights; focus alone lights nothing; `select` of another person puts it out and of the lit one keeps it; a scope change puts it out; a touch lights, a second selects and leaves the light, a touch on empty space puts it out; the hover tests (rest, sweep, focus) are replaced.
- [x] 1.2 In `src/desk/fileViews.ts` hide the timeline's light through `unlight()` and the graph's timer through `cancelHover()`. Test in `src/desk/fileViews.test.ts`: hiding the tab puts out the light of a clicked timeline person; the graph tests pass unchanged.
- [x] 1.3 In `styles.css` keep the transition and `has-hl`/`is-on` rules for the click; nothing fades under `:hover`. In `README.md` change the sentence about pointing at a person to clicking. Test in `tests/fileTimeline.spec.ts`: hovering a name changes no row's opacity and draws no arrow; a click fades the others to 0.18 and draws four arrows for Marie; a click on empty space and Escape restore opacity 1; reduced motion lights at once; the keyboard test and the branch tests that relied on hover click first.

## 2. Gates

- [x] 2.1 `npm run openspec:validate`, `npm run check`, and `npm run test:browser` five times.
