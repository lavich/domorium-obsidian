Archive order: `desk-card-polish` is archived (#240); this change restates what it added.

## 1. The Places section of a person's card

- [ ] 1.1 `src/desk/personPage.ts`, `src/desk/timelineView.ts`, `src/desk/timeline.ts`: delete the *Places* fold, `renderPlaces`, `placesOf` and `PlaceEntry`. Remove the imports the deletion leaves unused (`PlaceEntry`, `placesOf`, `renderPlaces`, `plural` where only the fold used it). Test: `src/desk/personPage.test.ts` (no section of places, the timeline still folded; the cases that open `Set(["places"])` and count two folds, around lines 233–254, 282 and 302–309, are rewritten), `src/desk/recordCard.test.ts` (the headings read Timeline, Evidence, around line 118), `src/desk/timeline.test.ts` and `src/desk/timelineView.test.ts` (the cases of `placesOf` and `renderPlaces` go).
- [ ] 1.2 `src/i18n/en.json`, `src/i18n/ru.json`: remove `desk.places` and `places.empty`; keep `places.count`. `styles.css`: remove the `gedcom-desk-place`, `-place-name`, `-place-events` and `-place-count` rules that only the section used, and keep `gedcom-desk-place-occurrences`. Test: `npm run lint`, and a grep that no string or class is left unused.
- [ ] 1.3 `tests/desk.spec.ts`: the order of headings reads Facts, Other names, Family, Media, Timeline, Evidence; the fold case reads Timeline alone.

## 2. Marks and the line above the facts

- [ ] 2.1 `src/desk/factRow.ts`: draw the count of sources only where it is above zero; delete the `no-source` branch and the `desk.noSource` string from both catalogues. Test: `src/desk/personPage.test.ts`, `src/desk/familyPage.test.ts`, `src/desk/placePage.test.ts` (a row with no source has no mark, where they now assert *No source* at `personPage.test.ts` around lines 83–86, `familyPage.test.ts` around line 58 and `placePage.test.ts` around line 50; a row with one shows `1 source`).
- [ ] 2.2 `src/desk/personPage.ts` (`renderFactList`): the line above the facts, for a person and for a family, as in D3; left out where every fact cites a source or there are no facts. `src/i18n/en.json`, `src/i18n/ru.json`: `desk.unsourced`, a plain string with `{count}` and `{total}`. Test: `src/desk/personPage.test.ts` and `src/desk/familyPage.test.ts` (three of four, four of four, all cited, no facts, one fact; a person whose total includes the events of a family they married into; a fact with no event identifier counted).
- [ ] 2.3 `styles.css`: the `gedcom-desk-unsourced` line in `--text-muted`; delete the `no-source` chip rule. Test: `tests/theme.spec.ts` (the case around lines 322–336 that is about the *No source* mark and reads `.no-source` is rewritten: the computed colour of the line is the muted text colour in the light and the dark theme; no orange on the card) and `tests/desk.spec.ts` (the case around line 362 that reads `.gedcom-desk-chip.no-source` is rewritten: the line is above the facts, not inside the list).

## 3. The evidence of an event

- [ ] 3.1 `src/desk/evidence.ts`: for an event draw only the sources of the event, or the notice; no *Whole record* subsection, no record sources, no notes. `src/desk/recordCard.ts`: do not hand the notes to the Evidence section of an event card. `src/i18n/en.json`, `src/i18n/ru.json`: replace `evidence.belowBelong` by `evidence.recordOnItsCard`. `styles.css`: delete the `gedcom-desk-scope` rule. Test: `src/desk/evidence.test.ts` (an event with sources; an event with none whose record cites sources; an event with none whose record cites none; no heading *Whole record* in any), `src/desk/recordCard.test.ts` (the event card of Marie's birth lists nothing of the record).
- [ ] 3.2 `tests/desk.spec.ts`: the event card of Marie's birth has no *Whole record*, no note, and the record link at its top selects Marie, whose card lists her record's sources and notes.

## 4. Documents and the gate

- [ ] 4.1 `README.md`: the person card no longer lists places; facts show a count only where there are sources, and a line says how many have none; the event card shows what the event rests on.
- [ ] 4.2 Browser check at 360 and 480 pixels, English and Russian; screenshots of a person's card and of an event card; a look in Obsidian on the demo vault and on a phone remains for the reader.
- [ ] 4.3 `npm run openspec:validate`, `npm run check` and `npm run test:browser` (the change touches rendering and layout).
