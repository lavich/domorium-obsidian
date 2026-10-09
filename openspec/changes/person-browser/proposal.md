## Why

The plugin reads a GEDCOM file the way an IDE reads source: it validates, folds,
completes, navigates by cross-reference. That is the right tool for someone
editing the format, and the wrong one for someone asking who Marie's father was.
The answer is on line 214 of a 6,000-line file, behind an `@F1@` the reader has
to resolve in their head.

The file itself is already a genealogy database — people, families, events, all
connected by pointers the plugin can already follow. Nothing needs importing.
What is missing is a reading of it: a list of people and a page per person.

This is the first slice of that, and it is deliberately small. Its real job is
to settle where a genealogy read model lives and how a person is addressed and
navigated to, because a family tree, duplicate detection, a source browser and
a branch export all need those two answers first. Getting them wrong here is
expensive later; getting them right is most of the value of this change.

## What Changes

- A **People view** in the left sidebar lists the people in the GEDCOM document
  the reader is looking at: name, the years they lived, and a place that tells
  one John Smith from another. It filters as the reader types, over names,
  identifiers, years and places.
- A **Person view** opens as a workspace tab: who they were, their parents,
  partners and children, the events the record carries, and a way back into the
  file. Every relative in it is a link to that relative's own Person view, and
  the reader can retrace the trail they followed. Whether that is Obsidian's own
  Back and Forward is measured before it is promised: the design prefers them
  and names the fallback.
- **Open in GEDCOM** puts the cursor on the person's `INDI` line, using the
  same mechanism the plugin's `obsidian://` links already use.
- A new **`src/genealogy/`** module reads people, families and events out of
  the document symbols the language service already produces. It imports
  nothing from `obsidian`, knows nothing about views, and names nothing in a
  reader's language, so that extracting it later is adaptation rather than
  rewriting. See the Non-goals on why it starts here.
- A person is addressed by a **document reference and an identifier**, never by
  identifier alone, because two files may both call someone `@I123@`. The
  document half is a reference in its own right, holding a path today, so that
  a stable identity can replace the path later without every holder changing.

This change belongs in **this repository**. It adds no parsing, no validation
rule and no language-service behaviour: the family graph is assembled from
`getDocumentSymbols()`, which already reports every record's identifier, its
level-one payloads and their children — `FAMC` and `FAMS` pointers, `BIRT` with
its `DATE` and `PLAC`, and a `FAM` record's `HUSB`, `WIFE` and `CHIL`. Two
upstream gaps are named in the Non-goals and worked around here rather than
waited on.

## Capabilities

### New Capabilities

- `genealogy-read-model`: how the plugin reads people, families and events out
  of a GEDCOM document — what a person is, how a person is addressed across
  documents, which relatives and events are reported, how a name and a date are
  read, and what happens when a pointer leads nowhere.
- `people-browser`: the sidebar list of people in the active document — what a
  row shows, what the search matches, how the list follows the reader between
  documents, and what it says when there is nothing to show.
- `person-view`: the page for one person — the sections it shows, which of them
  are links, how navigation between people behaves, and how it reaches the
  record in the file.

### Modified Capabilities

None. `editor-search`, `media-preview` and `document-links` describe the file
view and are untouched; `plugin-language` already requires that every string the
plugin writes follows the app's language, which this change obeys by adding its
strings to the existing catalogue rather than by changing that requirement.

## Impact

- New `src/genealogy/` — people, families, events and person addressing, over
  `getDocumentSymbols()`. No `obsidian` import.
- New `src/people/` — the sidebar view, its list and its search.
- New `src/person/` — the Person view, its sections and its navigation.
- `src/main.ts` — registers the two views and a command to open the sidebar.
- `src/i18n/en.json`, `src/i18n/ru.json` — section headings, event labels and
  the empty states, in both languages.
- `styles.css` — list rows and the person page, on Obsidian's own variables.
- `src/vault/protocolLink.ts` — read, and reused for Open in GEDCOM; changed
  only if the person address needs a spelling it does not already have.
- `manifest.json` — unchanged. Every API this needs (`navigation`,
  `ViewStateResult.history`, `setState`, `getLeafById`) predates the 1.8.7
  floor, so the floor does not move and the table in CLAUDE.md gains no row.

## Non-goals

- **Editing anything.** No forms, no adding or deleting people, no writing to
  the file. Person view is a reading of the record and nothing else.
- **A family tree.** No canvas, no pedigree chart, no descendant chart. The
  read model is shaped so one can be built on it; this change does not build it.
- **Everything else on the roadmap.** Sources UI, media gallery, research notes,
  backlinks, maps, timelines, tree health, duplicate detection, diff, merge,
  branch extraction, accounts and licensing are each their own change.
- **Markdown files for people.** The GEDCOM file stays the source of truth. No
  note is generated, no second database is written to disk.
- **Putting the read model upstream in this change.** It belongs in
  [lavich/domorium](https://github.com/lavich/domorium) eventually, beside the
  clients that would share it. It starts here because its shape is not yet
  known, and designing an API upstream with no consumer invites a wrong one.
  It is built to be extracted with little adaptation, which is not the same as
  moved unchanged: it is shaped by the symbol interface it reads, it takes a
  naming function from its caller, and the bookkeeping that decides when a
  document has changed is the host's and would have to be handed in. Each of
  those is a named seam. CLAUDE.md records the condition for extracting it: the
  second client that wants it.
- **A correct GEDCOM date parser.** The list and the heading need a year, so a
  year is read out of `DATE` — a four-digit group, with `ABT` and `BET`
  understood — and reported as a hint that says how exactly the payload stated
  it, never as the year an event happened. A Hebrew date, a French Republican
  one or a dual `1867/68` is shown as the file wrote it, with no year. Doing
  this properly means exporting the calendar knowledge the validator already
  has, which is upstream's.
- **Deciding what is an event by reading the data.** Nothing in the symbol data
  distinguishes an event from any other structure: a bare `1 DEAT` looks exactly
  like `1 SEX M`. The set of event tags is therefore named, not inferred, and
  the specification says so. The schema that knows the difference is private to
  the validator; exposing it is an upstream request, not a prerequisite.
- **Following a renamed GEDCOM file.** An address names a path, so moving a
  GEDCOM invalidates addresses that named it, and the reader is told the file is
  not there. The plugin already listens to the vault's rename event for media,
  so following one is a later change against an interface built to allow it.
- **Translating the schema's event labels.** The validator carries the official
  names and they are `en-US` only, and some read badly in an interface —
  `BURI` is "Depositing remains". Event labels go in the plugin's own catalogue,
  where they are both translated and readable.
- **Fuzzy search.** The filter is a case-insensitive substring match over
  fields the model already holds. Nothing is ranked, nothing is guessed.
- **Virtualizing the list beyond what the measurements require.** Obsidian
  exposes no list component, so any virtualization is the plugin's to write.
  Whether it is needed at all is a question the design answers with numbers
  rather than by assuming.
