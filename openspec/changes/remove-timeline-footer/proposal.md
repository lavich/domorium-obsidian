## Why

The timeline of the file (#194) writes text around the drawing that the drawing
already says: a line under the board counting the facts without a year and the
people without a dated event, a subtitle under the title counting people,
families and dated events, and the names of undated facts written inside a
lifeline. The user asked for them to go.

## What Changes

The user's requirement, in their words (2026-11-04):

- «надо у таймлайна убрать подписи снизу — сколько фактов и так далее».
- Clarified: «вообще все подписи».
- «слайдер для зума надо убрать и заменить такими же кнопками шкалы как на
  дереве» — the buttons the graph of the file has.

Proposed scope, taken from that:

- Remove the two lines under the board — «N facts without a year have no mark on
  the line: …» and «N people have no dated event: …» — and the element, styles
  and strings behind them.
- Remove the subtitle under the title of the timeline: people, families, dated
  events and the span of years.
- Remove the facts without a date that are written inside a person's lifeline,
  zoomed in or under the pointer, with their layout, styles, strings and the
  model fields that only they used.
- Replace the zoom slider of the toolbar with the floating −, + and Fit buttons
  of the graph, over a corner of the board; the code that makes them is shared
  with the graph. A step is a fifth of the width of a year within the slider's
  old range; Fit widens or narrows the years to the width of the board.
- On a phone the board takes the height the removed lines and subtitle
  freed, with nothing below it and no empty band above it.
- A person with no dated event still has a row, and no lifeline; the timeline
  just no longer counts them.

This change is repository-local: it touches only the file timeline of the plugin.
Nothing is needed from `@domorium/*`.

## Non-goals

- The names column with years, the year axis, marks and spans with their hover
  tooltip, the year cursor with ages and its «In YEAR: N alive» line, search,
  zoom, the branch scope line, the Other-events switch and the empty and
  file-gone messages stay as they are.
- The graph of the file keeps its own summary of people and families.
- The page of one person keeps its timeline with its «Undated» section.
- Nothing is added in place of what is removed.

## Impact

- Capability `genealogy-file-timeline`: three requirements are modified — «A row
  is a person, and their lifeline is coloured by sex», «A person's events are
  drawn on their lifeline» and «Finding a person and zooming».
- Code: `src/desk/fileTimelineView.ts`, `src/desk/fileTimeline.ts`,
  `src/desk/dom.ts`, `src/desk/graphCanvas.ts`, `styles.css`, `src/i18n/en.json`, `src/i18n/ru.json`.
- No setting, no `minAppVersion` change, no dependency.
