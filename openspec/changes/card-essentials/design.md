## Context

A person's card is drawn by `renderPersonPage` (`src/desk/personPage.ts`): heading, facts, other names, family, media, then two folds, *Timeline* (`renderTimeline`) and *Places* (`renderPlaces`), and then the Evidence section (`renderEvidenceSection`, `src/desk/evidence.ts`). The facts of a person and of a family are drawn by `renderFactList` through `renderEventRow` (`src/desk/factRow.ts`), whose last cell is a mark: `has-source` with the count, or `no-source`. The Evidence section of an event card draws the sources of the event, then a `Whole record` subsection with the sources of the record and the notes that link to it.

`placesOf` (`src/desk/timeline.ts`) builds the places from the timeline's entries and is used only by the Places fold.

## Decisions

### D1. The Places section is deleted, with what only it used

`renderPlaces`, `placesOf`, `PlaceEntry`, the fold with id `places`, the `desk.places` heading and `places.empty`, and the `gedcom-desk-place`, `-place-name`, `-place-events` and `-place-count` rules that drew its rows go; `gedcom-desk-place-occurrences`, used by the card of a place, stays. `places.count`, `placeRows.ts`, `renderPlacePage` and the list's Places kind stay: the card of a place and the list read the whole file, not a person's timeline. A place is already a link in a fact (`renderEventDetail`) and in a timeline entry; nothing is lost that a reader could not reach.

Rejected: keeping the section unfolded under the timeline (still a second copy); merging the places into the timeline entries (they already show them).

### D2. A mark only where sources exist

`renderEventRow` draws the count when `citations > 0` and nothing otherwise. The place card and the family card use the same row, so the rule holds there too. The `no-source` class, its outlined rule and the `desk.noSource` string are deleted; the `has-source` mark is kept as it is.

### D3. One line above the facts

`renderFactList` counts the facts without a citation and, where the count is not zero, draws one line before the list (`gedcom-desk-unsourced`, muted text colour, the size of the card's secondary text):

`desk.unsourced`, one string with the count of facts without a source and the total — en *Facts without a source: {count} of {total}*; ru *Фактов без источника: {count} из {total}*. No noun follows a numeral, so no plural form is needed in either language, and a single fact reads *1 of 1*.

The total is the number of facts the card lists: for a person, the facts of the record and the events of the families they are a spouse of, so a marriage is counted on the person's card and again on the family's. A fact whose record has no identifier, drawn with a name that does not act, is counted like the others.

The line is not a heading and not a control. It is drawn for a person and for a family, which share `renderFactList`; a place card lists events of many records and gets none. A card with no facts keeps its *No facts* line and draws no summary. The colour is a theme variable (`--text-muted`), as the rest of the card's secondary text; no orange.


### D4. The event card's Evidence

`renderEvidenceSection` for an event draws *Sources of this fact* with the citations of the event, or the notice *No source of its own* with a line under it, and stops. The `Whole record` subsection (`gedcom-desk-scope`), `evidence.recordSources` for an event, `renderNotes` for an event and the branch that read `ofRecord` for it are deleted for the event case, and `recordCard.ts` no longer hands the notes to the Evidence section of an event card; the vault is still asked as before, since the card of the record needs the answer. The notice's second line is a new key `evidence.recordOnItsCard` replacing `evidence.belowBelong` — en *The sources of the whole record are on its card.* — where the record cites sources, and `evidence.recordNone` where it cites none, as now. A person's, a family's, a source's and a media card draw their Evidence as before.

The notes were part of the *Whole record* group, so they leave the event card with it; they are on the card of the record one link above. This is a consequence of the decision rather than a separate one, and is open to review.

### D5. What is left alone

The order of the remaining sections; the timeline and what it lists, folded as now; the `desk.wholeRecord` string, which the source card still uses for where a citation sits; the list's two scenarios that pressed a place on a person's card, which now press it in an entry of the timeline.

## Risks

- A person's card where every fact cites a source shows no line at all; a researcher who wants "how many facts have sources" sees it only when something is missing. Accepted: the absence of the line is the good state.
- An event card no longer shows that the record has sources; the notice says so only for an event with none of its own. A reader looking for the sources of the record goes to its card by the link at the top.

## Open for review

The wording of the line (D3), the notice's second line, and that the notes leave the event card (D4).
