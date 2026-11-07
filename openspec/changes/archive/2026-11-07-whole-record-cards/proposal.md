## Why

The right-hand cards of a person and of a family are a summary, not the record. They show one
name and list the other names as bare strings; they drop the sex, the type and parts of a name,
what an event states beyond its date and place (age, cause, agency, address, notes), the notes of
the record, the people it names as associates, its identifiers and change dates, how a child belongs
to a family, and every line they do not know — a custom tag silently vanishes. The sections also
disagree with one another in style, counts and what an empty one looks like. A reader of a
genealogy file needs the card to show everything the file says, in one consistent form.

## User requirement (verbatim, 2026-11-07)

- On the cards of the right panel: "давай правые панели для всех сущностей разберем предметно —
  там сейчас какая-то каша, неконсистентный дизайн, и не понятно что вообще надо показывать."
- After an audit of the six cards and three options (unify only; unify and rework what each card
  shows; tabs): **"вариант B, начни с человека и семьи И я хочу, чтобы эта панель отображала, эти
  панели отображали все возможные данные, которые есть в геткоме. Например, имена, потому что их
  может быть несколько."**
- Answers to the four design questions: **"1 гибрид, 2 компактная строка, 3 со сворачиванием,
  4 да"** — (1) curated sections for what a reader understands plus a folded section that shows
  every remaining line, so no line is ever dropped; (2) a fact stays one compact row on the person
  and family cards, its details on the event card; (3) a long note shows its first lines and
  folds the rest; (4) the first step is the person card, the family card and the event card —
  place, source and media cards come after.

## Proposed scope

- The read model gives the lines of one record whole, on request: tag, value or pointer, nested
  substructure, range, `CONC`/`CONT` joined, shared-note text of either dialect.
- Person and family cards show: every name with type and parts; sex; how a child belongs to a family
  (adopted, foster, sealing, status); notes (folded where long); related people (`ASSO`, `ALIA`);
  identifiers and record information (folded); and *Other data* (folded), which shows every line no
  other section shows, nested, so nothing is dropped.
- The event card shows details (age, cause, agency, religion, restriction, spouses' ages, date phrase
  and time, address, contacts, the place's form, coordinates, translations and notes), notes, related
  people, media, evidence with each citation's own details, and *Other data*.
- One convention across these cards: a section that lists things says how many in its heading; an
  empty section is left out, except the two a researcher looks for (no parents recorded, no source).
- Every label is in English and Russian; tags the standard names are named, others shown as written.

## Where it belongs

**This repository.** The language service already hands over the whole tree (`DocumentSymbol`: tag,
payload, children, ranges, and a record's `label`), probed on the published 2.x package for 5.5.1 and
7.0. What it does not give is the schema — which tag means what, payload kinds, enumerations —
which `docs/design/upstream-requests.md` already lists as «Schema access» and «Value and pointer
apart». Nothing here waits for upstream: the table of tag names and the reading of a payload are done
in the plugin and can be replaced when upstream ships them. No upstream issue is filed by this change.

## Capabilities

### New Capabilities
- `genealogy-record-detail`: how a card shows the whole record — every line shown, read as written,
  names, notes, related people, identifiers, other data, headings with counts, labels in both languages.

### Modified Capabilities
- `genealogy-record-card`: the person card, the family card and the event card.
- `genealogy-read-model`: a record's lines are reachable whole.

## Impact

- Code: `src/genealogy/` (a record-lines reader and `record(xref)` on the index), a new
  `src/desk/detail/` for the sections, `personPage.ts`, `familyPage.ts`, `eventPage.ts`,
  `evidence.ts`, `recordCard.ts`, `styles.css`, `src/i18n/en.json` and `ru.json`.
- Tests: beside each new module; a test that every line of a rich record appears on its cards; a
  Playwright spec on the card at panel and phone width; a rich fixture and a demo-vault file for
  manual checking.
- Dependencies: none; no Node built-ins; no API above `minAppVersion`.
- Reader-visible: the three cards change as described; their lines of facts stay as compact as now.

## Non-goals

- The place, source and media cards, and the shared header of the card (the name that repeats the
  heading) — a second step after this one.
- Editing: nothing writes to the file.
- Drawing a tree or a map; coordinates are shown as text.
- Changing what the graph, timeline, list or search show; `Person`, `Family` and their rows keep
  their shape.
- A new dependency, or a copy of the document: the lines are read from the existing symbols on request.
