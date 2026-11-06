# Changelog

## 1.18.0

- **A person's card is shorter.** The **Places** section is gone: a place is
  already a link in every fact and every entry of the timeline, and the card of
  a place is one tap away. A fact shows how many sources it cites only where it
  cites any, and one line above the facts of a person and of a family says how
  many have none (`Facts without a source: 3 of 4`).
- **The card of an event holds what the event rests on.** Its Evidence section
  lists the sources the event cites, or says it has none of its own; the sources
  of the whole record and the notes that link to it are on the card of the
  record, one link above.
- **The graph's cards have no picture.** Every card is one height and the graph
  loads no photograph; the record card keeps its portrait. Surnames that fall on
  one hue by chance are told apart by a tone, on the cards of the graph and on
  the bars of the timeline alike.
- **The zoom buttons sit beside the search icon.** On the graph and the timeline
  the zoom out, zoom in and Fit buttons stand in one row at the top corner, right
  after the search icon; the search field opens away from them and never covers
  them, on a phone too.
- **A person with no parents stands one row above their children.** A man whose
  daughter married into a family two generations down no longer stands in the
  top row with that family's oldest ancestor, and brothers and sisters stand
  eldest first where it costs no crossing. The rows of the timeline follow the
  generations of the graph.

## 1.17.0

- **The timeline is drawn in bars.** The column of names is gone: each person is a
  bar from birth to death, with the name written inside it, cut with an ellipsis
  where it is too long, and the whole name in the tooltip. Every person keeps a
  row of their own, in the order of the generations. A bar takes its colour from
  the person's surname — `Лобанов` and `Лобанова` look alike, unlike surnames do
  not — and a person with no surname is grey. A person who may still be alive,
  with no death recorded and born in the last hundred years, runs to today in a
  straight edge; an older bar with no death fades out. People with no dated event
  are not drawn.
- **A click lights a person's links.** A line with an arrowhead falls from each
  parent's bar to the person's birth and from the person to each child, and a
  dashed line joins the spouses at the year of their marriage. The age the
  person reached shows on the year cursor. **Branch** moves onto the selected
  bar, and the command **Branch of the selected person** reaches it from the
  keyboard. One bar is a stop for Tab, and the arrows step between bars; a pinch
  zooms the axis on a phone.
- **The graph's cards are tinted by surname,** in the same colours as the bars,
  in place of pink and blue for sex, with the lines of a card written in an ink
  that reads on its tint in the light and the dark scheme.
- **A family is named with the marriage sign.** `Pierre Curie ⚭ Marie
  Skłodowska-Curie` in the card, the list, the graph and the commands, in place
  of the word between the names.
- **The list shows places and events.** Two more kinds join People, Families and
  Sources. **Places** lists the places of the file with their events and years;
  **Events** lists every event of every person and family with its record, date
  and place. Both search, sort and open a card like the other kinds.
- **The cards are easier to read and reach.** Controls have a larger touch area
  and a visible focus ring, secondary text is no longer faint, and an event has
  one row wherever a card lists it. A person's **Timeline** and **Places**
  sections are folded under headings that count what they hold.

## 1.16.0

- **The list is a mode of the tab.** A GEDCOM tab has four modes, **Graph**,
  **Timeline**, **List** and **Source**, in that order in the tab's header. The
  list shows the people, the families or the sources of the file as rows in the
  look of the file explorer. The search over them opens from an icon, like the
  graph's, and a click on a column header sorts it: ascending, descending, then
  the order of the file. Selecting a row shows the record in the card on the
  right. A person who cites no source is marked, and sorts first by **Sources**.
  A file of many thousands of people scrolls without lag, and the list can be
  used from the keyboard and with a screen reader. The command **Show as list**
  opens it.
- **The Index in the left sidebar is gone.** The list replaces it. A saved Index
  panel is closed once, when Obsidian starts, and the ribbon icon is removed.
  The command **Open the list of the GEDCOM file** keeps its identifier and now
  opens the list of the tab you were in.
- **A file opens in the mode you last chose.** Choosing a mode with a header
  button or a command is remembered; the next file you open starts in it, and
  Graph is the first. The setting **Open GEDCOM files as** is removed.
- **Selecting a record opens its card.** In the graph, the timeline and the list,
  selecting a record shows the record card on the right, opening a collapsed
  sidebar without taking the focus from the view. The setting **Open the record
  card when selecting** turns this off.
- **The timeline.** A click on a person lights their family, and pointing at
  one no longer does. The years sit apart from the names, on an axis with ticks,
  and the names are rows in the look of the file explorer's, more compact and
  still under the pointer.

## 1.15.0

- **The record card.** A record now opens in a card in the right sidebar instead
  of a page in the middle of the tab. The card follows the GEDCOM tab you are in
  and shows a person, a family, a source or a media record. A person's card has
  their portrait, facts, other names, relatives as a list, media, and then their
  timeline, places and the sources they rest on, one under another; the
  separate **Evidence** panel is gone, its content is the card's last section.
  The card has **Back** and **Forward** over the records it has shown and
  **Show in source**. The command **Show the record card** opens it, and on a
  phone it opens in the right drawer.
- **Selecting a record shows it in the card.** A click on a card in the graph, a
  row in the timeline, a row in the index, a family node or a link inside the
  card selects the record. In Source the card follows the record under the
  cursor, without moving the cursor or taking focus from the editor. The
  selection is saved with the workspace.
- **The graph and the timeline are views of the file's tab.** A tab has three
  modes, **Graph**, **Timeline** and **Source**, chosen with buttons in the
  tab's header, with a command for each. They show what you have typed without
  saving, and they no longer open in tabs of their own. **Open GEDCOM files as**
  chooses the mode a file opens in; the default is Graph.
- **Genealogy mode and the tree on a person's page are gone.** A tab or a setting
  that was in Genealogy mode now opens as Graph. Saved tabs of the old timeline,
  graph and Evidence views are closed once, when Obsidian starts.
- **Find opens the view's own search.** In the graph and the timeline, **Find**
  opens the floating search; **Replace** works in Source only.

## 1.14.1

- **The timeline and the graph are calmer.** The captions under the timeline, its
  title, its header line and the zoom slider are gone, and so are the title and
  the summary above the graph. Zoom is by floating **−**, **+** and **Fit**
  buttons over the board, in the timeline, the graph and the tree on a person's
  page. On a phone the timeline now uses the whole screen. Its scrollbars no
  longer run over the axis or the names, and the **Other events** switch and the
  count of people alive are gone: every dated event is always shown.
- **Search floats over the board.** In the timeline, the graph and the tree on a
  person's page, a search icon opens into a field with a counter and ↑ / ↓ arrows
  that step through the matches (Enter for the next, Shift+Enter for the
  previous), and the view glides to each one. **×** clears the query.
- **One tooltip, not two.** The buttons show Obsidian's own tooltip only, placed
  so that it does not cover the buttons next to it.

## 1.14.0

- **A timeline and a graph of the whole file.** Both open in a tab of their own,
  from a header action on a GEDCOM tab, from a command and from the tab's menu,
  and follow the file as it is edited, renamed or moved. The **timeline** puts
  each person on a lifeline, pink for a woman, blue for a man, with births,
  marriages, deaths and other events marked on it, a year cursor that shows how
  old everyone was that year, and a search. The **graph** draws a card for each
  person and a node for each family, the husband on the left with each side's
  family on its own side, laid out to cross as few lines as possible. Both can
  show just one person's branch, and both draw only what is in view, so a file of
  thousands of people stays quick. A person opens their page in the file's tab,
  and a family node opens the family's.
- **The tree on a person's page is drawn like the graph.** It shows the same
  people as before: parents and grandparents, the first spouse's parents, spouses,
  siblings, children and grandchildren. It is drawn with the graph's cards, which
  show a portrait, the given name, the surname and the years, and it fills the
  page without scrolling.
- **The genealogy interface is a beta.** The setting is now called **Genealogy
  interface (beta)** and says so: this release adds a good deal to it, and it may
  still change.
- **The Branch button toggles.** Pressing it again on the person whose branch is
  shown returns to the whole file.

## 1.13.0

- **The genealogy interface is off until you turn it on.** Genealogy mode, the
  **Open Domorium** index, the evidence panel and the ribbon icon with their
  commands now appear only after you turn on **Genealogy interface** in the
  plugin settings; until then a GEDCOM file opens in the source editor, as it did
  before 1.12.0. If you used Genealogy mode, turn the setting on to get it back:
  the mode each tab was in is kept. Turning it off closes the panels and shows the
  source again. **Open GEDCOM files as** applies only while the interface is on.

## 1.12.0

- **A GEDCOM file opens as genealogy.** A tab now has a Genealogy mode beside the
  source editor, and a file opens in it by default. A person has a page with
  four views — their facts, names and family; a tree of two generations each
  way; a timeline of their life among their close relatives; and the places of
  that life — and families, sources and multimedia records have pages of their
  own. The ribbon's **Open Domorium** lists the file's people, families and
  sources; the evidence panel beside a page keeps a fact's own sources apart
  from the record's and lists the notes in the vault that link to it. Portraits
  and galleries show the files a record links, each cut to the part its link
  names. Nothing in Genealogy mode writes to the file: **Show in source**, and
  switching the tab to Source, take you to the lines a correction belongs in.
  To keep opening files in the editor, set **Open GEDCOM files as** to Source in
  the plugin settings.
- **A year is read only where it can be trusted.** A date before the common era
  or in another calendar is shown as the file writes it, without a year that
  would sort it among Gregorian ones.

## 1.11.0

- **The plugin speaks the language Obsidian is set to, in English and
  Russian.** Commands, notices, settings, the status bar, the search bar, the
  media popover, the two modals, the problem line under a GEDCOM block in a
  note, and the panels CodeMirror paints on the plugin's behalf all follow the
  app, with counts spelt by that language's plural rules. What the language
  service writes — diagnostics, hover text, quick-fix titles — stays English
  until it carries a locale.
- **Obsidian 1.8.7 or later is required**, the release in which an app first
  tells a plugin its language. A reader on an older app keeps 1.10.1. With the
  new floor, a link to a file already open reveals its tab wherever it is,
  including in a collapsed sidebar.

## 1.10.1

- **The media preview keeps its size while the image you asked for loads,**
  rather than collapsing to an empty frame under the pointer — which newer
  Chromium answers by closing the popover, so **Show this image** would have
  closed it on its own answer once Obsidian's Electron catches up.

## 1.10.0

- **A photograph at a web address is drawn once you have asked for it,** for
  that one image from the preview or for every one through **Load images from
  the web**. Until then the plugin makes no network request.
- **Escape works in the editor again.** A second copy of `@codemirror/state`
  beside the one Obsidian provides had left it with an undefined selection.

## 1.9.1

- **Nothing in the plugin itself changed.** `main.js` and `styles.css` are
  byte-for-byte what 1.9.0 shipped. The release carries repository work only: the
  two errors Obsidian's plugin review reported, both of them in the browser
  harness the tests mount rather than in anything that reaches a vault, and the
  lint rules that had been switched off there and so let them through.

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
