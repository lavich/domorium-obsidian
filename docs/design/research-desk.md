# Research desk: the genealogy interface

The design brief for reading and editing a GEDCOM file as genealogy. Product
truth lives in [`PRODUCT.md`](../../PRODUCT.md). Two interactive mockups sit
beside this brief: [`research-desk-reading.html`](research-desk-reading.html),
the first stage, which reads `demo-vault/curie.ged` itself, and
[`research-desk.html`](research-desk.html), an earlier sketch that includes
editing. Serve the repository root over HTTP and open them in a browser, so the
vault's images load.

Status: direction chosen, not yet specified. Reading ships first and editing is
the next large step; what comes next is tracked in
[`next-steps.md`](next-steps.md).

## Job and audience

A genealogist who keeps research in a vault and does not know GEDCOM. The
primary scenario is exploring the tree: following relatives, spotting gaps, and
checking what each fact rests on. An operating tool, not a showcase.

Success for reading: answering "who was Marie's father, and how do we know?"
without seeing `@F1@` or a level number. Success for editing: fixing a wrong
date the same way, with the edit landing in the same `.ged` file.

## Structure

Opening a `.ged` file shows genealogy; the source editor is a mode switch, the
way Markdown has reading and source modes.

| Area | Desktop | Phone |
| --- | --- | --- |
| Index of people, search, gap filter | Left sidebar view | Left sidebar drawer, beside Files and Search |
| Person, with Card · Tree · Timeline · Places | Main view | A normal tab; back and forward are Obsidian's own |
| Evidence for the selected fact: sources, vault notes, media | Right sidebar view | Inline under the tapped fact (the gist), right drawer for the rest |

The phone uses Obsidian's own mobile chrome. The plugin adds no bottom bar.

## Signature behaviour

- Selecting a fact switches the evidence panel to that fact.
- Gaps are visible everywhere: "no source" on a fact, a dot in the index and the
  tree, a "Without source" filter.
- An edited field stays marked until it is written to the file, then says it
  was written (editing stage).
- Disagreement between the record and a note is shown, not hidden (in the demo
  the death place differs from the note's "Sancellemoz").

## States and ranges

Thousands of people: the index and the tree load incrementally. States to
design: empty file, broken pointer, fact without a source, person without
dates, a file with validation errors, the file changing outside while edited.

## Open decisions

- **Map.** Tiles need the network, which `PRODUCT.md` forbids by default, and
  GEDCOM places rarely carry `MAP` coordinates. Options: no basemap, only
  coordinates from `MAP`, or tiles behind explicit permission like remote images.
- **Format tabs on a phone.** Four tabs do not fit; scroll them or move some
  into the view's "more" menu.
- **Undo and confirmation of edits**, and whether they share history with the
  source editor.
- **Several trees in one vault.** Deferred.
- **Business model.** Free viewing with paid editing is allowed by Obsidian's
  developer policies when disclosed in the README, but form editing would sit
  beside free source editing, and the edit engine is planned upstream as open
  source. The alternative under consideration: free reading and basic fact
  editing, a separate paid add-on plugin (through `src/api.ts`) for research
  tools — duplicates and merge, branch extraction, diff, chart export, tree
  health. Decide before asking upstream for the mutations API.

See [`upstream-requests.md`](upstream-requests.md) for what this needs from
`lavich/domorium`.
