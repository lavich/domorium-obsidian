## Context

The List shows the people, the families, the sources and the places of a file as rows (`src/desk/listRows.ts`, `src/desk/fileList.ts`). A kind is a set of columns, a way to filter, a default order and a sort value per column. Places added the first kind whose rows are not records, with its own id (`place:<key>`) and card.

The events are already read: `PersonEvent` (`tag`, `date`, `place`, `value`, `type`, `range`, `citations`) on every person and family of the index (`src/genealogy/types.ts:14`). A tab also already selects an event inside a record: a `FactKey` (`p:<n>` for a person's own event, `f:<n>` for a family's, `src/desk/personPage.ts:22`, `src/desk/familyPage.ts`), held by `GedcomView.selectedFact` (`src/GedcomView.ts:121`), unfolded in the card with its evidence and *Show in source* (`shownRange`, `src/desk/deskState.ts:170`). The `n` is the index into the record's `events`. See `proposal.md` for the why.

## Decisions

### D1. A row is one event, built from the index once per index

`eventsOf(index)` walks the people and the families that have an xref, takes every event of each and yields rows `{ xref, fact, key, event }`, where `xref` is the record's, `fact` is `p:<n>` or `f:<n>`, and `key` is `${xref}|${fact}` — the key of the row in the list's position map. Rows are ordered by the event's `range.start` and memoised per index in a `WeakMap`, as the places are. The kind lists attributes (`OCCU` and the like) with the events, since they are `PersonEvent`s; the card's word for them is *Facts*, the kind's is *Events*, as the user asked.

Cells: the event's name (`eventName`), followed by ` · ` and `event.value` where it has one; the record's name (`personName` or `familyTitle`); the date as `date.text`; the place as written. Without the value, 22 of the 51 events of `curie.ged` would read the bare `Occupation`, and the five `EVEN` of type `Award` in `curieWithEvents()` would be five identical `Award`.

### D2. Selection reuses the fact selection; no new id, no new card

An event row selects the record and then the fact: the host gains `selectEvent(xref, fact)`, which does `selectRecord(xref, "card")` and then `selectFact(fact)` (`GedcomView.ts:497-503`; `selectRecord` clears the fact, so the order matters). The card, the evidence block and *Show in source* are the existing ones. `pageKind`, `recordCard.ts`, `deskState.ts`, `recordHistory` and the `genealogy-record-card` spec are not touched, and no id has to survive an edit: `FactKey` is already how the card names an event.

Alternative considered and declined by the user: an id `event:<xref>:<n>` with a card of its own, as places have. It needs a new page kind, a new card, the history and restore rules, and its position drifts when an earlier event is inserted.

What this costs: the fact is the view's state, not the tab's saved selection, so Back, Forward and a restart return to the record with no event and no row marked. The spec says so. An edit that removes the event is already handled where the fact is shown (`factByKey` finds nothing and the card shows the record).

### D3. The mark

`ListBoard.select(xref, reveal)` becomes `select(xref, fact, reveal)` (`fileViews.ts:73-89`, `GedcomView.markInViews`, which passes `selectedFact`). On the Events the marked row is the one whose `xref` and `fact` equal the selection; a record with no fact marks no row. `selectFact` also tells the list, so pressing an event in the card marks its row. Elsewhere the argument changes nothing.

The guard that keeps the Places when a record is selected elsewhere (`fileList.ts:233`) is written as a rule for both kinds: a record or a source selected while the list shows the Places or the Events leaves the list there; a place selected while it shows the Events switches it to the Places and brings the place's row into view (the card's place link keeps working).

### D4. Sites that must handle an event row

These compile unchanged and misbehave silently, so each is named in the tasks and gets a test: `fileList.ts` `keyOf` (:77), `markedKey` (:569), `place()` (:230), `activate()` (:647: an event row has an xref, but must call `selectEvent`), `totalOfKind` (:439) and the sort menu; `listRows.ts` `cellsOf` and `sortValue`, which fall through to the sources branch. `ListRow` gains `EventRow`; `recordKind` is unchanged, since an event has no id of its own.

### D5. Order, sort and search

Without a sort the rows are in the order the file writes the events. Event, Record and Place compare through the language's collator; Event compares its displayed text; Record compares a person as the People list does (surname, then given name) and a family by its title; Date compares the first year of the date. The shared stable order (`listOrder.ts`) keeps ties in file order and a missing value last. The search folds the query and the haystack with `foldText`, which moves from `placeRows.ts` (private today) to its own module both kinds import, and matches the event cell, the record's name, the date text and the place.

### D6. The grid and the phone

The header holds four cells for every kind and the Events has four columns, so none is hidden. The compact layout puts the first two cells on one line and the last two under them, with the second and fourth in a `fit-content(40%)` column, and greys cells after the first (`styles.css`, the list's compact rules). For the Events that would put the long place in the narrow column, so the Events gets its own compact rules: the event and its date on the first line, the record and the place on the second, the date and the place in the narrow column. The cell order of the grid stays Event, Record, Date, Place.

### D7. No actions

The row of kind buttons holds the five kinds and the search. Nothing in the kind writes to the file, a note or the vault.

## Risks / Trade-offs

- A file with a hundred thousand events: the rows are built once per index and the window is virtual; the first build is one pass over the index, the cost of the places'. No lookup by id is added, since the selection is `(xref, fact)`.
- Five kind buttons are tighter on a phone than four. The row of kinds keeps its wrapping rule; the browser spec checks 390 px with no sideways scroll.
- The event is lost on Back, Forward and a restart (D2). It is the price of reusing the card; it is stated in the spec.
- `SortKey` gains `event`, `record` and `date`, next to the Places' `events` column key; the names are close and a test per kind covers the columns.

## Migration Plan

None. The saved list state accepts `events` as a kind (`LIST_KINDS`, `readListState`, `canonical` all iterate it); a state without it reads as before.

## Implementation

- `ListKind` gains `events`; `SortKey` gains `event`, `record` and `date` and reuses `place`.
- The stand-in tab of the harness already takes an `events` option and `curieWithEvents()`; its host gains `selectEvent`, recorded as `calls.selectedEvent`.
