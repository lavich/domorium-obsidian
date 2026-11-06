## Context

`generationsOf` (`src/desk/fileTimeline.ts`) gives each person `max(generation of their parents) + 1`, a person with no parents 0, then moves spouses: a spouse with no parents takes the generation of the one they married, and two spouses with parents both take the lower of the two. Everyone lower than before moves their children down. The graph reads these as its rows (`layerOf`), and the timeline orders its rows by them.

The graph's order inside a row is found by `reduceCrossings`: units (a person, or a couple as one rigid block, husband first by `readsBetterIn`) are ordered by sweeps toward the rows above and below, then `transpose` swaps any two neighbouring units that cross fewer lines the other way, within `SWEEPS` and `TRANSPOSE_ROUNDS`. The initial order is `model.rows`.

Measured on `demo-vault/2020.11.08.ged` (111 people): 65 crossings at the start, 18 after 7 sweeps. Vasily `@I0064@` stands at x 988, his wife Fekla `@I0071@` at 1148 and his brother Ivan `@I0067@` at 1320; Mikhail `@I0072@`, Fekla's father, at x 983 in row 0 beside Naum `@I0000@` (1155), Pyotr `@I0005@` (1111) in row 1.

## Goals / Non-Goals

**Goals:**
- A person with no parents is no higher than one row above their children.
- The couple in the example stands where Fekla's father's line crosses nothing, and `curie.ged` and the committed fixtures are unchanged.
- Siblings stand eldest first wherever that costs no crossing.

**Non-Goals:**
- A different layering algorithm or a time-scaled axis.

## Decisions

### D1. The rule is on the roots only

After `generationsOf` has done what it does, a last pass takes each person with no parents who is not the lower-placed of a couple (not moved down by a spouse) and who has children: their generation becomes `min(generation of their children) − 1`, never below what they had. Only roots move, and a root moves down only, so nothing else's generation changes, and the pass is one sweep in descending order of the current generation, since a root's children are not roots. A root married to another root moves together, each taking the smaller of the two targets, as the couple rule already keeps them equal.

The advice the user agreed to said «на ряд выше своего самого низкого ребёнка»; a parent must stand above *every* child, so the rule takes the child that stands highest, which is the same for one child and the only one that keeps a line from running upward for two. This is a correction of that wording, not of the decision.

*Alternatives.* Placing by year of birth: rejected, Mikhail has no dates and most roots of real files have none. Lowering every ancestor, not only roots: not needed, an ancestor with parents already stands one below them.

### D2. A couple moves as a block in the order search

`transpose` swaps two neighbouring units, which for a couple next to a brother is already a block move; what it cannot do is a move over two or more units or a move that crosses more before it crosses fewer. A new step, after `transpose` and while the budget lasts, takes each unit that shares a parent family with another and tries it at every position among those siblings, keeping the position with the fewest crossings to the rows above and below (ties: keep). The count is `crossed` as it is today, so the step is `O(k²)` per family of `k` units, bounded by the budget. It needs a measurement before it is trusted: tasks 1.2 and 2.3 reproduce the example and count crossings on `demo-vault/2020.11.08.ged` and the committed fixtures, and the step ships only if it lowers the count on the first and raises it on none.

*Alternative.* Treating siblings as a group and permuting the group: rejected as `O(k!)`.

### D3. Siblings eldest first is a tie-break

Where two orders cross the same number of lines, `transpose` and the new step prefer the one that puts the sibling born earlier to the left; a missing year sorts last and ties keep the file's order. It is part of the comparison, not a constraint, so it never raises the crossings. The year is the year of the person's birth, christening or baptism as the timeline reads it (`lifeline.start` where it begins at one).

### D4. The timeline's order follows the generations

`model.rows` orders by generation (`orderOf` in `fileTimeline.ts`); a root lowered by D1 moves with its generation. In `curie.ged` every root's children stand in the next row, so nothing moves; a test pins that.

## Risks / Trade-offs

- [A root lowered below the top row loses its line's height: its children's line is now short, but a root with two children in different rows has one long line] → The rule uses the highest child, so no line runs upward.
- [The sibling move step costs time on a file with a very large family] → The step is bounded by the same time budget as the sweeps and skipped when the budget is gone; a test with one family of 200 children checks the time.
- [Another file reorders in a way that is worse] → The step ships only where the measurement on the committed fixtures and on the demo file lowers or keeps the count; otherwise the change keeps D1 and D3 and drops D2.

## Open Questions

- Whether D2 earns its place after D1 alone; D1 may remove the crossing in the example by itself. Task 2.3 decides on numbers.
