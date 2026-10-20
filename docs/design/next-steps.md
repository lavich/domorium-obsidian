# Research desk: next steps

The working list for taking the [research desk](research-desk.md) from mockup to
code. Tick items off here as they land.

The desk ships in two stages. **Reading** comes first: the file opens as
genealogy and nothing in the desk writes to the `.ged`; the source editor stays
the only way to change it. **Editing** is the next large step and starts once
reading has shipped.

## Stage 1: reading

### Decide

- [ ] **Map.** No basemap, coordinates from `MAP` only, or tiles behind explicit
      permission like remote images.
- [ ] **Format tabs on a phone.** Scroll them, or move some into the view's
      "more" menu.
- [ ] **What happens to `feat/person-browser`**: reuse its read model
      (`src/genealogy/`) or replace it, and close the branch either way.

### Refine the mockup

Iterate in `research-desk.html` or beside it, one file per variant, before any
code exists. Remove edit affordances from the reading variant.

- [ ] Compare the phone part with a real screenshot of Obsidian mobile (view
      header, bottom navbar, drawers) and correct it.
- [ ] States: empty file, file with validation errors, broken pointer, the file
      changing in the source editor while the desk is open.
- [ ] The tree at scale: a few thousand people, navigation and loading.
- [ ] Places with coordinates, once the map decision is made.

### Ask upstream

Reading needs nothing from upstream to start, but the plugin otherwise
reimplements these. File them as issues in `lavich/domorium`, not as blockers.

- [ ] Schema access, value and pointer apart, dates, places — from the
      Important list in [`upstream-requests.md`](upstream-requests.md).

### Specify and build, in slices

Each slice is an OpenSpec change: `/openspec-propose`, review, then
`/openspec-apply-change`.

- [ ] **Reading.** File opens as genealogy, index, person tab with Card, Tree,
      Timeline and Places, evidence panel.
- [ ] **Evidence from the vault.** Notes that link to a record, and media the
      record references, shown in the evidence panel.

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
