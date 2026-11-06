## Why

A design critique of the five cards in the right panel (person, family, source, place, event) scored them 25/40. Two problems are plain defects: the controls are small and have no visible keyboard focus, and some text is too faint to read. Two are the card's own structure: the event card, which exists to answer "how do we know?", leads with a generic title and a 12-pixel date and repeats itself in its Evidence section; and the same event is drawn three different ways across the cards. A fifth is length: the person card is seven sections and dozens of controls, with two sections that repeat what is above them.

## The user's decision (2026-11-06)

In Russian, after the critique `/impeccable` of the cards: «проведи ревью карточек персоны, события, семьи, места и источника которые в правой панели представлены». Asked what to take first and how much, the user chose **focus and touch** first and **P1 and P2**, then said «делай все сразу». Recorded as given. The details of each fix are the author's proposal on that brief and are open to review.

## What Changes

- **Controls are easy to hit.** On a touch device or in the mobile app, every control of a card has an activation area at least 44 pixels tall, without the text getting bigger; Back and Forward are 44 by 44.
- **Keyboard focus is visible.** Every control of a card shows a focus ring in the accent colour when reached by keyboard. The picture on a media card, which was clickable by pointer only, becomes a button.
- **Text is readable.** Section headings and the secondary text of a card use the muted text colour, not the faint one. The *No source* mark is a neutral outlined mark, not an orange one, since a fact without a source is the normal state of a family tree; the missing-source notice keeps its warning background and its title is set in the normal text colour.
- **The event card leads with the event.** The record the event belongs to is a link above the title, labelled *Person* or *Family*; the title is the name of the event and its text; under it come the date and the place, the place as a link. The labelled detail rows (*Record*, *Date*, *Place*) go.
- **The Evidence of an event does not repeat the card.** On an event card the Evidence section has no head repeating the name and the detail of the event, no second *Show in source* and no *Whole record* link beside the record link; it holds what the event rests on and what the whole record rests on.
- **An event is one row wherever a card lists it.** The facts of a person and of a family, and the events at a place on the card of a place, share one row: the name of the event, which opens its card; its date, place and text; the number of sources it cites. On a place's card the row also links the record. The timeline keeps its own form.
- **The person card folds what repeats.** The *Timeline* and the *Places* sections are folded under their headings, each heading showing how many it holds, closed on opening a card; *Other names* stays open. A section the reader opens stays open while the card shows the same record, including across a redraw from the file changing.
- **A person's card keeps its sections and their order**; the family, source, place and media cards keep theirs.

Repository or upstream: **this repository only.**

Order of work: `places-list` and `events-list` are archived by their own PR (#233), and this change restates the event card and the person card as they stand after it.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `genealogy-record-card`: the person card (folded sections), the event card (its heading), and the scenario of a tab selecting a fact and going back; added requirements for the controls of a card and for the one event row.
- `genealogy-evidence`: the Evidence section on an event card.
- `genealogy-list`: the scenario *A family pressed in the card of a place*, since the name in a row on a place's card now opens the event and the record is a link of its own.

## Non-goals

- A hierarchy of places, and a place that is more than its name.
- A count of unsourced facts, or any grading of evidence beyond what the card already shows.
- Merging *Places* into the facts of a person's card; the section stays, folded.
- Keyboard shortcuts between facts or cards.
- Changes to the list, the graph, the timeline mode, or what the file stores.
- Raising `minAppVersion`.

## Impact

- **Cards**: `src/desk/eventPage.ts`, `src/desk/evidence.ts`, `src/desk/personPage.ts`, `src/desk/familyPage.ts`, `src/desk/placePage.ts`, `src/desk/mediaPage.ts`, `src/desk/recordCard.ts` (the folds' state), new `src/desk/factRow.ts`, `src/desk/eventDetail.ts`, and their tests beside them.
- **Styles**: `styles.css` (the controls, focus, contrast, the event card, the fold).
- **Strings**: `src/i18n/en.json`, `src/i18n/ru.json` (*Person*, *Family* above the event title; the three detail labels go).
- **List**: no code; one scenario of `openspec/specs/genealogy-list`.
- **Specs and documents**: `tests/desk.spec.ts`, `README.md` where it describes the cards.
- **Dependencies and `minAppVersion`**: none changed.
