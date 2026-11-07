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
children, range }` on request: `CONC`/`CONT` joined into `text` (`CONT` breaks a line, `CONC` does not),
a payload that is `@X@` becomes `pointer`, anything else `text` with `@@` read as `@`; for `NOTE` and
`SNOTE` records the text is `label` plus the continuation. The index gains `record(xref)` over a map
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
| Person | `NAME` → Names; `SEX` → heading line; events and attributes (`tags.ts`) → Facts; `FAMC`, `FAMS` → Family; `NOTE` → Notes; `ASSO`, `ALIA` → Related people; `OBJE` → Media; `SOUR` → Evidence; `REFN`, `UID`, `EXID`, `AFN`, `RIN`, `RESN`, `CREA`, `CHAN`, `SUBM`, `ANCI`, `DESI` → Identifiers and record information |
| Family | `HUSB`, `WIFE`, `CHIL` → spouses and children; events (`FAMILY_EVENT_TAGS`) → Facts; `NCHI` → a line by the facts; `NOTE`, `ASSO`, `OBJE`, `SOUR`, identifiers as above |
| Event | `DATE`, `PLAC`, `TYPE` → top lines; `AGE`, `CAUS`, `AGNC`, `RELI`, `RESN`, `SDATE`, `ADDR`, `PHON`, `EMAIL`, `FAX`, `WWW`, `HUSB`/`WIFE` (their `AGE`) → Details; `NOTE`, `ASSO`, `OBJE`, `SOUR`, `UID`… |

### D3. Modules (`src/desk/detail/`)

One file per concern, each a pure function from lines and a context to DOM, tested alone:
`labels.ts` (tag, type, role, status and sex names through `t()`, a falling back to the tag as
written), `lineView.ts` (the generic nested renderer and `renderRest`), `foldedText.ts` (five lines
or three hundred characters, then show more / show less), and the sections `names.ts`, `notes.ts`,
`related.ts`, `recordInfo.ts`, `otherData.ts`, `eventDetails.ts`. The three pages assemble them.
Shared note text is read through `index.record(pointer)`.

### D4. Names

Every `NAME` is an entry: the line as written without slashes (`readName`), its `TYPE` named, the
parts (`GIVN`, `SURN`, `NPFX`, `NSFX`, `NICK`, `SPFX`) as labelled rows, its notes and the count of
its sources, a `TRAN` as a nested name with its `LANG`, and the rest through the generic renderer.
The section is left out for one name with nothing under it. The existing «Other names» section goes.

### D5. How a child belongs to a family

`Person.childLinks` (kind from `PEDI`, added in 1.18.1's read model) groups the parents under *Parents*,
*Adoptive parents*, *Foster parents* or *Sealing parents*; a `STAT` is named beside it. A person with no
child-family gets the line «Parents not recorded», one of the two sections kept when empty. The family
card marks a child *Adopted*, *Foster* or *Sealing* the same way, read from the child's `childLinks`.

### D6. Folding

Notes fold per note: more than five lines or three hundred characters shows the first of either and a
button. The sections *Timeline*, *Identifiers and record information* and *Other data* use `renderFold`
with the ids `timeline`, `info`, `other`, closed when a record is opened and kept through a redraw. Names,
Facts, Family, Notes, Related people and Media stay open.

### D7. Counts and empties

A section that lists says `Name · n` in its heading. Empty sections are not drawn, with two exceptions
(parents, evidence). Evidence says once that the record cites no source, without «· 0». The common
`h2` section style is kept; labelled rows inside a section use one row style (label above or beside the
value), replacing the three styles of subheading the cards have today.

### D8. Citations carry their own lines

`renderCitation` finds the citation's `SOUR` line in the owner's record by its range and renders the
substructure it does not already show (`PAGE` and `QUAY` are shown) through the generic renderer beneath the
citation, so `DATA`/`TEXT`, `EVEN`/`ROLE`, notes and media of a citation are visible.

### D9. Labels

`tag.<TAG>` keys for the standard tags of 5.5.1 and 7.0 (about a hundred), `nameType.*`, `role.*`,
`status.*`, `sex.*`, `pedi.*` in both `en.json` and `ru.json`. A test lists the standard tags and fails
for a missing key in either language. A tag with no key is shown as written.

### Alternatives considered

- *Add every field to `Person` and `Family`* — grows a summary that every list, the timeline and the
  graph read, and still loses the tag nobody added.
- *A tab with the raw tree* — shows everything but not as a card; the reader leaves the card for a dump.
- *Wait for upstream's schema* — blocks a reader-visible fix on another repository for what a table of
  names covers.

## Risks / Trade-offs

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
