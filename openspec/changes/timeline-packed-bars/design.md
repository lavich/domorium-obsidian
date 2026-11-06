## Context

`layoutOf` (`src/desk/timelineLayout.ts`) gives every shown person a `y` of `at * ROW + ROW / 2` from their place in `model.rows`, and builds one `Item` per bar, span, mark and marriage line, each with a box (`top`, `bottom`, `left`, `right`) that the view uses to draw only what is in the window. Names are not part of that layout: `drawNames` in `fileTimelineView.ts` builds a second, parallel column of HTML rows, with the Branch button, the years and the keyboard focus, and `timelineEvents.ts` wires its scroll (`surface.names`, `namesScrolled`). A click draws the links of one person (`drawArrows`) into the `hover` layer, and the marriage lines of all families are drawn always, as items.

Two fields of the view are easy to confuse. `highlighted` is the lit person: the light, the fade, the links and the cursor's lit ages follow it, and a click on empty space or Escape ends it. `selected` is the tab's selected record: the selected mark and, after this change, the Branch button and the age ruler follow it, and Escape leaves it. A phone's first touch lights without selecting.

Everything downstream of the layout reads `layout.y` by xref — the cursor's age pills, the highlight, the find's scroll target, the selected mark — so a lane can stand in for a row without those readers changing, as long as `y` stays a map from xref to the centre of the person's lane.

The model already holds what the links need: `FileTimeline.families` has `spouses`, `children` and `marriage`, and `TimelinePerson` has `parents`, `spouses`, `children`. `readNameParts` (`src/genealogy/names`) splits a surname. See proposal.md for the motivation and the decisions the user recorded.

## Goals / Non-Goals

**Goals:**
- Lanes replace rows in `layout.y` with no change to its readers.
- The name column and its second render path disappear; the name is drawn with the bar and virtualised with it.
- Colour, packing and the link years are pure functions with their own unit tests.

**Non-Goals:**
- A second layout for the old rows, or any flag choosing between them.
- Squeezing empty years off the axis, and a historical background.

## Decisions

### D1. Packing is a pure function over boxes, in `timelineLanes.ts`

`packLanes(boxes, near)` takes, for each shown person, the pixel `left` of the bar and the pixel `right` of the bar *or of its label, whichever is further*, and returns the lane of each. People are taken in order of `left`, the order of `model.people` — the order the file declares them — breaking ties; each goes in a free lane, where free means the lane's last `right` plus `GAP` (12 px) is at most the new `left`. Of the free lanes the one with the smallest distance to the lanes of the person's already placed parents and spouse is taken, the topmost if none is placed; a lane is opened only if none is free.

The scan of the free lanes makes this `O(n × lanes)`, not `O(n log n)`; with lanes in the low hundreds that is a few milliseconds for 10 000 people, and the time-bound test keeps it so. It runs in pixels because the label's width is in pixels, so a zoom changes the lanes. `layoutOf` already runs on a change only (`relayout`), so there is no extra memo; an edit in Source relays out the board while the tab is in view, and one changed date can move lanes everywhere. That is accepted; keeping lanes stable across edits is not worth the second state.

*Alternatives.* Packing in years and drawing the label over whatever is next: rejected, a label would run over the next bar. Packing once at a reference zoom: rejected, labels beyond the bar at a narrow zoom would collide. Keeping `model.rows` as the order of lanes: rejected, it is the one-person-per-row order the change leaves; `model.rows` stays for the file graph and for what else reads it.

### D2. The width of a label is measured with the card's measure

The layout takes a `measure(text)` from the view, which is `nameMeasure(root)` from `src/desk/cardRender.ts` — a canvas `measureText` in the interface font, with the try/catch fallback to a character count and a per-name memo it already has. No second measure is written. Under Vitest there is no canvas, so unit tests inject a `measure` of their own; whether a real name fits a real bar is checked in the Playwright spec. A change of font or of the interface zoom makes a new `nameMeasure`, since the view builds one per layout.

The name is `personName`. A name narrower than the part of the bar that is not faded is written inside; otherwise it is written beyond the end of the bar, and D1 counts it. *Alternative:* clipping with an ellipsis, rejected by the user's decision.

### D3. The bar keeps its element; the name is its own item

The bar stays a `rect` with the classes, the `mask` and the `data-p` it has, so the code that marks `is-selected`, `is-current` and `is-dim` on `.gedcom-ft-life` (`fileTimelineView.ts`, `styles.css`) keeps working. The name is a second item with the same `data-p`, a `text` of class `gedcom-ft-label`, dimmed and hit-tested with the bar, in the same window. Text inside the bar sits in the unfaded part only (D2); beyond a faded end it is drawn in the plot's text colour.

A bar is 22 px high in a lane of 32 (`ROW`), the name above the bar's middle line, and the marks and spans of events are drawn along the bar's lower edge — a circle of at most 5 px, a span 4 px high — so none lies across the name. The age pills of the cursor, which do cover the bar, keep their place.

The bands that painted a person's whole row, `gedcom-ft-row-hl` and `gedcom-ft-row-selected`, would now cover other people in the lane; they become a ring around the bar.

`drawNames`, the `names` element and its scroll following (`timelineEvents.ts`: `names`, `namesScrolled`, the scroll listener), the names part of `fitGutters`, the `gedcom-ft-names` and `gedcom-ft-name*` styles, the corner (`gedcom-ft-axis-pad`) and the grid column of `.gedcom-ft-board` go. `fitGutters` stays for `--gedcom-ft-vbar` and `--gedcom-ft-hbar`, which the floating controls need. `lifelineYears` in `labels.ts`, used only by the name column, is deleted with its tests.

Keyboard: each drawn bar has `tabindex="0"`, `role="button"` and the person's name as its label; Enter and Space select as a click does. The Tab order is the order of the DOM, which is the order bars begin. The focused xref is remembered across a redraw, as `drawNames` did.

### D4. Colour is a hue from the surname, by similarity

`surnameHue(surname)` returns a hue in [0, 360). The whole surname is used — `Skłodowska-Curie` and `Joliot-Curie` are two surnames, as the user said. It is folded (NFD without marks, lowercase) and a Cyrillic surname is transliterated to Latin by a small table (`ж→zh`, `х→kh`, `ы→y`, …), so `Жуков` and `Zhukov` agree. The gendered endings are stripped by a table written in the folded form — `й` is `и` after NFD, so the table holds `ski/ska/ske`, `ov/ova`, `ev/eva`, `in/ina` and `ii/aia`, not `ский`. The stem is then read as a fraction in base 27 over its first four letters, first letter most significant, and mapped to the circle; saturation and lightness are fixed per scheme.

The result is that stems that begin alike are near and ones that do not are far. The circle wraps, so `Abramov` and `Zhukov` meet at the red end; that is accepted. A step of one first letter is about 13°, so the tests state what the function promises: the same stem is within 3°, first letters at least four apart are at least 50° apart, and `Лобанов` and `Сидорова` clear that. The colour is a hint, never the only carrier: the name is in the bar.

*Alternatives.* An edit distance among the surnames of the file laid out on the circle: better neighbours, but a surname's colour then depends on the file and changes as people are added; rejected. A plain string hash: rejected, near surnames would be far.

The text colour (white or near-black) is chosen per hue so that it passes 4.5:1 on the bar's fill in each scheme; a Playwright spec computes the ratio for a spread of hues, the yellow-green band included, and for the dimmed and the ringed bar.

### D5. The lit person's links, as `drawArrows` does, plus the marriage

Links follow `highlighted`, which a click sets with the selection and Escape clears. `drawArrows` keeps its lines — a vertical from the parent's lane to the bar's edge at the child's start year, parents offset by 2 px each way — and gains the dashed marriage line, with a dot at each end, for each family the lit person is a spouse in, from the same `hover` layer. `itemsOf` stops making the always-visible marriage items; the marriage mark stays on each bar. The year of a marriage line is `TimelineFamily.linkYear`: the marriage's year, else the first year of the earliest dated child's bar start; with neither, no line. Links run under the bars and over the gridlines; a bar a link crosses hides it, the cost of vertical lines over packed lanes and the reason links are for one person.

### D6. Branch is an overlay button and a command

The board is SVG, and a button cannot nest inside a `role="button"` bar. Branch is an HTML button in the plot's content layer, positioned at the end of the selected bar and following it as the plot scrolls, a sibling of the bars. It follows `selected`, not `highlighted`, so it stays after Escape; it exists only for the selected person, and only while that bar is drawn. The keyboard reaches Branch through the command **Branch of the selected person** (`commands.ts`), which calls the same `setScope`, so a selected bar scrolled out of the window, or a reader who never tabs to the overlay, loses nothing.

### D7. The tooltip is the name

The tooltip of a mark exists (`tip`, driven by `markOf` in `timelineHits.ts`); the bar's is the same element with a new hit function `barOf`, giving the name `personName`. A mark is drawn above its bar, so `markOf` is asked first and wins. A touch's first tap shows it, as the phone requirement says.

### D8. The age ruler follows the selection

`drawCursor` writes the year on the axis flag and the ages of those alive on their lanes. With a selected person the flag also carries their age at that year, `≈` where the birth is approximate, by the rule `alive` already uses (a difference of years); none before the birth, after the death, or where the bar begins at another event. The flag widens to fit.

### D9. A pinch is a gesture of its own

`touch-action: pan-x pan-y` on the plot makes the browser take two fingers and cancel the pointer events, so the pinch uses touch events with non-passive `touchstart` and `touchmove` listeners, calling `preventDefault` once a second finger is down. While the fingers move, the plot's content is scaled by a CSS transform about the midpoint, with no relayout; when they lift, one `setScope({ zoom })` runs, clamped to the range of the zoom buttons, with the scroll set so the year under the midpoint stays under it and the lane under it stays in view. No `setScope` runs per frame, so no save and no re-packing of 10 000 bars per frame. A test sends touch sequences and asserts a single `setScope`.

### D9a. A person who may be alive runs to the current year

`TimelinePerson.lifeline` gains `living: boolean`, true where no death is recorded, the bar begins at a dated birth, christening or baptism (`age` is set) and `begin.year + OPEN_SPAN > now`; its `end` is already `now` in that case. A person whose bar begins at another event — a marriage in 1930 — stays open and fades. The living bar's end is a straight edge (no `mask`), and the `now` line of `drawGrid` passes through it. `alive(year)` already counts such a person up to `end`, and the cursor and the ages treat it as before. Nothing is written to the file and no `living` flag is read. `fileTimelineOf` takes `now`, so tests fix it; `curie.ged`'s Hélène and Pierre Joliot, with no death, change from faded to cut, and the assertions on `is-open` and `"1927–"` change with them.

### D10. People with no dated event have no bar and are left out

A person with no dated event has no `lifeline`, so no box. `layout.shown` is filtered to people with a lifeline, so the search (`matchIds`), the reveal, the scope line's count and the order of matches all see the same people; the scope says how many of the file's people *with a bar* its branch holds. A search for an undated person's name reads *No results*. `initialFocus` takes the first person with a bar. A person with no bar who is selected from outside is marked nowhere: `select` does not scroll and does not change the scope. Nothing on the board mentions them; the List and the card still hold them. The user sees no value in an ancestor with no data on a timeline. Existing tests that count 17 or 18 people (`fileViews.test.ts`, `tests/fileTimeline.spec.ts`) change with this.

### D11. Other specs

`genealogy-view` and `genealogy-record-card` keep scenarios that say "row" and "lifeline" of the timeline (`genealogy-view` *A link to a person in a tab in Timeline mode*, *A reader who prefers the timeline*, *A tab that is not in view*; `genealogy-record-card` *A tab holds one selected record*). Restating those four large requirements for a word would copy hundreds of lines; as `places-list` and `events-list` did for a similar gap, they are left as they stand, read "row" as the person's bar, and the gap is recorded here.

## Risks / Trade-offs

- [Packing changes with the zoom, so bars jump between lanes as the reader zooms] → Lanes are recomputed on a zoom step; the view keeps the lane under the pinch midpoint, or the selected bar's, under the same scroll offset.
- [Links cross many packed lanes and hide behind bars] → They are for the lit person only, drawn under bars, and their arrowhead lands on the bar's edge.
- [Order-preserving hue puts `Kowalski` and `Cowalski` far apart, and the circle wraps] → Accepted; D4. The colour is a hint, never the only carrier.
- [The name beyond a short bar extends the lane's width and wastes room] → Only the label's width counts, the gap is 12 px.
- [Measuring text with a canvas is slow for 10 000 names] → `nameMeasure` memoises per text; the layout measures each shown name once per layout.
- [Losing sex as a colour loses a quick read] → The user chose a tooltip with the name only; sex is shown nowhere on the timeline. It stays in the card and the List.
- [Existing unit and browser specs assert the names column, rows and the 17-person count] → They are rewritten in tasks 3 and 5; this is the bulk of the work.
- [A selected person with no bar has no Branch and no mark] → Accepted, D10; the card still shows them.

## Migration Plan

None. No persisted state names a row or a column: the saved scope, zoom and scroll are read as before. A saved scroll offset in `y` lands on a lane that may hold other people, which is harmless, and `scrollTop` is clamped as it already is.
