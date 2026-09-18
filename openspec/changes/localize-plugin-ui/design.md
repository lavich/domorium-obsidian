## Context

See proposal.md — Why. What the code gives this change, and where the seams
are:

- The plugin's text sits as literals in ten files. Most are read at module
  load: `COMMANDS` in `src/commands.ts` carries each command's `name`;
  `SETTING_DEFINITIONS` and `RECORD_PREVIEW_OPTIONS` in
  `src/settingDefinitions.ts` carry names, descriptions and dropdown options;
  `REMOTE_NOTES` and `OFFERS` in `src/editor/mediaPreviewView.ts` carry the
  popover's rows and buttons. The rest are inline: notices in `src/main.ts`,
  `src/commands.ts`, `src/GedcomView.ts` and `src/vault/renamedMedia.ts`; the
  status bar in `src/editor/status.ts`; the search bar's placeholders and
  tooltips in `src/editor/searchPanel.ts`; the two modals and the note-block
  problem line in `src/main.ts`.
- Two places spell plurals by hand: `formatProblems` in `status.ts`
  (`1 problem` / `N problems`) and `count` in `renamedMedia.ts` (appends `s`).
  A third, `find-gedcom-references`, sidesteps it with `reference(s)`.
- `harness/mount.ts` imports `searchPanel`, `searchKeys`, `mediaPreviewView`,
  `composition` and `settingsData` straight from `src/` and mounts them in a
  browser with no `obsidian` module. `src/commands.ts` keeps `obsidian` out on
  purpose behind `CommandHost`; `searchPanel.ts` does the same behind
  `PanelHost`, `mediaPreviewView.ts` behind `MediaPreviewHost`. Whatever
  supplies a translation to those files cannot import `obsidian` either.
- `getLanguage()` is exported from `obsidian` since 1.8.7 and returns the
  app's language code — `en`, `ru`, `zh-TW`, `pt-BR` and so on. The floor is
  1.5.0; `obsidianmd/no-unsupported-api` reads the floor from `manifest.json`
  and fails lint on a call above it.
- CodeMirror's own UI text goes through `EditorState.phrases`: `@codemirror/lint`
  asks for `Diagnostics`, `No diagnostics` and `close`; `@codemirror/language`
  for `folded code` and `unfold`; `@codemirror/autocomplete` for `Completions`.
  The plugin assembles the editor's extensions in
  `src/editor/hostExtensions.ts`, so it can supply the facet. CodeMirror's own
  search panel also uses phrases, but the plugin replaces that panel with its
  own.
- `eslint-plugin-obsidianmd`'s recommended config turns on `ui/sentence-case`,
  which looks at literals passed to `addCommand`, `Notice`, `setName`,
  `createEl` text and the like; a value that is a call, not a literal, is
  invisible to it. The project passes it `acronyms: ["GEDCOM"]`. Two sibling
  rules cover locale files, and neither is in `recommended`; `acronyms` and
  `brands` replace the rule's default lists rather than extend them, and the
  default brands include the Cursor editor.
- `GedcomView.openDocumentLink` finds a tab already showing the target with
  `leafShowingFile` over `iterateRootLeaves` and brings it forward with
  `setActiveLeaf(leaf, { focus: true })`. The comment there names `revealLeaf`
  (1.7.2) as the API declined, and CLAUDE.md's table records it. `revealLeaf`
  uncollapses a sidebar, which `setActiveLeaf` will not, and that is why only
  root leaves are searched today: a leaf found in a sidebar could not be shown.
- Unit tests assert English text in about eighteen places, chiefly
  `src/editor/status.test.ts` and `src/editor/mediaPreviewView.test.ts`;
  `tests/mediaPreview.spec.ts` asserts `File not found` once. They import the
  functions directly, with no plugin instance and no `obsidian`.
- The release workflow asserts that `versions.json` maps the released version
  to the manifest's `minAppVersion`.

## Goals / Non-Goals

**Goals:**

- One catalogue with two sides and one lookup, reachable from every file that
  writes text, including the ones the harness mounts without Obsidian.
- English by default, so that a test which never mentions a language sees what
  it saw before, and a reader whose language the plugin lacks sees English.
- A Russian side that cannot silently fall behind the English one: a missing
  key or a mismatched placeholder fails `npm run check`.
- The floor moved once, with the table cleared as far as the new floor
  reaches, and the documents that name the floor all agreeing.

**Non-Goals:**

- Re-reading the language while the plugin runs. Obsidian applies its own
  language on reload; the plugin does the same.
- A translation of what arrives from `@domorium/*` — not even the handful of
  diagnostic codes that could be mapped here. Mapping them would be a second
  copy of upstream's messages, and the seam belongs upstream.
- An abstraction for languages that are not shipped: no lazy loading, no
  external files, no runtime registration.

## Decisions

### A catalogue of the plugin's own, not a library

Two JSON files, `src/i18n/en.json` and `src/i18n/ru.json`, each a flat object of
dotted keys to messages, and `src/i18n/index.ts` exporting the lookup. No
dependency. JSON is what a translator can be handed and what a pull request adding
a third language touches; `resolveJsonModule` is already on, and esbuild inlines
the file into the bundle.

*Alternative considered:* `i18next`. It brings interpolation, plurals and
fallback, all of which the plugin needs, but as ~40 KB of machinery for sixty
strings in two languages, plus a language detector the Obsidian lint plugin
exists to warn against. The three features it would be used for are each a few
lines here, and a dependency in a mobile bundle is not free.

*Alternative considered:* TypeScript modules exporting the objects. They would
type the two sides against each other directly, but they are code, and the
catalogue is content: a translator should not have to read `satisfies` to add a
line.

### The English side is the type; the Russian side must satisfy it

TypeScript infers the shape of an imported JSON file, so `en.json` is still the
source of the key set: `MessageKey` is `keyof typeof en`, and `ru.json` is
assigned to `Record<MessageKey, Message>` in `index.ts`. A key missing from
Russian fails that assignment, so `npm run typecheck` is the first of the
"checks fail" scenarios in the spec. A key present only in Russian is caught by
the test below instead, the assignment being to a wider type.

A `Message` is either a string or a plural table `{ one?, few?, many?, other }`
keyed by the categories `Intl.PluralRules` returns. English tables use `one`
and `other`; Russian tables use `one`, `few`, `many` and `other`. Placeholders
are `{name}` in the string; the lookup replaces each from a params object. A
unit test in `src/i18n/i18n.test.ts` walks both sides and asserts that they
carry the same keys and that every key's set of placeholders matches — that is
the second "checks fail" scenario, which types cannot express.

*Alternative considered:* a nested object per screen (`commands.goToRecord`).
Nesting reads well but the mismatch test and the type become recursive for no
gain; dotted flat keys keep both a one-liner.

### Language is module state, set once at load, English until then

`src/i18n/index.ts` holds the current language and exports `setLanguage(code)`,
`t(key, params?)` and `plural(key, count, params?)` (or `t` handling both — a
detail for implementation). `setLanguage` takes whatever `getLanguage()`
returns, keeps the primary subtag (`ru-RU` → `ru`), and selects the Russian
side for `ru` and the English side for anything else. `main.ts` calls it first
thing in `onload`, before commands, views or the settings tab are registered.

The module imports nothing from `obsidian`, so `searchPanel.ts`,
`mediaPreviewView.ts`, `status.ts` and `renamedMedia.ts` can call `t` and the
harness can still mount them. The default is English, so every existing unit
test passes unchanged; a test that wants Russian calls `setLanguage("ru")` and
resets in `afterEach`. The harness's `mount` gains an optional `language` and
calls `setLanguage` with it, so a Playwright spec can prove the bar and the
panel in Russian.

*Alternative considered:* threading a translate function through `CommandHost`,
`PanelHost` and `MediaPreviewHost`, as `setIcon` and `notify` are threaded. It
is the repository's pattern for Obsidian-only things, but the language is not
Obsidian-only — the harness and the tests have one too — and it would touch
every signature between `main.ts` and the leaf that speaks, for a value that is
the same everywhere. Module state is the honest shape of "the app's language".

### Text is resolved when shown, not when the module loads

Anything evaluated at import time runs before `onload` sets the language, so
the module-level tables stop carrying text:

- `GedcomCommand.name` becomes a `MessageKey`; `main.ts` resolves it in the
  `addCommand` call. `commands.test.ts` compares keys, or resolves them, as it
  suits each test.
- `SETTING_DEFINITIONS` becomes a function returning the definitions with
  `name` and `desc` resolved, and `RECORD_PREVIEW_OPTIONS` likewise; both
  `getSettingDefinitions()` and the deprecated `display()` call it when Obsidian
  asks, which is after load.
- `REMOTE_NOTES` and `OFFERS` in `mediaPreviewView.ts` hold keys and resolve
  them when drawing.
- Everything inline — notices, tooltips, placeholders, the status bar — calls
  `t` where the literal was.

### Plurals through `Intl.PluralRules`

`plural(key, count, params)` selects the table entry by
`new Intl.PluralRules(language).select(count)`, falling back to `other`, then
interpolates `{count}` and the rest. The three hand-made plurals in `status.ts`,
`renamedMedia.ts` and the references notice all go through it; `reference(s)`
becomes a proper pair. `Intl.PluralRules` is in every Chromium that Electron
ships and in the iOS and Android WebViews, and is not a Node API, so the mobile
rule is satisfied.

### CodeMirror phrases, supplied only when there is something to say

`createHostEditorExtensions` adds `EditorState.phrases.of({...})` with the six
phrases translated when the language is Russian, and adds nothing for English,
so the English editor is byte-for-byte what it was. The Russian phrases live in
`ru.ts` under their own keys, and the mapping from CodeMirror's English phrase
to the key is the one place that knows both.

*Alternative considered:* translating `close` too, which the lint panel's close
button uses. It is translated with the rest; the note here is only that the
plugin's own search bar does not go through phrases, and its close button is a
catalogue string like the other tooltips.

### What is not translated

Key names stay as `spellKey` spells them: Obsidian's own Russian hotkey list
shows `Ctrl`, `Alt`, `Shift`, `Enter` in Latin, and the macOS glyphs are
language-free. `GEDCOM`, version numbers, tags, identifiers, paths and URLs
pass through as parameters. The `·` between version and problem count in the
status bar stays. Russian wording follows Obsidian's own Russian translation
where the same concept has a name there — хранилище for vault, заметка for
note, команда, ссылка, настройки — so the plugin does not coin a second word
for what the app already names.

### Sentence case moves with the strings, into a test

Once every literal is a `t(...)` call, `ui/sentence-case` has nothing left to
look at: it reads literals passed to Obsidian's own methods. Its sibling for
locale files, `ui/sentence-case-json`, would cover `en.json` by name, but it
listens for `Literal` nodes under a `Property`, and neither `@eslint/json` nor
`jsonc-eslint-parser` produces those node types — the rule cannot fire on a JSON
file, and the plugin ships no test for it. Rather than configure a rule that
silently checks nothing, `src/i18n/i18n.test.ts` calls `evaluateSentenceCase`,
the evaluator behind both rules, over every English string, with the options the
source files are held to. The deep import into the lint plugin's build is a
devDependency used by a test; if the plugin moves the file, the import fails
loudly in `npm run check`.

Russian is not checked: sentence case is an English convention.

### `revealLeaf` over `setActiveLeaf`, all leaves over root leaves

`GedcomView.leafShowing` iterates `iterateAllLeaves`, and `openDocumentLink`
calls `void this.app.workspace.revealLeaf(open)`. The result is awaited by
nobody, as `setActiveLeaf` was not; `revealLeaf` also loads a deferred view,
which is a bonus and not a dependency. The comments in `GedcomView.ts` and
`openTabs.ts` that explain the root-only search go, and CLAUDE.md's row goes
with them.

### The catalogue is generated once, then owned by hand

The two JSON files were written by evaluating the strings out of the source
files they came from, so that no wording changed in the move. They are ordinary
files from that point on: nothing regenerates them, and a new string is added
to both by hand.

### The floor, and every document that names it

`manifest.json` moves to 1.8.7 in this change. `versions.json` is a release
artifact: the release that carries this change maps its version to 1.8.7,
which the release workflow checks, and the release notes say who is stranded
and what they keep. CLAUDE.md's section is rewritten to say the floor is 1.8.7,
moved once for `getLanguage()`, and the table keeps its
`getSettingDefinitions` row; `openspec/config.yaml`'s context line and the
comment in `settings.ts` follow. `no-unsupported-api` then permits
`getLanguage()` and `revealLeaf` and forbids anything above 1.8.7, which is
the guard the table relies on.

## Risks / Trade-offs

- [A problem line in a note reads half Russian, half English] → Accepted and
  named in the spec; the message is upstream's until upstream carries a
  language. The Russian prefix is still worth having: it tells the reader which
  half is the plugin's.
- [Module state leaks between unit tests that set Russian] → Every test that
  calls `setLanguage("ru")` resets to English in `afterEach`; the i18n test file
  owns a helper for it.
- [`getLanguage()` returns a code the mapping does not expect, such as `zh-TW`]
  → Only the primary subtag is compared, and everything that is not `ru` is
  English by construction.
- [A Russian string is longer than the English one and crowds a control] →
  The settings tab and notices wrap; the status bar and the search bar's
  tooltips do not truncate. The Playwright spec in Russian is where a squeeze
  would show, and the search bar's count is numeric in both languages.
- [Readers on Obsidian 1.5.0–1.8.6 stop receiving updates] → Deliberate, and
  the release notes say so. 1.8.7 is from early 2025; the last release with the
  old floor stays installable.
- [The `sentence-case-locale-module` rule flags Russian-side or key-side text]
  → It runs only on files matching the English globs; `ru.ts` and `index.ts`
  match none. If a future file is named `en-something.ts` for another reason,
  it will be checked — an acceptable surprise.

## Migration Plan

One release. The change lands on `main` with `minAppVersion` 1.8.7; the release
commit bumps the version, adds the `versions.json` entry mapped to 1.8.7, and
the release notes lead with the floor. Rollback is a release with the previous
floor and the English-only text, which is a revert of this change; no data is
written, so nothing needs migrating back.
