## Why

A family file is mostly events — births, marriages, deaths, residences, occupations, awards — and the plugin shows them only inside a person's or a family's card, one record at a time, and on the timeline of one record. A reader cannot see all the events of a file in one table, sort them by date or place, or find every event that names a town. The List already reads the file as rows of people, families, sources and places; a fifth kind, the events of the file, answers those questions with the machinery the list has: search, sort, keyboard, a phone layout.

## The user's decision (2026-11-06)

In Russian: «я так же хочу чтобы была таблица Events», then, declining questions: «Events по образцу Places, как ещё один вид списка, через OpenSpec-изменение». Recorded as given. On review the user chose, from two options: a click selects **the record and its event** (the card the plugin already has, with the event unfolded) rather than a new card for the event; and the Event column reads **the name and the text the event carries**. The columns and the search are the author's proposal on that brief and are open to review.

## What Changes

- **A fifth kind in the List, Events.** The kind buttons read People, Families, Sources, Places, Events. A row is one event stated on a person or a family, with the columns **Event** (`Occupation · Physicist`), **Record**, **Date** and **Place**. Attributes such as an occupation are listed too; the card calls them facts.
- **Every event, once.** Dated or not, placed or not; the order is the file's. A custom event (`EVEN`, `FACT`) is named by its type, as the card names it.
- **Search.** The list's expanding search narrows the events by event name, record name, date, place and the text the event carries, ignoring case and marks on letters, with the table the Places search uses.
- **Sort.** Each column sorts with the list's three-press cycle; Date by its first year; a missing value comes last in both directions; ties keep the file's order.
- **A click selects the record and the event.** A click or Enter on a row selects the person or the family and unfolds that event in the card the plugin already shows — with its sources and *Show in source* — as pressing the event in the card does. Only the row of that event is marked. The event is kept while its record stays selected and nothing selects a record anew; Back, Forward, a link and a restart return to the record with no event and no row marked.
- **Records elsewhere leave the list alone.** On the Events, as on the Places, selecting a record or a source elsewhere neither switches the kind nor marks a row; a place switches the list to the Places, as it does now.
- **One correction to the Places text.** The restated *keyboard* requirement fixes the scenario *Enter on a place*, which still said that no record is selected; the card shows the place, as the merged code does.
- **The same list machinery.** Virtual window, keyboard, ARIA grid, and the phone and narrow-tab layout.
- **Read-only.** No actions, and nothing written to the file, a note or the vault.

Repository or upstream: **this repository only.** The read model already carries the events of a person and a family (`PersonEvent`); it is not touched.

Order of work: `places-list` is merged but not yet archived, and this change restates two of the requirements it modifies. Archive `places-list` first, so that the main `genealogy-list` spec holds the text this delta replaces.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `genealogy-list`: a fifth kind, **Events**, its rows, search, sorts, selection and card; every requirement of the list that names its kinds is restated with it: the list itself, the kinds, the search, the sort, the selected row, the row brought into view, the keyboard and the Places' no-actions rule.

## Non-goals

- A map, a timeline or a chart of the events; the timeline mode stays as it is.
- Grouping events by record, year or place, and any column beyond the four.
- Action buttons on the Events, and any note, table or file the plugin creates or writes for events.
- Links from a person's or a family's card to the row of an event, and an event index across several files.
- Editing an event, or its sources, from the list.
- Raising `minAppVersion`.

## Impact

- **List**: `src/desk/listRows.ts` (the kind, its columns), new `src/desk/eventRows.ts`, `src/desk/fileList.ts` (the kind, the mark of an event, the activation), `src/desk/fileViews.ts` and `src/GedcomView.ts` (the host passes the selected event to the list and selects a record with an event), their tests beside them.
- **Card**: none; the card, the evidence block and *Show in source* are the ones that exist.
- **Strings**: `src/i18n/en.json`, `src/i18n/ru.json`.
- **Styles**: `styles.css` (the Events grid).
- **Specs and documents**: `tests/fileList.spec.ts`, `README.md`, `demo-vault/Start here.md`.
- **Dependencies and `minAppVersion`**: none changed.
