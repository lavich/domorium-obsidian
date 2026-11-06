## Why

The cards in the right panel say the same thing several times. A person's own events are on the card as facts, again as the timeline, and a third time as the places of the timeline; each fact carries a mark of how many sources it cites, and in a researched tree most facts cite none, so the mark *No source* is repeated down the list until it stops being read; and the card of an event, which exists to answer "how do we know this?", repeats under *Whole record* the sources and the notes that are one link away on the card of the record. Principle 3 of the product, *every claim shows what it rests on*, is served better by one clear signal than by a mark on every row.

## The user's decision (2026-11-06)

In Russian, after an audit of the right panel: «мне надо разобраться в том что и как там отображается, что нужно, а что удалить». After a read of what each card shows and what repeats, the user decided, asked one by one:

- the *Places* block of a person's card, which lists the places of the timeline with their events: **remove** («Убрать»);
- the events of relatives in the person's timeline (a parent's death, a child's birth, a grandchild's birth, within the person's years): **leave, folded** («Оставить свёрнутой»);
- the *No source* mark on every fact row: **one summary instead of marks** («Одна сводка вместо чипов»), described as showing «N источников» only where there are some, and the lack of sources as one line above the list;
- the *Whole record* subsection on the card of an event, which repeats the sources of the record's owner: **remove** («Убрать»).

Also, on the question of the overlap with the *Non-goals* of the archived `desk-card-polish` (*a count of unsourced facts*, *Places stays, folded*): «Да, новое решение заменяет старые non-goals». Recorded as given. The wording of the summary line and the handling of the notes on an event card are the author's proposal on that brief and are open to review.

## What Changes

- **A person's card has no *Places* section.** The place stays a link in every fact and every entry of the timeline, and the card of a place stays. The list's *Places* kind is untouched.
- **A fact row marks only what is there.** A fact that cites sources shows how many, as now. A fact that cites none shows no mark. The *No source* mark and its outlined style go.
- **One line says what is missing.** Above the facts of a person and of a family: *Facts without a source: 3 of 4*; the line is left out where every fact cites a source. It is set in the muted text colour, not in a warning one.
- **The card of an event holds the event's sources and nothing of the record's.** The *Whole record* subsection goes, with the record's sources and the notes that link to the record, which stay on the card of the record one link above. A fact without a source of its own says so, and says that the sources of the whole record are on the card of the record, or that the record cites nothing either.
- **The timeline of a person stays**, folded, with the same entries.

Repository or upstream: **this repository only.**

Order of work: `desk-card-polish` is archived (#240); this change restates the requirements it added, as they stand in `openspec/specs` now. It overlaps no open change: `graph-surname-colour` and `timeline-named-bars` are about the graph and the timeline mode.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `genealogy-record-card`: the person card (no places, the summary line, marks only where sources exist), the family card (the same line), the event card (no whole record), the event row (a mark only where it cites sources), the controls (the colour of the line); removed: *The places of a person*.
- `genealogy-evidence`: *Sources of the fact, then of the whole record* renamed *Sources of the fact* and restated; the family card section; the notes, which an event card does not list; the Evidence section that closes a card.
- `genealogy-list`: two scenarios that pressed a place in the *Places* section of a person's card now press it in an entry of the timeline.

## Non-goals

- Changing what the timeline lists, or the entries of relatives in it.
- Showing the sources of the whole record on an event card by any other means.
- A grade of evidence, a share of sourced facts as a bar or a percentage, or a per-person score.
- The notes, the age, the cause and the other fields of an event the card does not read today.
- The list, the graph, the timeline mode, the place card, the source card, the media card, and what the file stores.
- Raising `minAppVersion`.

## Impact

- **Cards**: `src/desk/personPage.ts`, `src/desk/factRow.ts`, `src/desk/timelineView.ts`, `src/desk/timeline.ts`, `src/desk/evidence.ts`, and their tests beside them.
- **Styles**: `styles.css` (the *No source* mark, the place section rules, the whole-record subsection, the new line).
- **Strings**: `src/i18n/en.json`, `src/i18n/ru.json` (the line for facts without a source; the text of the notice on an event with no source of its own; the *No source* mark, the *Places* heading and its empty state go).
- **Tests and documents**: `tests/desk.spec.ts`, `tests/theme.spec.ts`, `README.md` where it describes the cards.
- **Dependencies and `minAppVersion`**: none changed.
