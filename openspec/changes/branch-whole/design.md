## Context

`FileTimeline.branch(focus, up, down)` walks parents `up` times and children `down` times and adds the spouses of everyone reached. `related(xref)` is the person with their parents, spouses and children. The graph (`scene.related`, `graphCanvas.highlight`) and the timeline (`highlight`, `drawArrows`, `drawCursor`) both light from `related`. The scope `{focus, up, down}` is persisted in the tab's state (`readBranchScope`, `deskState`) and is part of the graph layout cache key (`fileGraph.ts`).

## Decisions

- **One walk, no depth.** `branch(focus)` walks parents until none are left and children until none are left, with a visited set so that a file whose records loop through each other still finishes. It adds spouses as now. `related(xref)` goes: the light asks `branch(xref)`.
- **The scope is `{focus?}`.** `BranchScope` loses `up` and `down`; `BRANCH_STEPS`, the steppers, `clampTo` for them and the six `overview.*Ancestors/Descendants` keys go. `readBranchScope` ignores any `up` and `down` it finds, so a workspace saved before the change opens on the branch of its `focus`. `sameBranch` compares `focus` alone; the layout cache key is the focus.
- **The light in the graph.** Cards: every person of the branch (every copy, as now). Lines and family nodes are lit by a predicate on the item, not by a count: a line (`people` = child, then parents) lights where its child and at least one parent are in the branch; a node (spouses, then children) lights where a spouse and another of its people are in the branch. So the lines to Marie's sisters and brothers stay dark though both her parents are lit. `is-hl` stays on the pointed card and its own lines. The file graph draws each person once; `CanvasScene.related` becomes `branch(xref)`.
- **The light in the timeline.** Rows and lifelines of every person of the branch; ages on the year cursor likewise. Arrows: parent → child for every pair within the branch, and the marriage link of every family whose spouses are both in the branch; a link with an end not drawn runs to the edge of the part shown, as `A click on a person lights their family` says.
- **Cost.** The branch of the last person asked is kept, so redraws of the graph, the timeline's year cursor and focus steps ask once. The timeline's arrows are drawn once for the branch, over its families once, and only where an end is in the drawn window; they are redrawn as the window moves. A file of 10 000 people lit at its root lights the whole file.
- **The legacy state.** No migration: the numbers are dropped when the state is read and not written again.

## Risks

- A person whose branch is the whole file lights everything and fades nothing; that is the branch, and the whole file is what the reader asked for.
- Scenarios that used `up: 0, down: 0` as the narrow scope now use a person whose branch is small; the tests that stepped the numbers go with the steppers.
