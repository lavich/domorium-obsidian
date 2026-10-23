## 1. Bring the read model over

- [x] 1.1 Copy `src/genealogy/` (code, `fixture.ts` and every `*.test.ts`) from `feat/person-browser` as it stands; `npm run test` passes with the branch's tests unchanged
- [x] 1.2 Carry the symbol `range` on records, events and citations; extend `src/genealogy/index.test.ts` with the birth-lines and record-lines scenarios
- [x] 1.3 Attach each citation to the event it sits under, with an event index for two of a kind, and read `QUAY`; extend `src/genealogy/sources.test.ts` with the two-residences, record-and-birth, family-event and quality scenarios
- [x] 1.4 Report a 5.5.1 `SOUR` line with text as an inline citation rather than a structure; extend `src/genealogy/sources.test.ts` with a 5.5.1 document of its own, since `fixture.ts` is 7.0
- [x] 1.5 Report siblings and, per spouse-family, the other spouse, events and children; extend `src/genealogy/families.test.ts` with the siblings, two-marriages and no-other-spouse scenarios
- [x] 1.6 Confirm the model still imports nothing from `obsidian` and names nothing in a reader's language; the existing independence tests in `src/genealogy/index.test.ts` pass

## 2. Two modes in one tab

- [x] 2.1 Add the `openAs` setting (`genealogy` default, `source`) to `src/settingsData.ts`, `src/settingDefinitions.ts` and the deprecated `display()` in `src/settings.ts`; extend `src/settings.test.ts` for parsing and the default
- [x] 2.2 Give `GedcomView` a genealogy container beside the editor, a mode and a record in `getState`/`setState`, and a header switch; record history for record changes only; the state it reads is covered in `src/desk/deskState.test.ts` (`GedcomView` imports Obsidian at runtime and cannot be loaded by Vitest), the view itself in 6.4
- [x] 2.3 Own a revision counter in `GedcomView`, build the model through `IndexCache`, and raise `genealogyChanged` after edits settle; the cache's revision behaviour is covered by `src/genealogy/cache.test.ts`, the view's in 6.4
- [x] 2.4 Choose the record on entering Genealogy (link, cursor record, last record, first person, empty state); covered in `src/desk/deskState.test.ts`
- [x] 2.5 Route a link subpath by record kind in `setEphemeralState`: person and source to a page, other kinds to Source at the record; covered in `src/desk/deskState.test.ts`
- [x] 2.6 Show in source: switch mode, select and scroll the range; the ranges each page hands over are covered in `src/desk/personPage.test.ts` and `src/desk/evidence.test.ts`, the selection in the editor in 6.4
- [x] 2.7 Gate editor commands to Source mode and make copy-link use the shown record in Genealogy; extend `src/commands.test.ts`

## 3. Pages

- [x] 3.1 Add every new string and an `event.<TAG>` key for each tag in `src/genealogy/tags.ts` to `src/i18n/en.json` and `src/i18n/ru.json`; `src/i18n/i18n.test.ts` passes (no key missing on either side)
- [x] 3.2 Render the person page in `src/desk/personPage.ts` — heading, facts with source state, other names, family with unresolved pointers, fact selection, phone unfold — covered by a new `src/desk/personPage.test.ts` (happy-dom) against the demo vault's `curie.ged`
- [x] 3.3 Render the source page in `src/desk/sourcePage.ts` — title, author, publication, repository, cited by with where and page — covered by a new `src/desk/sourcePage.test.ts`
- [x] 3.4 Render the empty and record-gone states, and wire both pages into `GedcomView`; extend `src/desk/personPage.test.ts` for the record-gone state

## 4. Index and evidence panel

- [x] 4.1 Render the windowed index in `src/desk/indexList.ts` — people and sources, rows, no-source mark and filter, search, current row — covered by a new `src/desk/indexList.test.ts`
- [x] 4.2 Register the **Domorium** index `ItemView` in the left sidebar, opened by the ribbon icon and a command, following the last active GEDCOM tab and redrawing on `genealogyChanged`; extend `src/commands.test.ts` for the command
- [x] 4.3 Render the evidence panel in `src/desk/evidence.ts` — heading, fact sources then whole-record sources, notices, citation details, inline and unresolved citations, source-page heading — covered by a new `src/desk/evidence.test.ts`
- [x] 4.4 Register the **Evidence** `ItemView` in the right sidebar, opened by a command and from the person page, following the last GEDCOM tab in Genealogy mode; extend `src/commands.test.ts` for the command

## 5. Styling and the browser

- [x] 5.1 Style pages, index and panel in `styles.css` on Obsidian's CSS variables with `gedcom-desk-` classes, matching `docs/design/research-desk-reading.html`; check by eye in the demo vault in light and dark themes
- [x] 5.2 Mount the person page, index and panel in `harness/` (`harness/mount.ts`, `harness/index.html`) with the demo vault's `curie.ged`
- [x] 5.3 Add `tests/desk.spec.ts`: a person page at desktop width and at 390 px with no horizontal scroll, fact selection driving the panel, the phone unfold, and the index scrolling and filtering 20,000 generated people while the search field answers
- [x] 5.4 Add the theme case to `tests/theme.spec.ts`: page text, borders and the no-source mark take their colours from Obsidian's variables

## 6. Documents and close-out

- [x] 6.1 Describe Genealogy mode, the index, the evidence panel and the *Open GEDCOM files as* setting in `README.md`, and the default-mode change in the release notes draft
- [x] 6.2 Tick the Reading slice in `docs/design/next-steps.md`
- [x] 6.3 Run `npm run check` and `npm run test:browser`; both pass
- [x] 6.4 Open `demo-vault` in Obsidian with this build: modes and their header switch, state across a restart, Back and Forward between people, a link into a person and into a family, Show in source, the index and the panel following the tab, and the phone drawers

## 7. The family page

- [x] 7.1 Report a family's missing spouses and children with the lines naming them; extend `src/genealogy/families.test.ts`
- [x] 7.2 Give families a page: `pageKind` and `routeLink` treat a family as a page; extend `src/desk/deskState.test.ts`
- [x] 7.3 Render the family page in `src/desk/familyPage.ts` — heading by the spouses with the marriage, facts with source state, spouses by role, children, missing pointers — covered by a new `src/desk/familyPage.test.ts`
- [x] 7.4 Link each marriage on the person page to its family page, and make a citing family on the source page open it; extend `src/desk/personPage.test.ts` and `src/desk/sourcePage.test.ts`
- [x] 7.5 Show a family's selected fact and whole record in the evidence panel; extend `src/desk/evidence.test.ts`
- [x] 7.6 Add Families to the index between People and Sources, with search; extend `src/desk/indexList.test.ts`
- [x] 7.7 Wire the family page into `GedcomView`, add it to the harness, and cover it in `tests/desk.spec.ts`
- [x] 7.8 Run `npm run check` and `npm run test:browser`; both pass
- [x] 7.9 Place the Evidence view in the right sidebar the first time a file is shown as genealogy, and bring it into view when a fact is selected on a desktop; checked in Obsidian
- [x] 7.10 Open a record from the index in the mode the tab is in: its page in Genealogy, its first line in Source; covered in `src/desk/deskState.test.ts`

## 8. Evidence from the vault

- [x] 8.1 Carry the link position on every picture, read multimedia records, and report who links each; extend `src/genealogy/index.test.ts`
- [x] 8.2 Give multimedia records a page kind and route links to them; extend `src/desk/deskState.test.ts`
- [x] 8.3 Render a gallery of resolved media and a portrait, from `mediaPreviewContent` answers handed in, in `src/desk/media.ts`; covered by a new `src/desk/media.test.ts`
- [x] 8.4 Render the media page in `src/desk/mediaPage.ts`; covered by a new `src/desk/mediaPage.test.ts`
- [x] 8.5 Add the portrait and the Media section to the person, family and source pages; extend their tests
- [x] 8.6 Find vault notes linking a record and cut the line around each link, in `src/desk/noteLinks.ts`; covered by a new `src/desk/noteLinks.test.ts`
- [x] 8.7 List those notes in the evidence panel and open one at its line; extend `src/desk/evidence.test.ts`
- [x] 8.8 Wire media resolution, the media page and vault notes into `GedcomView` and the plugin; mount them in the harness and cover them in `tests/desk.spec.ts`; check in Obsidian on the demo vault
- [x] 8.9 Run `npm run check` and `npm run test:browser`; both pass

## 9. Timeline and places

- [x] 9.1 Build a person's timeline and places from the model in `src/desk/timeline.ts`; covered by a new `src/desk/timeline.test.ts` against the demo vault
- [x] 9.2 Render the Card, Timeline and Places tabs on the person page, the timeline and the places, in `src/desk/personPage.ts` and `src/desk/timelineView.ts`; covered by a new `src/desk/timelineView.test.ts`
- [x] 9.3 Keep the chosen view in the tab's state and across moving to another person; covered by `src/desk/deskState.test.ts`
- [x] 9.4 Style the tabs, the timeline and the places; cover the tabs on a phone, the timeline and the places in `tests/desk.spec.ts`; check in Obsidian
- [x] 9.5 Run `npm run check` and `npm run test:browser`; both pass

## 10. Tree

- [x] 10.1 Lay out the tree around a person in `src/desk/treeLayout.ts`; covered by a new `src/desk/treeLayout.test.ts`, with two marriages, a wide family and a cousin marriage
- [x] 10.2 Draw it, and add the Tree tab, in `src/desk/treeView.ts` and `src/desk/personPage.ts`; covered by a new `src/desk/treeView.test.ts`
- [x] 10.3 Expand a run of siblings, kept for the session in `GedcomView`; cover the tree on a desktop and a phone in `tests/desk.spec.ts`; check in Obsidian
- [x] 10.4 Run `npm run check` and `npm run test:browser`; both pass

