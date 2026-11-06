## Context

`timeline-named-bars` adds `surnameHue.ts`: `surnamePaint(surname)` returns four custom properties — a fill and an ink for the light scheme and for the dark — and the timeline sets them on each bar. The graph's card is an SVG group `gedcom-fg-person` with a background `rect` tinted by a class `is-f`, `is-m` or `is-u` from the person's sex (`cardRender.ts`).

## Decisions

### D1. The card carries its paint, not its sex

`CanvasCard.sex` is replaced by `paint`, the style string of the person's surname, built once in `fileGraphView.ts` with `paintStyle`. `cardShape` sets it as the `style` of the card group; the classes `is-f`, `is-m` and `is-u` go. The layout of the graph still reads sex to stand a husband left of his wife; that is the model's, not the card's.

### D2. One set of properties for both views

The properties were `--gedcom-ft-*`, named for the timeline. They become `--gedcom-surname-fill-light`, `--gedcom-surname-fill-dark`, `--gedcom-surname-ink-light` and `--gedcom-surname-ink-dark`, and `surnamePaint` and `paintStyle` are the only writers.

### D3. The card's lines take the ink

The background is the fill; the name lines and the years are the ink of that hue and scheme, not `--text-normal` and `--text-muted`, which the fill does not guarantee contrast for. The years are no longer muted. A Playwright spec computes the contrast of every card of the demo file in both schemes.

## Risks / Trade-offs

- [Losing sex as a tint on the graph] → The user asked for the surname method, and the timeline already dropped sex; sex stays in the card, the list and the file.
- [The years are no longer muted, flattening the card's hierarchy] → The years are smaller and the names bolder; contrast comes first.
