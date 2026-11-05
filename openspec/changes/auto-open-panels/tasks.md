## 1. The setting

- [x] 1.1 In `src/settingsData.ts` add `openPanelsOnSelect: boolean`, default `true`, read by `parseSettings` with the default for a missing or non-boolean value; in `src/settingDefinitions.ts` add the toggle row after *Open GEDCOM files as*; add `setting.openPanelsOnSelect.name` ("Open the side panels when selecting") and `.desc` to `src/i18n/en.json` and `ru.json`. Test in `src/settings.test.ts`: the defaults and the persisted-values tests carry the key; a settings file without it reads `true`; a non-boolean reads `true`; `false` is kept; `changedSetting("openPanelsOnSelect", false)` accepts it and `"no"` is refused; the definitions list has the row with its English name, description and default.

## 2. The rule

- [x] 2.1 Create `src/desk/sidePanels.ts` (no `obsidian` import) with `opensSidePanels`, `panelStep` and `sidePanelPlan` as `design.md` lists them. Test in a new `src/desk/sidePanels.test.ts`: `view`, `index` and `link` open and `card`, `history` and `cursor` do not; an open panel in an expanded sidebar is `none`, in a collapsed one `open`, a missing one `open`; the plan is `none` for both panels with the setting off, on a phone, and for `cursor`; the plan with both sidebars collapsed and nothing open is `open` for both; with the card visible and the Index closed only the Index is `open`.

## 3. Applying it

- [x] 3.1 In `src/main.ts` make `cardWanted` build the plan from `settings.openPanelsOnSelect` and `genealogyInterface`, the leaves of `INDEX_VIEW_TYPE` and `RECORD_VIEW_TYPE`, `leftSplit.collapsed` and `rightSplit.collapsed`; apply each `"open"` with `ensureSideLeaf(type, side, { active: false, reveal: true })` and `loadIfDeferred`, restore the active leaf if it changed, and fall back to today's path (`opensDrawer`, then `placeCard`) where the plan does nothing for the card. `npm run check` exits 0.
- [x] 3.2 In the README replace the sentence about the card being placed once without expanding the sidebar with the new behaviour and name the setting.

## 4. Verify

- [x] 4.1 `npm run check`, `npm run test:browser` three times, `npm run openspec:validate`.
- [x] 4.2 Manual check in Obsidian, desktop: both sidebars collapsed, click a graph card, a timeline row, a family node and a wikilink to a record — both sidebars open, focus stays in the view; collapse the right sidebar and click again — it opens again; with both open, a click expands nothing and does not change the front tab; Back in the card and the cursor in Source open nothing; turn the setting off — no sidebar opens; turn the interface off — nothing opens. Phone: the second touch opens the right drawer; the left drawer never opens.
