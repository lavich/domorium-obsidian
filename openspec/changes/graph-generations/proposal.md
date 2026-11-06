## Why

In the graph of `demo-vault/2020.11.08.ged` Mikhail Bessolov stands in the top row beside Naum Lobanov, though Mikhail's daughter Fekla stands two rows below and Pyotr Lobanov, Mikhail's age-mate, one row below Naum. A person with no parents in the file is placed in the first row, whatever their children's row. The same graph draws a line from Mikhail to Fekla across a line from Pyotr to his son Vasily, because Fekla stands between Vasily and Vasily's brother Ivan, and her father's line has to pass under the arch of Pyotr's two lines.

## The user's decisions (2026-11-06)

In Russian, in turn: «Михаил Бессонов скорее всего не ровесник Наума Николая, но стоят они на одной горизонтали»; «стоит ли детей одной семьи ставить в один ряд или сдвинуть их относительно друг друга по вертикали в зависимости от года рождения?» and, to the advice given, «да, согласен». The advice was: keep the children of one family in one row; lower a person with no parents to the row above their children; let a couple stand on either side of the brothers and sisters of its spouses; order brothers and sisters by birth as a soft preference. Recorded as given.

## What Changes

- **A person with no parents is lowered to the row above their children.** In place of the first row, a person with no parents in the file, and no spouse standing below them, stands one row above the highest-standing of their children, and in the first row only where they have none. Mikhail stands beside Pyotr, not Naum. A person married into a family still takes their spouse's row.
- **The timeline's rows follow.** The generation a person is given is shared by the graph and the timeline, so the order of the timeline's rows follows it. For `curie.ged` nothing moves.
- **Children of one family stay in one row.** No card is moved up or down for a year of birth.
- **A couple may stand on either side of the brothers and sisters of its spouses.** A couple is one block, husband left of wife; the search for a row's order may now move that block past a brother or a sister of one of its two members where that crosses fewer lines, which the swap of two neighbours it has now cannot always find.
- **Brothers and sisters stand eldest first, as a soft preference.** Wherever two orders cross as many lines, the elder stands to the left. It never costs a crossing.

Repository or upstream: **this repository only.** The read model's `generations` is the one thing both views read; the parser and the language service are untouched.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `genealogy-file-graph`: the generation a card stands in, the movement of a couple in the search for an order, and the preference for the eldest at the left.
- `genealogy-file-timeline`: the rule that gives a person without parents their generation, which orders the rows.

## Non-goals

- Moving the cards of one family up or down for their years of birth, or scaling the graph to a time axis: that is the timeline.
- Deriving a row from dates for a person whose children are not in the file; a person with no children in the file stays in the first row, as now.
- A guarantee of the fewest crossings: the order is still found within the time budget the requirement on size gives it.
- Changing how the timeline draws a row, or any other of its requirements.
- Raising `minAppVersion`.

## Impact

- `src/desk/fileTimeline.ts` (`generationsOf`), `src/desk/fileGraph.ts` (`makeUnits`, `transpose`, `reduceCrossings`, and the order of siblings), their tests `src/desk/fileTimeline.test.ts` and `src/desk/fileGraph.test.ts`, `src/desk/fileTimelineView.test.ts` where a count of rows or an order depends on a generation, and `tests/fileGraph.spec.ts`.
- `demo-vault/2020.11.08.ged` is the real-data check and is not committed; the committed fixtures are small generated documents.
- `README.md` is read for a sentence on generations.
