## Context

See proposal.md. What exists on `main` (925fc82), observed in the code and by probing the published
`@domorium/language-service`:

- The language service returns the full tree: `DocumentSymbol { name, detail, label, kind, range,
  children }`. `name` is the tag, `detail` is the payload — a value or a pointer `@X@`, not told
  apart — and `CONC`/`CONT` arrive as children. A record's `label` is what a reader calls it: the
  name of a person, and for a shared note the whole first line of its text (no truncation at 400
  characters). For a record, `detail` is its identifier. Both dialects give a note record as `SNOTE`
  (7.0) or `NOTE` (5.5.1) with the text in `label` and the continuation in children.
- `src/genealogy/build.ts` keeps a summary: `Person`, `Family`, `PersonEvent { tag, date, place,
  value, type, range, citations }`. Names are one parsed `NAME` plus `otherNames: string[]`.
  Everything else of a record is dropped. `person()` is resolved on request for the selected record.
- The cards: `personPage.ts`, `familyPage.ts`, `eventPage.ts` assemble sections; `renderFold`
  (`fold.ts`) folds one with a count and keeps it open across a redraw through `data-open` on the card;
  `evidence.ts` draws the citations; `factRow.ts` the compact fact row; i18n is `en.json` and `ru.json`.
- `docs/design/upstream-requests.md` already asks upstream for «Schema access» and «Value and pointer
  apart». The plugin names its event tags by hand (`src/genealogy/tags.ts`).

## Goals / Non-Goals

**Goals:** every line of a person, family and event shown somewhere; a consistent anatomy of
sections; nothing paid for records nobody opened.

**Non-Goals:** the other three cards; a schema in the plugin beyond what labels need.

## Decisions

### D1. The record's lines, on request

`src/genealogy/recordLines.ts` converts one `DocumentSymbol` into `RecordLine { tag, text?, pointer?,
void?, children, range }` on request: `CONC`/`CONT` joined into `text` (`CONT` breaks a line, `CONC` does not),
a payload that matches `^@[^@\s]+@$` becomes `pointer` — `@VOID@`, 7.0's deliberate «no record», sets `void`
instead — and anything else is `text` with `@@` read as `@` (a payload beginning `@@` is a value, not a pointer);
for `NOTE` and `SNOTE` records the text is `label` (absent where the first line is empty) plus the continuation. The index gains `record(xref)` over a map
of every level-0 symbol that has an identifier — filled in the loop `build.ts` already makes, holding
only references to symbols. Nothing is converted until the card of that record is drawn, so the cost
is one record's walk per draw, as `person()` is today.

### D2. Curated sections plus a remainder, claimed by tag

A card is drawn from the record's lines in four steps: (1) split the lines into those a section
claims by tag and the rest; (2) each section draws what it claims, and for each claimed structure
draws the substructures it knows by labelled rows and the others through the generic renderer — so
nothing is lost at any depth; (3) the lines no section claims go to *Other data*; (4) sections with
nothing to show are not drawn. There is no global bookkeeping of «consumed» lines: a section either
claims a tag at the top of the record or it does not, and below that the generic renderer is the rule.

| Record | Claimed by a section |
| --- | --- |
| Person | `NAME` → Names; `SEX` → heading line; events and attributes (`tags.ts`) → Facts; `FAMC`, `FAMS` → Family; `NOTE` and `SNOTE` (7.0's pointer to a shared note) → Notes; `ASSO`, `ALIA` → Related people; `OBJE` → Media, only the lines the gallery draws (see below); `SOUR` → Evidence; `REFN`, `UID`, `EXID`, `AFN`, `RIN`, `RESN`, `CREA`, `CHAN`, `SUBM`, `ANCI`, `DESI` → Identifiers and record information |
| Family | `HUSB`, `WIFE`, `CHIL` → spouses and children; events (`FAMILY_EVENT_TAGS`) → Facts; `NCHI` → a line by the facts; `NOTE`, `SNOTE`, `ASSO`, `OBJE`, `SOUR`, identifiers as above |
| Event | `DATE`, `PLAC`, `TYPE` → top lines; `AGE`, `CAUS`, `AGNC`, `RELI`, `RESN`, `SDATE`, `TEMP`, `STAT` (of an LDS ordinance), `ADDR`, `PHON`, `EMAIL`, `FAX`, `WWW`, `HUSB`/`WIFE` (their `AGE`) → Details; `NOTE`, `SNOTE`, `ASSO`, `OBJE`, `SOUR`, `UID`… |

**Every claimed structure shows the rest of itself.** A section built from the summary (`Person`,
`Family`, `childLinks`) is not enough, because the summary drops what lies under a claimed line. So
Family and Media are drawn from the record's lines: `FAMC` and `FAMS` show their `PEDI`, `STAT`, notes
and sources; `HUSB`, `WIFE` and `CHIL` show a `PHRASE` and the rest; an `OBJE` line is claimed by Media only
where the gallery draws it (a media item's position lies within the line's range) and otherwise —
a pointer to a record the file does not declare, an inline `OBJE` with no `FILE`, or an `OBJE` with
a `NOTE` — goes to Other data with its lines. On an event card, Media is the event's `OBJE` lines
drawn as links to the media card (pointer) or as `FILE`, `FORM` and `TITL` rows (inline).

**Lines carry their place.** Every row a section draws for a line carries `data-line` with the line's
number, so a test can compare the set of lines of a record with the set the card draws, instead of
looking for values that may appear elsewhere on the card.

### D3. Modules (`src/desk/detail/`)

One file per concern, each a pure function from lines and a context to DOM, tested alone:
`labels.ts` (tag, type, role, status and sex names through `t()`, a falling back to the tag as
written), `lineView.ts` (the generic nested renderer and `renderRest`), `foldedText.ts` (five lines
or three hundred characters, then show more / show less), and the sections `names.ts`, `notes.ts`,
`related.ts`, `recordInfo.ts`, `otherData.ts`, `eventDetails.ts`. The three pages assemble them.
Shared note text is read through `index.record(pointer)`.

### D4. Names

Every `NAME` is an entry: the line as written without slashes (`readName`), its `TYPE` named (7.0:
aka, birth, immigrant, maiden, married, professional, other; 5.5.1 the lower-case ones, and any
free text as written), the parts (`GIVN`, `SURN`, `NPFX`, `NSFX`, `NICK`, `SPFX`) as labelled rows, its notes and the count of
its sources, a `TRAN` as a nested name with its `LANG`, and the rest through the generic renderer.
The section is left out for one name with nothing under it. The existing «Other names» section goes.

### D5. How a child belongs to a family

The person's own `FAMC` lines say how: `PEDI` groups the parents under *Parents*, *Adoptive parents*,
*Foster parents* or *Sealing parents*, `STAT` is named beside it, and a `NOTE` or `SOUR` under the line
is shown. A person with no child-family gets the line «Parents not recorded», one of the two sections
kept when empty. The family card marks a child *Adopted*, *Foster* or *Sealing* the same way, read from
that child's own `FAMC` line for this family through `index.record(child)` — a walk of the one record,
not the full `person()` resolve, so a family of a hundred children costs a hundred small walks.

### D6. Folding

Notes fold per note: more than five lines or three hundred characters shows the first of either and a
button. The sections *Timeline*, *Identifiers and record information* and *Other data* use `renderFold`
with the ids `timeline`, `info`, `other`, closed when a record is opened and kept through a redraw; their
bodies are drawn only while open, so a closed *Other data* of a huge record costs nothing. Names, Facts,
Family, Notes, Related people and Media stay open.

**What a redraw keeps.** `drawRecord` gives the folds to the family and event cards as well as the
person card. A note's open state is held in `data-open` as `note:<line>` beside the fold ids, and the
button that opens it has `data-focus-key="note:<line>"`; the buttons of Related people carry
`assoc:<xref>`, not the bare `<xref>` the family buttons carry, so a person who is a relative and an
associate does not share a key.

**Order.** The card ends with **Evidence**, as `genealogy-evidence` says: Names, Facts, Family, Notes,
Related people, Media, Timeline, Identifiers and record information, Other data, Evidence. The two
folded sections stay before it so the requirement that Evidence closes the card and the browser specs
that read it as the last section hold.

### D7. Counts and empties

A section that lists things of one kind shows how many in its heading, by one mechanism for all: a
`data-count` on the heading that the stylesheet shows after the title, as the fold buttons do now (no
`·` in the text). Family and Evidence are made of several kinds and show no count. Empty sections are
not drawn, with two exceptions (parents, evidence). Evidence says once that the record cites no source,
without a «0». The common
`h2` section style is kept; labelled rows inside a section use one row style (label above or beside the
value), replacing the three styles of subheading the cards have today.

### D8. Citations carry their own lines

`renderCitation` finds the citation's `SOUR` line in the owner's record by its range and renders the
substructure it does not already show (`PAGE` and `QUAY` are shown) through the generic renderer beneath the
citation, so `DATA`/`TEXT`, `EVEN`/`ROLE`, notes and media of a citation are visible.

### D9. Labels

`record.tag.<TAG>` keys for the standard tags of 5.5.1 and 7.0 that are not events (events keep the
`event.*` names the cards already use), `record.nameType.*`, `record.role.*`, `record.linkStatus.*`,
`record.sex.*`, `record.pedi.*` in both `en.json` and `ru.json` — a prefix of their own, because the
editor already has `status.*`. Types, roles and statuses are matched case-insensitively (5.5.1 writes
`birth`, 7.0 `BIRTH`). A test lists the standard tags and fails for a missing key in either language.
`labels.ts` looks a key up with an `in` guard, since an unknown key makes `t()` throw. A tag with no key
is shown as written. New English strings are in sentence case.

### Alternatives considered

- *Add every field to `Person` and `Family`* — grows a summary that every list, the timeline and the
  graph read, and still loses the tag nobody added.
- *A tab with the raw tree* — shows everything but not as a card; the reader leaves the card for a dump.
- *Wait for upstream's schema* — blocks a reader-visible fix on another repository for what a table of
  names covers.

## Risks / Trade-offs

- [Family-level `RESI`, `FACT` and 7.0 `NCHI` are not in `FAMILY_EVENT_TAGS`] → they are shown in Other data
  of the family card, not as facts; adding them to the events would change the timeline, list and events
  views, which this change does not.
- [The citations of a name are not indexed by name] → attributed to a name by the range of the `SOUR` line
  falling inside the `NAME` line's range.
- [A very long note or custom record on every redraw] → the folded sections draw only when open; a long
  note draws only its first five lines until opened.

- [A long card on a phone] → every new section but Names, Notes and Related people is folded or absent
  when empty; the folds keep the existing open/closed rules.
- [The labels table is plugin-side and can drift from the standard] → a test lists the tags of both
  dialects the plugin knows; unknown tags show as written; replaced when upstream exposes the schema.
- [A tag in both dialects with different meaning] → the label is by tag; where the dialects differ the
  neutral word is used and the file's own type/phrase is shown beside it.
- [`label` of a record is the reader's name, not always the text] → used only for `NOTE`/`SNOTE`,
  checked on both dialects.
- [Existing tests assert the old sections] → the scenarios the spec restates are updated one by one;
  the compact fact row, the family list and the timeline fold are unchanged.

## Migration Plan

Land the read-model addition with tests first; the sections one by one behind their own tests with the
cards unchanged until each page is switched; a last commit switches the pages and updates the
existing tests. Rollback is `git revert` of the switch; the modules stay unused.

## Open Questions

- The shared header of the card repeats the record's name (the bar above the heading): left for the
  second step with the other cards.

## Implementation

Deviations from the design above, as built:

- **Where the pieces live.** `src/genealogy/recordLines.ts` holds the converter; `record(xref)` is memoised
  per revision inside `buildIndex`, so the cards and every citation of a record share one conversion.
  `src/desk/detail/` has `labels`, `lineView`, `foldedText`, `section` (the heading with `data-count`), `lazyFold`,
  `claims`, `names`, `notes`, `related`, `recordInfo`, `otherData`, `eventDetails`.
- **Counts.** A heading's count is the `data-count` attribute shown by the stylesheet; the fold buttons already
  did this. Evidence's «Sources of the record» and «Notes in the vault» count the same way and carry none at zero.
- **Rows by `data-line`.** Every row a card draws carries the number of its line in the file (a space-separated list
  where one row shows several); `src/desk/detail/wholeRecord.test.ts` compares those numbers with the lines of the
  record, for a person and a family in 7.0 and in 5.5.1 and for each event, and fails if a line is not drawn
  (checked by claiming a custom tag in a section that does not draw it).
- **Gallery lines.** An `OBJE` line is the gallery's where a media item's position lies in the line's range; with no
  media handed to the page every `OBJE` line is taken as the gallery's.
- **Family-level `RESI`, `FACT`, 7.0 `NCHI`.** `NCHI` is a line under the facts (the number the record states);
  `RESI` and `FACT` of a family go to Other data, as the design's risk said.
- **Nested rows are stacked.** Rows inside a row (a latitude under a map, a time under a date) show the label above
  the value, in a ruled indent: beside it they were squeezed to a few characters on a 360-pixel panel (seen in a
  screenshot).
- **A lazy fold needs the fold open to be seen**: the Timeline of a person is drawn only when opened, so a test
  or a spec that reads it first presses its heading.
- **The plan was reviewed before the code, but not again after its fixes** (they were corrections the review named).
- **Found in review and fixed.** Inline `SOUR` text with `CONC`/`CONT` showed only its first line; a media link the
  gallery shows but that states more than one file, or a note or another child, now goes to Other data instead of being
  taken as the gallery's; the lines beneath `PEDI` and `STAT`, beneath a link to a family the file does not declare and
  beneath `FAMS @VOID@`, were not drawn; a family's `NCHI` is drawn as rows, each; `AGE` under `HUSB`/`WIFE` shows its own
  lines; a second `DATE` or `PLAC` of an event, and a second `TYPE`, are rows; a shared note's empty first line is kept; a
  fold's notes are numbered from the fold's own start so that the order folds are opened in does not rename them;
  the `assoc:` key of two associations of one person differs; Facts is left out where there is none (no «0» above «no
  facts»); the tile of a media record whose file is missing keeps its two links 20 pixels apart on a phone; the fold
  heading's count does not wrap.
- **Not changed, known.** `@@` is read as `@` wherever it stands, as 5.5.1 says; in 7.0 only a leading `@@` is an
  escape, so `a@@b` in a 7.0 file shows as `a@b`.
- **Events and Details instead of Facts** (the reader's decision, after seeing the rows). A single Facts table could
  not hold both what happened and what is true of a person. The person card has **Events** (date on the left, a dash
  where there is none; the name, which opens the event; the place under it; a quiet dot where it cites a source) and
  **Details** (an attribute as name and value, its date and place under the value, split by `PERSON_ATTRIBUTE_TAGS`).
  Marriages and the other events of a family stand under that spouse in the Family section. The line counting facts
  without a source is gone; the dot replaces it. Event names are in the normal text colour. The same event row draws
  the events of a family and of a place. On a phone the name and the place link are targets that do not overlap.
- **Fields, read-only for now** (the reader's decision: build the panel as fields so that editing needs no new markup;
  flat until the pointer or the focus is on them; in this PR). A value of a row is a read-only `textarea` that grows with
  its text by the grid trick (a hidden copy of the text sized by CSS from `data-value`), `tabindex="-1"` so that Tab
  still goes through buttons and links only, `aria-labelledby` its row's label; a value the standard limits to a list is
  kind `choice` (a field showing the name, to become a dropdown). A name is a form of rows (name, type, parts) instead of
  a header with a badge. Links, the facts, the relatives, the sources and the headings are not fields. Inline words (the
  role of an associate, the sex in the heading line) stay text for now. Editing itself waits for the mutations upstream
  (`docs/design/upstream-requests.md`) and for the business decision (`docs/design/next-steps.md`, stage 2): each field
  already carries the line it was read from, which is where a write will go.
