Archive order: #233 (`places-list`, `events-list`) first, then this change.

## 1. Controls, focus, colour

- [ ] 1.1 `styles.css`: `:focus-visible` outline on every `button.gedcom-desk-*`, `gedcom-card-nav` and the new media button. Test: `tests/desk.spec.ts`, the outline is drawn on a keyboard-focused button and not on a mouse-clicked one.
- [ ] 1.2 `styles.css`: 44-pixel activation areas under `(pointer: coarse)` and `.is-mobile`, the block controls by `min-height`, the inline links by `::after`. Test: `tests/desk.spec.ts`, a point 20 pixels above and below the middle of each control hits it, on the person, family, source, place and event cards at 390 pixels.
- [ ] 1.3 `styles.css`: section headings and secondary text in `--text-muted`; the *No source* mark neutral; the notice title in `--text-normal`. Test: `tests/desk.spec.ts`, computed colour of a section heading is `--text-muted` and the mark has no orange background.
- [ ] 1.4 `src/desk/mediaPage.ts`: the picture on the media card is a button. Test: `src/desk/mediaPage.test.ts`.
- [ ] 1.5 `styles.css`: delete the unused `.gedcom-desk-unfold` rule.

## 2. The event card

- [ ] 2.1 `src/i18n/en.json`, `ru.json`: *Person* and *Family* for the owner line; remove `desk.eventRecord`, `desk.eventDate`, `desk.eventPlace`.
- [ ] 2.2 `src/desk/eventPage.ts`: owner line, title, date and place subtitle. Test: new cases in `src/desk/recordCard.test.ts`.
- [ ] 2.3 `src/desk/evidence.ts`: no evidence head on an event card. Test: `src/desk/evidence.test.ts`.
- [ ] 2.4 `styles.css`: the owner line, the subtitle; remove the `gedcom-desk-event-detail/label/value` rules.

## 3. One event row

- [ ] 3.1 New `src/desk/factRow.ts` with `renderEventRow`; `src/desk/personPage.ts` `renderFactList` uses it. Test: `src/desk/personPage.test.ts` and `src/desk/familyPage.test.ts` unchanged in what they assert.
- [ ] 3.2 `src/desk/placePage.ts` uses it, the record a link in the detail, the name opening the event card. Test: new `src/desk/placePage.test.ts`.

## 4. Folding

- [ ] 4.1 `src/desk/personPage.ts`: *Timeline* and *Places* as folds, closed, with the count in the summary. Test: `src/desk/personPage.test.ts`.
- [ ] 4.2 `src/desk/recordCard.ts`: `data-open` kept across a redraw of the same record, reset for another. Test: `src/desk/recordCard.test.ts`.
- [ ] 4.3 `styles.css`: the summary looks as a section heading, with a marker.

## 5. Documents and gate

- [ ] 5.1 `README.md`: the card sections and the folds where described.
- [ ] 5.2 Browser check at 360 and 480 pixels, English and Russian, desktop and phone width; screenshots of the five cards; a look in Obsidian on the demo vault and on a phone remains for the reader.
- [ ] 5.3 `npm run check` and `npm run test:browser`.
