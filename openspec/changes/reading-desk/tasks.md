## 1. Bring the read model over

- [x] 1.1 Copy `src/genealogy/` (code, `fixture.ts` and every `*.test.ts`) from `feat/person-browser` as it stands; `npm run test` passes with the branch's tests unchanged
- [x] 1.2 Carry the symbol `range` on records, events and citations; extend `src/genealogy/index.test.ts` with the birth-lines and record-lines scenarios
- [x] 1.3 Attach each citation to the event it sits under, with an event index for two of a kind, and read `QUAY`; extend `src/genealogy/sources.test.ts` with the two-residences, record-and-birth, family-event and quality scenarios
- [x] 1.4 Report a 5.5.1 `SOUR` line with text as an inline citation rather than a structure; extend `src/genealogy/sources.test.ts` with a 5.5.1 document of its own, since `fixture.ts` is 7.0
- [x] 1.5 Report siblings and, per spouse-family, the other spouse, events and children; extend `src/genealogy/families.test.ts` with the siblings, two-marriages and no-other-spouse scenarios
- [x] 1.6 Confirm the model still imports nothing from `obsidian` and names nothing in a reader's language; the existing independence tests in `src/genealogy/index.test.ts` pass

## 2. Two modes in one tab

- [ ] 2.1 Add the `openAs` setting (`genealogy` default, `source`) to `src/settingsData.ts`, `src/settingDefinitions.ts` and the deprecated `display()` in `src/settings.ts`; extend `src/settings.test.ts` for parsing and the default
- [ ] 2.2 Give `GedcomView` a genealogy container beside the editor, a mode and a record in `getState`/`setState`, and a header switch; record history for record changes only; cover state round-trip and mode switching without losing unsaved text in a new `src/GedcomView.test.ts` (happy-dom)
- [ ] 2.3 Own a revision counter in `GedcomView`, build the model through `IndexCache`, and raise `genealogyChanged` after edits settle; extend `src/GedcomView.test.ts` so an unsaved edit yields a new revision and one settled notification
- [ ] 2.4 Choose the record on entering Genealogy (link, cursor record, last record, first person, empty state); extend `src/GedcomView.test.ts` with each case
- [ ] 2.5 Route a link subpath by record kind in `setEphemeralState`: person and source to a page, other kinds to Source at the record; extend `src/GedcomView.test.ts`
- [ ] 2.6 Show in source: switch mode, select and scroll the range; extend `src/GedcomView.test.ts` for a fact range and a whole record
- [ ] 2.7 Gate editor commands to Source mode and make copy-link use the shown record in Genealogy; extend `src/commands.test.ts`

## 3. Pages

- [ ] 3.1 Add every new string and an `event.<TAG>` key for each tag in `src/genealogy/tags.ts` to `src/i18n/en.json` and `src/i18n/ru.json`; `src/i18n/i18n.test.ts` passes (no key missing on either side)
- [ ] 3.2 Render the person page in `src/desk/personPage.ts` — heading, facts with source state, other names, family with unresolved pointers, fact selection, phone unfold — covered by a new `src/desk/personPage.test.ts` (happy-dom) against the demo vault's `curie.ged`
- [ ] 3.3 Render the source page in `src/desk/sourcePage.ts` — title, author, publication, repository, cited by with where and page — covered by a new `src/desk/sourcePage.test.ts`
- [ ] 3.4 Render the empty and record-gone states, and wire both pages into `GedcomView`; extend `src/desk/personPage.test.ts` for the record-gone state

## 4. Index and evidence panel

- [ ] 4.1 Render the windowed index in `src/desk/indexList.ts` — people and sources, rows, no-source mark and filter, search, current row — covered by a new `src/desk/indexList.test.ts`
- [ ] 4.2 Register the **Domorium** index `ItemView` in the left sidebar, opened by the ribbon icon and a command, following the last active GEDCOM tab and redrawing on `genealogyChanged`; extend `src/commands.test.ts` for the command
- [ ] 4.3 Render the evidence panel in `src/desk/evidence.ts` — heading, fact sources then whole-record sources, notices, citation details, inline and unresolved citations, source-page heading — covered by a new `src/desk/evidence.test.ts`
- [ ] 4.4 Register the **Evidence** `ItemView` in the right sidebar, opened by a command and from the person page, following the last GEDCOM tab in Genealogy mode; extend `src/commands.test.ts` for the command

## 5. Styling and the browser

- [ ] 5.1 Style pages, index and panel in `styles.css` on Obsidian's CSS variables with `gedcom-desk-` classes, matching `docs/design/research-desk-reading.html`; check by eye in the demo vault in light and dark themes
- [ ] 5.2 Mount the person page, index and panel in `harness/` (`harness/mount.ts`, `harness/index.html`) with the demo vault's `curie.ged`
- [ ] 5.3 Add `tests/desk.spec.ts`: a person page at desktop width and at 390 px with no horizontal scroll, fact selection driving the panel, the phone unfold, and the index scrolling and filtering 20,000 generated people while the search field answers
- [ ] 5.4 Add the theme case to `tests/theme.spec.ts`: page text, borders and the no-source mark take their colours from Obsidian's variables

## 6. Documents and close-out

- [ ] 6.1 Describe Genealogy mode, the index, the evidence panel and the *Open GEDCOM files as* setting in `README.md`, and the default-mode change in the release notes draft
- [ ] 6.2 Tick the Reading slice in `docs/design/next-steps.md`
- [ ] 6.3 Run `npm run check` and `npm run test:browser`; both pass
