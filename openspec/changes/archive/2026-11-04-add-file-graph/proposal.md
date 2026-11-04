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

Answers to the plan's open questions (2026-11-04):

- Activating a family node opens the family's page in the file's tab, brought
  to the front; pointing at it still shows the marriage date and place and the
  number of children.
- The graph's position and zoom are saved with the workspace, as the
  timeline's zoom is.
- The graph has a search: cards that do not match fade, Enter moves the view to
  the first match, and each further Enter to the next.
- The header icon: «network». `git-fork` was proposed first, but it is the icon
  of Obsidian's own graph view (`graph-glyph`), and the user chose `network`
  instead.

Added to this change (2026-11-04): «на странице персоны надо заменить старый
граф на новый». Asked how, the user chose «Состав старого дерева, вид нового
графа»: the Tree tab of a person's page keeps exactly who it shows today —
parents and their parents, the first spouse's parents; spouses, siblings in one
box with a count that unfolds them, the first spouse's siblings; children with
their spouses; grandchildren — with its no-source mark, its marks for relatives
beyond the edge, its focus mark, activating a person to make them the focus, no
overlaps however wide the family, and the focus in view on opening; but it is
drawn by the graph's pieces: cards coloured by sex, a family node with the
marriage year that opens the family's page, husband on the left with each
side's family on its side, curved lines in the gaps, hover by classes, and the
graph's keyboard and phone behaviour. One renderer serves both; the old tree's
layout and drawing are retired.

From the demo vault (2026-11-04): the line «Whole file · 17 people. Choose the
branch on a person's card…» is superfluous and takes room — in the whole-file
scope no scope line is shown, in the graph and in the timeline; the branch line
stays while a branch is shown, and the count of people stays in the subtitle.
And Branch pressed again on the person whose branch is shown returns to the
whole file, in the graph and in the timeline, by keyboard and touch too, shown
as a toggle that reads pressed while that branch is shown.

Cards, for the graph and the person page's tree (2026-11-04): «в карточках хочу
запись имени и фамилии чтобы был перенос на разные строки и добавить аватарку,
если она есть», «аватарка вверху карточки». From top to bottom a card shows the
person's portrait where they have one, their given names, their surname and
their years; with no portrait it begins with the name. The portrait is the one,
and the crop, the person's page shows, a picture from the web only where *Load
images from the web* allows. Then: «Почему карточки такие широкие и в них
столько свободного места?» and «остались вертикальные цветные полоски — надо
их просто убрать сейчас»: cards are narrowed, with their portrait and text
centred, and the coloured stripe goes; sex is shown by the card's tint.

The Tree tab (2026-11-04): «когда переключение на вкладку с деревом, то там не
должно быть скролла — все должно вписаться. и убери оттуда легенду». The tree
fills the space under the page's heading and tabs, opens fitted to it, and has
no legend.

The legends (2026-11-04): «в таймлайне и на странице графа тоже убери
легенду» — no legend remains in the timeline, the graph or the tree.

Proposed scope:

- A new view, **Graph of the file**, opened in a tab of its own from a header
  action on a GEDCOM tab, from a command and from the tab's menu. It draws one
  card per person of one file, generations from top to bottom, couples joined
  by a family node from which lines run to their children.
- The layered layout above, computed once per reading of the file and scope,
  and kept responsive for a file of 10 000 people.
- Hover highlight, a search by name, the branch scope, pan, zoom and Fit saved
  with the workspace, a far view without text, the family node's details,
  keyboard access to cards and family nodes, and the phone's drag, pinch and
  two-touch.
- A person opens their page, and a family node its family's page, in the
  file's tab, brought to the front.
- The timeline and the graph share their model of the file, the branch scope
  bar, and the host plumbing that reads a file, follows its edits, renames and
  deletion, and leads into its tab; the bookkeeping of reading a closed file
  moves into a module of its own with unit tests. The timeline behaves as it
  does today.

This change belongs in this repository. It reads only what the read model
already reports (people, families, sex, dates, generations); nothing in the
parser or the language service changes.

## Non-goals

- The branch in a sidebar and the hover preview card: each is its own change,
  in that order.
- Adopting the graph's crossing reduction in the timeline's row order: that
  would change the timeline and is its own change if wanted.
- A minimap, a fan chart, or a map.
- Exporting the graph as an image or printing it.
- Editing anything from the graph: like the rest of the genealogy interface it
  never writes to the file.
- A Web Worker for the layout, or a layout cached across sessions.
- Raising `minAppVersion`.
- Colouring cards by family line (male line) — later, its own change.

## Capabilities

### New Capabilities

- `genealogy-file-graph`: the graph of a whole file — how it opens, what a card
  and a family node show, how couples, families and generations are placed,
  hover, the search, the branch scope, pan and zoom, what activating does, how
  it holds up at size, and the phone.

### Modified Capabilities

- `genealogy-file-timeline`: Branch on the person whose branch is shown returns
  to the whole file.
- `genealogy-view`: the genealogy interface setting also hides the graph of the
  file, its header action and its command; the tree of a person's page is drawn
  as the graph of the file is drawn, with the same people in it as before.

## Impact

- New `src/desk/fileGraph.ts` (the layered layout of a model and scope — no
  DOM) and `src/desk/fileGraphView.ts` (drawing, pan, zoom, hover, touch, with
  only what is in view in the DOM), with tests beside them.
- Shared with the timeline, extracted from `src/desk/fileTimelineView.ts`: a
  new `src/desk/branchScope.ts` (the scope bar and the reading of its saved
  state), the years of a card in `src/desk/labels.ts`, the placing of a tooltip
  in `src/desk/dom.ts`.
- New `src/vault/overviewReads.ts`: the bookkeeping of reading a closed file
  for an overview, shared by the timeline and the graph, with tests beside it.
- `src/desk/DeskViews.ts`: a base view for both overviews, `FileTimelineView`
  moved onto it, and `FileGraphView` beside it.
- `src/main.ts`: the overview plumbing — opening, reading a closed file,
  staleness, rename, delete, the interface switch — made to serve both view
  types.
- `src/commands.ts` and `src/GedcomView.ts`: the command, the menu item and the
  header action, with the `network` icon.
- `styles.css`, `src/i18n/en.json`, `src/i18n/ru.json`, `README.md`.
- The person page's tree: new `src/desk/personTree.ts` (who the tree shows, as
  an input to the graph's layout) and `src/desk/personTreeView.ts` (drawing it
  on the graph's canvas), the canvas itself moved from `fileGraphView.ts` to a
  new `src/desk/graphCanvas.ts`; `src/desk/treeLayout.ts`, `src/desk/treeView.ts`
  and their tests removed; `src/desk/personPage.ts`; `tests/desk.spec.ts`.
- `harness/fileGraph.ts` and page, `harness/build.mjs`, `harness/palette.css`,
  a Playwright spec `tests/fileGraph.spec.ts`, and the 10 000-person generator
  moved from `tests/fileTimeline.spec.ts` to a shared `tests/generated.ts`.
