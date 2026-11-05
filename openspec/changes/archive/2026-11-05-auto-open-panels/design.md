## Context

`GedcomView.selectRecord(xref, origin)` ends with `host.cardWanted(view, origin)` for
every origin but `cursor` (`originRules.placesCard`). `main.ts` answers with
`placeCard()` — once a session, `getRightLeaf(false)`, `active: false`, and no
expansion of a collapsed sidebar — or, on a phone, `revealCardDrawer()` for the
`view` and `index` origins. The Index is placed only by `openIndex()` from the ribbon
icon and the command. `workspace.leftSplit` and `rightSplit` are a `WorkspaceSidedock`
(`collapsed`, `expand()`, since 0.12.11) on desktop and a `WorkspaceMobileDrawer` on a
phone; `ensureSideLeaf(type, side, { active, reveal })` is since 1.7.2.

## Goals / Non-Goals

**Goals:** a selection by the reader shows both panels without taking the focus; the
reader can turn it off; the rule is a unit-tested pure function.

**Non-Goals:** as in `proposal.md`.

## Decisions

### A pure rule decides, `main.ts` applies

`src/desk/sidePanels.ts` has no `obsidian` import:

```ts
function opensSidePanels(origin: Origin): boolean;            // view | index | link
interface PanelState { open: boolean; collapsed: boolean }   // leaf exists / its sidebar is collapsed
function panelStep(state: PanelState): "none" | "open";
function sidePanelPlan(input: {
  enabled: boolean; mobile: boolean; origin: Origin; index: PanelState; card: PanelState;
}): { index: "none" | "open"; card: "none" | "open" };
```

`panelStep` is `"none"` for an open panel in an expanded sidebar and `"open"` for a
missing panel or a collapsed sidebar. `sidePanelPlan` is `none`/`none` unless
`enabled`, not `mobile` and `opensSidePanels(origin)`.

### Which origins open

`view`, `index` and `link` — the reader reaching for a record from outside the card.
`card` and `history` are gestures inside the card, so the card is open already, and
expanding the left sidebar because the reader pressed Back would undo a collapse made
on purpose; they keep placing a missing card once per session, as today. `cursor`
places and opens nothing. (mine)

### Applying a step

For a panel whose step is `"open"`, `main.ts` calls
`workspace.ensureSideLeaf(type, side, { active: false, reveal: true })`, which creates
the leaf if missing and, through `revealLeaf`, expands the sidebar and brings the tab
forward in it. `reveal` is not used for `"none"`, so an expanded sidebar showing
another tab is not touched. Both calls run in parallel and a failure of one does not
stop the other.

Focus: `ensureSideLeaf` with `active: false` and `revealLeaf` activate nothing in
Obsidian 1.8, but that is not in the typings, so `main.ts` remembers the leaf of the
active view before and, if the active view's leaf differs afterwards, hands the focus
back with `setActiveLeaf(previous, { focus: true })`. (mine)

The state is read at the moment of the gesture: `getLeavesOfType(type).length > 0` and
`leftSplit.collapsed` / `rightSplit.collapsed`. Nothing is remembered, so a collapse or
a close by the reader is simply the state the next gesture finds.

`cardPlaced` is set when the card is opened this way, so the setting-off and the
card/history paths stay as they were.

### The setting

`openPanelsOnSelect: boolean`, default **true**, parsed like the other booleans (a
non-boolean or a missing value reads as `true`, so an upgrade turns it on). Its row
**Open the side panels when selecting** follows *Open GEDCOM files as* in the list;
the description says it applies while the genealogy interface is on and, on a phone,
only the right drawer opens. The row is always shown (the conditional `visible` needs
1.13.0; see the table in `CLAUDE.md`). (mine)

### Phone

`originRules(…).opensDrawer` keeps deciding: `view` and `index` open the right drawer
as before, whatever the setting, because that is the existing, specified behaviour
and the drawer is the only way to the card. The left drawer is not opened and the
Index is not placed: a drawer covers the screen, and the Index row it would show is
one the reader reaches from the drawer. The setting therefore changes nothing on a
phone. (mine)

## Risks / Trade-offs

- A reader who prefers sidebars shut loses a layout choice on each click until they
  turn the setting off; default on is what the user asked for.
- Expanding a sidebar resizes the centre and the graph may re-fit. The graph already
  redraws on resize; a manual check confirms it does not recentre away from the
  clicked card.
- Whether `revealLeaf` takes the focus cannot be confirmed here; the restore of the
  active leaf covers it.

## Open Questions

None.

## Implementation

Decisions (mine) are marked above. Unit tests cover the rule and the setting; no
harness spec can show a sidebar, so applying the plan in `main.ts` is covered only by
the manual check in the last task.
