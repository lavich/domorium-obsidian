## Context

See proposal.md — Why. What shapes the approach:

- `search({ top: true, createPanel })` in `src/editor/hostExtensions.ts` wires
  the search state and the panel. The keys are a separate export of
  `@codemirror/search` and nothing installs them. The one keymap in the editor
  is `keymap.of([indentWithTab, ...defaultKeymap, ...historyKeymap])`, inside
  `@domorium/codemirror`.
- A CodeMirror keymap only sees `contentDOM`. The panel's DOM sits outside it,
  which is why the stock panel bridged with `runScopeHandlers`.
- `Scope`, `Keymap.pushScope` / `popScope`, `Hotkey`, `Modifier`,
  `Platform.isMacOS` and `showSearch(replace?: boolean)` are all in
  `obsidian.d.ts`. `KeymapEventListener` is documented as "return `false` to
  automatically preventDefault".
- The Playwright harness (`harness/mount.ts`) mounts `createGedcomComposition`
  with no Obsidian `app`, so anything reached through `app.keymap` needs an
  injected port. `setIcon: IconSetter` already establishes that pattern.
- `isDesktopOnly` is false. Nothing under `src/` may reach a Node built-in.

## Goals / Non-Goals

**Goals:**

- One keymap answers for the bar, and it is the panel's own lifetime that owns
  it — pushed on mount, popped on destroy.
- The key table is data in `src/`, unit-testable without a DOM and without
  Obsidian, so the browser specs exercise the same table the plugin ships.
- The seam the harness stubs stays as thin as `setIcon`: the matcher is real
  code, only the push and pop are stubbed.

**Non-Goals:**

- Reworking how `search()` is configured, or the panel's chrome and layout
  (#81, #88, #89 settled those).
- A settings surface for the key table. These are Obsidian's keys; the two keys
  that open the bar are reassignable through Settings → Hotkeys, and the rest
  are the bar's own, as they are in Obsidian.

## Decisions

### D1. An Obsidian `Scope`, not a CodeMirror keymap

A scope pushed on `app.keymap` answers wherever focus sits, which is the
property the bar needs and a CodeMirror keymap cannot have for the panel's own
DOM. Parenting it on `app.scope` lets every key the bar does not register fall
through untouched. This is what the native bar does.

*Alternatives:* `keymap.of(searchKeymap)` — wrong table (see proposal.md —
Non-goals) and blind to the panel's DOM. A `runScopeHandlers(view, e,
"search-panel")` bridge from the panel's `keydown` — that is the stock panel's
workaround for having no scope, and it still would not see a key pressed in the
document.

### D2. The table is data; the panel supplies the actions

`src/editor/searchKeys.ts` is new and holds no DOM:

```ts
export type KeyModifier = "Mod" | "Ctrl" | "Meta" | "Shift" | "Alt";

export interface SearchKeyBinding {
  modifiers: KeyModifier[];
  key: string;                    // from KeyboardEvent.key: "F3", "G", "Enter"…
  /** True when the key was the bar's; false leaves it to the editor. */
  run(): boolean;
}

export interface SearchKeyActions {
  findNext(): void;
  findPrevious(): void;
  close(): void;
  selectAll(): void;
  replaceNext(): void;
  replaceAll(): void;
  /** Which field has the focus, if either. */
  focused(): "search" | "replace" | null;
  /** False while the replace row is collapsed, as the native bar's no-op. */
  moveFocus(back: boolean): boolean;
}

export function searchBindings(actions: SearchKeyActions): SearchKeyBinding[];
export function matchesBinding(
  event: KeyboardEvent,
  binding: SearchKeyBinding,
  mac: boolean,
): boolean;

/** What the panel needs of `app.keymap`; pushes bindings, returns the pop. */
export type ScopePusher = (bindings: SearchKeyBinding[]) => () => void;
```

Every action already exists as a CodeMirror command — `findNext`,
`findPrevious`, `closeSearchPanel`, `selectMatches`, `replaceNext`,
`replaceAll` — so the panel's `SearchKeyActions` is a thin adapter over them
plus the two focus questions only the panel can answer.

`run()` returning a boolean rather than calling `preventDefault` keeps the table
free of the event: the caller decides what claiming a key means. On the Obsidian
side each binding is registered as `() => (binding.run() ? false : true)`,
`false` being Obsidian's "claimed, preventDefault".

### D3. The focus gate lives in the table, not at the call site

The gates are Obsidian's own, read out of its bundle with the keys. `Enter`,
`Shift+Enter` and `Alt+Enter` ask `actions.focused()` and return `false` when it
is `null`, which is how the key reaches the editor — the gate its `onEnter`,
`onShiftEnter` and `onAltEnter` keep. `Mod+Alt+Enter` asks for more, as its
`onModAltEnter` does: the replace row open *and* the focus in it, because the
replacement lives in that row and a key that rewrites the file with a
replacement the reader cannot see is a key that loses work. `Tab` and
`Shift+Tab` return `false` when `moveFocus` reports the replace row collapsed.
`F3`, `Mod+G`, `Shift+F3`, `Mod+Shift+G` and `Escape` claim unconditionally,
which is the whole of what Obsidian claims unconditionally.

Above every gate sits one more: no binding answers while
`event.isComposing`. `app.keymap` does not filter composition — its
`onKeyEvent` skips modifier keys and nothing else — which is why Obsidian's own
`onEnter` opens with that check, and why the panel's deleted `keydown`
listeners had it. `Enter` mid-composition commits an IME candidate, and taking
it would lose the candidate and search for a half-typed term.

That keeps the gate in the one place a test can reach without a browser, and it
is why `searchKeys.test.ts` can cover the whole table with a fake
`SearchKeyActions`.

Returning `false` means the key was never the bar's, so the browser goes on to
do what it would have done: `Tab` in the find field with the replace row
collapsed moves the focus to the next control, which is what Obsidian's own bar
does with a key its `goToNextInput` declines.

### D4. `matchesBinding` is shipped code, not harness code

The harness has no `app.keymap`, so its stub must match events itself. Putting
the matcher in `src/` means the browser specs drive the real table through the
real matcher, and the only test-only code is the push and pop. `Mod` resolves to
`metaKey` on macOS and `ctrlKey` elsewhere; the `mac` flag is a parameter so
both branches are unit-testable, with `Platform.isMacOS` supplying it in the
plugin and `navigator` in the harness.

*Alternative:* let the harness write its own matcher. Then the browser specs
would prove a stub correct and say nothing about the shipped table.

### D5. Ordering: the scope first, then CodeMirror

`app.keymap`'s constructor is `window.addEventListener("keydown",
this.onKeyEvent.bind(this), true)` — `window`, capture phase, the earliest point
there is. CodeMirror handles keys on `contentDOM` in the bubble phase. So the
scope sees every key first, and a claimed one gets `preventDefault` *and*
`stopPropagation` before the editor is reached: `Escape` from the document
closes the bar and the editor's `simplifySelection` does not also run.

A key the table declines returns non-`false` from the scope handler, which
Obsidian reads as unclaimed and passes on untouched, so `Enter` still opens a
line and `Tab` still indents. Note what non-`false` does *not* do: `handleKey`
returns at the first matching entry whose key is named, so it never walks on to
the parent scope. A key the bar registers is a key the global hotkey manager
will not see while the bar is open — which is the point for `F3`, and the reason
the table registers nothing it does not mean to take.

The one visible cost of winning the order: with the bar open, `Escape` no longer
reaches CodeMirror's completion keymap, so it closes the bar rather than the
autocomplete popup, and the second `Escape` dismisses the popup. Accepted — the
alternative is letting the editor pre-empt the bar, which is worse.

### D6. `showSearch` for `Mod+F`; an own hotkey for replace

Obsidian's `editor:open-search` dispatches by duck type — `typeof
view.showSearch === "function"` — with `app.workspace.activeEditor` first and
`app.workspace.activeLeaf.view` second. For a GEDCOM leaf nothing sets
`_activeEditor` and the view is not a `MarkdownView`, so the first branch is
null and the second reaches us. Naming the method `showSearch(replace?:
boolean)` is therefore the whole of `Mod+F`, and it reads nothing private:
that signature is public on `MarkdownView`.

`editor:open-search-replace` cannot be reached the same way — its gate needs a
non-null `activeEditor` and has no second branch — so replace keeps a hotkey of
the plugin's own. `GedcomCommand` grows `hotkeys?: (mac: boolean) =>
CommandHotkey[]`, a function so the per-platform default stays pure and
testable, with `src/main.ts` passing `Platform.isMacOS`. `CommandHotkey` is
declared locally and structurally matches `Hotkey`, so `src/commands.ts` still
imports nothing from `obsidian`.

*Alternatives:* `hotkeys: [["Mod"], "F"]` on the find command — claims `Mod+F`
app-wide beside Obsidian's own and ignores a reader who has rebound it;
assigning `app.workspace.activeEditor = this` to reach the replace command —
rejected in proposal.md — Non-goals.

### D7. One host object through the composition, not a second positional argument

`obsidianSearchPanel(setIcon)` becomes `obsidianSearchPanel(host: PanelHost)`
with `PanelHost = { setIcon: IconSetter; pushScope: ScopePusher }`, and
`createHostEditorExtensions` and `createGedcomComposition` thread that one
object. Threading a fourth positional argument through two layers instead would
read worse at every call site and again at the next port.

`GedcomView` supplies the Obsidian side: build `new Scope(this.app.scope)`,
`register` each binding, and push and pop it as the active leaf changes (D9).
The harness supplies a `window` `keydown` listener in the capture phase — the
same position as `app.keymap`'s own, see D5 — that walks the bindings with
`matchesBinding` and, on a claim, calls `preventDefault` and `stopPropagation`.

### D9. The scope follows the active leaf, not the panel alone

A scope on `app.keymap` answers app-wide, and the panel outlives the leaf being
looked at: a `TextFileView` is not unloaded when its tab goes to the background.
Pushing on mount and popping on destroy alone would leave `F3` searching, and
`Mod+Alt+Enter` rewriting, a file in a background tab, with `Escape` swallowed
where the reader needs it. So `pushScope` pushes only while
`getActiveViewOfType(GedcomView) === this` and follows `active-leaf-change`,
popping when the leaf goes away and pushing again when it comes back. Two GEDCOM
tabs with a bar open each therefore act on the file being looked at.

Obsidian's own bar does the same thing by the same means: `MarkdownView` applies
its search scope through a callback that pops the old one, and `hide()` — called
when the editor is hidden — calls `search.hide()`, which pops it.

*Alternatives:* gate inside the registered handler instead. Rejected: a handler
returning `undefined` does not walk on to the parent scope (D5), so the key
would be swallowed rather than passed on. Pop on `blur` of the editor —
`TextFileView` offers no such hook, and the focus legitimately sits in the
panel's own input, which is outside `contentDOM`.

### D8. The hand-wired input handlers go

The two `keydown` listeners on the inputs are deleted rather than kept as a
fallback: with them in place `Enter` would be handled twice, and a bug in either
path would be invisible while the other worked.

## Risks / Trade-offs

- `Mod+F` rests on an undocumented duck type (proposal.md — Risks) → the palette
  command and the pane menu open the bar independently, so the fallback costs
  nothing; a release checks `Mod+F` in a `.ged` file by hand.
- `Mod+H` reads as a conflict off macOS (proposal.md — Risks) → only one of the
  two commands ever passes its check, and the binding is reassignable in
  Settings → Hotkeys.
- A pushed scope also sees keys typed into the document, so a mistake in the
  focus gate would break typing or indenting rather than merely fail to search
  → the gate is table data covered by unit tests, and the browser specs assert
  `Enter` still inserts a line and `Tab` still indents with the bar open.
- A scope handler that claims a key **does** stop CodeMirror from acting on it —
  asserted, and read out of the bundle: `app.keymap` listens on `window` in the
  capture phase, so it is reached first and `stopPropagation` keeps the editor
  from ever seeing the key (D5). Cost: with the bar open, `Escape` no longer
  reaches the completion keymap, so it closes the bar rather than the autocomplete
  popup → accepted, the second `Escape` dismisses the popup.
- A pushed scope answers app-wide and outlives the tab being looked at → the
  scope follows the active leaf (D9), which is what keeps `Mod+Alt+Enter` from
  rewriting a background file. Not unit-testable — it is `app.workspace` — so a
  release checks it by hand: open the bar, switch tabs, press `Escape` and
  `Mod+Alt+Enter`, and see neither reach the GEDCOM file.
- `app.keymap` does not filter IME composition, so moving the keys onto it would
  have broken committing a candidate with `Enter` in the find field → the table
  answers no key while `event.isComposing`, covered for every binding in
  `searchKeys.test.ts`.
- The harness's scope is a stub, so ordering against the real `app.keymap` is
  only ever confirmed by hand in `demo-vault/` → the same trade-off `setIcon`
  already carries, and the stub now listens where `app.keymap` listens: `window`,
  capture phase.
- The harness bundle carries two copies of `@codemirror/state`: the 6.5.0 pinned
  in `package.json`, and a 6.7.1 nested under `@codemirror/commands` 6.10.4,
  which asks for `^6.7.0`. A range built by a command from one copy reads as
  `undefined` through the other, so `simplifySelection` leaves
  `{"ranges":[{}]}` rather than a cursor. The plugin is unaffected —
  `esbuild.config.mjs` marks every `@codemirror/*` external and Obsidian
  supplies one copy — and the harness duplicates only because it bundles
  everything. Confirmed twice: the same `Escape` breaks the selection in the
  harness with no panel open at all, and a metafile built without the externals
  lists both paths → a spec must not assert on the selection left by a
  `@codemirror/commands` command in the harness, which is why the browser case
  for `Escape` asserts the bar closes and the document is untouched. With the
  ordering settled the way D5 describes, `simplifySelection` no longer runs on
  that `Escape` at all — but the rule stands for any other command. The dedupe
  is its own issue and its own PR, as the `@domorium` 2.0.0 bump is.

- `Alt+Enter` runs select-all-matches from the bar's fields, and the editor keeps
  one range of it:
  `EditorState.allowMultipleSelections` is off, and
  `tr.newSelection.asSingle()` is what a state without it applies, so a
  two-range selection arrives and one survives → accepted. The bar's own "Select
  all matches" button, shipped in #81, dispatches the same command and has
  always had the same ceiling, so the key promises exactly what the button
  delivers. Turning it on wants `allowMultipleSelections` and `drawSelection()`
  to render a second range — editor-preset behavior, which lives upstream in
  `lavich/domorium`, so it is filed there rather than worked around here.

## Migration Plan

No data, settings or persisted state change. The renames — `GedcomView.openSearch`
→ `showSearch`, `CommandView.openSearch` → `showSearch` — are internal; `src/api.ts`
exposes no search. Rollback is reverting the commit: the palette commands and the
pane menu keep working with or without the change.
