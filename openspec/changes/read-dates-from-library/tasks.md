## 1. Dependency and the upstream gap

- [x] 1.1 Raise `@domorium/language-service` to `^2.2.0` in `package.json`, run `npm install`, and verify `npm ls @domorium/language-service` resolves a single 2.2.x (the copy `@domorium/codemirror` 2.1.0 pulls in included) and `npm run typecheck` passes (no test file: the check is the install and the typecheck)
- [ ] 1.2 Draft the lavich/domorium issue asking whether `readDate` should read in a document whose version resolves as `undetermined` or `unsupported`, with the reproduction from design.md, noting also that a year 0 is accepted and that 5.5.1 `1750/51 B.C.` loses its `dualYear`, and file it once the user approves the text (no test file); verify by recording the issue number in design.md under "The gap upstream"

## 2. Reading a date from the library's value

- [x] 2.1 Rewrite `src/genealogy/dates.ts` as a reading over `GedcomDateValue | null` per the table in design.md as `readingOf(payload, value)` with `text` always the payload (signed astronomical `year`, `dualYear`, Gregorian and Julian only, no year for an extension epoch or year 0, precision by modifier), keeping `DateReading` and `DatePrecision`; rewrite `src/genealogy/dates.test.ts` over library values from a 7.0 and a 5.5.1 `GedcomLanguageService`, covering every scenario of the `genealogy-read-model` delta, and verify it passes
- [x] 2.2 Change `buildIndex` to take an `IndexSource` (`getDocumentSymbols` and `readDate`) and read every birth, death, event and marriage date through it; extend `src/genealogy/index.test.ts` with a 5.5.1 person born `1401 B.C.` and one in a document with no `GEDC.VERS`, and verify it passes
- [x] 2.3 Change `IndexCache.at` to take `() => IndexSource`, and `GedcomView.genealogy()` to pass `() => this.language.update(this.editor.state.doc)`; update `src/genealogy/cache.test.ts` fakes to an `IndexSource` and verify it passes
- [x] 2.4 Move every other `buildIndex` caller to pass the service — `src/testing/curie.ts`, `harness/desk.ts`, `src/genealogy/{index,sources,families,twoDocuments}.test.ts`, `src/desk/{deskState,evidence,familyPage,indexList,personPage,sourcePage,treeLayout}.test.ts` — and verify `npm run test` passes with no expectation changed

## 3. Showing a year

- [x] 3.1 Add `desk.yearBce` to `src/i18n/en.json` (`{year} BCE`) and `src/i18n/ru.json` (`{year} до н. э.`), and verify `src/i18n/i18n.test.ts` passes
- [x] 3.2 Add `yearText` to `src/desk/labels.ts` and build `year()` on it; show a year through it in `src/desk/timelineView.ts` and in the sibling span of `src/desk/treeLayout.ts`; extend `src/desk/personPage.test.ts` with the English and Russian heading scenarios of the `genealogy-view` delta, and verify it passes
- [x] 3.3 Put the written year digits, not the signed year, into both search texts in `src/genealogy/index.ts` — `searchTextOf` for a person and the family row's for a marriage — through one helper; extend `src/desk/indexList.test.ts` with filters by `1401` that find a person born `1401 BCE` and a family married `1401 BCE`, and verify it passes
- [x] 3.4 Extend `src/desk/timeline.test.ts` with events dated `10 BCE`, `5 BCE` and `20`, ordered so, and `src/desk/timelineView.test.ts` with their shown years, and verify both pass

## 4. Verification

- [x] 4.1 Confirm `src/genealogy/dates.ts` has no regular expression left and nothing under `src/` reads a year from a payload except through `readDate`, by `grep -nE 'RegExp|/[gimsuy]*\.(test|exec)|/[gimsuy]+[;,)]' src/genealogy/dates.ts` returning nothing (no test file: a review check)
- [x] 4.2 Run `npm run openspec:validate`, `npm run check`, and `npm run test:browser` (the person page, timeline and tree render years), and verify all three pass
