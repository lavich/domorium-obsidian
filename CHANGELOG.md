# Changelog

## 1.5.0

- **A note whose GEDCOM version cannot be checked no longer looks clean.**
  `2 VERS 4.0`, a misspelled version and a note with no version line were all
  checked against the GEDCOM 7 rules and reported nothing, because none of those
  rules applied. Each now carries one error saying so, and the rest of the
  checking goes quiet rather than judging the note by the wrong specification.
  Highlighting, folding and navigation are unaffected.
- **`2 VERS 5.5`, `5.5.5` and `5.5EL` are checked against the 5.5.1 rules with a
  warning** that says the two differ, so some marks may not apply and others may
  be missing. Those notes previously collected the 5.5.1 marks with no
  explanation of where they came from.
- Autocomplete and file links go quiet for a version with no rules.
- **Anything written under a structure that cannot hold it is now marked.** A
  line beneath `1 TITL`, or beneath the trailer in a 5.5.1 note, was accepted
  without comment.
- `2 VERS  5.5.1` written with two spaces was read as GEDCOM 7, so the note was
  checked against the wrong rules and an absolute media path stopped being a
  link. Both are fixed.
- `1 OBJE` with `FILE` and `TITL` beneath it, the inline form of a 5.5.1 media
  link, no longer reports `FILE` as an unknown tag.

## 1.4.0

- An extension tag used as an enumeration value is no longer marked as an error.
  `2 PEDI _ENUMVAL` and `2 ROLE _CHILD` were underlined in a GEDCOM 7 note,
  though the specification permits extending an enumeration this way. One that
  is never declared in `HEAD.SCHMA` is now a warning instead of an error.
- A `HEAD.SCHMA` tag declared as an abbreviation for a standard URI is read as
  the structure it names. A record written under such an alias now satisfies a
  pointer to the standard tag, and a date in an aliased calendar is accepted.
- `1 EVEN` with a `TYPE` beneath it is no longer reported as missing a value in
  a GEDCOM 5.5.1 note.
- **A count that is not a number is now marked.** `1 NCHI abc` was accepted, and
  so were `3.7`, `12abc` and `Infinity`.
- An event with neither a value nor anything beneath it is a warning rather than
  an error, and says what is actually wrong: the line asserts nothing and other
  software may drop it.
- A source citation pointing at a record type the note does not contain no
  longer offers an empty list of candidates.

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
