## Why

A family file is mostly events — births, marriages, deaths, residences, occupations, awards — and the plugin shows them only inside a person's or a family's card, one record at a time, and on the timeline of one record. A reader cannot see all the events of a file in one table, sort them by date or place, or find every event that names a town. The List already reads the file as rows of people, families, sources and places; a fifth kind, the events of the file, answers those questions with the machinery the list has: search, sort, keyboard, a phone layout.

## The user's decision (2026-11-06)

In Russian: «я так же хочу чтобы была таблица Events», then, declining questions: «Events по образцу Places, как ещё один вид списка, через OpenSpec-изменение». Recorded as given. On review the user chose, from two options, that the Event column reads **the name and the text the event carries**. Having then seen a click that selected the record and unfolded its event in the record's card, the user said, in Russian: «должна открываться картчока события», and chose **a card of its own for the event**, as a place has. That replaces the first choice, which was the record with its event unfolded. The columns and the search are the author's proposal on that brief and are open to review.

## What Changes

- **A fifth kind in the List, Events.** The kind buttons read People, Families, Sources, Places, Events. A row is one event stated on a person or a family, with the columns **Event** (`Occupation · Physicist`), **Record**, **Date** and **Place**. Attributes such as an occupation are listed too; the card calls them facts.
- **Every event, once.** Dated or not, placed or not; the order is the file's. A custom event (`EVEN`, `FACT`) is named by its type, as the card names it.
- **Search.** The list's expanding search narrows the events by event name, record name, date, place and the text the event carries, ignoring case and marks on letters, with the table the Places search uses.
- **Sort.** Each column sorts with the list's three-press cycle; Date by its first year; a missing value comes last in both directions; ties keep the file's order.
- **An event is selected like a place.** A click or Enter on a row selects the event (`event:<xref>:<TAG>:<n>`, the record, the tag of the event and its place among the events of that tag on the record, so that an event of another tag inserted or removed does not move it), marks its row only and shows the **event card** in the right panel: the name and the text of the event, its record, date, place and sources, each a link, and *Show in source*. The selection is the tab's, so history, Back and Forward and the restart carry it, an edit that removes the event drops it, and *Show in source* moves to its lines without losing it: while the cursor is in the record of the selected event, the event stays selected, in Source mode and on leaving it.
- **Records elsewhere leave the list alone, but a click in the card follows.** On the Events, as on the Places, selecting a record or a source from a link, the graph, the timeline or the cursor neither switches the kind nor marks a row; a place switches the list to the Places and an event to the Events. A record chosen in the record card, a person on the card of a place or of an event, for one, switches the list to its kind and marks its row. The user asked for this on the card of a place; it is applied to every selection made in a card, the event card's record link included, as one rule.
- **One correction to the Places text.** The restated *keyboard* requirement fixes the scenario *Enter on a place*, which still said that no record is selected; the card shows the place, as the merged code does.
- **The same list machinery.** Virtual window, keyboard, ARIA grid, and the phone and narrow-tab layout.
- **Read-only.** No actions, and nothing written to the file, a note or the vault.

Repository or upstream: **this repository only.** The read model already carries the events of a person and a family (`PersonEvent`); it is not touched.

Order of work: `places-list` is merged but not yet archived, and this change restates the requirements it modifies. Archive `places-list` first, so that the main `genealogy-list` spec holds the text this delta replaces.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `genealogy-record-card`: an **event card** is added. A requirement is added for the selection to survive the cursor staying in the record of the event. The requirement that a tab holds one selected record, which names a person, a family, a source or a multimedia record, is left as it stands, as `places-list` left it for a place; that gap is recorded in `design.md`.
- `genealogy-list`: a fifth kind, **Events**, its rows, search, sorts, selection and card; the card is described in `genealogy-record-card`; in `genealogy-list` every requirement that names the kinds of the list is restated with it: the list itself, the kinds, the search, the sort, the selected row, the row brought into view, the keyboard and the Places' no-actions rule.

## Non-goals

- A map, a timeline or a chart of the events; the timeline mode stays as it is.
- Grouping events by record, year or place, and any column beyond the four.
- Action buttons on the Events, and any note, table or file the plugin creates or writes for events.
- Links from a person's or a family's card, or from a place's card, to an event card, and an event index across several files.
- Editing an event, or its sources, from the list.
- Raising `minAppVersion`.

## Impact

- **List**: `src/desk/listRows.ts` (the kind, its columns, `recordKind`), new `src/desk/eventRows.ts`, `src/desk/fileList.ts` (the kind, the row id, the selection), their tests beside them.
- **Card**: new `src/desk/eventPage.ts`, `src/desk/recordCard.ts` (its own `pageKind`, `recordName` and the branch that draws it), `src/desk/deskState.ts` (the `event` page kind and the lines *Show in source* moves to), `src/desk/tabModes.ts` and `src/desk/followRules.ts` (the cursor in the record of the event keeps the event), `styles.css` (the card).
- **Strings**: `src/i18n/en.json`, `src/i18n/ru.json`.
- **Styles**: `styles.css` (the Events grid).
- **Specs and documents**: `tests/fileList.spec.ts`, `README.md`, `demo-vault/Start here.md`.
- **Dependencies and `minAppVersion`**: none changed.
