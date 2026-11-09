## Context

See `proposal.md` for why and for what the user decided. What the code does today, as far as this change touches it:

- A person's card is `renderPersonPage` (`src/desk/personPage.ts`): a heading, then names, the facts as event rows and detail rows, the family, notes, related people, pictures, a folded timeline, folded identifiers and other data, then evidence (`src/desk/evidence.ts`, drawn by `recordCard.ts`). A family card (`familyPage.ts`) and a source card (`sourcePage.ts`) are built the same way from their own sections.
- `index.record(xref)` already returns the whole record as `RecordLine`s — tag, text, pointer, nested children, `range` (`src/genealogy/recordLines.ts`, `types.ts`). Sections that retell lines read it through `claims.ts` (`unclaimed`, `PERSON_CLAIMED`) to find what no section drew.
- `src/desk/detail/lineView.ts` draws any line as a label and a value, a pointer as a link (`renderPointer`), a note folded (`renderNoteText`), a value as a read-only field (`renderField`, `fields.ts`). It nests with a `gedcom-detail` grid; it has no node, no summary, no control.
- The card is torn down and redrawn on every change; its scroll, its folds (`data-open` on the root, `foldsOf` in `recordCard.ts`) and the focus (`data-focus-key`) are carried across; folds reset when another record is shown.
- A fact is an event or an attribute a card can select (`factsOf` in `personPage.ts`, `familyFacts`): `fact.event.range` is the range of its line; `options.selected` is the selected fact's key; `host.select(key)` opens its event card.
- The event card (`eventPage.ts`) uses `renderNotes`, `renderRelated` and `renderOther` for the lines of an event; the family section and the place card use the event row of `eventRows.ts`.
- No new data is needed: nothing in this change calls a language-service method that is not already used.

## Goals / Non-Goals

**Goals:**

- One renderer that draws a record's lines as they are, so that a later step can make rows editable without a new layout.
- A card that fits 320 pixels and a phone and that does not show a control until the reader is there.

**Non-Goals:**

- A generic tree widget for other views; the renderer is the card's and is written for `RecordLine`.

## Decisions

**A new renderer, `src/desk/detail/tree.ts`, built from the pieces `lineView.ts` already has.** It reuses `renderPointer`, `renderNoteText`, `renderField`, `valueText` (exported for this) and `tagLabel`, and adds what a tree needs: a node with a control, a summary, a depth, lazy children. Alternative: extend `renderLine`. Rejected: its grid cannot carry a node's header, and the event card still needs the grid as it is.

**The tree draws every line and claims nothing.** The family section, the pictures, the timeline and the evidence stay, so a line that a section also tells — `FAMS`, `FAMC`, `HUSB`, `WIFE`, `CHIL`, `OBJE`, `REPO`, an event's citation — shows in both. Alternative: leave out of the tree the lines a section draws, as `claims.ts` does today. Rejected: it breaks "the file's order, nothing left out", leaves holes in the order, and keeps `claims.ts` and its two lists alive. `claims.ts` goes.

**A node's key is its place in the record, not its line number.** `NAME[1].TYPE[0]`: the tag and the index among siblings of that tag, from the record's opening line. It is stable when a line above changes, which a number is not, and it is what the redraw keeps (the requirement on a node kept across a redraw). The reader's choices are kept as the set of nodes whose state differs from the default — open on level one, closed beneath — in the root's `data-open` with the other folds, under `t:`, and it resets when another record is shown, as the folds do. *Open every node* and *close every node* write that set from the tree.

**Closed nodes draw their children when first opened.** A person with a hundred lines would otherwise draw several hundred rows at once on a phone. `lazyFold.ts` is the precedent. A test opens a node before it looks beneath it.

**The summary of a node is the plugin's, built from the lines it already has.** An event or an attribute (the tags `src/genealogy/tags.ts` lists) shows its date as the file writes it and its place cut to the short form `labels.ts` uses, joined by a dot, with nothing for a part it lacks; any other node shows its value, a `NAME` without its slashes; a pointer node shows the record's name. It is shown only while the node is closed.

**The label of a fact is a button; any other label is text.** The tree is given a lookup from a line's number to the fact the page knows on it, built once from `factsOf` or `familyFacts`, and the selected fact's line. The button calls `host.select(key)`, which is what the event rows do; the row is marked when its line is the selected fact's. Alternative: a link on every label that could be a fact. Rejected: the card would then offer to open something that has no card.

**Tags and the open state of the tree's controls live with the session, not with the file or the settings.** The *Show tags* choice is held in a small object that `DeskViews` creates and hands to the card through `CardView`; it is read when the card is drawn and written when the control is pressed, which redraws. It survives a change of record and of tab and is lost when the plugin reloads. Alternative: a setting. Rejected: it would add a persisted key and a setting row for something the reader changes in passing.

**Controls appear by CSS where they can, and a hidden control stays focusable.** A row's *Show in source* and the tree's controls are positioned over the end of the row and not in the flow, so hiding them frees no space and showing them shifts nothing; they are hidden with opacity and pointer-events, not `display: none`, so the keyboard can reach them, and `:hover`, `:focus-within` and `:focus-visible` show them. On a device that cannot hover (`@media (hover: none)` and the `.is-mobile` class of the mobile app) the row the reader last pressed carries a class that shows its controls, set on `pointerdown` and removed when another row is pressed; the tree's controls stay shown. The open/close control of a node stays shown at a quiet colour. Alternative: a "…" menu per row. Rejected: one more control on every row, which is what the reader asked not to see.

**A disclosure, not an ARIA tree.** A node's control is a button with `aria-expanded` and `aria-controls`; rows are plain blocks in the tab order. An ARIA `tree` role promises roving focus and arrow keys, which would be a second keyboard model on a card that is read with Tab. Alternative: `role="tree"`. Rejected for this step; it is revisited with editing.

**Indentation stops after the fourth level.** A node's depth sets `data-depth`, capped at four in CSS, so a line six levels deep keeps the width of one at four. A guide of one pixel in the border colour joins a node to its children; no colour band, no card around a node.

**Removed code goes in the same change.** `names.ts`, `recordInfo.ts` and `claims.ts` lose their only callers and are deleted; `notes.ts`, `related.ts` and `otherData.ts` keep serving the event card and stay; in `personPage.ts` and `familyPage.ts` the retelling sections go and the family section, the pictures, the timeline and the evidence stay. The event row stays for the family section and the place card; the dot for a source stays on those rows.

## Risks / Trade-offs

- [A card that was dense with facts at a glance — an event with its date and place, a dot for a source — becomes a tree whose second level is closed] → A node shows its summary while closed; the first level is open so that an event's date and place are rows, and *Open every node* and *Close every node* are one press. The first Obsidian check on the demo vault looks at exactly this.
- [Lines shown twice: the pointer to a family in the tree and the family section] → Accepted and stated; the tree is the file, the section is the people. The alternative is above.
- [A person with several hundred lines draws slowly] → Lazy children; a Playwright spec on a long record times the first draw.
- [The event rows are removed from a person's and a family's own card, and with them the dot for "cites a source"] → The citation is a row beneath the event, which is where the file states it, and the event card still shows what an event rests on.
- [`hover: none` is not what Obsidian's mobile app reports in every webview] → The `.is-mobile` class of the app is used beside the media query, the same as the card's existing touch sizes.
- [The unchanged specs that name the old sections] → The deltas modify or remove every requirement the grep found; the cross-review looks for the rest.

## Migration Plan

None: no setting, no data. Rollback is a revert of the change.

## Open Questions

- The summary's wording for a node that has neither a value nor date and place is the first node's label alone; the first Obsidian look on the demo vault confirms this reads right.
