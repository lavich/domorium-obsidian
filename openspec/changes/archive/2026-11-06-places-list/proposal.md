## Why

A family file is full of places — a birth in Warsaw, an education in Paris, a Nobel Prize in Stockholm — and the plugin shows them only inside a person's or a family's card and as the place column of the people and the families. A reader cannot see which places a file names, how many events happen at each, or in which years. The List mode already reads the file as rows of people, families and sources; a fourth kind, the places of the file, answers those questions with the machinery the list has: search, sort, keyboard, a phone layout.

## The user's decision (2026-11-06)

In Russian: «давай пока что удалим карту, но оставим таблицу Places». Recorded as given; it is not open. The map is taken out for now, the Places table of the List view stays. Issue #215 (map view) stays open for later.

## History

The map was planned and implemented on 2026-11-05 under the change `map-view`. Its decisions were: coordinates only from `PLAC > MAP > LATI/LONG` in the file; no geocoder, so no place name leaves the vault; an outline of the world bundled with the plugin and tiles only by a setting that is off by default; a point is a place, sized by its events and coloured by their kind; labels with the years; a collapsed years-range chip; routes of moves for a selected person or family. During that work the user moved the list of places into the List as a kind, and then asked that all data come from the GEDCOM file alone, so the places table note was removed. On 2026-11-06 the user asked to take the map out and keep the Places table. The full work, the map included, is in the local branch `lavich/map-view-backup`. Issue #215 remains open.

## What Changes

- **A fourth kind in the List, Places.** The kind buttons read People, Families, Sources, Places. The rows are the places of the file, with the columns **Place**, **Events** and **Years**.
- **One place per spelling.** Spellings that agree after case folding and collapsing white space are one place, named as first written in the file.
- **Order.** Alphabetical by the collator of the plugin's language until a column is chosen; each column sorts with the list's three-press cycle and ties keep the file's order.
- **Search.** The list's expanding search narrows the places by name, ignoring case and marks on letters, with the small table `ł`→`l`, `ß`→`ss`, `ø`→`o`, `đ`→`d`, `æ`→`ae`, `œ`→`oe`, `ı`→`i`.
- **A place is selected like a record.** A click or Enter on a row selects the place (`place:<key>`, an id no xref can have), marks its row and shows its card in the right panel: the name, the events and years, and every event of that place linking to the person or family it belongs to. The Places section of a person's card links each place to this row, and a place selected from a card switches the list to Places and brings its row into view. The selection is the tab's, so history, Back and Forward and the restart carry it; the list no longer keeps a marked place of its own.
- **The same list machinery.** Virtual window, keyboard, ARIA grid, and the phone and narrow-tab layout.
- **No coordinates, no actions.** The Places has no Coordinates column, no mark for a place without coordinates, and no action buttons.

Repository or upstream: **this repository only.** The read model is not touched; a place is the text of an event's `PLAC`, as everywhere in the plugin.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `genealogy-list`: a fourth kind, **Places**, its rows, search, sorts and marked row; the requirements that name three kinds, the kept state, the search, the sort, the selected row, the row brought into view and the keyboard are restated with it.

## Non-goals

- A map, in any form, and anything only a map uses: coordinates, tiles, an outline, a geocoder.
- A Coordinates column or a mark for places without coordinates.
- Action buttons on the Places, and any note, table or file the plugin creates or writes for places.
- A place selecting a record, or a place index across several files.
- Splitting a place into jurisdictions or reading `HEAD.PLAC.FORM`; a place is the text the file writes.
- Raising `minAppVersion`.

## Impact

- **List**: `src/desk/listRows.ts` (the kind, its columns, `ListState.place`), `src/desk/listOrder.ts` (the stable order, extracted so the places share it), new `src/desk/placeRows.ts`, `src/desk/fileList.ts` (the kind, the local selection), and their tests beside them.
- **Strings**: `src/i18n/en.json`, `src/i18n/ru.json`.
- **Styles**: `styles.css` (the Places grid).
- **Specs and documents**: `tests/fileList.spec.ts`, `README.md`, `demo-vault/Start here.md`.
- **Dependencies and `minAppVersion`**: none changed.
