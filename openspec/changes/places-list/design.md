## Context

The List mode shows the people, the families and the sources of a file as rows (`src/desk/listRows.ts`, `src/desk/fileList.ts`). Each kind is a set of columns, a way to filter, a default order and a sort value per column. A place is not a record, so the rows of the Places have no xref, and a click cannot select a record.

## Decisions

### D1. The rows are built from the index, once per index

`placesOf(index)` walks the events of every person and family, takes the place of each event that has one and groups them by `placeKey`: trim, collapse white space, NFC, lowercase. A row is the place's name as first written in the file, the number of events, and the first and last year over the dated events. The rows are memoised per index in a `WeakMap`, so a search or a sort never walks the file again.

### D2. Order, sort and search

Without a sort the rows are alphabetical by the language's collator. A column sorts through the shared stable order (`listOrder.ts`): ties keep the order in which the file first names the places, a missing value comes last in both directions. Years sort by the first year of the first dated event. The search narrows by name with `foldText`: NFD without marks, lowercase, and the table `ł ß ø đ æ œ ı`.

### D3. A place is selected as a record is

A place has no xref, so its id is `place:` plus its key; GEDCOM identifiers cannot hold a colon, so no record can collide with it. `pageKind` answers `place` for an id the file names, which gives it a card, a step in the history, a place in the saved selection, and its drop when an edit removes the last event of that place. A click or Enter on a row calls the host's `select` with that id; the row is marked from the tab's selection, so `ListState` keeps no place. A place selected from a card switches the list to Places and scrolls its row into view; a record selected while the list is on Places leaves the list there and unmarks the rows.

### D4. The compact sort menu

On a narrow tab the sort is a menu. Its empty choice on the Places reads *Alphabetical* in place of *File order*, since that is what it returns to.

### D5. No actions, no coordinates

The row of kind buttons holds the four kinds and the search. The Places has no Coordinates column and no mark for a place without coordinates.

## Risks / Trade-offs

- Two spellings of one place that differ in accents are two places. That is the key's rule, and the plugin does not guess further.

## Migration Plan

None. The saved list state gains an optional `place`; a state without it reads as before.

## Implementation

- The list's header holds four cells for every kind; the Places has three columns, so the fourth cell is hidden there.
- `placeKey` and `foldText` stay private to `src/desk/placeRows.ts`; nothing else uses them.
- The stand-in tab of the harness takes an `events` option, which mounts `curieWithEvents()`, the file with the places the specs need, and its `changed` keeps the tab's memory as the real tab does, so a marked place survives a visit to another mode.
