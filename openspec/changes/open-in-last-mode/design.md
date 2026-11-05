## Context

`GedcomView` gave a tab with no mode of its own `initialMode(desk.mode, settings.openAs,
interfaceOn)`, in the constructor and in the `!sameFile` branch of `setState`.
`setMode` is called by the header buttons, the **Show as** and toggle commands, and by
the plugin itself (`showInSource`, `goToXref`, `goToRecord`).

## Goals / Non-Goals

**Goals:** the next file opens as the reader is working; the rule is a pure,
unit-tested function; saving the choice does not refresh every view.

**Non-Goals:** as in `proposal.md`.

## Decisions

### One rule, no setting

`initialMode(persisted, lastMode, interfaceOn)` is `persisted`, else `lastMode` while
the interface is on, else Source. `DeskMode` moves to `settingsData.ts` with
`DESK_MODES` and `readDeskMode`; `OpenAsMode`, `readOpenAs` and `DEFAULT_SETTINGS.openAs`
go away.

### Where `lastMode` lives

`GedcomSettings.lastMode: DeskMode`, default `"graph"`, read by `parseSettings` with
`readDeskMode` so a missing or unknown value is Graph. It sits in the same `data.json`
and is not a row of the settings tab; `parseSettings` builds a new object, so a saved
`openAs` is dropped the next time anything is saved.

### What is a choice

`setMode(mode, source)` takes `"reader"` or `"program"`, `"program"` by default.
The header buttons, `showMode` and `toggleMode` pass `"reader"`; `showInSource`,
`goToXref` and `goToRecord` do not. The pure `rememberedMode(last, next, source)`
answers which mode is remembered. The call is made while the interface is on, before
`TabModes.setMode` can refuse a mode equal to the tab's own, so choosing the mode a
restored tab is already in still counts. The `setState` path, the constructor, the
interface switch and a link route never pass `"reader"`.

### A light path to save it

`GedcomViewHost` gains `lastMode()` and `modeChosen(mode)`. `main.ts` replaces
`this.settings` with a copy carrying the mode and calls a debounced
`saveData(this.settings)` (1 s, reset on each call), run once from `onunload`. It does
not call `updateSettings`, so no view is refreshed and `syncInterface` is not run; a
view reads the mode through the host at the moment a file opens. (mine)

### Old data

`openAs` is ignored on read, whatever it held, including the legacy `genealogy`. No
migration of it into `lastMode`: a reader who pinned Source gets Graph on the first use
and Source after they pick it once. (mine)

## Risks / Trade-offs

- A reader who pinned a mode with the retired setting loses the pin; the first
  pick of a mode restores their working pattern. Said in the proposal.
- A crash within the second after a choice loses it; the previous one is read.
- `onExternalSettingsChange` re-reads `lastMode` from a synced `data.json`, so
  another device's choice can replace this one's.

## Open Questions

None.

## Implementation

Decisions (mine), all marked above or here:

- The setting is removed outright, as the user said, with no migration of the old
  value into `lastMode`. (mine)
- A link route to Source for a record with no card (`goToXref`, `goToRecord`) and
  *show in source* from a card are programmatic and do not update the mode. (mine)
- Clicking the button of the mode a tab is already in counts as a choice. (mine)
- `lastMode` is a field of `GedcomSettings` that has no settings row; the test that
  pairs rows with settings skips it. (mine)
- A mode chosen while the interface is off cannot happen: the buttons and commands
  are hidden, and `lastMode` is not touched. (mine)
- Unit tests cover the rule, the parsing and the definitions. `GedcomView` and
  `main.ts` apply the rule thinly and cannot be unit-tested (Obsidian is types only);
  the manual check in the last task covers them. No harness spec was added.
