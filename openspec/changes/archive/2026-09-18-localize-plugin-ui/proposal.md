## Why

Every word the plugin says is English, whatever language the reader has set
Obsidian to: the command palette, the notices, the settings tab, the status bar,
the search bar, the media popover, the two modals, and the problem list under a
`gedcom` block in a note. Obsidian translates its own chrome around them, so a
Russian-speaking reader sees a Russian app with one English plugin in it. The
author and the first readers are Russian speakers, and nothing about the
plugin's text is hard to translate — it is sixty-odd short strings that were
never given a home outside the code.

Reading the app's language the official way needs `getLanguage()`, which
arrived in Obsidian 1.8.7, and the plugin's floor is 1.5.0. The floor has never
moved; CLAUDE.md keeps a table of what that has cost so that, when it does move,
everything at or below the new floor is collected at once. This is the first
API worth the move, and the table has one row it clears.

## What Changes

- The plugin's own text follows the app language: Russian when Obsidian is set
  to Russian, English otherwise. Every string the plugin writes for a reader
  moves into a catalogue with an English and a Russian side; the code asks the
  catalogue rather than carrying the words itself.
- Counts are spelt by the rules of the language shown — Russian has three plural
  forms where English has two — instead of by appending an `s`.
- The editor's own panels speak the same language: the problems panel's title
  and its "no diagnostics" line, the folded-code placeholder, and the
  completion list's label, which CodeMirror lets a host translate.
- **BREAKING** for readers on an old app: `minAppVersion` rises from 1.5.0 to
  1.8.7. Obsidian installs the newest plugin version an app supports, so a
  reader below the floor keeps 1.10.1 and stops receiving updates; nothing
  breaks for them, but nothing arrives either.
- The `revealLeaf` row of the CLAUDE.md table is cleared in the same release,
  as the table asks: following a link to a file that is already open now reveals
  the tab wherever it is, including in a collapsed sidebar, rather than only
  among the tabs of the main area. The `getSettingDefinitions` row (1.13.0)
  stays.
- CLAUDE.md and the OpenSpec project context stop saying the floor is 1.5.0
  and record why it moved.

This change belongs in **this repository**. It touches only the text this
plugin writes and the Obsidian APIs it calls. The diagnostics, hover text,
quick-fix titles and edit refusals that arrive from `@domorium/language-service`
and `@domorium/codemirror` stay as those packages write them; giving them a
language is a change to the language service and belongs in
[lavich/domorium](https://github.com/lavich/domorium), where it would need
either a locale to be handed in or a message key with its parameters handed
out. This change leaves the seam ready and makes no attempt to translate
upstream text here.

## Capabilities

### New Capabilities

- `plugin-language`: which language the plugin speaks and where it learns it;
  which text follows that language and which stays as written (tags,
  identifiers, paths, key names, and everything the language service produces);
  how counts are spelt; and the minimum app version the plugin declares.
- `document-links`: what following a link from a GEDCOM file to another file
  in the vault does when that file is already open somewhere in the workspace.

### Modified Capabilities

None. `editor-search` and `media-preview` describe what the bar and the popover
do, not the words they do it in; a popover that "says the file is remote" says
so in the reader's language and the requirement is unchanged.

## Impact

- `manifest.json` — `minAppVersion` 1.8.7. `versions.json` maps the next
  release to 1.8.7 when it is cut, as the release workflow checks.
- New `src/i18n/` — the catalogue as `en.json` and `ru.json`, plus the lookup
  and the plural rule in `index.ts`.
- `src/main.ts` — reads `getLanguage()` on load; the notices, the note-block
  problem line, the record switcher's placeholder and the rename modal go
  through the catalogue; command names resolve at registration.
- `src/commands.ts`, `src/settingDefinitions.ts`, `src/settings.ts`,
  `src/editor/status.ts`, `src/editor/searchPanel.ts`,
  `src/editor/mediaPreviewView.ts`, `src/vault/renamedMedia.ts`,
  `src/GedcomView.ts` — strings replaced by catalogue lookups; the two hand-made
  plurals replaced by the plural rule.
- `src/editor/hostExtensions.ts` — CodeMirror's translatable phrases supplied
  for Russian.
- `src/GedcomView.ts`, `src/vault/openTabs.ts` — `revealLeaf` over
  `setActiveLeaf`, all leaves searched rather than root leaves only.
- `harness/mount.ts`, `tests/` — the harness is told a language so a spec can
  see the bar and the panel in Russian.
- `CLAUDE.md`, `openspec/config.yaml`, `src/settings.ts` comment — the floor
  and its table.
- `src/i18n/i18n.test.ts` — holds the English side to the sentence case the
  lint rule holds the source files to, the rule that would cover a locale file
  being unable to parse one.

## Non-goals

- **Translating what the language service says.** Diagnostic messages, hover
  text, quick-fix titles, completion details and edit refusals arrive in
  English and are shown as they arrive. A Russian problem list will read
  "Строка 3: Missing required tag" until upstream carries a language. That is
  the seam, and it is upstream's.
- **A language setting of the plugin's own.** The plugin follows the app.
  A reader who wants the plugin in another language changes Obsidian's.
- **Other languages.** The catalogue is built so that a third file is one
  more file, but only English and Russian ship, and only those two are tested.
- **Translating `manifest.json` or the README.** The manifest is one language
  by design; the plugin's name in the palette stays "Gedcom".
- **Locale-aware dates and numbers.** GEDCOM dates are shown as the file
  writes them; the only numbers the plugin spells are counts.
- **Translating key names.** `Ctrl`, `Alt`, `Shift`, `Enter`, `F3` and the
  macOS glyphs are what Obsidian's own Russian hotkey list shows; the tooltips
  keep them.
- **Clearing the `getSettingDefinitions` row.** That needs 1.13.0, released
  this year, and stranding readers on it is not worth a deprecated method kept
  beside a new one.
