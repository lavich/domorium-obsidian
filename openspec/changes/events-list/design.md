## Context

The List shows the people, the families, the sources and the places of a file as rows (`src/desk/listRows.ts`, `src/desk/fileList.ts`). A kind is a set of columns, a way to filter, a default order and a sort value per column. Places added the first kind whose rows are not records: its id is `place:<key>`, `pageKind` answers `place` for it, its card is `src/desk/placePage.ts`, and the list marks its row from the tab's selection, so `ListState` keeps no mark.

The events are already read: `PersonEvent` (`tag`, `date`, `place`, `value`, `type`, `range`, `citations`) on every person and family of the index (`src/genealogy/types.ts:14`). The card already names an event of a record by a positional `FactKey` (`p:<n>`, `f:<n>`, `src/desk/personPage.ts:22`); the event's id does not use it (D2). See `proposal.md` for the why, and for the user's choice of a card of its own for the event.

## Decisions

### D1. A row is one event, built from the index once per index

`collectEvents(index)` walks the people and the families that have an xref, takes every event of each and yields rows `{ key, owner, event, person?, family? }`, where `owner` is the record's xref and `key` is the event's id (D2), so a row, like a place's, has no `xref` of its own. A record declared twice is listed once, as the last declaration reads (the Places and the People list do not dedupe, so such a file counts its events at a place more than the Events lists). Rows are ordered by the event's `range.start` and memoised per index in a `WeakMap`, as the places are. The rows keep the record and the event, not their texts: the name of an event and of a record depend on the language, so the cells are read when a row is drawn, and the folded text a search reads is kept per row and per language.

The kind lists attributes (`OCCU` and the like) with the events, since they are `PersonEvent`s; the card's word for them is *Facts*, the kind's is *Events*, as the user asked.

Cells: the event's name (`eventName`), followed by ` · ` and `event.value` where it has one other than `Y` (the timeline drops `Y` too, `fileTimelineView.ts:865`); the record's name; the date as `date.text`; the place as written. Without the value, the 15 occupations of `curie.ged` would read the bare `Occupation`, and the five `EVEN` of type `Award` in `curieWithEvents()` would be five identical `Award`.

### D2. Identity: `event:<xref>:<TAG>:<n>`, found without building the rows

An event has no xref. Its id is `event:`, the record's xref, the event's tag and the number of events of that tag before it on the record (`event:@I1@:BIRT:0`, the second residence `event:@I1@:RESI:1`). A positional index over all the events would name a neighbour when an event of another tag is deleted above it, and the card would then silently show another event; counting within the tag leaves the id alone when other tags change, and makes it name nothing, which drops the selection, when the event itself is the one removed. Inserting an event of the *same* tag above it, or removing an earlier one, still moves the ones after it: after an insertion the id names its neighbour, and after a removal of an earlier one the selection is dropped only when no event is left at that number. That is accepted, the card behaves so for a fact today, and Back and Forward can land on such a neighbour after an edit.

The id is parsed from the end with `^event:(.+):([A-Za-z0-9_]+):(0|[1-9]\d*)$`, because the index takes the xref of a record from its line's text and a xref may hold a colon (`0 INDI a:b`); a record with such an xref shadows an event id only if its xref is exactly an event id, since `pageKind` asks for a person first. The count is canonical digits only, so `00` and `1e0` name nothing and no event has two ids. `eventAt(index, id)` finds the record with `index.person` or `index.family` and filters its events by the tag: one record's events, never the rows. `pageKind` is called on every edit with an event selected (`tabModes.textChanged`) and on every history and card render, so it must not rebuild the rows.

### D3. A selection like a place's, through the tab

`pageKind` answers `event` for an id the file names, which gives the event a card, a step in the history, a place in the saved selection, and its drop when an edit removes it, exactly as it gave them to a place. `deskState.shownRange` returns the event's `range` for it, so *Show in source* in the card and the switch to Source mode move to its lines. `recordKind(index, id)` answers `events`, and `ListBoard.place()` is written as one rule for both non-record kinds: a record or a source selected while the list shows the Places or the Events leaves the list there and unmarks the rows; a place or an event selected switches the list to its kind, clears a filter that hides the row and brings the row into view. The row is marked from the tab's selection by its key, which is the id.

The cursor in Source mode follows the selection and the selection follows the cursor (`genealogy-record-card`, in Source mode the cursor and the selection go together), and an event id is never equal to the xref of the record under the cursor. Without a rule, switching to Source (which moves the cursor into the event, `moveCursorToShown`), the first click in Source, and leaving Source would each replace the event with its record. `eventOwner(id)` gives the record an event id names; `TabModes.setMode` (on leaving Source) and `shouldFollowCursor` treat a cursor in that record as the same selection and keep the event; a cursor in another record selects that record, as it does now. The cursor may be in another event of the same record and the event stays; the rule is by record, not by lines.

### D4. The card of an event

`src/desk/eventPage.ts` draws the card: the event's title (name and text) as the heading; the record as a link (`host.openRecord(owner)`); date and place, the place a link to the place (`host.openRecord(placeId(place))`); and the sources the event cites, each a link to its source record, or plain text for an inline citation, as the person card's unfolded fact shows them (`personPage.ts:158`, which keeps its rows plain and is left as it is); *Show in source*; and, where the event states nothing, a line that says so. It has no evidence section (`recordCard.ts:192`'s early return, as the place card). `recordCard.ts` had its own copy of `pageKind` (:118), which now imports the exported one, and has `recordName` (:40, the header title and the live-region announcement) and the branch in `drawRecord` (:175); each learns the event. A citation of a source the file does not declare is shown as text, not as a link that would select nothing. The card has its own small styles in `styles.css`.

Known gap, shared with `places-list`: `genealogy-record-card`'s requirements that a tab holds one selected record and that the card moves between records still name a person, a family, a source or a multimedia record. They are left as they stand rather than restated here; the new requirements describe the event card and the event kept under the cursor.

### D5. Order, sort and search

Without a sort the rows are in the order the file writes the events. Event, Record and Place compare through the language's collator; Event compares its displayed text; Record compares a person as the People list does (surname, then given name) and a family by its title, through the one pair of helpers (`personSortKey`, `familySortKey`, extracted from the People and Families sorts) both lists use; Date compares the first year of the date. The shared stable order (`listOrder.ts`) keeps ties in file order and a missing value last. The search folds the query and the haystack with `foldText`, which moves from `placeRows.ts` (private today) to its own module both kinds import, and matches the event cell, the record's name, the date text and the place.

### D6. The grid and the phone

The header holds four cells for every kind and the Events has four columns, so none is hidden. The compact layout puts the first two cells on one line and the last two under them, with the second and fourth in a `fit-content(40%)` column, and greys cells after the first (`styles.css`, the list's compact rules). For the Events that would put the long record name in the narrow column and the short date in the wide one, so the Events gets its own compact rules (and its own wide grid, `is-events`, beside `is-places`): the event and its date on the first line, the record and the place on the second, the date and the place in the narrow column. The place may truncate at its 40 %, and the wide grid's date column keeps a minimum width. The cell order of the grid stays Event, Record, Date, Place.

### D7. No actions

The row of kind buttons holds the five kinds and the search. Nothing in the kind writes to the file, a note or the vault.

## Risks / Trade-offs

- A file with a hundred thousand events: the rows are built once per index and the window is virtual; the first build is one pass over the index, the cost of the places', and it calls `index.person()` and `index.family()` for every record, which are not cached upstream and each build a full record; that cost is the index's and not this change's. The id lookup builds one record, never the rows (D2).
- The id counts within a tag (D2), so an insertion of the same tag above an event shifts what an old id names.
- A selected event is kept while the cursor stays in its record (D3), so a cursor moved to another event of that record in Source does not change the selection until it leaves the record.
- Five kind buttons are tighter on a phone than four. The row of kinds keeps its wrapping rule; the browser spec checks 390 px with no sideways scroll.
- `SortKey` gains `event`, `record` and `date`, next to the Places' `events` column key; the names are close and a test per kind covers the columns.

## Migration Plan

None. The saved list state accepts `events` as a kind (`LIST_KINDS`, `readListState`, `canonical` all iterate it); a state without it reads as before. A saved selection that is an event id is dropped at load when the file does not name it, as a place's is.

## Implementation

- `ListKind` gains `events`; `SortKey` gains `event`, `record` and `date` and reuses `place`; `PageKind` gains `event`; `ListRow` gains `EventRow`.
- The stand-in tab of the harness already takes an `events` option and `curieWithEvents()`; its selections are ids, so the specs mark and read event rows by their id; the desk harness's `exists` asks `pageKind`, so Back and Forward reach events and places.
