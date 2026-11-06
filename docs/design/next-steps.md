# Research desk: next steps

The working list for taking the [research desk](research-desk.md) from mockup to
code. Tick items off here as they land.

The desk ships in two stages. **Reading** comes first: the file opens as
genealogy and nothing in the desk writes to the `.ged`; the source editor stays
the only way to change it. **Editing** is the next large step and starts once
reading has shipped.

## Stage 1: reading

### Decide

- [x] **Map.** No basemap in this stage: Places is a list of the places in a
      life, as in the mockup. A map, from `MAP` coordinates or tiles behind
      explicit permission, is a later slice of its own.
- [x] **Format tabs on a phone.** They scroll sideways, as Obsidian's own panels
      do. Check against the real app when the phone part is compared.
- [x] **`feat/person-browser`.** Its read model (`src/genealogy/`, with its tests
      and fixture) moves into the Reading slice; its views and styles do not.
      The branch closes once the move lands.
- [x] **Where the read model lives.** In the plugin for now, as a module that
      knows nothing of Obsidian, so it can move upstream when `packages/query`
      and `packages/graph` exist there. Reading does not wait on upstream.

### Refine the mockup

Iterate in [`research-desk-reading.html`](research-desk-reading.html), one file
per variant, before any code exists. It reads its own embedded copy of
`demo-vault/curie.ged` and can open any other `.ged`, so states and scale can be
tried on real files.

- [x] A reading variant with no edit affordances, a "show in source" bridge from
      every fact and record, and source pages.
- [ ] Compare the phone part with a real screenshot of Obsidian mobile (view
      header, bottom navbar, drawers) and correct it.
- [ ] States: empty file, file with validation errors, broken pointer, the file
      changing in the source editor while the desk is open.
- [ ] The tree at scale: a few thousand people, navigation and loading.
- [ ] Places with coordinates, for the later map slice.

### Ask upstream

Reading starts without these and shows less until they land: dates as years,
names as one string, no notes from the file. They are parsing, so they belong
upstream rather than in a workaround here. File them as issues in
`lavich/domorium`, not as blockers.

- [x] Dates: the parse the library already performs —
      [lavich/domorium#378](https://github.com/lavich/domorium/issues/378).
- [x] Which tags are events, and the read model moving upstream —
      [lavich/domorium#379](https://github.com/lavich/domorium/issues/379).
- [ ] Names in parts, with their type.
- [ ] A line's value apart from its pointer, with `CONT`/`CONC` joined.
- [ ] Places in parts, with `MAP`.

Drafts of these three, checked against upstream, are in
[`upstream-issue-drafts.md`](upstream-issue-drafts.md); they are filed by hand.

### Specify and build, in slices

Each slice is an OpenSpec change: `/openspec-propose`, review, then
`/openspec-apply-change`. So far every slice has gone into one change,
`openspec/changes/archive/2026-10-23-reading-desk`, on branch `lavich/research-desk-design`.

- [x] **Reading.** File opens as genealogy; people, families and sources index;
      person, family and source pages; evidence panel; "show in source". Brings
      over the read model from `feat/person-browser`. Checked in Obsidian on the
      demo vault; Back and Forward, and a phone, are still to be checked there.
- [x] **Evidence from the vault.** Portraits and galleries, a page per
      multimedia record, and the vault notes that link a record in the evidence
      panel.
- [x] **Timeline and Places.** Places as a list, no map; no ages until dates
      are read in full upstream.
- [x] **Tree.** Hourglass around the focus, siblings collapsed; laid out and
      tested apart from the page, including wide families, two marriages and a
      cousin marriage.
- [x] Close `feat/person-browser`, now that its read model has moved. Deleted at
      `fc2ba27`.

## Stage 2: editing

### Decide

- [ ] **Business model.** Free viewing with paid editing, or free reading and
      basic editing with a paid add-on of research tools. The answer decides
      what the upstream mutations API may be, so settle it before filing it.
      Record the outcome in `PRODUCT.md` under Brand Commitments or
      Capabilities. Research and a recommendation:
      [`business-model.md`](business-model.md).
- [ ] **Undo and confirmation of edits**, and whether they share history with
      the source editor.

### Refine the mockup

- [ ] Editing a fact, with the field marked until it is written.
- [ ] Adding a person: a child, a spouse, a parent — the form and where it opens.
- [ ] Choosing or creating a source for a fact, with a citation page.
- [ ] The file changing outside while a form is being edited.

### Ask upstream

- [ ] File the blockers for editing from
      [`upstream-requests.md`](upstream-requests.md), the mutations request
      after the business decision.

### Specify and build, in slices

- [ ] **Vault actions.** Creating a note from a record, attaching vault media.
- [ ] **Editing facts.** Waits on the upstream blockers.
- [ ] **Editing structure.** Adding people and families, linking, removing.
- [ ] Any paid add-on, as its own plugin over `src/api.ts`, if that model wins.

## Finish each slice

- [ ] Build it in `harness/` and cover it with Playwright specs.
- [ ] `/impeccable audit` and `/impeccable polish` on the built UI.
- [ ] `npm run check` and `npm run test:browser` before every commit.
