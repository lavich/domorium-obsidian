## Why

The genealogy interface — the record card and the Graph, Timeline and List modes — has been behind a setting that is off by default and named a beta since it arrived. It is now the plugin's main way of reading a file, and a new reader should meet it without first finding a toggle in the settings.

## What Changes

The user's decisions, in their words and by date:

- 2026-11-17: «давай теперь по умолчанию включим его» — the **Genealogy interface** setting is on by default.
- 2026-11-17, asked whom it applies to: «Новым и не трогавшим» — only the default changes. A reader whose saved settings hold the setting as off keeps it off; there is no migration.
- 2026-11-17, asked about the beta mark: «Убрать» — the setting is named **Genealogy interface** (in Russian, without the beta either), and its description says nothing about a beta. *Superseded below.*
- 2026-11-17, later: «надпись Бета все же оставь еще» — the beta mark stays: the setting keeps the name **Genealogy interface (beta)** / **Генеалогический интерфейс (бета)**, and its description keeps saying the interface is still in beta and may change.

The proposed scope:

- The setting's default becomes on. A reader with no saved settings, or whose saved settings do not hold the setting, has the interface on; a saved value, on or off, is kept as it is.
- The setting's name and description are unchanged: they still call the interface a beta, and nothing in them contradicts its being on by default.
- With the interface on and no mode chosen yet, a file opens in Graph mode, as the spec already says for a reader who turned the interface on.
- The README no longer calls the interface optional or off until turned on; it still calls it a beta.

**This repository or upstream.** This repository: the setting, its default and its wording are the plugin's. Nothing in the parser or the language service changes.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `genealogy-view`: the requirement on the setting is renamed from *The genealogy interface is off until the reader turns it on* to *The genealogy interface is on until the reader turns it off*; its default changes and a saved value is kept; the name and the beta description stay. The scenario of a file opened with the default setting no longer needs the reader to turn the interface on first.

## Non-goals

- Turning the interface on for a reader whose saved settings hold it as off — including one who never touched this toggle but whose settings were saved with its old default by a change of another setting.
- Changing what the interface does, its modes, the card, or the mode a file opens in.
- Changing the setting's name or description, or dropping its beta mark.
- Changing the *Open the record card when selecting* setting or its default.
- The CHANGELOG entry, which the release PR adds.
- Raising `minAppVersion`.

## Impact

- `src/settingsData.ts`: the default.
- `README.md`: the feature list, the getting-started step and the section on the interface.
- `demo-vault/Start here.md`: the interface is on, `curie.ged` opens in Graph mode, and Source shows the editor.
- Tests: `src/settings.test.ts`.
