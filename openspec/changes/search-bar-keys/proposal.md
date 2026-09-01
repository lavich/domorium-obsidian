## Why

`Mod+F` in a `.ged` file does nothing. The search bar opens from the command
palette only: `search-in-gedcom-file` is registered without a `hotkeys` field,
and Obsidian's own `editor:open-search` never fires because its `checkCallback`
passes only for a markdown editor. With the bar open, three keys work —
`Enter`, `Shift+Enter`, `Escape` — all hand-wired onto the two inputs, so all
three stop the moment focus returns to the document. The bar wears Obsidian's
chrome (#81) but is not Obsidian's bar to a keyboard.

The keys a reader already knows from a markdown document are the target. This
is Obsidian adaptation, so the work belongs in this repository, not upstream in
`lavich/domorium`: the parser and the language service are untouched.

## What Changes

- The search bar gains Obsidian's own key table, read out of `obsidian-1.13.7`:
  `F3` and `Mod+G` find next; `Shift+F3` and `Mod+Shift+G` find previous;
  `Enter` finds next, or replaces when the replace field has focus;
  `Shift+Enter` finds previous; `Escape` closes; `Tab` / `Shift+Tab` move
  between the find and replace fields; `Alt+Enter` selects all matches;
  `Mod+Alt+Enter` replaces all.
- Each key keeps the gate the native bar keeps on it. `F3`, `Mod+G`, `Shift+F3`,
  `Mod+Shift+G` and `Escape` answer wherever focus sits, the document included;
  `Enter`, `Shift+Enter`, `Tab` / `Shift+Tab` and `Alt+Enter` only from one of
  the bar's fields, so typing a line and indenting with Tab still work in the
  document; `Mod+Alt+Enter` only with the replace row open and the focus in it,
  so a replacement the reader cannot see never rewrites the file. `Tab` also
  does nothing while the replace row is collapsed, and no key answers while an
  IME composition is in progress.
- They live on an Obsidian `Scope` parented on `app.scope`, which is the
  mechanism the native bar uses. It is pushed while the GEDCOM leaf is the one
  being looked at and popped when it is not — again as the native bar does — so
  a bar left open in a background tab takes no key.
- `GedcomView` gains `showSearch(replace?: boolean)`. Obsidian's own
  `editor:open-search` dispatches by duck type on that method name, so `Mod+F`
  reaches the GEDCOM view with no `hotkeys` field of ours: the key stays on
  Obsidian's command, a user's rebinding of it is honoured, and no second
  "Search in file" appears beside "Search current file" in the palette.
  **BREAKING** for the internal seam only: `GedcomView.openSearch` and
  `CommandView.openSearch` are renamed to `showSearch`. No public plugin API
  changes — `src/api.ts` does not expose search.
- `replace-in-gedcom-file` gains a default hotkey — `Mod+Alt+F` on macOS,
  `Mod+H` elsewhere — because `editor:open-search-replace` cannot reach us: its
  gate needs a non-null `activeEditor` and has no second branch.
- The three hand-wired `keydown` handlers on the inputs are removed. One keymap
  answers for the panel.
- Each button's `aria-label` carries its binding as `label\nkey`, the way the
  native bar spells a tooltip.

## Capabilities

### New Capabilities
- `editor-search`: the search and replace bar in the GEDCOM file view — which
  keys it answers, from which focus, and which commands open it.

### Modified Capabilities
<!-- None: openspec/specs/ is empty, so this change introduces the first spec. -->

## Impact

- `src/editor/searchKeys.ts` — new: the key table as data, the event matcher,
  and the port the panel pushes a scope through.
- `src/editor/searchPanel.ts` — pushes and pops the scope; loses the input
  `keydown` handlers; tooltips carry their keys.
- `src/editor/hostExtensions.ts`, `src/editor/composition.ts` — thread a panel
  host (`setIcon` plus the scope port) instead of `setIcon` alone.
- `src/GedcomView.ts` — `showSearch(replace?)`; builds the Obsidian `Scope`.
- `src/commands.ts`, `src/main.ts` — `CommandView.showSearch`; a per-platform
  default hotkey on the replace command.
- `harness/mount.ts` — a stub scope, since the Playwright harness mounts the
  composition with no Obsidian `app`.
- Tests: new `src/editor/searchKeys.test.ts`; `src/commands.test.ts` and
  `tests/search.spec.ts` extended.
- Obsidian API surface used: `Scope`, `Keymap.pushScope` / `popScope`,
  `Hotkey`, `Modifier`, `Platform.isMacOS` — all public. No new dependency;
  `@codemirror/search` already supplies every command the keys run.

## Risks

- **`Mod+F` rests on an undocumented duck type.** `editor:open-search` tests
  `typeof view.showSearch === "function"` rather than a class. That is verified
  behaviour of Obsidian 1.13.7, not a contract, and can change without notice.
  The fallback is cheap — the palette command and the pane menu open the bar
  either way — but a release should confirm `Mod+F` still lands in a `.ged`
  file.
- **`Mod+H` looks like a conflict off macOS.** Obsidian's own
  `editor:open-search-replace` holds the same combination, so Settings →
  Hotkeys will show both. In practice only one ever runs: the native command's
  `checkCallback` fails in a GEDCOM view, and ours fails in a markdown editor.

## Non-goals

- Installing `searchKeymap` from `@codemirror/search`. It invents `Mod+D`,
  `Mod+Alt+G` and `Mod+Shift+L`, which Obsidian has nowhere, and misses
  `Mod+G`, `Shift+F3`, `Tab`, `Alt+Enter` and `Mod+Alt+Enter`.
- Any parser or language-service change. Those belong upstream in
  `lavich/domorium`; this change needs none.
- Reaching `editor:open-search-replace` by assigning
  `app.workspace.activeEditor = this`. That would open the view to every
  markdown editor command testing the same field — too much for one hotkey.
- Match case, whole word and regex controls. The native bar carries none.
- Reproducing the native bar's `hasPhysicalKeyboard` guard on `Enter`. It is
  absent from the public `obsidian.d.ts`, and `Enter` in the find field works
  on a phone today; gating it would be a regression.
