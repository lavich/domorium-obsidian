# Research desk: next steps

The working list for taking the [research desk](research-desk.md) from mockup to
code. Tick items off here as they land.

## 1. Decide what blocks everything else

- [ ] **Business model.** Free viewing with paid editing, or free reading and
      basic editing with a paid add-on of research tools. The answer decides
      what the upstream mutations API may be, so settle it first. Record the
      outcome in `PRODUCT.md` under Brand Commitments or Capabilities.
      (`/openspec-explore` is a good place to think it through.)
- [ ] **Map.** No basemap, coordinates from `MAP` only, or tiles behind explicit
      permission like remote images.
- [ ] **Undo and confirmation of edits**, and whether they share history with
      the source editor.
- [ ] **Format tabs on a phone.** Scroll them, or move some into the view's
      "more" menu.

## 2. Refine the mockup

Iterate in `research-desk.html` or beside it, one file per variant, before any
code exists.

- [ ] Compare the phone part with a real screenshot of Obsidian mobile (view
      header, bottom navbar, drawers) and correct it.
- [ ] Adding a person: a child, a spouse, a parent — the form and where it opens.
- [ ] Choosing or creating a source for a fact, with a citation page.
- [ ] States: empty file, file with validation errors, broken pointer, the file
      changing outside while being edited.
- [ ] The tree at scale: a few thousand people, navigation and loading.
- [ ] Places with coordinates, once the map decision is made.

## 3. Ask upstream

- [ ] Turn [`upstream-requests.md`](upstream-requests.md) into issues in
      `lavich/domorium`, blockers for editing first. Wait for the business
      decision before filing the mutations request.

## 4. Specify and build, in slices

Each slice is an OpenSpec change: `/openspec-propose`, review, then
`/openspec-apply-change`.

- [ ] **Reading.** File opens as genealogy, index, person tab with Card, Tree,
      Timeline and Places, evidence panel. Needs nothing from upstream; reuse or
      replace the read model on `feat/person-browser` (`src/genealogy/`), and
      decide what happens to that branch.
- [ ] **Evidence and vault.** Notes linking to a record, creating a note from a
      record, attaching vault media.
- [ ] **Editing facts.** Waits on the upstream blockers.
- [ ] **Editing structure.** Adding people and families, linking, removing.
- [ ] Any paid add-on, as its own plugin over `src/api.ts`, if that model wins.

## 5. Finish each slice

- [ ] Build it in `harness/` and cover it with Playwright specs.
- [ ] `/impeccable audit` and `/impeccable polish` on the built UI.
- [ ] `npm run check` and `npm run test:browser` before every commit.
