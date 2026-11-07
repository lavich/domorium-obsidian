Archive order: independent; `openspec/changes/` holds no other in-flight change.

## 1. The record's lines

- [ ] 1.1 Add `src/genealogy/recordLines.ts` (`RecordLine`, symbol → lines with `CONC`/`CONT` joined, pointer vs value, `@@`, note text from `label`) and `record(xref)` on the index over every level-0 symbol with an identifier, filled in the loop of `src/genealogy/build.ts`, with `GenealogyIndex.record` in `src/genealogy/types.ts` — `src/genealogy/recordLines.test.ts`: the lines of a record with names, parts, an event, a pointer, a custom tag; a continued note; `@@`; a 7.0 `SNOTE` and a 5.5.1 `NOTE`; an undeclared record gives none; nothing converted for a record nobody asked for.

## 2. Labels and the generic view

- [ ] 2.1 Add `src/desk/detail/labels.ts` and the keys `tag.*`, `nameType.*`, `role.*`, `status.*`, `sex.*`, `pedi.*` to `src/i18n/en.json` and `ru.json` — `src/desk/detail/labels.test.ts`: every standard tag of 5.5.1 and 7.0 listed in the test has a key in both languages, an unknown and a custom tag fall back to the tag as written; `src/i18n/i18n.test.ts` still passes.
- [ ] 2.2 Add `src/desk/detail/lineView.ts` (the generic nested renderer, `renderRest` with the tags a section handled, pointer links and the missing-record pointer, line counts) and `src/desk/detail/foldedText.ts` — `src/desk/detail/lineView.test.ts`: nesting in file order, a pointer to a declared and to an undeclared record, a value with `@@`, counts; `src/desk/detail/foldedText.test.ts`: five lines / three hundred characters, show more and show less, no control for a short note.

## 3. The sections

- [ ] 3.1 Add `src/desk/detail/names.ts` — `src/desk/detail/names.test.ts`: two names with types, the parts in rows, a type the file words itself, a translation, the notes and the source count of a name, the section left out for one plain name.
- [ ] 3.2 Add `src/desk/detail/notes.ts` and `src/desk/detail/related.ts` — tests beside them: an inline note, a shared note of both dialects, a long note folded, a note's own lines; a godparent with a role, `OTHER` with a phrase, `ALIA` as *Same person as*, an undeclared pointer.
- [ ] 3.3 Add `src/desk/detail/recordInfo.ts` and `src/desk/detail/otherData.ts` — tests beside them: two `REFN` with a type, `EXID` with its type, `CHAN` with date and time, `CREA`, `RESN`; the other-data section shows a custom tag with nested children and its count, and is absent when empty.
- [ ] 3.4 Add `src/desk/detail/eventDetails.ts` (age, cause, agency, religion, restriction, spouses' ages, date phrase and time, sorting date, address, contacts, the place's form, coordinates, translations, notes) — `src/desk/detail/eventDetails.test.ts` for each row, a two-line address, the coordinates, and a line left to Other data.

## 4. The cards

- [ ] 4.1 Rebuild `src/desk/personPage.ts`: Names, the heading line with the sex, Facts, Family grouped by how the person belongs, Notes, Related people, Media, Timeline, Evidence, Identifiers and record information, Other data, with the counts and empties of the spec and the folds `timeline`, `info`, `other` — extend `src/desk/personPage.test.ts` for each scenario of the person card (Marie from the demo vault, an adopted child, no parents, one plain name, nothing to say) and `src/desk/recordCard.test.ts` for the folds kept across a redraw.
- [ ] 4.2 Rebuild `src/desk/familyPage.ts`: children marked by `PEDI`, the number of children stated, Notes, Related people, Identifiers and record information, Other data — extend `src/desk/familyPage.test.ts`.
- [ ] 4.3 Rebuild `src/desk/eventPage.ts` with the details, notes, related people, media and other data, and extend `src/desk/evidence.ts` so a citation shows its own lines (`DATA`/`TEXT`, `EVEN`/`ROLE`, notes, media) — extend `src/desk/evidence.test.ts` and add the event-card scenarios to `src/desk/recordCard.test.ts`.
- [ ] 4.4 Add `demo-vault/rich-record.ged` and `src/testing/rich.ts` (a record with several names and types, all parts, events with age/cause/agency/address/coordinates/notes/witnesses, notes inline and shared, a long note, `ASSO`, `ALIA`, `REFN`, `UID`, `EXID`, `CHAN`, `CREA`, custom nested tags, an adopted child, a family with `NCHI`) and add `src/desk/detail/wholeRecord.test.ts`: every line of that record, of its family and of each of its events appears on the cards (a tag's name or its value; a pointer as the name of its target), none dropped.

## 5. Styles, docs, gate

- [ ] 5.1 Add the styles for the new sections to `styles.css` (one labelled-row style, notes, folds), then a Playwright spec in `tests/desk.spec.ts` for the rich record at 360 and 390 px: the sections in order, the folds, a long note folding, no horizontal scroll — verify with screenshots at both widths from a temporary script, deleted after; name what to look at in Obsidian on the demo vault and on a phone.
- [ ] 5.2 Update `README.md` where it describes the person and family cards, and record deviations under an "Implementation" heading in `design.md`.
- [ ] 5.3 Run `npm run check && npm run test:browser` and record the output.
