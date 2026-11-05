## Why

In the timeline, the band of years runs on from the corner above the column of
names in the same colour with nothing between them, so the header row has no
visible structure, and the axis itself is a row of numbers with nothing to read a
year from between them.

## What Changes

The user's requirement, in their words (2026-11-05):

- «на таймлайне шкала сливается с шапкой списка — надо там или разделитель или
  цвета разные сделать, а так же на шкале надо бы добавить рисок».

This repository is the right place: the change is the timeline's own drawing and
its spec; nothing in parsing, validation or the language service is involved.

Proposed scope (decisions that are mine are marked):

- **A divider** (mine): a line between the corner and the band of years, the
  continuation of the line that already runs between the names and the rows, and
  the line under the whole header row stays. The two cells keep one background:
  the header is told apart from the rows by its colour and its lines, not by a
  second shade inside it.
- **Ticks** (mine): on the axis, from its bottom edge upwards, a short tick for
  every year, a medium one every 5 years and a long one every 10 years, in the
  theme's faint text colour. The yearly ticks are left out where the years are
  closer than 4.5 px. The labels stay as they are, and the ticks do not depend on
  them; every labelled year has a long tick, and the long ticks sit on the
  plot's gridlines.
- **Drawn as the rest is** (mine): only for the years in and near the window, as
  one shape per kind of tick, never one element per tick, and no kind of tick
  beyond a thousand in a window.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `genealogy-file-timeline`: one added requirement, «The axis of years is set
  apart from the names and carries ticks». No existing requirement changes: the
  zoom requirement already says the axis stays in place, and the year cursor
  requirement still names the year on the axis.

## Non-goals

- No change to the labels, their thinning with zoom, or the gridlines.
- No change to the scrollbars' gutters, the names, the plot or the zoom range.
- The graph is untouched.
- No new strings, no change to `minAppVersion`.

## Impact

- `src/desk/fileTimelineView.ts`, `src/desk/axisTicks.ts` (new, pure),
  `styles.css` (`.gedcom-ft-*`).
- Tests: `src/desk/axisTicks.test.ts`, `tests/fileTimeline.spec.ts`.
- Spec: `openspec/specs/genealogy-file-timeline/spec.md`.
