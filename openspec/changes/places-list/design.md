## Context

The List mode shows the people, the families and the sources of a file as rows (`src/desk/listRows.ts`, `src/desk/fileList.ts`). Each kind is a set of columns, a way to filter, a default order and a sort value per column. A place is not a record, so the rows of the Places have no xref, and a click cannot select a record.

## Decisions

### D1. The rows are built from the index, once per index

`placesOf(index)` walks the events of every person and family, takes the place of each event that has one and groups them by `placeKey`: trim, collapse white space, NFC, lowercase. A row is the place's name as first written in the file, the number of events, and the first and last year over the dated events. The rows are memoised per index in a `WeakMap`, so a search or a sort never walks the file again.

### D2. Order, sort and search

Without a sort the rows are alphabetical by the language's collator. A column sorts through the shared stable order (`listOrder.ts`): ties keep the order in which the file first names the places, a missing value comes last in both directions. Years sort by the first year of the first dated event. The search narrows by name with `foldText`: NFD without marks, lowercase, and the table `ł ß ø đ æ œ ı`.

### D3. The marked place is list-local

A click or Enter on a row sets `ListState.place` to the place's key and nothing else: no record is selected, the host is told only that the list's state changed. The key is saved with the list's kind and sorts, dropped when the kind changes and when the file no longer holds the place. A record selected elsewhere leaves the list on the Places.

### D4. The compact sort menu

On a narrow tab the sort is a menu. Its empty choice on the Places reads *Alphabetical* in place of *File order*, since that is what it returns to.

### D5. No actions, no coordinates

The row of kind buttons holds the four kinds and the search. The Places has no Coordinates column and no mark for a place without coordinates.

## Risks / Trade-offs

- Two spellings of one place that differ in accents are two places. That is the key's rule, and the plugin does not guess further.

## Migration Plan

None. The saved list state gains an optional `place`; a state without it reads as before.
