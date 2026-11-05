## Why

A GEDCOM file opened anew takes its mode from the setting **Open GEDCOM files as**,
Graph by default. A reader who works in Source or in Timeline and moves between
files finds each file open as a graph and has to switch it again, every time.

## What Changes

The user's request (2026-11-05):

«когда я переключаюсь между разными gedcom файлами, то они все открываются как граф — надо сделать чтобы открывались так, как выбрано и стоит сейчас у пользователя и не менять его выбор»

and, after a first plan that added a *Last used* option to the setting (2026-11-05):

«настройка Last used кажется теперь не нужна»

- The setting **Open GEDCOM files as** is removed. A tab with no mode of its own — a
  file opened in a new tab, or a tab navigated to another file — opens in the mode
  the reader last chose in any GEDCOM tab, and in Graph the first time.
- The reader chooses a mode with a header button, a **Show as** command or the
  command that switches between source and the last view. Nothing else changes the
  mode the next file opens in: opening a file, the interface being turned off, a
  restored workspace, Back and Forward, and a link that takes a tab to Source mode at
  a record with no card do not.
- The last mode is kept in the plugin data as `lastMode` and survives a restart. A
  saved `openAs` is ignored and is not written again.
- A tab keeps its own mode as before; with the interface off every tab shows Source.

This repository holds the change; nothing in it belongs upstream in lavich/domorium.

## Capabilities

### Modified Capabilities

- `genealogy-view`: the rule for the mode a file opens in, the retired setting, and
  the scenarios that named it.
- `genealogy-file-graph`, `genealogy-file-timeline`: the scenario of a large file
  opened as a graph or a timeline names the last mode instead of the setting.

## Non-goals

- A setting that pins a fixed opening mode, or a per-folder or per-file choice.
- Changing a tab's own mode when it is restored or navigated Back.
- Raising `minAppVersion`.

## Impact

- `src/settingsData.ts`, `src/settingDefinitions.ts`, `src/desk/deskState.ts`,
  `src/GedcomView.ts`, `src/main.ts`, `src/i18n/{en,ru}.json`, README, the table in
  `CLAUDE.md`.
- The saved `openAs` of existing readers stops having any effect, so a reader who
  pinned Source or Timeline now follows the last mode instead.
