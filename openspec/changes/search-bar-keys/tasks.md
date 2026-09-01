## 1. The key table

- [x] 1.1 Create `src/editor/searchKeys.ts` with `KeyModifier`,
      `SearchKeyBinding`, `SearchKeyActions`, `ScopePusher` and
      `searchBindings(actions)` carrying every row of the table in
      `specs/editor-search/spec.md` — `F3`, `Mod+G`, `Shift+F3`,
      `Mod+Shift+G`, `Enter`, `Shift+Enter`, `Escape`, `Tab`, `Shift+Tab`,
      `Alt+Enter`, `Mod+Alt+Enter`. Verify with new tests in
      `src/editor/searchKeys.test.ts` asserting each key runs its action and
      that no key outside the table is registered.
- [x] 1.2 Gate `Enter`, `Shift+Enter`, `Tab` and `Shift+Tab` on
      `actions.focused()`, and `Tab` additionally on `moveFocus` reporting an
      expanded replace row, returning `false` from `run()` in every inert case.
      Verify in `src/editor/searchKeys.test.ts`: `Enter` inert with
      `focused() === null`, `Enter` replacing from the replace field and
      finding from the find field, `Tab` inert while the replace row is
      collapsed.
- [x] 1.3 Add `matchesBinding(event, binding, mac)` to
      `src/editor/searchKeys.ts`. Verify in `src/editor/searchKeys.test.ts`
      that `Mod` matches `metaKey` when `mac` is true and `ctrlKey` when it is
      false, that a bare `F3` does not match `Shift+F3`, and that an unlisted
      modifier on the event fails the match.
- [x] 1.4 Export the tooltip captions from `src/editor/searchKeys.ts` and
      verify in `src/editor/searchKeys.test.ts` that every caption names a
      binding the table actually carries, so a tooltip cannot promise a key
      that does nothing.

## 2. The panel owns the scope

- [x] 2.1 Change `obsidianSearchPanel` in `src/editor/searchPanel.ts` to take
      `PanelHost = { setIcon: IconSetter; pushScope: ScopePusher }`, push the
      bindings on `mount()` and pop them in `destroy()`, and delete the two
      hand-wired `keydown` listeners on the inputs. Thread `PanelHost` through
      `src/editor/hostExtensions.ts` and `src/editor/composition.ts`. Verify
      `npm run typecheck` passes with no call site left on the old signature.
- [x] 2.2 Add a stub `pushScope` to `harness/mount.ts`: a `window` `keydown`
      listener in the capture phase, where `app.keymap`'s own listens, that walks
      the bindings with `matchesBinding` and, on a claim, calls `preventDefault`
      and `stopPropagation`. Verify the existing cases
      in `tests/search.spec.ts` — Enter finds the next match, Shift+Enter the
      previous, Escape closes — pass again through the scope rather than the
      deleted listeners.
- [x] 2.3 Confirm early, before the table grows harder to change, what a
      claimed key leaves to CodeMirror: add a case to `tests/search.spec.ts`
      pressing `Escape` with the focus in the document, asserting the bar
      closes, the document is unchanged, and a second `Escape` closes nothing
      because the scope was popped. A claimed key does stop the editor — see
      design.md, D5.

## 3. The Obsidian side

- [x] 3.1 Rename `GedcomView.openSearch` to `showSearch(replace = false)` in
      `src/GedcomView.ts` and `CommandView.openSearch` to `showSearch` in
      `src/commands.ts`. Verify by updating the `CommandView` stub in
      `src/commands.test.ts` and seeing its find and replace command cases
      pass.
- [x] 3.2 Implement the private scope pusher in `src/GedcomView.ts` —
      `new Scope(this.app.scope)`, `register` each binding as
      `(event) => (binding.run(event) ? false : true)`, `app.keymap.pushScope`,
      and a returned pop — and pass it into the composition as part of
      `PanelHost`.
      Verify `npm run check` passes and confirm by hand in `demo-vault/` that
      `Mod+F` opens the bar in a `.ged` file and `F3` finds from the document.
- [x] 3.3 Add `hotkeys?: (mac: boolean) => CommandHotkey[]` to `GedcomCommand`
      in `src/commands.ts`, give `replace-in-gedcom-file` `Mod+Alt+F` on macOS
      and `Mod+H` elsewhere, and pass `command.hotkeys?.(Platform.isMacOS)` to
      `addCommand` in `src/main.ts`. Verify with new cases in
      `src/commands.test.ts` covering both platform branches and asserting the
      find command declares no hotkey of its own.

## 4. The tooltips

- [x] 4.1 Give each button in `src/editor/searchPanel.ts` an `aria-label` of
      `label\nkey` — "Next" with `F3`, "Previous" with `Shift+F3`, "Select all
      matches" with `Alt+Enter`, "Replace" with `Enter`, "Replace all" with
      `Mod+Alt+Enter` — and update the selectors that match on the old labels
      in `tests/search.spec.ts`. Verify the chrome case in
      `tests/search.spec.ts` passes with the new labels.

## 5. The browser specs

- [x] 5.1 Cover the keys that answer from either focus in
      `tests/search.spec.ts`: `F3`, `Mod+G`, `Shift+F3` and `Mod+Shift+G` from
      the find field and again with the focus in the document, each moving the
      selection and the bar's count.
- [x] 5.2 Cover `Alt+Enter` from the find field and `Mod+Alt+Enter` from the
      replace field in `tests/search.spec.ts`, asserting that replace-all
      rewrites the document and that `Alt+Enter` lands the selection on a match
      — the editor holds one range, see design.md, Risks.
- [x] 5.3 Cover the focus gate in `tests/search.spec.ts`: with the bar open and
      the focus in the document, `Enter` inserts a line break without searching
      or closing, and `Tab` indents.
- [x] 5.4 Cover field navigation in `tests/search.spec.ts`: `Tab` and
      `Shift+Tab` move between the find and replace fields with the replace row
      expanded, and while it is collapsed the bar takes no part — the focus
      leaves the field without a replace field appearing.
- [x] 5.5 Cover the closed bar in `tests/search.spec.ts`: after the bar closes,
      `F3` no longer moves the selection — the scope was popped.

## 6. Verification

- [x] 6.1 Run `npm run check` and `npm run test:browser`, and confirm both pass
      with no lint, typecheck, unit test, build or browser spec failure.

## 7. Review fixes

- [x] 7.1 Restore the gates the native bar keeps on the two keys that write:
      `Alt+Enter` only from one of the bar's fields, `Mod+Alt+Enter` only with
      the replace row open and the focus in it — its `onAltEnter` and
      `onModAltEnter`, read out of the bundle. Verify in
      `src/editor/searchKeys.test.ts` that both are inert from the document,
      that replace-all is inert from the find field and with the row collapsed,
      and in `tests/search.spec.ts` that a replacement left in the query by an
      earlier replace cannot rewrite the file through a collapsed row.
- [x] 7.2 Guard the whole table on `event.isComposing`, the guard the deleted
      `keydown` listeners kept and `app.keymap` does not supply: give
      `SearchKeyBinding.run` a `SearchKeyEvent` and pass the keydown through
      from both `pushScope` implementations. Verify in
      `src/editor/searchKeys.test.ts` that no binding answers mid-composition.
- [x] 7.3 Make the scope follow the active leaf in `src/GedcomView.ts` (D9):
      push only while `getActiveViewOfType(GedcomView) === this`, follow
      `active-leaf-change`, and pop on both. Verify by hand in `demo-vault/`
      that with the bar open in a `.ged` file and another tab in front, neither
      `Escape` nor `Mod+Alt+Enter` reaches the GEDCOM file, and that both answer
      again on coming back.
- [x] 7.4 Move the harness's stub listener to `window` in the capture phase,
      where `app.keymap`'s own listens, and correct D5 and the browser case that
      described the opposite ordering. Verify `npm run test:browser` passes.
- [x] 7.5 Silence `obsidianmd/commands/no-default-hotkeys` for `src/main.ts` in
      `eslint.config.mjs`, with the reason the default is Obsidian's own key for
      the job, rather than inline — `eslint-comments/no-restricted-disable`
      forbids inline disables of the plugin's rules. Verify `npm run lint`
      reports no new warning.
