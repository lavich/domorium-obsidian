## 1. The setting

- [ ] 1.1 Add `genealogyInterface: boolean` (default `false`) to `GedcomSettings`, `DEFAULT_SETTINGS` and `parseSettings`; tests in `src/settings.test.ts`: missing key, wrong type and a saved `openAs: "genealogy"` all read as off.
- [ ] 1.2 Add the toggle to `settingDefinitions()` and show the *Open GEDCOM files as* row only while it is on, in `src/settingDefinitions.ts` and `src/settings.ts` (both the definitions path and the deprecated `display()`); tests in `src/settings.test.ts`.
- [ ] 1.3 Add `setting.genealogyInterface.name` and `.desc` to `src/i18n/en.json` and `src/i18n/ru.json`; extend the key-parity check in `src/i18n` tests if one exists.

## 2. The view

- [ ] 2.1 Give `GedcomView` an effective mode that is `source` while the setting is off, use it wherever the view chooses editor or desk, and keep writing the stored mode in `getState`; tests in `src/commands.test.ts` or a new `GedcomView` test beside it, in the happy-dom environment.
- [ ] 2.2 Hide `modeAction` and redraw in `applySettings` when the setting changes; test in the same file.
- [ ] 2.3 Add `genealogyInterface()` to `CommandView` and make the toggle-mode command available only while it is true; test in `src/commands.test.ts`.

## 3. The plugin

- [ ] 3.1 `syncInterface()` in `src/main.ts`: add or remove the ribbon icon, detach Index and Evidence leaves when off, from `onload` (after `onLayoutReady`), `updateSettings` and `onExternalSettingsChange`.
- [ ] 3.2 Turn the Index and Evidence commands into `checkCallback`s gated on the setting, and make `placeEvidence` return while it is off; test in `src/main.test.ts` if the plugin class can be constructed there, otherwise extract the gating into a function tested in `src/commands.test.ts`.

## 4. Browser harness

- [ ] 4.1 Make `harness/desk.ts` and the specs that mount Genealogy mode (`tests/desk.spec.ts`, `tests/panels.spec.ts`) set the setting on explicitly; add one spec in `tests/desk.spec.ts` that with it off the tab shows the editor and no mode switch.

## 5. Docs

- [ ] 5.1 Rewrite the README paragraph on Genealogy mode, the ribbon icon and the panels to say they start off and where to turn them on (`README.md`); add a line to `demo-vault` settings if it pins `openAs`.

## 6. Verify

- [ ] 6.1 `npm run check` and `npm run test:browser`; screenshot the settings tab and a GEDCOM tab with the setting off and on at desktop and phone width; list what still needs a look in Obsidian on the demo vault and on a phone.
