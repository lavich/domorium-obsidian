## Why

On the graph and the timeline the zoom buttons sit at the bottom corner of the canvas and the
search icon at the top, so the two floating controls of one view are far apart.

User decision, 2026-11-06, verbatim: «на графе и таймлайне элементы управления масштабом графа
перемести к иконке поиска и пусть они теперь будут вместе».

## What Changes

- The zoom out, zoom in and Fit buttons move from the bottom corner to the top corner, into one
  row with the search icon, right after it, and the two share one bordered box, a thin line
  between them.
- The search field opens to the left, away from the zoom buttons, and never covers them.
- The tooltips of the zoom buttons open downwards, as the search's do, because the row is at the top.

This is a change in this repository: no parser or language-service behavior is involved, and no API
above `minAppVersion` is used.

## Capabilities

### Modified Capabilities

- `genealogy-file-graph`: Finding a person; Moving about the graph.
- `genealogy-file-timeline`: Finding a person and zooming.

## Impact

- `src/desk/dom.ts` (`floatingDock`, `zoomControls`), `src/desk/graphCanvas.ts`,
  `src/desk/floatingSearch.ts`, `src/desk/fileTimelineView.ts`, `styles.css`.
- Unit tests `fileGraphView.test.ts`, `fileTimelineView.test.ts`; Playwright specs
  `tests/fileGraph.spec.ts`, `tests/fileTimeline.spec.ts`.
- The Lists keep their own search and are not touched.

## Non-goals

- No new setting, command or string; no change to what the buttons do or to the zoom range.
- The list's search.
