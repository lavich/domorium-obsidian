## Why

The genealogy interface — Genealogy mode, the Index and Evidence panels, the
ribbon icon — is the plugin's largest surface, and today it is on for everyone:
a reader who installed the plugin for GEDCOM validation and highlighting opens a
`.ged` file onto a page instead of the editor and finds a ribbon icon and two
panel commands they did not ask for. It should be something a reader turns on.

## What Changes

User requirement (2026-11-02): hide the interface by default for everyone, and
make it switch on only from the plugin settings. "Interface" means all of it —
the Genealogy mode and its header switch, the Index and Evidence panels and the
ribbon icon — confirmed with the user as "all the panels and the rest".

Proposed scope:

- A new setting, **Genealogy interface**, off by default for every reader,
  existing ones included.
- While it is off: a GEDCOM tab is always in Source mode and has no mode switch;
  the ribbon icon is absent; the commands that open the Index, open the Evidence
  panel and toggle the mode are not offered; the Evidence panel is not placed
  on its own; open Index and Evidence panels are closed.
- Turning it on shows all of that without restarting Obsidian; turning it off
  removes it the same way.
- **Open GEDCOM files as** stays in the settings and applies only while the
  interface is on; its description says so. A conditional row would need the
  settings API of Obsidian 1.13.0, above `minAppVersion`.
- A mode a tab was last in, and a stored `openAs`, are kept but ignored while
  the interface is off, so turning it on again finds them.
- **BREAKING** for readers who use Genealogy mode today: after the update they
  open Source until they turn the setting on.

This change belongs in this repository: nothing in it touches parsing,
validation or the language service.

## Non-goals

- Removing or reworking any genealogy page, panel or the read model.
- Hiding what is not the genealogy interface: the editor, `gedcom` code blocks,
  record previews, links into records, `obsidian://` links, the status bar,
  the API for other plugins.
- Unregistering the views with Obsidian, which has no API for it.
- Raising `minAppVersion`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `genealogy-view`: Genealogy mode, its header switch and its command exist
  only while the setting is on; Source is the only mode otherwise; *Open GEDCOM
  files as* is shown only then.
- `genealogy-index`: the Index view, its ribbon icon and its command exist only
  while the setting is on.
- `genealogy-evidence`: the Evidence view, its command and its automatic
  placement exist only while the setting is on.

## Impact

- `src/settingsData.ts`, `src/settingDefinitions.ts`, `src/settings.ts`: the
  setting, its parsing and its row.
- `src/main.ts`: ribbon icon, command gating, closing panels, evidence
  placement, reacting to a settings change.
- `src/GedcomView.ts`, `src/desk/deskState.ts`, `src/commands.ts`: effective
  mode, the header action and the mode command.
- `src/i18n/en.json` and `src/i18n/ru.json`: the new strings in both.
- `README.md`: every passage that says Genealogy mode, the ribbon icon, the
  panels or their commands are there from the start.
- Unit tests beside those files. The browser harness renders pages directly and
  never mounts `GedcomView`, so it and the Playwright specs are unaffected.
