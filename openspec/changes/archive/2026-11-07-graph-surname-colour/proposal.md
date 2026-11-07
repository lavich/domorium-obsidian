## Why

The timeline of a file colours a bar by the person's surname, so that a family reads as one colour; the graph of the same file still tints a card by sex, pink or blue, and the two views of one file disagree about what colour means.

## The user's decision (2026-11-06)

In Russian: «и этот же метод раскраски я хочу чтобы был применен в карточках в графе». Recorded as given; the method is the one of `timeline-named-bars`: the whole surname, hues near for surnames that read alike, a person without a surname grey.

Added later the same day, in Russian: «убери фото аватарки из карточек графового представления». Recorded as given.

## What Changes

- **A card shows no picture.** The portrait is gone from the cards of the graph, and with it the extra height of a card that had one: every card is one height, and a row is one card tall. The record card keeps its portrait; only the graph's cards lose it, and the graph no longer loads any picture.

- **A card is tinted by its person's surname**, in place of sex, in the same colours as the person's bar in the timeline, in the light and the dark scheme. **BREAKING:** sex no longer tints the card.
- **The lines of a card** — the given names, the surname and the years — are written in the ink chosen for that tint, so they stay readable at 4.5:1 in both schemes.
- The tone of a card, as of a bar, has a lightness and a saturation from the whole stem of the surname beside its hue, so that two surnames on one hue differ.
- The colour helper (`surnameHue.ts`) and its custom properties are shared by both views, so the properties are named for the surname and not for the timeline.

Repository or upstream: **this repository only.**

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `genealogy-file-graph`: the requirement on a card is restated for the surname tint and for no picture.
- `genealogy-view`: the requirement that the views draw the tab's own reading no longer says a card shows a portrait.

## Non-goals

- A key other than the surname, a switch for it, or a legend of colours.
- Colouring the nodes of families, the lines, or anything but the card's background and its ink.
- Showing sex anywhere else in the graph; the card, the list and the file still hold it.

## Impact

- `src/desk/cardRender.ts`, `src/desk/graphCanvas.ts` (the card carries its paint, not its sex, and no portrait), `src/desk/fileGraph.ts` (no tall cards), `src/desk/fileGraphView.ts`, `src/desk/fileViews.ts`, `src/GedcomView.ts` (the graph no longer asks for a portrait), `src/desk/fileTimeline.ts` (`TimelinePerson.portrait` goes), `src/desk/media.ts` (`PortraitContent` moves here), `src/desk/surnameHue.ts` (`paintStyle`), `styles.css`.
- Tests: `src/desk/fileGraphView.test.ts`, `tests/fileGraph.spec.ts`.
- `README.md`.
- Depends on `timeline-named-bars`, which introduces `surnameHue.ts`; it archives first.
