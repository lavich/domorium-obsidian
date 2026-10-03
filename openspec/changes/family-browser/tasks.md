## 1. Rename what was never about people

- [x] 1.1 Rename `PersonRef` to `RecordRef` and `personRef` to `recordRef` across `src/genealogy/`, `src/people/`, `src/person/` and `src/main.ts`, keeping `DocumentRef` and the spelling untouched. Verify with `npm run typecheck` and by `src/genealogy/personRef.test.ts` renamed to `recordRef.test.ts` passing unchanged but for the names
- [x] 1.2 Split `PersonRow` into a `Row` the list can draw — identifier or a mark that there is none, title, two detail lines, the searchable string — and a `PersonRow` that is one case of it. Verify in `src/genealogy/index.test.ts` that every existing assertion about a person's row still holds

## 2. Families in the read model

- [x] 2.1 Add `FAMILY_EVENT_TAGS` to `src/genealogy/tags.ts` — the event structures GEDCOM defines for a family record in both dialects — and take the set to read by as an argument to the event reader rather than copying it. Verify in `src/genealogy/index.test.ts`: a person's events are unchanged; `MARR` is read for a family and `HUSB`, `CHIL` and `SOUR` are not
- [x] 2.2 Report families from `buildIndex`: every `FAM` in document order, unaddressable where it declares no identifier, each carrying the spouses it is named by, the marriage reading, the place and the child count. Verify in `src/genealogy/index.test.ts` against the fixture: five families in order; a `0 FAM` with no cross-reference reported and marked; a family carrying its year, place and count
- [x] 2.3 Name a family from its spouses in `src/genealogy/`, in the order the record names them, degrading through one spouse to none. Verify in new `src/genealogy/families.test.ts`: two spouses name it in order; one names it; none leaves it unnamed; a spouse the document does not declare does not contribute and does not stop the other
- [x] 2.4 Read a family in full — spouses and children resolved as people, each with the role that named them, in record order, with unresolved pointers reported. Verify in `src/genealogy/families.test.ts` against the fixture: four people with their roles; a child the document does not hold reported as unresolved with its siblings intact
- [x] 2.5 Report the families a person belongs to, child-families and spouse-families distinguished, in the order the record points at them. Verify in `src/genealogy/index.test.ts`: a person who is both; a person in two spouse-families; a person in none
- [x] 2.6 Extend `src/genealogy/fixture.ts` with what these need: a family recording a marriage with a date and a place, one recording only the people in it, one declaring no identifier, one naming a spouse the document does not declare, and one naming nobody. Verify by the tests above and by `npm run check`

## 3. The list draws either subject

- [x] 3.1 Make the list draw a row it is given rather than a person it assumes, in `src/people/peopleList.ts`: the window, the filter, the mark, the count and the bar unchanged. Verify in `src/people/peopleList.test.ts` that every existing assertion holds with a person-drawing function handed in
- [x] 3.2 Draw a family row — the people it joins, the year, the place, the child count, and the identifier where it names nobody — and build its searchable string from names, identifier, year and place. Verify in `src/people/peopleList.test.ts`: a family with a marriage and children; one recording only its people; one naming nobody; `curie` and `sceaux` each matching
- [x] 3.3 Offer families in the subject control and keep the two selections independent, in `src/people/peopleList.ts` and `src/people/PeopleView.ts`. Add the subject strings to `src/i18n/en.json` and `ru.json`. Verify in `src/people/peopleList.test.ts`: both subjects offered; choosing one calls back; changing the document keeps the subject. Verify by hand in `demo-vault/` that the list switches
- [x] 3.4 Mark the open family's row, and mark nothing where the subject is not the one shown. Verify in `src/people/peopleList.test.ts`: a family row marks; a person shown while families are listed marks nothing

## 4. The family page

- [x] 4.1 Create `src/family/familyPage.ts` drawing one family into a plain container: the heading from the people it joins or its identifier, the year, the spouses and children as openable rows, the events, and the identifier back to the record. It imports nothing from `obsidian` and nothing from the catalogue, taking its words and its callbacks as the person page does. Verify in new `src/family/familyPage.test.ts` (happy-dom): a full family; one with no children; one naming nobody; an unresolved child stated; choosing a person calls back
- [x] 4.2 Add the family sections and the family event names to `src/i18n/en.json` and `ru.json`, both sides. Verify in `src/i18n/i18n.test.ts` that the new keys carry matching placeholders, and in `src/family/familyPage.test.ts` that an unnamed tag is shown as the tag
- [x] 4.3 Create `src/family/FamilyView.ts`, the workspace view: `navigation = true`, a `RecordRef` as its state, `result.history = true` in `setState`, the document named in the header and the people it joins on the tab. Verify by hand in `demo-vault/`: opening a family from the list shows it; restarting shows the same family
- [x] 4.4 Register the view and open one in `src/main.ts`, reusing one tab as Person view does, and reading a closed document through the same warm step. Verify by hand in `demo-vault/`: choosing a family from the list opens it; choosing a person from that page opens them; going back twice returns through both
- [x] 4.5 Wire the identifier to the record, over the path Person view already uses. Verify by hand in `demo-vault/`: the cursor lands on `0 @F1@ FAM`; with the file removed, a notice says so

## 5. Both ways round

- [x] 5.1 Show the families a person belongs to on their page, in `src/person/personPage.ts`, as openable rows in two named groups beside the people already there. Verify in `src/person/personPage.test.ts`: a person who is a child and a spouse; a person in none; choosing one calls back
- [x] 5.2 Open a family from a person's page in `src/person/PersonView.ts`, into the same leaf, so the trail spans both kinds. Verify by hand in `demo-vault/`: from Marie to her marriage to Pierre and back
- [x] 5.3 Style the family page in `styles.css` on Obsidian's own variables only, adding no colour and no new pattern. Verify with `grep -nE '#[0-9a-fA-F]{3,8}|rgb\(' styles.css` showing no new literals, and by hand in both themes

## 6. Check

- [x] 6.1 Run `npm run check` and `npm run test:browser`, both green
