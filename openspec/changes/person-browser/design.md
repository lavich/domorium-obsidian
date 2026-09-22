## Context

See proposal.md — Why. What the repository and its packages give this change,
measured rather than assumed:

- **`getDocumentSymbols()` already reports the family graph.** It is not a flat
  list of records. On the demo vault it returns, for each record, its tag, its
  identifier in `detail`, the `NAME` payload in `label`, and its level-one
  children with their own payloads in `detail` — and those children carry their
  own children. A `FAM` reports `HUSB=@I3@ WIFE=@I4@ CHIL=@I5@ …`; an `INDI`
  reports `SEX="F" FAMC="@F1@" FAMS="@F3@"` and `BIRT` with
  `DATE="7 NOV 1867"` and `PLAC="Warsaw, Congress Poland"` beneath it. Every
  field this change needs is therefore already on a public, editor-independent
  interface. No AST access and no upstream change are required.
- **The cost is the parse, and the editor already pays it.** Measured on
  synthetic documents through `GedcomLanguageService`:

  | People | File | Parse | `getDocumentSymbols` | Identifier index | Full walk |
  | --- | --- | --- | --- | --- | --- |
  | 5,000 | 1.2 MB | 202 ms | 57 ms | 2 ms | 3 ms |
  | 20,000 | 5.0 MB | 548 ms | 340 ms | 13 ms | 15 ms |

  Indexing and traversal are tens of milliseconds at twenty thousand people.
  Heap after the 20,000-person read was ~500 MB, which is the syntax tree: the
  parser's own comments record that stored ranges were most of it. That number
  is the reason the read model holds a projection and not a second copy.
- **`src/notes/recordIndex.ts`** already caches a record list per vault path,
  keyed by a `mtime:size` revision, and re-reads only when the file changed
  under it. That is the incremental mechanism this change needs, one level down.
- **`src/editor/records.ts`** already projects symbols into
  `{tag, identifier, label, start}` for the record switcher.
- **`src/vault/protocolLink.ts`** already spells and parses a person address —
  vault, file path, and xref — for `obsidian://` links, and `src/main.ts`
  already resolves one by opening the file and calling `GedcomView.goToXref`,
  which uses `setEphemeralState({ subpath })`. "Open in GEDCOM" is this
  mechanism read backwards.
- **The Obsidian APIs this needs are all below the 1.8.7 floor**: `navigation`
  (0.15.1), `ViewStateResult.history`, `View.setState`/`getState` (0.9.7),
  `getLeafById` (1.5.1), `getLeftLeaf`, `onLayoutReady`. The floor does not
  move and CLAUDE.md's table gains no row.
- **Obsidian exposes no list component.** There is no virtualization helper in
  `obsidian.d.ts`; anything of the sort is the plugin's to write.
- **The validator carries the official GEDCOM schema** — 238 labelled types,
  `record-INDI`'s 62 substructures, both dialects — but `GedcomDocument.scheme`
  is private and the package exports none of it. Its labels are `en-US` only
  and some are unusable in an interface: `BURI` is "Depositing remains".
- **`src/i18n/`** holds the catalogue and `t`/`plural`, imports nothing from
  `obsidian`, and is already the home for every string the plugin shows.

## Goals / Non-Goals

**Goals:**

- One reading of a document, shared by both views, paid for once per revision.
- A read model designed to be extracted with little adaptation — no `obsidian`
  import, no vault, no file system, no reader-facing text, own tests — rather
  than one that can be moved without reading it.
- A person address that is the same value in a view's state, in a link, and in
  the model, so nothing has to translate between two spellings.
- Answers for the two unknowns — navigation history and list size — obtained by
  measurement before the code that depends on them is written.

**Non-Goals:**

- Choosing the eventual upstream package name or its boundary. That is the
  moving change's business, and the proposal records the condition for it.
- A model that anticipates the tree, diff or merge. It reports what a GEDCOM
  document says about people; those features will ask it for more, and asking
  for more is cheap.
- Reusing `RecordIndex` itself. It is built for reading closed files
  asynchronously through the vault; this reads the open document. The pattern
  is reused, the class is not.

## Decisions

### The read model is a projection built once, addressed by document and xref

`src/genealogy/` exports a `GenealogyIndex` built from the symbol tree of one
revision of one document. Building it is one pass that produces:

- `people`: an array of compact person rows — identifier or a mark that the
  record declares none, display name, other names, the birth and death date
  readings described below, a place, and the searchable text — in document
  order. This is what the sidebar renders and filters.
- `byXref`: identifier to the symbol that declares it, for both `INDI` and
  `FAM`, so a person or family is a lookup rather than a scan.
- `familiesOfPerson`: identifier to the `FAMC` and `FAMS` identifiers it
  carries, so relatives are resolved without re-walking.

Spouses and children are read from a named set of family roles — GEDCOM's spouse
roles and its child role — for the same reason the event set is named: a family
record may carry pointers to people in roles that are neither, and "any pointer
to a person inside a `FAM`" would make a witness into a parent. Within those
roles nothing is constrained: a role may repeat, and a recorded sex need not
agree with the role that names it.

Detail — events, and the resolved relative lists — is computed when a person is
opened, from `byXref`, not stored for all. At twenty thousand people the row
array is a few megabytes beside a syntax tree of five hundred, and opening one
person touches a handful of symbols.

*Alternative considered:* materialising a full person object per record at build
time. Simpler to call, but it doubles the resident structure for data that
almost none of it is ever read, and the measurements say the lookup is free.

### A person address names a document, not a path

```ts
interface DocumentRef { path: string; }
interface PersonRef { document: DocumentRef; xref: string; }
```

The document half is a reference of its own even though it currently holds only
a path. Nothing today needs more, but a vault-relative path identifies a
document only while nobody moves it, and this address is about to become the
thing a link, a workspace file, a duplicate result and a cross-tree reference
are all spelt in. Wrapping the path now means a later change can add a stable
identity — a header identifier, a fingerprint of the file — beside or instead of
the path without touching every holder of an address.

`PersonRef` is what the Person view returns from `getState()` and receives in
`setState()`, so Obsidian persists and restores it, and it is the same pair
`protocolLink.ts` already spells into an `obsidian://` URL.

What this does **not** do is survive a rename. A GEDCOM file moved in the vault
invalidates every stored address that named it, and the specification says so
rather than promising otherwise. The plugin already listens to the vault's
rename event for media links, so following a rename is a small later change
against an interface that will not have to move.

*Alternative considered:* a bare `{ file: string; xref: string }`. One field
fewer, and every consumer that later wants a stable identity has to change.

*Alternative considered:* a single opaque string, `path#@I1@`. It is what a
subpath already looks like — but every consumer then parses it, and a vault path
may contain a `#`.

### Navigation rides Obsidian's history, and a spike says whether it can

The intended route: Person view sets `navigation = true`, holds the `PersonRef`
as its view state, and moves between people by
`leaf.setViewState({ type, state: personRef })`. Obsidian records leaf
history for navigable views, so Back and Forward should walk the people the
reader visited, and a restored workspace should reopen the last person.

The type definitions support every part of this, but nothing in them *promises*
that a custom view's state transitions are what Back walks. That is an
empirical question, and the browser harness cannot answer it: it mounts
CodeMirror without Obsidian, and workspace history is Obsidian's.

So the first task is a spike in the demo vault: a throwaway view that shows a
number, moves to the next number through `setViewState`, and is tested against
Cmd+[ and Cmd+]. Its outcome selects the branch:

- **Back walks the states** — the route above stands, and Person view keeps no
  history of its own.
- **Back does not** — Person view keeps its own trail in its state, and offers
  its own back control in the page.

The specification requires only that the reader can retrace their steps, and
says explicitly that which control does it is settled here. So neither outcome
sends anyone back to rewrite a requirement; it was worded that way after the
first draft promised the application's own Back and Forward, which is a promise
this design cannot yet make.

*Alternative considered:* writing the fallback stack unconditionally, which
always works. It duplicates a facility the application has and puts a second
back control next to Obsidian's own, which is exactly what requirement 8 asks
to avoid. It stays the fallback, not the plan.

### The list renders a window, and a measurement says how big

Twenty thousand rows of three lines each is not a DOM to build eagerly. The list
renders only the rows in view plus a margin, on a fixed row height, positioned
inside a spacer of the full height — the usual approach, written here because
Obsidian ships none.

**Measured, and the window stays.** A plain list of styled rows, built in
Chromium at the sidebar's width:

| What | Cost |
| --- | --- |
| 20,000 rows, first build with layout | 253 ms |
| 20,000 rows, rebuilt | 237 ms |
| Filtering down to 440 rows | 23 ms |
| Filtering to text every row matches | 256 ms |
| Scrolling twenty steps | 2 ms |
| Resident elements at 20,000 rows | 80,000 |

Scrolling is free — the browser does it — and a filter that narrows is cheap,
which is the common case. What is not cheap is a rebuild that keeps every row:
clearing the filter, or typing a letter most people match, costs a quarter of a
second, and the search field's existing 150 ms settle sits on top of that. Near
half a second after a keystroke is sluggish, and 80,000 resident elements is a
weight the whole application carries, not just this view.

So the window is built. The alternative — a plain list — is not comfortable at
the size the specification names, which is what this spike was for.

Nothing is claimed above 20,000. The heap figure Chromium reports was identical
at all three sizes and is too coarse to be worth recording; the element count
is the honest number.

Filtering runs over the precomputed searchable text of each row, which is one
lowercase string per person built at index time. Twenty thousand substring tests
are sub-millisecond; no index, no ranking, no debounce beyond the one the search
bar already uses elsewhere.

### A revision follows the text, not the file on disk

The index is cached per document, keyed by a revision, and what counts as a
revision differs by whether the document is open.

For an open document the plugin owns a counter. It already drives
`GedcomLanguageService.update(text)` from `GedcomView.setViewData`, so it
increments its own revision at the same moment. This is deliberate: the language
service keeps a `DocumentVersion` internally and **does not expose it** — the
method that looks like it would, `getVersionResolution()`, returns the GEDCOM
format version, `7.0`, which is a different thing entirely and an easy mistake
to make. Asking upstream to expose the document version would be reasonable; it
is not needed, because the plugin is the one calling `update`.

For a closed document, read through `VaultReader`, the revision is the
`mtime:size` pair `recordIndex.ts` already uses.

A revision is therefore never derived from the file's timestamp while the
document is open, which is the trap: a reader types, the path does not change,
the modification time does not change, and an index keyed on disk metadata goes
stale while showing a reader their own edit back as the old value.

*Alternative considered:* hashing the text. Correct without any bookkeeping, but
it is a pass over five megabytes on every keystroke to answer a question a
counter answers for nothing.

### The active document is followed, not owned

The sidebar tracks the last GEDCOM document the reader was in, through
`workspace.on("active-leaf-change")`, and ignores leaves that are not a
`GedcomView`. It reads that view's current text, so an unsaved edit is reflected
without going to disk, and rebuilds its index when the view reports a new
version.

The Person view reads the same way where the document is open, and falls back to
reading the file through the existing `VaultReader` where it is not — a Person
view restored after a restart, before its GEDCOM has been opened, must still
show someone.

### The event set is named, because nothing in the data distinguishes one

`src/genealogy/` carries a named set of the event and attribute tags GEDCOM
defines for an individual record, for both dialects, and reports a structure as
an event when its tag is in that set.

A generic rule would be better, and was tested. It is not available. The symbol
data reports two kinds only, `Field` and `Object`, so every level-one structure
under an `INDI` arrives as a `Field`. Nor does shape help:

```
NAME  kind=8 detail="A /B/"   children=0
SEX   kind=8 detail="M"       children=0
DEAT  kind=8 detail=null      children=0     <- an event
FAMC  kind=8 detail="@F1@"    children=0
CENS  kind=8 detail=null      children=1     <- an event
```

A bare `1 DEAT` is indistinguishable from `1 SEX M` and `1 FAMC @F1@`: same
kind, no payload, no children. A heuristic of "has a `DATE` or a `PLAC` beneath
it" therefore fails on exactly the case the specification has a scenario for.

The knowledge that would settle it does exist — the validator's schema knows
`record-INDI`'s 62 substructures and which are events — but
`GedcomDocument.scheme` is private and the package exports none of it. Exposing
it is a reasonable upstream request and a real improvement; it is not a
prerequisite, because a named set of forty-odd tags is a table, and the
specification says plainly that it is named rather than inferred.

*Alternative considered:* reporting every level-one structure and letting the
view decide. It moves the same table into the view and makes `SOUR` and `SNOTE`
events on the way.

### Event names come from the plugin's catalogue, not the schema

`src/i18n/en.json` and `ru.json` gain a key per supported event tag. The schema's
labels are not used: they are `en-US` only, and "Depositing remains" is not what
a reader should see for a burial. A tag the catalogue does not carry is shown as
the tag itself, which is honest and needs no fallback table.

This also keeps the event names inside the mechanism that already translates
them, rather than adding a second source of user-visible English.

### The renderers are handed their dependencies, including how to name a tag

`src/people/peopleList.ts` and `src/person/personPage.ts` take their container,
their callbacks, and a naming function:

```ts
renderPersonPage(container, person, { t, onPersonClick, onOpenSource });
```

They do not import `t` from `src/i18n/`. That module is honest about being
module state — one language for the whole plugin, set once at load — and a
renderer reaching for it is a renderer that cannot be drawn twice in two
languages, and whose test has to set global state to say anything. Handing the
function in is what `PanelHost`, `MediaPreviewHost` and `CommandHost` already do
for everything Obsidian-shaped in this repository, and a naming function belongs
in the same category.

The views built on Obsidian supply `t` from the catalogue, as they do today.

### Dates yield a year only when they plainly state one

`src/genealogy/` reads a year with a small, stated rule: strip a leading `ABT`,
`CAL`, `EST`, `BEF`, `AFT`, or a `BET … AND …`, take the first four-digit group,
and refuse anything carrying a calendar escape or a `1867/68` dual year. The
payload is always carried through unchanged beside the year.

What comes back is not called a birth year. `BET 1867 AND 1870` yields 1867, and
that is the lower end of a range, not the year anyone was born. The reading is
reported as a hint carrying how exactly the payload stated it:

```ts
interface DateReading { text: string; year?: number; precision?: "exact" | "approximate" | "range" }
```

The naming is the point. A field called `birthYear` holding 1867 for
`BET 1867 AND 1870` is a trap for the first caller that compares two people by
it — which is precisely what duplicate detection will do, and precisely where a
wrong match is expensive. A caller that needs an exact year can now ask for one
and be refused.

This is deliberately less than GEDCOM allows, and the specification says so in
its scenarios rather than leaving it to be discovered. Doing it properly means
the calendar knowledge in `packages/validator/src/validator/calendars.ts`, which
is not exported; that is an upstream request, recorded in the proposal, not a
reason to hold this change.

## Risks / Trade-offs

- [The navigation spike says Back does not walk custom states] → The design
  names the fallback and the specification is written to survive it. The spike
  is task 1.1 precisely so this is known before anything depends on it.
- [The read model never moves upstream and a second client reimplements it] →
  The module has no `obsidian` import, no reader-facing text and its own tests,
  so extracting it is adaptation rather than rewriting; the proposal and
  CLAUDE.md record the condition. It is not a file move, and calling it one
  would be wrong: the module is shaped by `DocumentSymbol[]`, which upstream may
  want to bypass for its own AST; it takes a naming function that upstream may
  want to define differently; and the revision bookkeeping above is the host's
  and would have to be handed in. What the design buys is that each of those is
  a named seam rather than a tangle.
- [Symbol trees add materially to memory on a large document] → Measured in the
  same spike as the list. If they do, the index can be built from the symbol
  tree and the tree dropped, since the model keeps only its own rows.
- [Following the active leaf surprises a reader who wanted the list pinned] →
  The list holds its last GEDCOM rather than emptying on a note, which covers
  the common case. Pinning is a later change if anyone asks.
- [A GEDCOM the reader never opened, restored into a Person view, reads slowly]
  → It costs one parse of that file, once, the same as opening it would.
- [Two views reading the same document build two indexes] → They share one,
  keyed by path and revision, held by the plugin rather than by either view.

## Migration Plan

Nothing to migrate: no stored data, no format, no setting. The feature is
additive and inert until the reader opens the sidebar. Rolling it back is
reverting the change; no file the reader owns has been touched.

## Open Questions

None that would change the specifications, the approach or the task list. The
two genuine unknowns — whether Back walks a custom view's states, and whether
the list needs a rendering window — are answered by the first two tasks, and
both branches of each are designed above.
