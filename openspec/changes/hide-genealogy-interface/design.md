## Context

`GedcomView` reads `this.mode` (`src/GedcomView.ts`) to choose between the
editor and the desk, takes its first value from `settings.openAs`, and adds a
header action, `modeAction`, in its constructor. `src/main.ts` registers the
Index and Evidence views, a ribbon icon and two commands once in `onload`, places
the Evidence panel from `genealogyChanged`, and gates the toggle-mode command
through `COMMANDS` in `src/commands.ts`. Settings reach open views through
`updateSettings` and `onExternalSettingsChange`, both of which call
`view.applySettings`.

Obsidian has no API to unregister a view type, a ribbon icon is an element that
`addRibbonIcon` returns, and a command's `checkCallback` is asked again each time
the palette opens.

## Goals / Non-Goals

**Goals:**
- One setting, `genealogyInterface`, off by default, that gates every entry point
  to the genealogy interface and reacts to a change live.
- No stored state lost by turning it off.

**Non-Goals:**
- Anything in the proposal's Non-goals.

## Decisions

**The setting is a plain boolean in `GedcomSettings`, default `false`,
parsed like `remoteImages`.** A saved file lacking the key therefore reads as
off, which is how existing readers are covered; `openAs` stays in the file and
is not rewritten. The user decided the default is off for everyone, existing
readers included.

**`GedcomView` keeps the stored `mode` and reads an effective mode.** A getter
answers `"source"` while the setting is off and `this.mode` otherwise; every
read that chooses what to show uses it, and `getState` still writes the stored
mode. That is what lets a tab come back in Genealogy after the setting is turned
off and on. Alternative: write `"source"` into the tab when turning off. Rejected:
it throws away the reader's choice and the record the tab showed.
`openRecord` and `setMode("genealogy")` are unreachable with the setting off
because their callers are the desk, the Index and the toggle command; none of
those is shown. A link that opens a record (`goToXref`) goes to the source, as
the effective mode says.

**`modeAction` is hidden, not removed, while the setting is off.** `applySettings`
toggles its visibility and calls `showMode`, which already redraws editor or desk
from the mode. Alternative: add and remove the action. Rejected: `addAction` has
no remove API.

**The ribbon icon is created and removed from one `syncInterface()` in `main.ts`.**
It runs after `loadData`, in `updateSettings` and in `onExternalSettingsChange`.
It adds the icon element when on and none exists, removes it when off, and, when
off, detaches the leaves of `INDEX_VIEW_TYPE` and `EVIDENCE_VIEW_TYPE`. On load
the detach waits for `workspace.onLayoutReady`, since a saved layout restores
those leaves after `onload`.

**The view types stay registered.** Without an unregister API, registration is
harmless: nothing opens them while the setting is off, and a stray leaf is
detached by `syncInterface`.

**Commands stay registered and answer through `checkCallback`.** The Index and
Evidence commands are rewritten from `callback` to a `checkCallback` that
returns false while the setting is off. The toggle-mode command's
`isAvailable` in `COMMANDS` reads a `CommandView.genealogyInterface()` the view
answers from its settings, keeping `obsidian` out of `commands.ts`.
`placeEvidence` returns at once while the setting is off.

**The setting's row sits first in the list, and *Open GEDCOM files as* follows
it only while the setting is on.** `settingDefinitions()` takes the current
settings and omits the `openAs` definition when off. The new
`getSettingDefinitions` API re-asks after a change; the deprecated `display()`
path re-renders itself when the toggle changes.

## Risks / Trade-offs

- A reader who relied on Genealogy mode sees the editor after updating and must
  find the setting. Mitigated by the README and the release note; the user
  accepted it as the point of the change.
- Registered-but-unreachable view types appear nowhere in the UI, but remain in
  `app.viewRegistry`. Accepted for lack of an API.
- A hand-edited or synced `data.json` that flips the setting is covered by
  `onExternalSettingsChange`, which calls the same sync.
