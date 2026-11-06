## Context

The cards are drawn by `src/desk/*Page.ts` into one scrolling column (`gedcom-card-body`) under a header with Back and Forward. Their controls are plain `button` elements restyled in `styles.css` with `box-shadow: none; padding: 0; height: auto`, which also removes Obsidian's own focus ring, and which makes them as tall as their text (16 to 29 pixels, measured in the harness at 360 and 480 pixels). Section headings are 11-pixel faint uppercase text. A fact row is built by `renderFactList`; the occurrences on a place card, the entries of a timeline and the detail of an event card are each built separately.

## Decisions

### D1. A hit area, not a bigger look

On a coarse pointer (`@media (pointer: coarse)`) and in the mobile app (`.is-mobile`, the same condition the list uses), block controls — the person button, the citation, the note line, the fact name, the timeline label, Back and Forward — get `min-height: 44px` and padding that keeps their text where it was. A control that sits inside a line of text, the `gedcom-desk-link` for a place or *Show in source*, cannot grow without breaking the line, so it gets an `::after` that extends its activation area by 14 pixels above and below. The two together give every control a 44-pixel area. A fact row is a grid of name, value and mark; its name is the block control.

Rejected: raising font sizes (changes the look on desktop), `touch-action` tricks (do not enlarge targets).

### D2. Focus is drawn by us

`button.gedcom-desk-*:focus-visible` gets `outline: 2px solid var(--interactive-accent); outline-offset: 1px`, since `box-shadow: none` on those buttons removes the ring Obsidian draws with a shadow. Mouse focus is not affected (`:focus-visible`). The picture on a media card, a `div` with a click handler, becomes a `button` holding the picture, with the label of what it opens.

### D3. Colour

`--text-faint` falls under 4.5:1 on several themes, and `--text-warning` on its tinted background measured 3.27:1. Section headings, years, kin labels and the other secondary lines move to `--text-muted`. The *No source* mark becomes `color: var(--text-muted); border: 1px solid var(--background-modifier-border); background: none`. It is the common state of a researched tree and was shouted in orange on every row. The missing-source notice keeps its tinted background, and its title takes `--text-normal` with the weight it had. No hard-coded colour is introduced.

### D4. The event card

```
Person · Marie Skłodowska-Curie        (the owner, a link)
Occupation · Physicist     Show in source
7 NOV 1867 · Warsaw, Congress Poland   (the place a link)
EVIDENCE
```

`eventPage.ts` draws the owner line, the title, and a subtitle through `renderEventDetail` with the date and place only, since the title already carries the text. The owner line says *Person* or *Family*; the label is chosen by whether the owner is a person. An event with no date and no place draws no subtitle and keeps the line saying the event states nothing.

`renderEvidenceSection` with an event draws no `gedcom-desk-evidence-head`: no context, no *Show in source*, no *← Whole record*. The heading above it is `Evidence`; the groups are *Sources of this fact* and *Whole record · n* as before. A person's or a family's card, which has no selected fact in the card, draws as before.

### D5. One event row

`factRow.ts` exports `renderEventRow(list, row)` with the name of the event, an optional handler that opens its card, the detail (date, place link, text, and the other spouse), the count of citations, and an optional trailing link. `renderFactList` (person, family) and the place card use it. On a person's or a family's card the row is as now. On a place's card the name opens the card of the event, the detail carries the date and the text, and the record is a link in the detail, as it was on the old row (`Birth · Marie` selected the record). The timeline's own form stays: it is a chronology, a year column and a dot, and the same function draws only its detail.

### D6. Folding

A fold is a `details` with a `summary` that holds the section's `h2`, styled as the other section headings, so that the heading outline is unchanged and the summary is keyboard-operable by the browser. *Timeline* and *Places* are closed on opening a card; *Other names* stays open because it is one or two lines. The sections the reader has opened are written on the card's root as `data-open` while `data-shown` is unchanged, and a redraw of the same record restores them; showing another record resets them. The focus is kept by the existing `data-focus-key`.

Rejected: merging *Places* into the facts, which changes what the card contains and would drop the order in which places first appear.

### D7. What is left alone

The order of sections in each card; the source card's notes (a place has no identifier a note can link to, so a place card has no notes section); the list; the timeline mode. The unused selected-fact code (`selectedFact`, `selectFact`, `PageHost.select`) is not touched.

## Risks

- A folded timeline hides the main narrative of a person from a reader who does not see the heading; the heading shows the count of entries so the fold announces what it holds.
- The 44-pixel areas of two adjacent inline links can overlap; the later in the document wins, and links in a line are separated by text.
- `details` in a container query layout: the fold's content is an ordinary block, so the 560-pixel rule is not affected.
