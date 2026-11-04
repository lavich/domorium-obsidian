## Why

The timeline of the file (#194) shows a family through time; it does not show
its shape — who descends from whom, which families married into which, where a
line of descent stops. The user laid out a graph of the whole file in a mockup
(`docs/design/file-graph.html` on the branch `lavich/design-file-timeline`, PR
#188, which is not being merged) and asked for it as the second of the
overviews.

## What Changes

The user's requirement, in their words, with the decisions taken on the way
(2026-11-02 to 2026-11-04):

- On where an overview lives: a tab of its own, as Obsidian's graph view is; the
  person page stays in the centre; the tab header gets an action per overview
  beside the Genealogy / Source switch — «звучит правильно и хорошо. будем
  делать все». The order of changes: the timeline (done, #194), then this
  graph, then the branch in a sidebar, then the hover preview card.
- «Оставляем один плагин…» — one plugin, not two.
- Couples and sides: «пусть мужчины будут слева а справа женщины» / «в браках»
  — a husband stands to the left of his wife; «и семьи мужа стремись
  располагать слева а жены справа» — the husband's family on the left, the
  wife's on the right.
- Colours as in the timeline: «розовые - женский пол, голубые - мужской пол,
  серые - пол не указан»; no generation labels — «Убери Generation».
- On the first, naive layout of their own 111-person file: «некрасиво… все
  перекрещено». The layout accepted in its place is layered: spouses form one
  block; blocks are ordered generation by generation by barycentre sweeps,
  keeping the order with the fewest crossings, then pulled towards their
  parents and children; a line meets a block at the child's own card and
  leaves from the family node between the spouses; a line spanning several
  generations keeps a lane free in the rows it passes; lines are curved; the
  family node between the spouses shows the marriage year, and is hollow where
  the marriage is undated.
- Pointing at a person lights them, their parents, spouses and children and
  the lines to them; a **Branch** scope of ancestors and descendants, zero to
  nine generations each, spouses included, as the timeline has; drag to pan,
  wheel to zoom, **Fit**; only the shapes in view are drawn, and far out the
  cards are drawn without text; a file of more than 500 people opens on the
  branch of the tab's person, the same rule as the timeline.
- Activating a person brings the file's tab forward on their page, as the
  timeline does; pointing at a family node shows the marriage date and place
  and the number of children. The graph is part of the genealogy interface,
  as the timeline is.

Proposed scope:

- A new view, **Graph of the file**, opened in a tab of its own from a header
  action on a GEDCOM tab, from a command and from the tab's menu. It draws one
  card per person of one file, generations from top to bottom, couples joined
  by a family node from which lines run to their children.
- The layered layout above, computed once per reading of the file and scope,
  and kept responsive for a file of 10 000 people.
- Hover highlight, the branch scope, pan, zoom and Fit, a far view without
  text, the family node's details, keyboard access to cards, and the phone's
  drag, pinch and two-touch.
- A person opens their page, and a family node its family's page, in the
  file's tab, brought to the front.
- The timeline and the graph share their model of the file, the branch scope
  bar, and the host plumbing that reads a file, follows its edits, renames and
  deletion, and leads into its tab. The timeline behaves as it does today.

This change belongs in this repository. It reads only what the read model
already reports (people, families, sex, dates, generations); nothing in the
parser or the language service changes.

## Non-goals

- The branch in a sidebar and the hover preview card: each is its own change,
  in that order.
- Adopting the graph's crossing reduction in the timeline's row order: that
  would change the timeline and is its own change if wanted.
- A search in the graph, a minimap, a fan chart, or a map.
- Exporting the graph as an image or printing it.
- Editing anything from the graph: like the rest of the genealogy interface it
  never writes to the file.
- Saving the pan and zoom with the workspace: the scope is saved, the view
  reopens as on first opening.
- A Web Worker for the layout, or a layout cached across sessions.
- Raising `minAppVersion`.

## Capabilities

### New Capabilities

- `genealogy-file-graph`: the graph of a whole file — how it opens, what a card
  and a family node show, how couples, families and generations are placed,
  hover, the branch scope, pan and zoom, what activating does, how it holds up
  at size, and the phone.

### Modified Capabilities

- `genealogy-view`: the genealogy interface setting also hides the graph of the
  file, its header action and its command.

## Impact

- New `src/desk/fileGraph.ts` (the layered layout of a model and scope — no
  DOM) and `src/desk/fileGraphView.ts` (drawing, pan, zoom, hover, touch, with
  only what is in view in the DOM), with tests beside them.
- Shared with the timeline, extracted from `src/desk/fileTimelineView.ts`: a
  new `src/desk/branchScope.ts` (the scope bar and the reading of its saved
  state), the years of a card in `src/desk/labels.ts`, the placing of a tooltip
  in `src/desk/dom.ts`.
- `src/desk/DeskViews.ts`: a base view for both overviews, `FileTimelineView`
  moved onto it, and `FileGraphView` beside it.
- `src/main.ts`: the overview plumbing — opening, reading a closed file,
  staleness, rename, delete, the interface switch — made to serve both view
  types.
- `src/commands.ts` and `src/GedcomView.ts`: the command, the menu item and the
  `git-fork` header action.
- `styles.css`, `src/i18n/en.json`, `src/i18n/ru.json`, `README.md`.
- `harness/fileGraph.ts` and page, `harness/build.mjs`, `harness/palette.css`,
  and a Playwright spec `tests/fileGraph.spec.ts`.
