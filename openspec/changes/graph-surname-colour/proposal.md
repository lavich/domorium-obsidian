## Why

The timeline of a file colours a bar by the person's surname, so that a family reads as one colour; the graph of the same file still tints a card by sex, pink or blue, and the two views of one file disagree about what colour means.

## The user's decision (2026-11-06)

In Russian: «и этот же метод раскраски я хочу чтобы был применен в карточках в графе». Recorded as given; the method is the one of `timeline-named-bars`: the whole surname, hues near for surnames that read alike, a person without a surname grey.

## What Changes

- **A card is tinted by its person's surname**, in place of sex, in the same colours as the person's bar in the timeline, in the light and the dark scheme. **BREAKING:** sex no longer tints the card.
- **The lines of a card** — the given names, the surname and the years — are written in the ink chosen for that tint, so they stay readable at 4.5:1 in both schemes.
- The colour helper (`surnameHue.ts`) and its custom properties are shared by both views, so the properties are named for the surname and not for the timeline.

Repository or upstream: **this repository only.**

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `genealogy-file-graph`: the requirement on a card's tint is restated for the surname.

## Non-goals

- A key other than the surname, a switch for it, or a legend of colours.
- Colouring the nodes of families, the lines, or anything but the card's background and its ink.
- Showing sex anywhere else in the graph; the card, the list and the file still hold it.

## Impact

- `src/desk/cardRender.ts`, `src/desk/graphCanvas.ts` (the card carries its paint, not its sex), `src/desk/fileGraphView.ts`, `src/desk/surnameHue.ts` (`paintStyle`), `styles.css`.
- Tests: `src/desk/fileGraphView.test.ts`, `tests/fileGraph.spec.ts`.
- `README.md`.
- Depends on `timeline-named-bars`, which introduces `surnameHue.ts`; it archives first.
