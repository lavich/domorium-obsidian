## 1. Sources and citations in the read model

- [x] 1.1 Report sources from `buildIndex`: every `SOUR` in document order, unaddressable where it declares no identifier, each carrying its title or a placeholder, its author, and the name of the repository it points at. Verify in new `src/genealogy/sources.test.ts` against the fixture: three sources in order; one carrying title, author and repository name; one naming a repository the document does not declare, reported unresolved; one with no title
- [x] 1.2 Read a source in full — what the record states at its first level, the repository as a record of its own with its name, address and web address, and the pictures it points at, read the way a person's are. Verify in `src/genealogy/sources.test.ts`: a source and its repository's address; a source carrying a picture
- [x] 1.3 Collect citations in the walk `buildIndex` already makes, into two maps: by citing record and by cited source. Each citation carries the citing identifier, the tag of the structure the pointer sat beneath where that is not the record, and the `PAGE`. Verify in `src/genealogy/sources.test.ts`: a person citing a source with a page, reported from both sides; a citation beneath a birth carrying `BIRT`; a source cited by three records, in document order; a source nothing cites; a citation of a source that is not declared, reported unresolved for the citing record
- [x] 1.4 Prove one pass: asking what cites each of three sources reads the document once. Verify in `src/genealogy/sources.test.ts` with a counting reader, as the cache test does
- [x] 1.5 Extend `src/genealogy/fixture.ts`: a source with title, author, publisher and repository; one with a title only; one with no title; one naming a repository that is not declared; a source nothing cites; a citation beneath an event; a citation of an undeclared source. Verify by the tests above and `npm run check`

## 2. Sources as a third subject

- [x] 2.1 Draw a source row in new `src/people/sourceRowView.ts` — the title or the identifier, with the author and the repository beneath — and build its searchable string from title, author, repository and identifier. Verify in `src/people/recordList.test.ts`: a source with all three; one with a title only; one with no title; `parish` and `warsaw` each matching
- [x] 2.2 Offer sources in the subject control and give them a presentation of their own — count, search placeholder, empty message, drawing — in `src/people/PeopleView.ts`, with the strings in `src/i18n/en.json` and `ru.json`. Verify in `src/people/recordList.test.ts`: three subjects offered; the count says sources; the placeholder invites a search of sources
- [x] 2.3 Open a source from the list and mark the open one's row. Verify in `src/people/recordList.test.ts` that a source row marks, and by hand in `demo-vault/` that choosing one opens it

## 3. The source page

- [x] 3.1 Create `src/source/sourcePage.ts` drawing one source: the heading, the labelled fields, the repository, the picture, and the identifier back to the record. It imports nothing from `obsidian` and nothing from the catalogue. Verify in new `src/source/sourcePage.test.ts` (happy-dom): a source with author and publisher; one stating only a title; one with no title; one with a repository and an address
- [x] 3.2 Draw the citations of the source on that page, in a shared `src/source/citationRows.ts` used by all three pages: the citing record openable, what within it the citation was attached to, and the page it states. A source nothing cites says so. Verify in `src/source/sourcePage.test.ts`: three citing records listed; one attached to a birth named as such; a page shown; a source nothing cites saying so; choosing a record calls back
- [x] 3.3 Add the source sections and the subject strings to `src/i18n/en.json` and `ru.json`, both sides. Verify in `src/i18n/i18n.test.ts` that the new keys carry matching placeholders
- [x] 3.4 Create `src/source/SourceView.ts` and register it in `src/main.ts`, reusing one tab, joining the trail by being navigable and moving by `setViewState`, with the document in the header. Verify by hand in `demo-vault/`: opening a source shows it; choosing a citing person opens them; going back returns; restarting shows the same source

## 4. What a record is sourced from

- [x] 4.1 Show a person's citations on their page, in `src/person/personPage.ts`, using the shared citation rows, and open the source when one is chosen. Verify in `src/person/personPage.test.ts`: a person citing a source with a page; one citing nothing; choosing calls back
- [x] 4.2 Show a family's citations the same way in `src/family/familyPage.ts`. Verify in `src/family/familyPage.test.ts` with the same three cases
- [x] 4.3 Wire both to open a source, in `src/person/PersonView.ts` and `src/family/FamilyView.ts`. Verify by hand in `demo-vault/`: from Marie to the Nobel source and back
- [x] 4.4 Style the citation rows in `styles.css` on Obsidian's own variables only. Verify with `grep -nE '#[0-9a-fA-F]{3,8}|rgb\(' styles.css` showing no new literals, and by hand in both themes

## 5. Check

- [x] 5.1 Run `npm run check` and `npm run test:browser`, both green

## Still to verify by hand

The code is written and covered by unit and browser tests. These parts of 2.3,
3.4, 4.3 and 4.4 need a running Obsidian and are outstanding, as the same
checks are on `person-browser` and `family-browser`:

- Choosing a source from the list opens it, and its row is marked.
- From a source, choosing a citing person opens them; Back returns; restarting
  Obsidian shows the same source.
- From Marie to the source behind a fact and back.
- The citation rows read well in both the light and the dark theme.

`demo-vault/curie.ged` now carries a citation beneath a birth and one beneath a
marriage, so the "within" line and a family's citations both have something to
show.
