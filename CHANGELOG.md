# Changelog

## 1.1.0

Catches the plugin up with three validator releases and one editor release. The
plugin's own code did not change; all of the below arrives through
`@domorium/codemirror` 1.1.0.

### Fewer wrong errors

- Dates that name their calendar are no longer marked. `JULIAN 1401`,
  `HEBREW 1 TSH 5761` and even `GREGORIAN 1 JAN 2000` were all underlined in a
  GEDCOM 7 note. Each calendar's own months and epochs now apply, so a Hebrew
  date carrying a Gregorian month is still caught.
- **Three older date forms are now marked in a 7.0 file**, so a file that was
  clean may not be: the `@#DGREGORIAN@` calendar escape, a slashed year such as
  `1 JAN 1857/58`, and phrases like `INT 1950 (around 1950)` or `(unknown)`.
  Version 7.0 removed all three — a date phrase belongs in a `PHRASE` line
  beneath the date. GEDCOM 5.5.1 files are unaffected.
- A line whose payload the specification allows to be left out is no longer
  reported as missing a value. `1 EVEN` with only a `TYPE` beneath it was
  flagged, along with 60 other kinds of line, and so were `AGE` and `DATE` left
  empty with a `PHRASE` instead.
- Application-defined extension tags (`_XXXX`) are accepted instead of being
  reported as unknown, and `HEAD.SCHMA` declarations are read.
- A file beginning with a byte order mark no longer opens with a warning on its
  first line.
- A `NOTE` that begins with spaces keeps them, and `CONC` continuations no
  longer change the text they rejoin.

### Large files

- Highlighting is built for the lines on screen rather than for the whole
  document, and is rebuilt once typing pauses instead of on every keystroke.
- Validation cost no longer grows with the number of records times the number of
  lines, so a large tree opens in seconds rather than minutes.

### Reading the messages

- Hover no longer shows stray asterisks around a tag description.
- A tooltip can no longer cover the document: it is capped and scrolls.
- The hint for a broken pointer named every matching record in the file. It now
  names ten and says how many more there are; completion still offers all of
  them.
- A source citation carrying text where a pointer belongs now reads
  `should be a pointer to a SOUR record, written as "@xref@"` rather than
  `should be POINTER`.

## 1.0.0

- First stable release, matching the 1.0.0 line of the rest of Domorium.
- No change to plugin behaviour.

## 0.3.1

- Present the plugin as GEDCOM while retaining Domorium as the ecosystem and
  repository identity.

## 0.3.0

- Rebrand the plugin as Domorium while preserving the permanent `domorium`
  community-plugin ID.
- Move the repository to `lavich/domorium-obsidian` and the shared editor
  dependency to `@domorium/codemirror`.

## 0.2.3

- Restore the permanent Obsidian community-plugin ID `domorium` so updates
  continue to match the existing plugin listing.
- Keep the lowercase display name `gedcom` required by plugin review.

## 0.2.2

- Use the published `@gedcom/codemirror` package for shared GEDCOM editor
  behavior.
- Preserve Obsidian-specific styling, vault links, settings, and persistence
  while removing duplicated editor integration code.
- Verify ESM, CommonJS, TypeScript declarations, atomic reference rename, and
  single-runtime CodeMirror bundling.

## 0.2.0

- Add rename support for GEDCOM record identifiers and all their references.
- Add code actions for creating missing referenced records and removing dangling links.
- Add go-to-definition and reference discovery for GEDCOM cross-references.
- Preserve local file links and editor changes while applying reference edits.

## 0.1.1

- Add searchable settings support for Obsidian 1.13.0 and later.
- Improve validation of persisted plugin settings.
- Update editor DOM creation to use Obsidian helpers.
- Add ESLint quality checks to CI.
- Add provenance attestations for release assets.

## 0.1.0

- Open and edit `.ged` and `.gedcom` files directly in Obsidian.
- Add GEDCOM semantic syntax highlighting and visual structure indentation.
- Report validation errors and warnings while editing.
- Add context-aware completion and tag documentation tooltips.
- Add code folding and navigation from XREF usages to record declarations.
- Support desktop and mobile Obsidian without Node.js or Electron APIs.
