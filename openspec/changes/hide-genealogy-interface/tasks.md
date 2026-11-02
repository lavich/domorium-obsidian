## 1. The setting

- [ ] 1.1 Add `genealogyInterface: boolean` (default `false`) to `GedcomSettings`, `DEFAULT_SETTINGS` and `parseSettings`; in `src/settings.test.ts` update the `DEFAULT_SETTINGS` and `settingDefinitions` deep-equals and add: missing key, wrong type and a saved `openAs: "genealogy"` all read as off.
- [ ] 1.2 Add the toggle to `settingDefinitions()` as the first row, and let `src/settings.ts` render it in both the definitions path and the deprecated `display()`; tests in `src/settings.test.ts`.
- [ ] 1.3 Add `setting.genealogyInterface.name` and `.desc` to `src/i18n/en.json` and `src/i18n/ru.json`, and add to `setting.openAs.desc` in both that it applies while the interface is on; `src/i18n/i18n.test.ts` already checks parity and sentence case.
- [ ] 1.4 Add the decision to the CLAUDE.md "minimum app version" table: a conditional *Open GEDCOM files as* row needs 1.13.0 (`visible`, `update()`).

## 2. The view

- [ ] 2.1 Add `effectiveMode` and `initialMode` to `src/desk/deskState.ts`; tests in `src/desk/deskState.test.ts`: off gives source whatever is stored, on gives the stored mode, a tab opened while off stores source and stays source when the interface is turned on.
- [ ] 2.2 In `src/GedcomView.ts` read the effective mode in every place that chooses what to show, seed new tabs with `initialMode`, make `openRecord`, `setMode` and `showInSource` inert while off, hide `modeAction` and call `host.genealogyChanged` in `applySettings` when the effective mode changed. Covered by 2.1's tests of the rules and the manual checks in 6.1.
- [ ] 2.3 Add `genealogyInterface()` to `CommandView` and make the toggle-mode command available only while it is true; in `src/commands.test.ts` extend the `CommandView` stub and replace the always-available assertion for `toggle-gedcom-mode` with an on and an off case.

## 3. The plugin

- [ ] 3.1 `syncInterface()` in `src/main.ts`: add or remove the ribbon icon, detach Index and Evidence leaves when off, from `onload` (after `loadData`, detach after `onLayoutReady`), `updateSettings` and `onExternalSettingsChange`, which also redraws an open settings tab. No unit test is possible (`obsidian` is types only); covered by 6.1.
- [ ] 3.2 Turn the Index and Evidence commands into `checkCallback`s gated on the setting, and make `placeEvidence` return before it sets `evidencePlaced` while the setting is off. Covered by 6.1.

## 4. Docs

- [ ] 4.1 Update `README.md` wherever it says Genealogy mode, the ribbon icon, the panels or their commands are there from the start (Features, Usage steps, the ribbon and panels paragraphs, *Open GEDCOM files as*), saying they start off and where to turn them on. `demo-vault` has no `.obsidian`, so note in the README or `demo-vault` start page that the setting must be on there.

## 5. Gate

- [ ] 5.1 `npm run check`. `npm run test:browser` is not required: no rendering, layout or panel code changes.

## 6. Manual checks in Obsidian on the demo vault, and on a phone

- [ ] 6.1 Toggle the setting off, on, off, on: the mode switch, ribbon icon, palette entries and panels follow; open Index and Evidence panels close; a saved workspace with them open loads with them closed; no duplicate or ghost ribbon entry (also in Appearance's ribbon list and on a phone); a Genealogy tab returns to its record; a tab opened while off stays Source when turned on.
