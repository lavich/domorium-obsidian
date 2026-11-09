No other change is open. The later change `edit-person-names-in-card` is rewritten on this tree after this one is archived.

## 1. The tree renderer

- [ ] 1.1 Add `src/desk/detail/tree.ts`: rows and nodes from `RecordLine`s in file order, each value drawn as `lineView.ts` draws it (`valueText` exported); verify in `src/desk/detail/tree.test.ts` (happy-dom) for a custom line, a pointer to a declared and an undeclared record, a note folded where long, a `CONT`, a 7.0 `@VOID@`, and a 5.5.1 and a 7.0 `NAME` with a type and parts
- [ ] 1.2 Summaries of closed nodes (event and attribute: date and short place; name without slashes; pointer: record name; none for an event with neither); verify in `src/desk/detail/tree.test.ts`
- [ ] 1.3 Open state: level one open, deeper closed, children drawn when a node is first opened, keys by place in the record, the reader's changes kept in the root's `data-open` under `t:` and reset when another record is shown, *Open every node* and *Close every node*; verify in `src/desk/detail/tree.test.ts` and `src/desk/recordCard.test.ts` that a change of the file above an open node keeps it open and that showing Pierre and then Marie again closes it
- [ ] 1.4 Tags on and off: the session object created by `DeskViews` and handed through `CardView`; verify in `src/desk/recordCard.test.ts` that no tag, level or identifier is drawn by default, that the control shows each tag after its label, and that the choice holds on another record
- [ ] 1.5 A fact's label as a button that calls `host.select`, the selected fact's row marked, no action on any other label; verify in `src/desk/detail/tree.test.ts` with Marie's birth, her death selected, and her sex
- [ ] 1.6 Controls: *Show in source* on a row, the tree's controls (tags, open all, close all), an accessible name that does not depend on being shown, the pressed-row class for a device that cannot hover; verify in `src/desk/detail/tree.test.ts` and `src/desk/recordCard.test.ts` that *Show in source* selects exactly the lines of the row's line and its children
- [ ] 1.7 The tree changes nothing; verify in `src/desk/detail/tree.test.ts` that opening, closing, selecting, pressing a link and showing tags leave a document text identical

## 2. The cards use the tree

- [ ] 2.1 `personPage.ts`: the tree replaces names, facts, details, notes, related people, identifiers and other data; heading, family, pictures, timeline and evidence stay; verify in `src/desk/personPage.test.ts`, `src/desk/detail/sections.test.ts` and `src/desk/detail/wholeRecord.test.ts` — the sections in order for Marie, a person with one plain name, a person with nothing
- [ ] 2.2 `familyPage.ts`: the tree replaces events, number of children, notes, related people, identifiers and other data; spouses, children and pictures stay; verify in `src/desk/familyPage.test.ts` — the Curies' family, an adopted child, a note, `NCHI`
- [ ] 2.3 `sourcePage.ts`: the tree below the heading, then repository, cited by and pictures; verify in `src/desk/sourcePage.test.ts`
- [ ] 2.4 Remove what has no caller (`names.ts`, `recordInfo.ts`, `claims.ts`, the person and family call sites of the retelling sections); verify with `npm run lint` and `npm run typecheck` that nothing unused is left and `src/desk/eventPage.ts` still draws its notes, related people and other data in `src/desk/detail/sections.test.ts`
- [ ] 2.5 The event row keeps serving the family section and the place card, without the person's own events; verify in `src/desk/eventRows.test.ts` and `src/desk/placePage.test.ts`

## 3. Words and style

- [ ] 3.1 New strings in `src/i18n/en.json` and `src/i18n/ru.json` — the controls, their accessible names, anything the summaries add; verify in `src/i18n/i18n.test.ts` that both catalogues hold the same keys
- [ ] 3.2 `styles.css`: the tree's rows and nodes, the one-pixel guide, the cap on indentation after level four, controls shown by hover and focus without taking space, the 44-pixel touch size, the muted colours, the marked fact; verify in the Playwright spec of 4.1 and by a screenshot of the harness at 320 and 390 pixels, in the light and the dark theme

## 4. The browser

- [ ] 4.1 Update `harness/desk.ts` and `tests/desk.spec.ts`: no horizontal scroll at 320 and 390 pixels on a record nested six levels deep, controls hidden until hover and shown by hover and by Tab, a node kept open across a redraw, tags on and off, a fact opening its card, and the first draw of a record of several hundred lines timed; verify with `npm run test:browser`
- [ ] 4.2 Look at the demo vault in Obsidian on desktop and on a phone, with the Curie record, a family and a source: the first level open, the summaries, hover and touch controls, the dark and the light theme; record what was seen in the PR's test plan

## 5. Docs and gate

- [ ] 5.1 `README.md` where it describes the card; verify the text names the tree, tags on request and the controls on hover
- [ ] 5.2 `npm run check` and `npm run test:browser`
