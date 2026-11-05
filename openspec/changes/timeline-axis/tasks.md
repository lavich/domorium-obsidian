## 1. The axis

No open change precedes this one.

- [ ] 1.1 Add `src/desk/axisTicks.ts`: `ticksBetween(from, to, pixelsPerYear)` returns the years for the short, medium and long ticks (short only from 4.5 px per year, each kind empty beyond 1000 in the span). Test in `src/desk/axisTicks.test.ts`: 1900 to 1920 at 6 px gives long ticks on 1900, 1910, 1920, medium on 1905 and 1915 and the rest short; at 2 px no short ticks; negative years sit on the same grid; a far span draws no kind over its cap.
- [ ] 1.2 In `src/desk/fileTimelineView.ts` draw the ticks with the window (`draw()`): one group in the axis SVG with a `path` per kind, from the bottom edge up by 3, 5 and 7 px, first in the SVG so labels and the year cursor paint over it. In `styles.css` give the corner a border on its inline end and the ticks `--text-faint` with `crispEdges`.
- [ ] 1.3 Test in `tests/fileTimeline.spec.ts`: the corner has a border on its inline end like the names' and the plot has none, the border under the header row is drawn, with the theme's border colour; at the initial zoom the axis has three paths, the long ticks are on the labelled years' gridlines and the counts of ticks are those of the shown decades; at the narrowest zoom there is no short path; after scrolling sideways the shape count is unchanged; a file of 10 000 people has no more than three tick shapes; the gutters test passes unchanged.

## 2. Gates

- [ ] 2.1 `npm run openspec:validate`, `npm run check`, and `npm run test:browser` five times; screenshots of the harness at 1400 and 390 px in light and dark looked at.
