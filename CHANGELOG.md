# Changelog

## 1.3.0

- Dates that name their calendar are no longer marked. `JULIAN 1401`,
  `HEBREW 1 TSH 5761` and even `GREGORIAN 1 JAN 2000` were all underlined in a
  GEDCOM 7 note. Each calendar's own months and epochs now apply, so a Hebrew
  date carrying a Gregorian month is still caught.
- **Three older date forms are now marked in a 7.0 note**, so a file that was
  clean may not be: the `@#DGREGORIAN@` calendar escape, a slashed year such as
  `1 JAN 1857/58`, and phrases like `INT 1950 (around 1950)` or `(unknown)`.
  Version 7.0 removed all three — a date phrase belongs in a `PHRASE` line
  beneath the date. GEDCOM 5.5.1 files are unaffected.
- A line whose payload the specification allows to be left out is no longer
  reported as missing a value. `1 EVEN` with only a `TYPE` beneath it was
  flagged, along with 60 other kinds of line, and so were `AGE` and `DATE` left
  empty with a `PHRASE` instead.
- A file beginning with a byte order mark no longer opens with a warning on its
  first line.
- A source citation carrying text where a pointer belongs now says what belongs
  there rather than naming the rule.

## 1.2.0

- Keep the spaces that belong to a value. A `NOTE` whose text began with spaces
  was losing them, and `CONC` continuations silently changed the text they
  rejoined.
- Stop the hint for a broken pointer from covering the note. It named every
  matching record in the file and offered a quick fix for each; it now names ten
  and says how many more there are, and the tooltip is capped and scrolls.
  Autocomplete still offers every record.
- Hover no longer shows stray asterisks around the tag description.
- Colour and validate large files without the editor stalling: highlighting is
  built for the visible lines rather than the whole note, diagnostics refresh
  once typing pauses, and validation cost no longer grows with the number of
  records times the number of lines.

## 1.1.0

- Accept application-defined extension tags (`_XXXX`) instead of flagging every
  one of them as an unknown tag. Notes holding files exported by other genealogy
  applications no longer fill with false warnings.
- Read extension tag declarations from `HEAD.SCHMA` in GEDCOM 7 documents: hover
  shows the URI a tag is bound to, and autocomplete offers the declared tags.
- Warn when a GEDCOM 7 document uses an extension tag it never declares in
  `HEAD.SCHMA`. GEDCOM 5.5.1 files, which have no such structure, are unaffected.
- Stop offering top-level record tags as completions inside a structure whose
  type cannot be resolved.

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
