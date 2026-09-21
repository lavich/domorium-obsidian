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

- One reading of a document, shared by both views, paid for once per version.
- A read model whose every function could be moved to another repository
  unchanged — no `obsidian` import, no vault, no file system, own tests.
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
document version. Building it is one pass that produces:

- `people`: an array of compact person rows — identifier, display name, other
  names, birth year, death year, a place, and the searchable text — in document
  order. This is what the sidebar renders and filters.
- `byXref`: identifier to the symbol that declares it, for both `INDI` and
  `FAM`, so a person or family is a lookup rather than a scan.
- `familiesOfPerson`: identifier to the `FAMC` and `FAMS` identifiers it
  carries, so relatives are resolved without re-walking.

Detail — events, and the resolved relative lists — is computed when a person is
opened, from `byXref`, not stored for all. At twenty thousand people the row
array is a few megabytes beside a syntax tree of five hundred, and opening one
person touches a handful of symbols.

*Alternative considered:* materialising a full person object per record at build
time. Simpler to call, but it doubles the resident structure for data that
almost none of it is ever read, and the measurements say the lookup is free.

### A person address is the pair, and it is the view's state

```ts
interface PersonRef { file: string; xref: string; }
```

The vault-relative path and the identifier, together, in that order everywhere.
This is the value the Person view returns from `getState()` and receives in
`setState()`, which means Obsidian persists and restores it for free, and it is
the same pair `protocolLink.ts` already spells into an `obsidian://` URL. A
person is therefore addressable from a workspace file, a link, and the model
without a second spelling to keep in step.

*Alternative considered:* a single opaque string, `path#@I1@`. One field instead
of two, and it is what a subpath already looks like — but every consumer then
parses it, and a vault path may contain a `#`.

### Navigation rides Obsidian's history, and a spike says whether it can

The intended route: Person view sets `navigation = true`, holds the `PersonRef`
as its view state, and moves between people by
`leaf.setViewState({ type, state: { file, xref } })`. Obsidian records leaf
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
  its own back control in the page. The specification is written in terms of
  what the reader sees ("Back shows William, then John"), so it holds either
  way; only the design's route and two tasks change.

*Alternative considered:* writing the fallback stack unconditionally, which
always works. It duplicates a facility the application has and puts a second
back control next to Obsidian's own, which is exactly what requirement 8 asks
to avoid. It stays the fallback, not the plan.

### The list renders a window, and a measurement says how big

Twenty thousand rows of three lines each is not a DOM to build eagerly. The list
renders only the rows in view plus a margin, on a fixed row height, positioned
inside a spacer of the full height — the usual approach, written here because
Obsidian ships none.

Whether the filtered list needs it at all is measured first: the second spike
times building a plain list of 1,000, 5,000 and 20,000 rows in the sidebar. If
the plain list is comfortable to the size a real document reaches, the window
is dropped from this change and the spec's requirement is met without it.

Filtering runs over the precomputed searchable text of each row, which is one
lowercase string per person built at index time. Twenty thousand substring tests
are sub-millisecond; no index, no ranking, no debounce beyond the one the search
bar already uses elsewhere.

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

### Event names come from the plugin's catalogue, not the schema

`src/i18n/en.json` and `ru.json` gain a key per supported event tag. The schema's
labels are not used: they are `en-US` only, and "Depositing remains" is not what
a reader should see for a burial. A tag the catalogue does not carry is shown as
the tag itself, which is honest and needs no fallback table.

This also keeps the event names inside the mechanism that already translates
them, rather than adding a second source of user-visible English.

### Dates yield a year only when they plainly state one

`src/genealogy/` reads a year with a small, stated rule: strip a leading `ABT`,
`CAL`, `EST`, `BEF`, `AFT`, or a `BET … AND …`, take the first four-digit group,
and refuse anything carrying a calendar escape or a `1867/68` dual year. The
payload is always carried through unchanged beside the year.

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
  The module has no `obsidian` import and its own tests, so moving it is a file
  move; the proposal and CLAUDE.md record the condition. This is a real risk and
  the honest mitigation is that the cost of moving stays near zero.
- [Symbol trees add materially to memory on a large document] → Measured in the
  same spike as the list. If they do, the index can be built from the symbol
  tree and the tree dropped, since the model keeps only its own rows.
- [Following the active leaf surprises a reader who wanted the list pinned] →
  The list holds its last GEDCOM rather than emptying on a note, which covers
  the common case. Pinning is a later change if anyone asks.
- [A GEDCOM the reader never opened, restored into a Person view, reads slowly]
  → It costs one parse of that file, once, the same as opening it would.
- [Two views reading the same document build two indexes] → They share one,
  keyed by path and version, held by the plugin rather than by either view.

## Migration Plan

Nothing to migrate: no stored data, no format, no setting. The feature is
additive and inert until the reader opens the sidebar. Rolling it back is
reverting the change; no file the reader owns has been touched.

## Open Questions

None that would change the specifications, the approach or the task list. The
two genuine unknowns — whether Back walks a custom view's states, and whether
the list needs a rendering window — are answered by the first two tasks, and
both branches of each are designed above.
