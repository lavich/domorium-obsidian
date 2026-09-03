# Changelog

## 1.9.0

- **A photograph a line names can be seen from the line.** Resting the pointer on a
  `FILE` payload, or on the pointer of a multimedia link, shows the picture the
  reference names, cropped to the rectangle that reference asks for — so two links
  to one photograph show two different pictures, while the record's own `FILE`
  shows the whole of it — with the caption the author wrote beneath. Media that is
  not a picture is named rather than hidden: audio, video and a document each say
  what they are, a file the vault does not hold says so, and a remote address is
  reported and never fetched, the plugin making no network request. Media preview
  has a setting of its own beside the record one, and both now open on hover alone
  rather than on a held modifier — a photograph should not need a gesture you have
  to be told about.
- **A payload that leads somewhere is dressed as a link, and following one keeps
  your place.** A reference to a record, a vault file or a web address wears the
  link colour before any gesture is made, and takes the link cursor and underline
  while the platform modifier is down — the modifier being what following needs,
  since a plain click in an editor has to place the caret. A followed file opens in
  a tab of its own with the GEDCOM file still open behind it, and following the
  same file twice brings that tab forward rather than making a second one, even
  where the tab has not been looked at since the window opened.
- **The search bar answers the keys you already know.** `Mod+F` opens it, the same
  key that opens document search everywhere else in Obsidian, and it follows that
  command if you have rebound it, the plugin claiming no key of its own for find;
  replace opens on `Mod+Alt+F`, or `Mod+H` off macOS, listed in Settings → Hotkeys
  where you can reassign it. `F3` and `Mod+G` step to the next match, `Shift+F3`
  and `Mod+Shift+G` to the previous, and `Escape` closes the bar, each from the
  document as well as from the bar's own fields, while `Enter`, `Tab` and the keys
  that write stay inside those fields so an open bar leaves typing and indenting
  alone. The keys belong to the file you are looking at: a bar left open in a
  background tab no longer swallows an `Escape` you needed elsewhere, nor answers a
  replace-all. Every button names its key in its tooltip, spelt for your platform.

## 1.8.2

- **A file whose lines end in CR is read as a file, not as one line.** GEDCOM 5.5.1
  ends a line with CR, LF, CR-LF or LF-CR, but only LF counted, so a file written
  with CR alone arrived as a single line: its version was never found, and
  validation, completion, navigation and colour all worked from that one line. All
  four endings now end a line.
- **A required tag missing from a parent with no children is marked where it is
  missing.** The mark took its place from the first child, so a parent with none had
  nowhere to point and landed on line 1. In a large export that gathered ten
  `Missing required tag FORM in FILE` problems at the top of the file, a hundred
  thousand lines from the media references they describe.
- **Six value sets that 5.5.1 closes are checked at last.** `QUAY 9`,
  `PEDI nonsense`, `RESN whatever`, `ORDI maybe`, `STAT nonsense` under `FAMC` and
  `ADOP nonsense` under `INDI.ADOP.FAMC` all passed unremarked. Completion offers
  the same values while one is typed: a `PEDI` line in a 5.5.1 file proposes
  `adopted`, `birth`, `foster` and `sealing`.
- **A year before the common era is read in the spellings exports write.**
  `1472 B.C.` passed while `1472 BC`, `1472BC` and `1472B.C.` were marked, and
  `29 FEB 1000 BC` was judged by whether 1000 was a leap year.
- **An age in a 5.5.1 file is read by that version's rules.** `AGE <8y` was marked
  while `AGE < 8y` passed, and `8Y` and `child` were marked while `8y` and `CHILD`
  passed, because one rule written for GEDCOM 7 served both versions.
- **A tag written in mixed case names the tag that is meant.** `1 NoTe hello` was
  reported as an unknown tag `N` — a tag that is nowhere in your file — because the
  tag was read only as far as its first upper-case letter. It now reads whole and
  the message names `NOTE`.
- **A line that cannot be read is reported once, in words about GEDCOM.** An
  identifier with a space in it produced a message about characters and offsets,
  then a second one about an unknown tag assembled from the wreckage. Such a line
  now yields one problem, saying an identifier holds letters, digits and underscore
  between two @ marks.
- **An extension tag declared twice in `HEAD.SCHMA` with different URIs is no longer
  reported.** The specification permits it, and files that use it include the
  specification's own example.

## 1.8.1

- **A note written as text in a GEDCOM 5.5.1 file is no longer marked as a
  problem.** `1 NOTE plain text` was told to be a pointer to a `NOTE` record, and a
  source citation carrying its description — `1 SOUR Parish register` — was told the
  same, with `TEXT` beneath it called an unknown tag. Both are forms the
  specification provides, and files exported by MyHeritage, Ancestry and Gramps are
  full of them.

## 1.8.0

- **The editor wears the theme you chose.** Every colour it draws — the document,
  the gutters, a tooltip, the problems list, a token — now comes from the same
  variables the rest of Obsidian reads, so a theme change reaches the `.ged` file
  the way it reaches a note. A hover card had been wearing the library's grey box,
  which no theme could follow, and was the only surface in the editor that looked
  like nothing else in the app.
- **A GEDCOM line is coloured by what each part of it is.** A tag reads as a
  keyword, an identifier as an identifier, and the text after a tag — which had no
  colour at all — as a value. The record an identifier declares is set apart from a
  reference to it, and a block in a note is coloured the same way, so the same
  record looks the same in both places.
- **A path and a web address look like links**, with the colour and weight
  Obsidian gives a link in a note's source and the underline only under the
  pointer.
- **The problems list is a list of results**, in the shape and the measurements of
  Obsidian's own search results pane: a row you can read, a hover, a selected row,
  and a close button the size of every other button in the app.

## 1.7.0

- **A note can link to a person, and the vault sees the link.** `[[tree.ged#@I47@]]`
  is indexed like any other, so the file's Backlinks pane lists the notes that
  mention a record, the graph draws an edge to each, and the note's Outgoing Links
  pane names it. 1.6.0's `obsidian://domorium` link is an external URL, which never
  enters the link cache, so nothing in the vault could answer which notes talk
  about a person. _Copy link to record_ writes the indexed form, spelt the way this
  vault spells its own links and carrying the record's name; _Copy Obsidian URL to
  record_ writes the URL, for a browser or another application.
- **Hovering a link to a record shows the record**, highlighted, without opening
  the file, and `![[tree.ged#@I47@]]` embeds it in the note. A link to a `.ged`
  file used to show a card carrying nothing but the file name, and a link naming a
  record the file no longer has says so rather than showing the wrong one.
- **Typing `[[tree.ged#` offers the records in that file**, by name where the
  format gives one, matched the way the rest of Obsidian matches. It answered "No
  match found": a subpath is read as a heading or a block, and neither exists for a
  file that is not markdown, so the one link that has to be typed by hand was the
  one nothing helped with.
- **A record read inside a note is indented as it is in the editor.** The editor
  draws the indentation rather than writing it, so a preview, an embed and a
  `gedcom` block all started flat and the level of a line had to be counted by eye.
  The plugin's own indentation setting decides, in the notes as in the editor.
- **Landing on a record puts it in the middle of the screen**, where a jump
  downwards used to leave it on the last line with everything it declares below the
  fold.
- **A shared note can be linked to.** `0 @N1@ SNOTE text` answered with its text
  where every other record answers with its identifier, so `[[tree.ged#@N1@]]`
  opened the file and stopped at the top, and _Copy link to record_ wrote a link to
  nothing.
- **The status bar names a file written by Personal Ancestral File** rather than
  calling it GEDCOM: a header naming a system before `GEDC` is PAF, which no
  specification here judges, and saying `GEDCOM` said the same as for a file that
  had been checked.

## 1.6.0

- **The record a pointer names is previewed where the pointer is written.**
  `1 FAMS @F1@` said nothing about who `@F1@` is. Hold Ctrl/Cmd and hover it, and
  the record appears in the editor's own colours. Which gesture opens a preview is
  a setting — Ctrl/Cmd and hover, hover alone, or never — and the preview closes
  when the modifier is released, wherever the pointer has gone by then.
- **A record can be reached by name.** _Go to record_ lists every record in the
  file and matches on name, identifier and tag at once, so `marie` finds
  `Marie /Curie/ @I47@ INDI` and `indi` narrows the list to individuals. Until now
  a record was found by scrolling for its identifier.
- **A search bar and a problems list, in the chrome Obsidian uses for a note.**
  Find and replace, match case, whole word and regular expressions, with the match
  count beside the field. _Go to next problem_ and its counterpart move through the
  file's diagnostics and wrap around, where before a problem was found by scrolling
  for an underline. Both panels follow the theme — every surface CodeMirror paints
  itself was light whatever Obsidian was wearing.
- **The status bar names the specification a file is checked against**, and counts
  its problems: `GEDCOM 5.5, checked as 5.5.1 · 2 problems`. Which of 1.5.0's
  version rules had applied was otherwise visible only by hovering the `VERS` line.
  The plugin's commands are on the tab menu as well as in the palette.
- **A note can link to a person, not only to a file.**
  `obsidian://domorium?vault=Family&file=tree.ged&xref=@I47@` opens the file with
  the cursor on that record — from a note, a browser, or another application — and
  _Copy link to record_ writes one. A link naming a record that is no longer there
  opens the file and says what was missing, rather than failing quietly.
- **A GEDCOM record pasted into a note is read as GEDCOM.** A fenced `gedcom` block
  is highlighted and checked as an excerpt rather than judged as a whole file, and
  what is wrong with it is listed beneath it. The fence may name the dialect, as in
  `gedcom 5.5.1`, and a block holding a whole file is judged by its own header.
- **A note can read a GEDCOM file it never opens.** `api.read(path)` goes to the
  vault and hands back the validator's own document, for a `dataviewjs` block
  asking about a file in another folder; `api.parse(text)` does the same for text
  already in hand.
- **A renamed media file is followed into the payloads that name it.** Obsidian
  rewrites every note that linked to a renamed photo, while
  `1 FILE media/marie.jpg` inside a `.ged` file kept pointing at a path that no
  longer existed. A renamed `.ged` that another file names is followed too. A
  GEDCOM 7 payload that would need a `..` segment is left as it was and reported,
  because the format permits none there; 5.5.1 takes the same move without comment.
  A rename no longer reads, rewrites and re-saves every `.ged` in the vault, and a
  large export no longer freezes the interface while they are examined.
- **The reader keeps their place.** Following a definition into another file and
  coming back landed on line 1, and so did leaving a tab and returning. A file
  rewritten from outside — Sync finishing on a phone, a `git pull` — left the caret
  at the end and the scroll at the top; the caret is now carried by line and column,
  and an open preview is closed, since the rewrite may have taken the record out
  from under it. Settings changed on another device reach a running plugin.
- Typing no longer stringifies the whole document on every keystroke.
- A tooltip follows the glyph the pointer is over; the space after a tag showed that
  tag's documentation. The underline under a marked declaration no longer breaks
  where the tail of `@` crosses it.

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
