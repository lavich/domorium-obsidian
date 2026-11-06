Archive order: #233 (`places-list`, `events-list`) first, then this change.

## 1. Controls, focus, colour

- [x] 1.1 `styles.css`: `:focus-visible` outline on every `button.gedcom-desk-*`, `gedcom-card-nav` and the new media button. Test: `tests/desk.spec.ts`, the outline is drawn on a keyboard-focused button and not on a mouse-clicked one.
- [x] 1.2 `styles.css`: 44-pixel activation areas under `(pointer: coarse)` and `.is-mobile`, the block controls by `min-height`, the inline links by `::after`; no `overflow: hidden` on `.gedcom-desk-facts`; the name above the value in the narrow layout. Test: `tests/desk.spec.ts` (a phone, and a spec with `hasTouch` and `isMobile` for the coarse pointer), a point 20 pixels above and below the middle of each control hits it, on the person, family, source, place and event cards at 390 pixels.
- [x] 1.3 `styles.css`: section headings and secondary text in `--text-muted`; the *No source* mark neutral; the notice title in `--text-normal`. Test: `tests/desk.spec.ts`, computed colour of a section heading is `--text-muted` and the mark has no orange background.
- [x] 1.4 `src/desk/mediaPage.ts`: the picture on the media card is a button. Test: `src/desk/mediaPage.test.ts`.
- [x] 1.5 `styles.css`: delete the unused `.gedcom-desk-unfold` rule.

## 2. The event card

- [x] 2.1 `src/i18n/en.json`, `ru.json`: *Person* and *Family* for the owner line; remove `desk.eventRecord`, `desk.eventDate`, `desk.eventPlace`.
- [x] 2.2 `src/desk/eventPage.ts`: owner line, title, date and place subtitle. Test: `src/desk/recordCard.test.ts` rewritten where it reads `.gedcom-desk-event-detail`, `.gedcom-desk-event-value`, `.gedcom-desk-evidence-context` and the place link (around lines 166 and 177–182); `tests/desk.spec.ts` rewritten where it reads them (around lines 127–137 and 164–172) and the narrow-column loop over the cards (around line 53).
- [x] 2.3 `src/desk/evidence.ts`: the event of an event card in place of a fact key; the fact branch, `EvidenceHost.wholeRecord` and `EvidenceSelection.fact` deleted; `src/desk/recordCard.ts` and `src/desk/DeskViews.ts` follow. Test: `src/desk/evidence.test.ts`, whose cases for the head, *Whole record* and `wholeRecord` are rewritten for the event card.
- [x] 2.4 `styles.css`: the owner line, the subtitle; remove the `gedcom-desk-event-details`, `-event-detail`, `-event-label`, `-event-value`, `-event-sources` and `gedcom-desk-place-when` rules.

## 3. One event row

- [x] 3.1 New `src/desk/factRow.ts` with `renderEventRow`; `src/desk/personPage.ts` `renderFactList` uses it. The name keeps `data-focus-key`; the row keeps the one click handler. Test: `src/desk/personPage.test.ts`, `src/desk/familyPage.test.ts` and the focus-restore case of `src/desk/recordCard.test.ts` unchanged in what they assert.
- [x] 3.2 `src/desk/placePage.ts` uses it, the record a link in the detail, the name opening the event card; `occurrencesAt` in `src/desk/placeRows.ts` returns the event's id. Test: new `src/desk/placePage.test.ts`; `tests/fileList.spec.ts` and `src/desk/fileList.test.ts` where they press a record or an event in a place's card.

## 4. Folding

- [x] 4.1 `src/desk/personPage.ts` and new `src/desk/fold.ts`: *Timeline* and *Places* as folds, closed, the count in a muted span, the button in the `h2`. Test: `src/desk/personPage.test.ts`.
- [x] 4.2 `src/desk/recordCard.ts`: `data-open` kept across a redraw of the same record, reset for another. Test: `src/desk/recordCard.test.ts`.
- [x] 4.3 `styles.css`: the fold button looks as a section heading, with a chevron; `tests/desk.spec.ts` line 65 stops asking the closed timeline's rows for a box, and a spec opens the fold and reads them.

## 5. Documents and gate

- [x] 5.1 `README.md`: the card sections and the folds where described.
- [ ] 5.2 Browser check at 360 and 480 pixels, English and Russian, desktop and phone width; screenshots of the five cards; a look in Obsidian on the demo vault and on a phone remains for the reader.
- [ ] 5.3 `npm run check` and `npm run test:browser`.
