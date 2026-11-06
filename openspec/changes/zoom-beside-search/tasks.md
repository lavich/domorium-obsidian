Archive after `timeline-named-bars`.

## 1. The dock

- [x] 1.1 `floatingDock` in `src/desk/dom.ts`; zoom tooltips at the bottom (`src/desk/fileGraphView.test.ts`)
- [x] 1.2 Graph: the canvas owns the dock, the search is prepended to it (`src/desk/fileGraphView.test.ts`)
- [x] 1.3 Timeline: search and zoom in the dock; drop `--gedcom-ft-hbar` (`src/desk/fileTimelineView.test.ts`)
- [x] 1.4 `styles.css`: dock position, children static

## 2. Browser specs

- [x] 2.1 Search beside the zoom, zoom in the top half (`tests/fileGraph.spec.ts`, `tests/fileTimeline.spec.ts`)

## 3. Check

- [x] 3.1 `npm run check` and `npm run test:browser`
