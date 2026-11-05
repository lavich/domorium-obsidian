## 1. The data

- [x] 1.1 In `src/settingsData.ts` remove `OpenAsMode`, `readOpenAs`, `isOpenAsMode` and `openAs`; add `DeskMode`, `readDeskMode` and `lastMode` (default `"graph"`, read with `readDeskMode`). Test in `src/settings.test.ts`: the defaults and the persisted-values tests carry `lastMode`; a file without it, an unknown value and a non-string read Graph; `genealogy` reads Graph; a saved `openAs` is ignored and absent from the parsed settings.
- [x] 1.2 In `src/settingDefinitions.ts` remove the row and `openAsOptions`; remove `setting.openAs.*` and `openAsOption.*` from `src/i18n/en.json` and `ru.json`. Test in `src/settings.test.ts`: the definitions list no longer has the row; every definition has a setting and every setting but `lastMode` a definition; the Russian definitions test follows the new order.

## 2. The rule

- [x] 2.1 In `src/desk/deskState.ts` make `initialMode(persisted, lastMode, interfaceOn)` and add `ModeSource` and `rememberedMode`. Test in `src/desk/deskState.test.ts`: a new tab takes the last mode with the interface on and Source with it off; a persisted mode wins; a reader's choice is remembered and a program's is not.

## 3. Applying it

- [x] 3.1 In `src/GedcomView.ts` read `host.lastMode()` where `initialMode` is called, pass `"reader"` from the header buttons, `showMode` and `toggleMode`, and report through `host.modeChosen` in `setMode` while the interface is on; in `src/main.ts` implement `lastMode` and `modeChosen` with a debounced `saveData`, flushed in `onunload`.
- [x] 3.2 Update the README paragraph about the mode a file opens in and the row of the table in `CLAUDE.md` that named the retired setting.

## 4. Verify

- [x] 4.1 `npm run check`, `npm run test:browser` three times, `npm run openspec:validate`.
- [ ] 4.2 Manual check in Obsidian, desktop, interface on: open file A, switch to Source, open file B — it is Source; switch to Timeline, open C — it is Timeline; navigate a tab to another file — it keeps Timeline; a link to a note record takes a tab to Source and the next file still opens in Timeline; restart — each tab keeps its own mode and a file opened anew takes the last chosen one; a `data.json` that still holds `openAs` is rewritten without it; interface off — every tab is Source.
