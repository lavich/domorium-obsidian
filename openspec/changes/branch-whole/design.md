## Context

`FileTimeline.branch(focus, up, down)` walks parents `up` times and children `down` times and adds the spouses of everyone reached. `related(xref)` is the person with their parents, spouses and children. The graph (`scene.related`, `graphCanvas.highlight`) and the timeline (`highlight`, `drawArrows`, `drawCursor`) both light from `related`. The scope `{focus, up, down}` is persisted in the tab's state (`readBranchScope`, `deskState`) and is part of the graph layout cache key (`fileGraph.ts`).

## Decisions

- **One walk, no depth.** `branch(focus)` walks parents until none are left and children until none are left, with a visited set so that a file whose records loop through each other still finishes. It adds spouses as now. `related(xref)` goes: the light asks `branch(xref)`.
- **The scope is `{focus?}`.** `BranchScope` loses `up` and `down`; `BRANCH_STEPS`, the steppers, `clampTo` for them and the six `overview.*Ancestors/Descendants` keys go. `readBranchScope` ignores any `up` and `down` it finds, so a workspace saved before the change opens on the branch of its `focus`. `sameBranch` compares `focus` alone; the layout cache key is the focus.
- **The light in the graph.** Cards: every person of the branch (every copy, as now). Family nodes and lines: an item lights where at least two of its `people` are in the branch — a family node lists its spouses and children, a line its child and parents — so the node of an ancestor couple lights through one child in the branch, and a line to a sister who is not in the branch does not.
- **The light in the timeline.** Rows and lifelines of every person of the branch; ages on the year cursor likewise. Arrows: parent → child for every pair within the branch that both have a row drawn, and the marriage link of every family whose spouses are both in the branch. Arrows are drawn only for rows in the layout, as now.
- **Cost.** A branch is walked once per light, over the persons of the branch, not of the file; the light is put on once per rest of the pointer or click. A file of 10 000 people lit at its root lights the whole file; the graph draws only the shapes in view, and lit elements are those drawn.
- **The legacy state.** No migration: the numbers are dropped when the state is read and not written again.

## Risks

- A person whose branch is the whole file lights everything and fades nothing; that is the branch, and the whole file is what the reader asked for.
- Scenarios that used `up: 0, down: 0` as the narrow scope now use a person whose branch is small; the tests that stepped the numbers go with the steppers.
