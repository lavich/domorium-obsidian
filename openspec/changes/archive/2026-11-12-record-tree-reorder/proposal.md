## Why

The tree of a record shows its lines in the file's order, and the order carries meaning: GEDCOM 7 reads the first of several structures of one type as the preferred one, so the first `NAME` is the preferred name, and a family's children are expected in birth order. Today the reader can change every value of the tree, add a line and remove one, but cannot change that order without going to Source and cutting and pasting lines by hand, levels, continuation lines and all. The language service now moves a structure among its siblings (lavich/domorium#523), so the card can offer it.

## What Changes

The user's requirement, in their words and by date:

- Before 2026-11-12: «я хотел еще перетаскивать целые ветки внутри объектов используя иконку с шестью точками» — whole branches are dragged within a record by an icon of six dots.
- 2026-11-12, asked for the scope: «Только перестановка среди соседей» — only among siblings; a line does not change its parent.
- 2026-11-12, asked where the grip goes: «Справа, в группе − и +» — a third control in the group of the removal and the add controls, at the end of the row.
- 2026-11-12, asked how it works on touch: «Тянуть за ручку, она видна всегда» — on touch the grip is always shown, and pulling it drags at once.
- 2026-11-12, asked about the keyboard: «Alt+↑ / Alt+↓ на ручке» — with the focus on the grip, Alt with an arrow moves the line one place. *Superseded below.*
- 2026-11-12, after the review of the plan, asked the grip's place in the group: «− + ⠿ (ручка последней)» — the grip is the last control, at the row's end.
- 2026-11-12, asked about the narrower value on a phone: «Пусть переносится под подпись» — a value that no longer fits beside its label wraps beneath it.
- 2026-11-12, asked whether the grip takes a hover background like − and +: «Нет, как родная ручка Obsidian» — it darkens its dots and shows the grab cursor only.
- 2026-11-12, after the first build: «убери перетаскивание по кнопкам» — no moving by keys: a line moves only by dragging its grip with a mouse, a pen or a finger, and the grip is a handle for the pointer alone, out of the keyboard's order.

The proposed scope:

- Every line of a tree the card writes that has at least one sibling carries a **grip**, the six-dot icon Obsidian uses for reordering, as the last control of the row's group beside the removal and the add controls: shown with them on hover or focus on a desktop, always shown and 44 pixels square on touch. The root, an unwritten row, a line with no sibling, a line written as a level with no tag, and every line of a card that does not write carry none.
- Dragging the grip — with a mouse, a pen or a finger, one implementation — lifts a copy of the row that follows the pointer, marks the row's place, and shows Obsidian's accent drop line only at the places among the line's own siblings that change the order: before a sibling or after the last one, never among the lines nested beneath a sibling. Releasing there moves the line with everything beneath it as one change of the file; releasing anywhere else, Escape, or the system cancelling the pointer writes nothing. A press that does not move does nothing. The card scrolls when the pointer nears its top or bottom edge.
- After a drop the focus stays where it was, the moved line's grip is brought into view and its new place is announced. No key moves a line, and the grip is not reached by the keyboard.
- What the language service refuses is not written and says why under the row, in the reader's language: a move that would change how the file is read (inside the header, or among lines written at a wrong level), and a file that changed since the card was drawn, which redraws the card.
- After a move the tree is drawn again from the file; the nodes the reader opened, the notes unfolded, a value typed and not written, a message and an unwritten row follow the line that moved and its siblings, not their old places.

**This repository or upstream.** The rule of where a line may go and what a move writes is the language service's: `describeMove` and `moveStructure`, with the refusal codes `not-a-sibling` and `reading-changed`, merged upstream in lavich/domorium#523 and not yet published. This change only offers the move in the card. It is built against a local link of that package; it cannot merge before a release of `@domorium/language-service` carries #523, as `record-fields-tree` cannot before #522.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `genealogy-record-tree` (added by `record-fields-tree`, changed by `record-kinds-lists`): the tree still never reorders lines of its own accord, and now shows the order the reader set by a move; moving a line joins the edits that write; a node's opened state follows a moved line; a redraw after a move scrolls just enough to show the moved line's grip.
- `genealogy-record-edit` (added by `record-fields-tree`): moving a line among its siblings by dragging its grip, and how a move is written or refused. Its Purpose, set by `record-fields-tree`, gains moving once that change is archived (task 7.2).

## Non-goals

- Moving a line under another parent, into or out of a node, or to another record; moving a whole record among the records of the file (the service refuses it).
- A long press on a row, or dragging by any part of the row other than its grip.
- Dragging with HTML5 drag and drop, or dropping a row into another view or another app.
- A rule of the plugin's own about order — `CHIL` in birth order, `GEDC` first in a 7.0 header — or a warning for one. The service has none either (upstream proposal, option A).
- A grip on the lines of a shared note drawn where its pointer is: they belong to the note's record and are moved on its card.
- Moving a line by keys, Alt+↑ / Alt+↓ among them (the reader's decision of 2026-11-12, above).
- Undo inside the card: a move is undone in Source, as any edit of the card is.
- Raising `minAppVersion`.

## Impact

- `src/desk/detail/tree.ts`: the grip in the row's group, the drag session's start; `src/desk/detail/treeMove.ts` (*new*): the drag session, its geometry and the renaming of a moved line's keys.
- `src/desk/detail/treeSession.ts`: the keys of the reader's choices renamed when a line moves.
- `src/desk/edits.ts`, `src/desk/recordCard.ts`, `src/GedcomView.ts`, `harness/desk.ts`: the describe and move calls of the service, at the version the card was drawn from, through the same commit path as every other edit; `recordCard.ts` also brings the moved line's grip into view after it restores the card's scroll.
- `src/i18n/en.json`, `src/i18n/ru.json`: the grip's name, the announcement of a move, the refusals `reading-changed` and `not-a-sibling`.
- `styles.css`: a group of three controls, the grip, the lifted row and the drop line where the app's own rules are missing at the floor; `harness/palette.css` and `harness/icons.ts` for the browser specs.
- `package.json`, `package-lock.json`: `@domorium/language-service` at the release that carries #523.
- `README.md`: one sentence on reordering.
- Tests: `src/desk/detail/tree.test.ts`, `src/desk/detail/treeSession.test.ts`, `src/desk/edits.test.ts`, `src/desk/recordCard.test.ts`, `src/i18n/i18n.test.ts`, `tests/desk.spec.ts`.
