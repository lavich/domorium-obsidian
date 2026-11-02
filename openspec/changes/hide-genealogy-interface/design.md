## Context

`GedcomView` reads `this.mode` (`src/GedcomView.ts`) to choose between the
editor and the desk, takes its first value from `settings.openAs` (constructor,
`setState` for a new file), and adds a header action, `modeAction`, in its
constructor. `src/main.ts` registers the Index and Evidence views, a ribbon icon
and two commands once in `onload`, places the Evidence panel from
`genealogyChanged`, and gates the toggle-mode command through `COMMANDS` in
`src/commands.ts`. Settings reach open views through `updateSettings` and
`onExternalSettingsChange`, both of which call `view.applySettings`.

Obsidian has no API to unregister a view type; a ribbon icon is an element that
`addRibbonIcon` returns; a command's `checkCallback` is asked again each time the
palette opens. A unit test cannot import `obsidian` (the package is types only),
so `GedcomView` and `main.ts` are not unit-testable, and the browser harness
renders pages directly without mounting `GedcomView`.

## Goals / Non-Goals

**Goals:**
- One setting, `genealogyInterface`, off by default, that gates every entry point
  to the genealogy interface and reacts to a change live.
- No stored state lost by turning it off.

**Non-Goals:**
- Anything in the proposal's Non-goals.

## Decisions

**The setting is a plain boolean in `GedcomSettings`, default `false`, parsed
like `remoteImages`.** A saved file lacking the key reads as off, which is how
existing readers are covered; `openAs` stays in the file and is not rewritten.
The user decided the default is off for everyone, existing readers included.

**Pure rules live in `src/desk/deskState.ts`, where they are tested.**
`effectiveMode(stored, interfaceOn)` answers `"source"` while the setting is off
and `stored` otherwise. `initialMode(persisted, openAs, interfaceOn)` answers the
persisted mode when the tab has one, else `openAs` while the setting is on, else
`"source"`. The last branch matters: a tab opened while off must not store
`openAs`'s default of Genealogy, or turning the setting on would flip it.

**`GedcomView` keeps the stored `mode` and reads the effective mode.** Every read
that chooses what to show goes through `effectiveMode`: `recordAtCursor`,
`inSource`, `toggleMode`, `deskSelection`, `shownRecord`, `goToXref`,
`goToRecord`, `drawDesk` and `showMode`. `getState` still writes the stored mode,
so a tab returns to Genealogy after the setting is turned off and on. Alternative:
write `"source"` into the tab when turning off. Rejected: it throws away the
reader's choice and the record the tab showed. `openRecord`, `setMode` and
`showInSource` are unreachable with the setting off because their callers are
the desk, the Index and the toggle command, none of which is shown; each still
returns without effect while it is off, since a history entry or a leaf not yet
detached could reach them.

**`modeAction` is hidden with `toggle(on)`, not removed.** `applySettings` hides
it, calls `showMode`, and, when the effective mode changed, calls
`host.genealogyChanged(this)` so the Index follows the tab and the Evidence
panel is placed when the setting is turned on over a Genealogy tab. `addAction`
has no remove API.

**The ribbon icon is created and removed from one `syncInterface()` in `main.ts`.**
It runs after `loadData` and before the ribbon is added (today `onload` adds it
unconditionally), in `updateSettings` and in `onExternalSettingsChange`, which
also asks an open settings tab to redraw. It adds the icon when on and none
exists, removes the element when off, and, when off, detaches the leaves of
`INDEX_VIEW_TYPE` and `EVIDENCE_VIEW_TYPE`. On load the detach waits for
`workspace.onLayoutReady`, since a saved layout restores those leaves after
`onload`. Whether Obsidian keeps a ghost entry for a removed ribbon element, in
the ribbon configuration or on a phone, is not known offline: a manual check
(tasks 6.1), with the fallback of keeping the icon and making its click inert.

**The view types stay registered.** Nothing opens them while the setting is off,
and `syncInterface` detaches a stray leaf.

**Commands stay registered and answer through `checkCallback`.** Index and
Evidence become `checkCallback`s that return false while the setting is off and,
when `checking`, true without running. The toggle-mode command's `isAvailable`
reads `CommandView.genealogyInterface()`, which the view answers from its
settings; `fillMenu` and the pane menu share `COMMANDS.isAvailable`, so they
follow. `placeEvidence` returns while the setting is off, before it sets
`evidencePlaced`, so the one placement a session is not spent while off.

**The settings tab gains one toggle and no conditional row.** *Open GEDCOM files
as* would be hidden while the setting is off only through `visible` and
`update()`, which are Obsidian 1.13.0. Declining them keeps the floor, so the row
stays and its description says it applies when the interface is on. Recorded in
the CLAUDE.md table when implemented. `settingDefinitions()` keeps no arguments.

## Risks / Trade-offs

- A reader who relied on Genealogy mode sees the editor after updating and must
  find the setting. The README says where; the release note belongs to the
  release PR. The user accepted it as the point of the change.
- A reader who sets *Open GEDCOM files as* without the interface on sees nothing
  happen; the row's description is the only hint.
- Registered-but-unreachable view types remain in the view registry. Accepted
  for lack of an API.
- A hand-edited or synced `data.json` that flips the setting is covered by
  `onExternalSettingsChange`, which calls the same sync.
- `GedcomView` and `main.ts` wiring is covered by review and the manual checks,
  not by unit tests.
