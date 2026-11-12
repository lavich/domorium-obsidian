## Context

The tree is drawn by `Tree` in `src/desk/detail/tree.ts`. Each row may end in a group of controls, `.gedcom-tree-actions`, holding the removal (`trash-2`) and the add (`plus`) controls: `canAdd` and `canRemove` decide them (`tree.ts:750-751`), and the row carries `data-actions` with their count (`tree.ts:754`), which `styles.css` reads to reserve the group's width (`styles.css:2462-2496`). Every write goes through a `TreeHost` method that the card binds to the version it was drawn at (`recordCard.ts:199-208`), only where the service describes the record (`recordCard.ts:177`, `196`); the tab answers through `commit(editTarget, …)` and `wrote` (`GedcomView.ts:780-809`), the same path in the harness (`harness/desk.ts:139-147`). `Tree.editable` is `host.setValueAt !== undefined` (`tree.ts:192`).

The reader's choices live in `TreeSession` (`treeSession.ts`) under node keys of the form `parent.TAG[nth]` (`keyOf`, `tree.ts:123`): the nth line of that tag among its siblings. Notes unfolded are keyed `note:<key>` or `note:<key>.<n>` (`lineView.ts:95`), field drafts and messages by the node key, unwritten rows by their parent's key, focus wishes by key and part (`treeSession.ts:35-38`).

The service (lavich/domorium#523, see its archived change `2026-11-12-structure-move`) answers `describeMove(position)` — the version, the line's range and subtree range, and every slot among its siblings in file order, each `{ target, changesOrder }` — and `moveStructure(position, target, expectedVersion)`, where `target` is `{ before: Position }` or `{ end: true }`. A slot that keeps the order answers an empty edit; a record's opening line is refused with `record-edit-unsupported`; a move that changes how the file is read with `reading-changed`. Measured on `demo-vault/curie.ged` against the linked build: `describeMove` for every one of its 314 substructures takes 1.1 ms in all, a move 2 ms; moving the `PLAC` of `1 BIRT` / `3 DATE 1900` / `2 PLAC x` before the `DATE` is refused with `reading-changed`, and so is moving a 7.0 `GEDC` after a `SYST` that follows it.

Obsidian's own reordering vocabulary, read from the app's `app.css` and `app.js` at 1.8.9 (the bundled installer, two patches above the floor) and at 1.15.0:

| Class | 1.8.9 | 1.15.0 |
| --- | --- | --- |
| `body.is-grabbing` (cursor `grabbing` everywhere, guards `:hover` rules) | yes | yes |
| `.drop-indicator` / `.is-active` (2 px accent line, absolute) | yes | yes |
| `.drag-reorder-ghost` (fixed, shadowed, `pointer-events: none`) | yes | yes |
| `.drag-ghost-hidden` on the original (hidden, an accent tint in its place) | yes | yes |
| `.drag-reorder-ghost > .mod-dragged-item`, `--drag-item-background`, `--drag-item-shadow` | **no** | yes |
| `.grip-handle` (faint, `cursor: grab`, muted on hover) | **no** | yes |
| icon `grip-vertical` (lucide) | yes | yes |
| `data-ignore-swipe` honoured by the mobile drawer's swipe | yes | yes |

The app's private reorder helper (not an API) starts a drag after 5 to 10 pixels, holds 250 ms on mobile before a touch drags, scrolls its container within `min(50 px, a third of its height)` of an edge at up to 10 pixels a frame, and copies the original row into the ghost at its measured size.

## Goals / Non-Goals

**Goals:** one pointer-events drag for mouse, pen and finger, drawn in the app's own classes; a keyboard path that writes the same edit; the reader's open nodes following the line; nothing on the draw path that asks the service.

**Non-Goals:** a reorder helper shared with other views; animating the rows apart while dragging (the app's helper moves the DOM node live; the tree is drawn from the file, so it shows a drop line instead and is redrawn once).

## Decisions

### Which rows carry a grip

A row carries a grip when `host.moveAt` is bound — the card writes this record (`recordCard.ts:199`), which excludes the read-only card and a file with no dialect (`uneditable`, `tree.ts:96`, `recordCard.ts:177`, `196`) — and the row is not the root (`depth === 0`), not an unwritten row (`unwrittenRow` draws its own header and never reaches the group), and its line has at least one sibling with a tag: `owner.children.filter((one) => one.tag !== "").length > 1`, the line itself having a tag. A line written as a bare level (`1` with no tag) is a `RecordLine` with the tag `""` (`recordLines.ts:41`), drawn as a row, but the service gives it no slot and refuses to move it with `not-a-structure`; it carries no grip and is not counted, in the grip's presence or in the place announced (*n of m*). The lines of a shared note drawn where its pointer is are drawn by `renderLines` inside the pointer's value (`lineView.ts:123-125`), not as tree rows, so they never carry one.

The sibling count stands in for "a slot that changes the order exists". By the service's `slotsOf` rule a slot changes the order exactly when the line has another sibling, and `RecordLine.children` are those siblings: `CONT` and `CONC` are already folded into their line (`recordLines.ts:44`), the same as the service excludes them. Asking `describeMove` per row would cost little (1.1 ms for all of `curie.ged`), but it would put a service call on the draw path for every row the reader opens, and its answer is only good for the version it was read at, which the drag must check again at its start anyway. Alternative rejected: `describeMove` on draw; the tagless lines are the only siblings the service and `RecordLine` count differently, and the filter above settles them.

The group is created when `canAdd || canRemove || canMove` — today only for the first two (`tree.ts:752`), so a line that can neither take a field nor go, such as one the standard requires, would otherwise have nowhere to put its grip — and its count becomes `Number(canAdd) + Number(canRemove) + Number(canMove)` (`tree.ts:754`). The grip is appended after the add control, the last in the group and at the row's inline end.

### The grip

A `div` with the classes `gedcom-tree-grip` and `grip-handle`, the icon `grip-vertical` through `host.setIcon` (text `⋮⋮` where there is none, as the add control falls back to `+`), `tabindex="0"`, `role="button"`, the focus key `t:<key>:grip`, `aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown"`, `data-ignore-swipe="true"` so the mobile drawer does not take the finger, and `touch-action: none` so the browser does not scroll with it. Its `aria-label`, which the app also shows as its tooltip, is `tree.moveField` with the row's name and the keys: *Move Name 2: drag, or press Alt+↑ / Alt+↓*; the keys read `⌥↑ / ⌥↓` where `Platform.isMacOS`, passed in by the card view as the add control's icon is, so `tree.ts` keeps importing nothing from `obsidian`. It does not use `pressable` (`tree.ts:153`): Enter and Space do nothing on it. A press that ends without moving does nothing, and since it is a `[role=button]` the header's click handler (`tree.ts:833`) does not open or close the node.

Its look, where `.grip-handle` is missing (below 1.15), is restated under `.gedcom-tree .gedcom-tree-grip` with the same declarations — `color: var(--text-faint)`, `cursor: grab`, muted on hover, `grabbing` while active — so the floor and the current app draw it alike. It is sized as − and + are (`styles.css:2186-2197`, `2205-2210`, `2218-2223`): the row's height less two pixels a side on a desktop, 44 pixels on touch. It is not a `clickable-icon`, as the app's own grips are not.

### The drag

A new module, `src/desk/detail/treeMove.ts`, holds the drag session; `tree.ts` (already 1070 lines) creates it from the grip's `pointerdown`.

1. **Press.** On `pointerdown` with the primary button (any `pointerType`), and only while the tree is live (`tree.ts:209`), the grip calls `preventDefault` — the press neither moves the focus nor starts a text selection, so a field keeps the focus it had, an empty unwritten row among them, which therefore is not dropped by losing it (`tree.ts`, `unwrittenRow`'s `left`) — and captures the pointer. The tree's capturing `pointerdown` (`tree.ts:189`, `214-238`) runs first and commits a value being typed. Where it commits, it has already called `preventDefault`, and the grip starts no drag on an event whose default is prevented on its arrival: written, the card is redrawn and the old grip is detached; refused, the tree stays live, the refusal shows under the field, and the drag is blocked just the same. Either way the reader presses again.
2. **Threshold.** Nothing happens until the pointer has moved 5 pixels from the press, so a press, a click or a tap on the grip does nothing. On touch the drag starts at the same 5 pixels, without the app's 250 ms hold: the grip is a handle of its own and the rest of the row still scrolls (the user's choice).
3. **Start.** `host.describeMoveAt(line.range.start)`; a refusal is said as a refused move is (below) and ends the session. The card binds this call to the drawn version and answers a description of any other version as `stale-document`, which redraws the card. Then: `body.is-grabbing` on the grip's own document (`grip.doc`, so a card in a popout window works); `drag-ghost-hidden` on the moved line's `.gedcom-tree-node`, so its place, subtree included, shows as the app's tint; a ghost `div.drag-reorder-ghost.gedcom-tree` in that document's body holding a clone of the node with its row only (children dropped, so an open node does not lift its whole subtree), with `mod-dragged-item`, every `id` and `data-focus-key` stripped from the clone, `aria-hidden="true"` and `inert` on the ghost so it is neither read nor focused, at the row's measured width and height, offset by where the grip was pressed; and one `div.drop-indicator` inside the tree's `.gedcom-tree`, whose `styles.css` rule sets `left: auto; width: auto` and places it by `inset-inline-start` and `inset-inline-end` so it starts at the siblings' indentation in either direction (already `position: relative`, `styles.css:1946-1949`).
4. **Move.** The ghost follows the pointer. The places are the moved line's siblings' `.gedcom-tree-node` elements, direct children of the parent's `.gedcom-tree-children`, unwritten rows excluded, each matched to the description's slot whose `target.before.line` equals its `data-line` (`tree.ts:660`), never by position in either list — a tagless row has a node and no slot — and the end slot after the last node that has one. A pure function `slotAt(boxes, y)` picks the slot: inside sibling *k*'s node box, above the middle of its row → before *k*; anywhere lower in that box, its subtree included → after *k*; outside the band from the first sibling's top to the last sibling's bottom → none. A slot that is none or has `changesOrder: false` hides the indicator (`is-active` off); any other shows it at the boundary, from the siblings' indentation to the tree's end, in the inline direction of the tree.
5. **Autoscroll.** The nearest scrollable ancestor — `.gedcom-card-body` in the card (`styles.css:301-309`) — scrolls while the pointer is within `min(50 px, a third of its height)` of its top or bottom, at up to 10 pixels a frame, eased, on `requestAnimationFrame`, recomputing the slot as it scrolls; the app's helper uses the same numbers.
6. **End.** `pointerup` on a shown slot calls `host.moveAt(at, slot.target)` with the drawn version (below). For the whole session `pointermove`, `pointerup`, `pointercancel` and `lostpointercapture` are listened to on the grip's document (`grip.doc`), not on the grip, and Escape by a capturing `keydown` on its window (`grip.win`), stopped there: a grip detached by a redraw loses its capture, and the browser then sends what follows to the document. The autoscroll's `grip.win.requestAnimationFrame` loop runs from the start to the end of the session and checks `grip.isConnected` every frame, so a redraw of the card — the file changed on disk, a write elsewhere — ends the session within a frame even with the pointer still. `pointerup` elsewhere, `pointercancel`, `lostpointercapture`, Escape and a detached grip end it without a write. Ending is one idempotent `end()`: it removes the listeners, cancels the frame, removes the ghost and the indicator, `is-grabbing` from that body and `drag-ghost-hidden` from the node if it is still there, and does nothing when called again.

`body.is-grabbing` also guards the tree's hover rules (`styles.css:1976`, `2161`, `2181`) so no row lights up under the moving pointer, and `body.is-grabbing .gedcom-tree` sets `user-select: none`. HTML5 drag and drop was rejected: it does not fire for a finger in Obsidian mobile's web view, which would have needed a second implementation.

### The keyboard

On the grip, `keydown` with `altKey` and `ArrowUp` or `ArrowDown`, and no other modifier, is taken (`preventDefault`, `stopPropagation`). It asks `describeMoveAt`, finds its own slot *j* (the slot before itself) and moves to slot *j − 1* for up and *j + 2* for down — the slot before the sibling after next, or the end. At the first or the last place nothing is written and nothing said. The focus wish is the moved line's new key with the part `grip` and `reveal: true` (`treeSession.ts:35-38`, `tree.ts:266`). The tree focuses its target with `preventScroll` (today it scrolls it, `tree.ts:255-256`), because `renderRecordCard` restores the body's `scrollTop` after drawing (`recordCard.ts:144-146`), which undoes any scroll made during the draw. A wish marked `reveal` instead hands its element to the card through a post-draw callback on the host, and the card calls its `scrollIntoView({ block: "nearest" })` after the restore; `recordCard.ts` leaves a focus the tree placed alone (`recordCard.ts:147-153`). Only a move marks its wish so: the other wishes keep the rule that a redraw does not scroll the card. After a move by the pointer the focus goes to the grip the same way, so the keys can carry on from a drag.

### Writing

`edits.ts` gains `describeMoveAt(service, at)` and `moveAt(service, at, version, target)`, beside `removeAt`. `CardTab` and `TreeHost` gain `describeMoveAt?` and `moveAt?`; the card binds them only where it writes (`recordCard.ts:199-208`), `moveAt` with the drawn version; `GedcomView.moveAt` is `this.wrote(commit(this.editTarget, moveAt(this.service(), at, version, target)))`, as `setValueAt` (`GedcomView.ts:798-800`); `harness/desk.ts` the same. The tree never asks for a slot with `changesOrder: false`, so `commit` never receives an empty edit, whose `line` would be `Math.min()` of nothing (`edits.ts:72`).

A refused move says why with `refusalText` (`edits.ts:161`), through new keys `edit.refusal.reading-changed` and `edit.refusal.not-a-sibling` in both catalogues (the second cannot be reached from the tree, which offers only the service's own slots; it is there so a code the service may send is never shown in English); `stale-document` already has words, raises the tab's notice (`GedcomView.ts:780-787`) and redraws. A refused value is shown under its field and a refused removal only announced; a move has no field, but nothing visibly happens when a drop is refused, so its reason is drawn under the moved row's header, with `showMessage` tied to its grip (`fieldEdit.ts:27`), and announced through the card's live region. It is drawn into the tree as it stands and not kept in `TreeState`: the tree is not redrawn by a refusal other than `stale-document`, and the next drawing of the card — any write, a change of the file, another record — clears it. A move that is written is announced as *Name moved to place 2 of 3* (`tree.moved`), counting only siblings with a tag.

### The reader's choices follow the line

Keys are by tag and occurrence, so a move changes the keys of the moved line and of the siblings of the same tag between its old and new place; lines of other tags keep theirs. Before `moveAt` returns to the tree, a pure `movedKeys(parentKey, siblings, from, to)` maps every changed key to its new one, and on success — before `settle()` redraws — `TreeState.renameKeys(map)` rewrites, as one simultaneous permutation, every stored key equal to an old key or beginning with it followed by `.` or `:`, and every `note:` key built on it: the open set, drafts, messages, unwritten rows' parent keys, and a focus wish. A refused move renames nothing.

### Layout

A third `data-actions` value reserves the group's width as the other two do: `calc(3 * var(--size-2-1) + 3 * var(--gedcom-tree-action) + var(--size-4-1))` = 82 px on a desktop, `calc(var(--size-4-2) + 132px + 2 * var(--size-2-1))` = 144 px on touch and in the mobile app. Measured in the harness (`harness/desk.ts`, card 320 px on a desktop and 390 px as a phone), the content width left for the label and the value of a row with all three controls:

| Depth below the root | Phone 390 px: today with 2 → with 3 | Desktop 320 px: today with 2 → with 3 |
| --- | --- | --- |
| 1 | 227 → 181 | 199 → 173 |
| 2 | 210 → 164 | 182 → 156 |
| 3 | 193 → 147 | 165 → 139 |
| 4 and deeper (indent stops) | 176 → 130 | 148 → 122 |

A row with a line and no add control goes from one control to two, the same as an add-and-remove row today. The value's box keeps `flex: 1 1 9rem` (`styles.css:2014-2022`); where the label, the 8 px gap and 144 px do not fit, the value wraps under its label and takes the whole width, which happens to a node at depth 1 on a phone (181 < 40 + 8 + 144 for *Name*) where today it does not. The narrowest value is 122 px, about eighteen characters of the panel's 13 px text per line, and it wraps; nothing scrolls sideways.

### The floor

Every Obsidian API used is old enough for 1.8.7: `setIcon`, `Platform.isMacOS`, `Element.doc`/`win` (0.15.4), `setCssStyles`/`setCssProps`, `toggleClass`. The rest are DOM: pointer events, `setPointerCapture`, `requestAnimationFrame`. The classes `grip-handle` and `mod-dragged-item` and the variables `--drag-item-background` and `--drag-item-shadow` are not APIs and the lint rule cannot see them; they are missing below 1.15, so `styles.css` restates the grip's look and gives the ghost's clone `background-color: var(--drag-item-background, var(--background-primary))` and `box-shadow: var(--drag-item-shadow, 0 2px 8px var(--background-modifier-box-shadow))` — the values 1.15 sets — and `.drag-reorder-ghost.gedcom-tree { position: fixed; }` so the tree's own `position: relative` does not undo the app's rule. Nothing joins the table of declined APIs in `CLAUDE.md`.

## Risks / Trade-offs

- [A slot the drop line shows is refused with `reading-changed`] → the description lists slots by place only (upstream option 1); the refusal is said under the row and nothing changes. Trying every slot first was declined upstream.
- [Alt+↑/↓ is bound by the reader as an Obsidian hotkey] → the grip stops the event in its own `keydown`; the app's keymap listens on the document, after the element. To confirm in the real app (task 6.3).
- [A finger meant to scroll lands on the grip] → the grip is 44 px at the row's end, as − and + are, and only it drags; the row around it scrolls.
- [The file changes during a drag] → the card is redrawn; the frame loop sees the grip detached and ends the session within a frame, with the document-level listeners catching the pointer events the detached grip no longer gets; a drop at the old version would be refused as `stale-document` anyway. happy-dom has no capture or layout to show it, so a browser spec does (task 6.1).
- [The value of a node row wraps under its label on a phone, where three controls stand] → measured above: the value keeps at least 122 px and wraps; lowering the value's 9rem basis on such rows would keep it beside the label but narrower, and was not chosen.

## Migration Plan

None for the reader. The branch builds against a linked `@domorium/language-service`; it merges only after a release carrying #523 is pinned in `package.json` and `package-lock.json`, with one copy of the package in `npm ls`.

## Implementation

Where the build departs from the decisions above, or settles what they left open:

- **The copy hangs below the pointer.** The ghost keeps the horizontal offset of the press but its top sits 8 pixels below the pointer, instead of being offset by where the grip was pressed. Held by its grip, the copy lay over the boundary the pointer chose, and in the harness the drop line was hidden under it (`treeMove.ts`, `BELOW`).
- **One click swallowed after a drag.** When a started drag ends, a capturing `click` listener on the grip's window stops the click the release may produce, for one task. Without it, a release over the moved line's own header, after the pointer travelled more than 5 pixels, opened or closed that node.
- **Escape before the threshold.** Escape ends the session at any point, but is stopped (`preventDefault`, `stopPropagation`) only once the drag has started; before 5 pixels it ends the press and passes on.
- **The grabbing cursor.** `app.css` at 1.15 has no body-wide `grabbing` rule (the app's helper sets the cursor from script), so `styles.css` adds `body.is-grabbing .gedcom-tree .gedcom-tree-grip { cursor: grabbing }`; the grip holds the pointer's capture for the whole drag, so its cursor is the one shown.
- **Names of the new host members.** The Macintosh flag reaches the tree as `CardView.macKeys` → `TreeHost.macKeys`, and the post-draw callback as `TreeHost.reveal(element)`. The card binds `describeMoveAt` and `moveAt` only together, where the tab offers both.
- **Test stand-ins.** `src/testing/obsidianDom.ts` gains `Node.doc`, `Node.win` and `HTMLElement.setCssStyles`, which the drag uses and happy-dom lacks.
- **The harness redraw.** `window.desk.replace()` changes the text without drawing the card, so the browser specs that change the file mid-drag, and after a move, draw the card again through `window.desk.selectRecord(window.desk.record())`, as a change on disk draws it in the app.
- **Measured (task 6.2).** The content width of a row with three controls, in the harness, matched the table above to the pixel: 181, 164, 147, 130 on a 390-pixel phone and 173, 156, 139, 122 on a 320-pixel desktop.
- **Not done here.** Task 1.3 waits for a release of `@domorium/language-service` carrying #523; the branch still builds against the local link. Task 6.3 needs the real app, and 7.2 the archive of `record-fields-tree`.
- **Focus after a drop (review).** A move by the pointer no longer wishes the focus onto the moved grip: the wish carries `focus: false` and only brings the grip into view, so no accent ring is drawn and `.gedcom-tree-actions:focus-within` does not keep the controls shown once the pointer leaves. Alt+↑/↓ still put the focus on the moved grip. This replaces "After a move by the pointer the focus goes to the grip the same way" under *The keyboard*.
- **A stale description (review).** `edits.describeMoveAt(service, at, version)` refuses a description of another version as `stale-document`, and the tab answers it through `GedcomView.wrote`, so the notice every other stale edit raises fires here too. Since the card is drawn again at once, the tree draws no message under the row for that code; the notice and the live region say it.
- **Lines beneath a tagless line (review).** A grip also needs its parent to have a tag: the service answers `not-a-structure` for the lines beneath a bare `1`.
- **The mobile drawer (review).** Besides `data-ignore-swipe`, the grip stops `touchstart` and `touchmove` from bubbling, passively, as the graph does (`graphInput.ts`).
- **One drag at a time (review).** A press starts a session only for the primary pointer and only while no other session is live in the grip's document (`TreeDrag.start`).
- **Cursor and ghost (review).** The grabbing cursor on the body is scoped to the plugin's own drag by a `gedcom-tree-moving` class, because Obsidian sets `is-grabbing` for its own drags too, the resizing of panes among them. The lifted copy hides its controls and its pointer chooser.

