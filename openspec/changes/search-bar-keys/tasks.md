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
- [x] 2.2 Add a stub `pushScope` to `harness/mount.ts`: a `document` `keydown`
      listener that walks the bindings with `matchesBinding` and, on a claim,
      calls `preventDefault` and `stopPropagation`. Verify the existing cases
      in `tests/search.spec.ts` — Enter finds the next match, Shift+Enter the
      previous, Escape closes — pass again through the scope rather than the
      deleted listeners.
- [x] 2.3 Confirm early, before the table grows harder to change, what a
      claimed key leaves to CodeMirror: add a case to `tests/search.spec.ts`
      pressing `Escape` with the focus in the document, asserting the bar
      closes, the document is unchanged, and a second `Escape` closes nothing
      because the scope was popped. The editor's own `Escape` runs too — see
      design.md, Risks.

## 3. The Obsidian side

- [x] 3.1 Rename `GedcomView.openSearch` to `showSearch(replace = false)` in
      `src/GedcomView.ts` and `CommandView.openSearch` to `showSearch` in
      `src/commands.ts`. Verify by updating the `CommandView` stub in
      `src/commands.test.ts` and seeing its find and replace command cases
      pass.
- [x] 3.2 Implement the private scope pusher in `src/GedcomView.ts` —
      `new Scope(this.app.scope)`, `register` each binding as
      `() => (binding.run() ? false : true)`, `app.keymap.pushScope`, and a
      returned pop — and pass it into the composition as part of `PanelHost`.
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
- [x] 5.2 Cover `Alt+Enter` and `Mod+Alt+Enter` from the document in
      `tests/search.spec.ts`, asserting that replace-all rewrites the document
      and that `Alt+Enter` lands the selection on a match — the editor holds one
      range, see design.md, Risks.
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
