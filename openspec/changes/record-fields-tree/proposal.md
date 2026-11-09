## Why

A researcher who wants to see what a record says reads it today through sections the plugin invented: names, events, details, notes, related people, identifiers, other data. The sections are a curated retelling of the file, and a line that the file writes in one place appears in another, under a name of the plugin's. A reader who does not know GEDCOM cannot tell how a card relates to the file, and the next step the project wants — editing a record through forms — needs a view in which every line is one place, in the order the file has it.

## What Changes

The user's requirement, in their words and by date:

- 2026-11-09: «этот вид должен стать основным», then «полносью заменить» — the tree of fields from the mock replaces the card's retelling sections, it is not an option beside them.
- 2026-11-09: «убери разделы Основное, События и прочее — элементы должны идти в том порядке, что заданы в gedcom» — no grouping; the file's order.
- 2026-11-09: «если на экране много элементов управления, то стоит их показывать только по наведению, чтобы не мельтешили».
- 2026-11-09: «пока не делаем перетаскивание», and, before it, «для начала сделаем поля не редактируемыми — просто отображение» — this step only reads.

The proposed scope:

- The card of a person, a family and a source shows, below its heading, one **tree of the lines of the record**, in the file's order, nested as the file nests them. The sections it replaces are removed: names, events, details, notes, related people, identifiers and record information, other data, and the family card's list of events.
- A row is a label and a value, in the reader's language. A line with substructures is a node, closed when the card is first drawn, with a one-line summary (an event shows its value, date and place); the reader's choice is kept for each record while the plugin is loaded.
- Tags are hidden, as the product principles ask, and a control shows them.
- The controls of a row and of the tree appear on hover and on keyboard focus; on a touch device those of a row appear on the row last pressed.
- A line that is an event or an attribute opens its event card from its label, and a place opens the card of the place, as they do on the card today.
- What the card computes from the whole file stays as it is: the heading, the family section (parents, siblings, spouses with their events, children), the pictures, the timeline, the evidence, and the spouses and children of a family card.
- The card's event, place and media pages keep their own forms.

**This repository or upstream.** The change is entirely in this repository: it reads `RecordLine`, which the published packages already give. Nothing waits on a release of `@domorium/*`. Moving a line, which the user asked for and deferred, will need an operation upstream; the issue is drafted when that step is taken.

## Capabilities

### New Capabilities

- `genealogy-record-tree`: the tree of the lines of a record, its rows, summaries, tags, controls, narrow-panel behaviour and words.

### Modified Capabilities

- `genealogy-record-card`: the person, family and source cards, *Show in source*, the narrow panel, the controls, and the event row, as they change for the tree.
- `genealogy-record-detail`: what the card leaves out, headings and counts, notes, a value as a field, the related people and other data of an event; the sections of names, identifiers and record information, and the person's events and details are removed.

## Non-goals

- Editing, adding, removing and reordering lines. They follow on this view; reordering needs a new operation upstream.
- A tree for the event, place and media pages, which are computed pages and keep their form.
- Grouping or sorting lines, or hiding a kind of line.
- Showing level numbers or cross-reference identifiers.
- A tree beside the old sections as an option. The old sections go.
- A changed list, graph or timeline.

## Impact

- `src/desk/personPage.ts`, `familyPage.ts`, `sourcePage.ts`: the retelling sections are replaced by the tree; the family and evidence sections stay.
- `src/desk/detail/`: a new tree renderer; `names.ts`, `notes.ts` (for records), `related.ts` (for records), `recordInfo.ts`, `otherData.ts` (for records) and `claims.ts` lose their person and family callers. The event card keeps what it uses.
- `src/desk/factRow.ts` (the event row): a person's and a family's own events are no longer rows; the family section and the place card keep it. `src/desk/detail/claims.ts` shrinks to the tag lists the event card still reads.
- `src/desk/recordCard.ts`: the tree's session choices (tags, open nodes) and the controls.
- `src/i18n/en.json`, `src/i18n/ru.json`, `styles.css`, `harness/desk.ts`, `tests/desk.spec.ts`, `README.md`.
- Specs: new `genealogy-record-tree`; deltas to `genealogy-record-card` and `genealogy-record-detail`. The later change `edit-person-names-in-card`, not yet in the repository, modifies "The names of a person", which this change removes; it is rewritten on this tree and is not archived as it stands.
