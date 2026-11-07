## Why

A branch in the graph or the timeline stops at a number of generations of ancestors and of descendants the reader sets with two steppers, starting at two; a branch the reader means to read whole needs the steppers pressed until nothing more appears. And pointing at a person in the graph lights only their parents, spouses and children, so the line they belong to is not shown.

## The user's decisions (2026-11-07)

In Russian: «Сейчас, когда я выбираю бранч в графовом представлении или таймлайне есть ограничение на количество потомков и предков. Хочу, чтобы этого ограничения не было и этой настройки тоже не было и выбирались максимальное количество предков либо потомков. А также при наведении подсвечиваются ближайшие родственники выбранного человека. Я хочу, чтобы подсвечивался весь бранч, а не только его родители и дети.» Asked what «the whole branch» is for the light, and where: «Тот же набор, что в Branch; граф и таймлайн». Asked what to do with the steppers and the saved state: «Убрать совсем». Recorded as given.

## What Changes

- **A branch has no limit.** The branch of a person is all their ancestors, all their descendants and the spouses of everyone so shown — in the graph and the timeline alike.
- **The two steppers go, with their numbers.** The line about the scope keeps whose branch is shown, how many of the file's people that is, and the way back to the whole file. A scope saved with `up` and `down` in the tab's state is read without them.
- **The light is the branch.** Pointing at a person in the graph lights every card of their branch, the family nodes and the lines between those people, and fades everything else. In the timeline the light a click puts on does the same, and its arrows join every parent to every child within the branch, and the spouses of every marriage within it.

Repository or upstream: **this repository only.** The read model's `branch` and `related` are the one thing both views read; the parser and the language service are untouched.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `genealogy-file-graph`: the branch scope, the light of pointing, and the scenario of a selection outside the branch shown.
- `genealogy-file-timeline`: the branch scope, the light of a click, and the scenario of a selection outside the branch shown.

## Non-goals

- A setting, a command or any other way to limit a branch again.
- Lighting brothers, sisters, cousins or the other children of an ancestor: the branch is the set the Branch scope shows.
- Changing when the light goes on or off, its easing, or the selected mark.
- Raising `minAppVersion`.

## Impact

- `src/desk/fileTimeline.ts` (`branch`, `related`, `BRANCH_STEPS`), `src/desk/branchScope.ts`, `src/desk/deskState.ts`, `src/desk/fileGraph.ts` (the scope's key), `src/desk/timelineLayout.ts`, `src/desk/fileGraphView.ts`, `src/desk/fileTimelineView.ts`, `src/desk/graphCanvas.ts`, `src/desk/sceneItems.ts`, `src/desk/fileViews.ts`, and the tests beside them, `tests/fileGraph.spec.ts`, `tests/fileViews.spec.ts`, `harness/fileGraph.ts`.
- `src/i18n/en.json`, `src/i18n/ru.json`: the six keys of the steppers go; `styles.css`: the stepper rules go.
- `README.md` is read for a sentence on the steppers.
