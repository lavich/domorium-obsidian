## Context

See proposal.md — Why. The third subject inherits almost everything; what it
adds is the first thing the plugin reads backwards.

What the data gives it, read off the demo document:

- A `SOUR` record carries `TITL`, `AUTH`, `PUBL`, `REPO` and `OBJE` as
  level-one payloads. A `REPO` record carries `NAME`, `WWW` and `ADDR`.
- A citation is a `SOUR` whose payload is a pointer, carrying `PAGE` beneath
  it. In the demo all seven sit directly on an `INDI`, but the format puts one
  under any structure — an event, a name, a family — and the model must read
  those too.
- `getDocumentSymbols()` reports all of it, at every depth, which is what makes
  this a projection rather than a parse.

What the code gives it:

- `RecordList` draws whatever row it is handed and says whatever the subject
  tells it to; `SubjectPresentation` bundles the four things that change.
- `RecordRef`, the cache, the trail, the header, the portrait and the crop are
  settled. A third view type joins the trail by being navigable and moving by
  `setViewState`, as the second did, without arranging anything.
- `buildIndex` already walks every record once, filling maps as it goes.

## Goals / Non-Goals

**Goals:**

- Citations read both ways from the one pass the model already makes.
- A third subject that costs a row, a page and a presentation, and changes
  nothing that already works — the same test the second subject was.
- A citation that carries where it came from, because "cited by Marie" and
  "cited by Marie's birth" are different claims.

**Non-Goals:**

- A general backlink index. Only `SOUR` pointers are read backwards, because
  only a source's page needs it. Reading every pointer backwards is a bigger
  design and would want its own change.
- Factoring the three pages into one. Three subjects is where a shared shape
  would show, and the honest answer after writing the third is in the
  retrospective below, not assumed here.

## Decisions

### Citations are collected by the walk that already happens

`buildIndex` walks every record's children to project a row. That walk gains a
descent: wherever it meets a `SOUR` whose payload is a pointer, it records a
citation carrying the citing record's identifier, the tag of the structure the
pointer sat beneath where that is not the record itself, and the `PAGE`.

The citations go into two maps filled in the same loop — by citing record, and
by cited source. Both directions are then lookups, and the document is read
once, which the specification requires.

*Alternative considered:* collecting citations when a source is opened, by
walking the document then. One walk per source page, over a document that may
hold twenty thousand people, to avoid two maps.

### A citation says what it was attached to, by tag

A citation carries the tag of the structure it sat beneath — `BIRT`, `NAME`,
or nothing where it sat on the record. The source page names that tag through
the same catalogue that names an event, so a citation of a birth reads as
"Birth" and one the catalogue does not name reads as its tag.

It does not carry a pointer to the structure itself. A structure is not
addressable — it has no identifier — which is the same reason events are not a
subject of the list. The tag is what can honestly be reported.

### The source's row and page reuse what the other two established

A `SourceRow` is a `Row` with a title, an author and a repository name. A
`SourceView` is a third `ItemView` holding a `RecordRef`. Neither is novel, and
the point of writing them is that neither had to be.

The citation rows on all three pages are one drawing, since a citation reads
the same whether the page is a source listing who cites it or a person listing
what they cite: a title, a place within the record, a page reference.

### What this change does not factor, and why it is worth saying

After three subjects the shared shape is visible: a page with a heading, an
identifier back to the record, some labelled fields, some groups of openable
rows, and events. Factoring it is tempting and is not done here.

The reason is that the three pages differ in what their groups *mean*, not just
in what they hold, and a shared page abstraction would have to carry that
difference as configuration — which is the shape that becomes unreadable at
four. If a fourth subject arrives, the factoring is worth doing with four
examples rather than three. This paragraph exists so the next reader knows it
was considered rather than missed.

## Risks / Trade-offs

- [A document where citations sit deep under many structures] → The walk is
  already recursive over a record's children; depth costs nothing extra, and
  the tag reported is the level-one structure, which is the one a reader
  recognises.
- [A source cited by hundreds of records] → The page lists them, and the list
  is a plain one; the rendering window belongs to the sidebar and is not shared
  with the pages. A source cited that heavily is rare enough to measure when it
  appears rather than to design for now.
- [Two maps growing with the document] → A citation is four short fields and
  documents hold fewer citations than people. The syntax tree remains the
  expensive thing.
- [A third subject making the selector crowded] → Three is still a glance.
  A fourth would be the moment to ask whether the control is still right.

## Migration Plan

Nothing to migrate: no stored data, no format, no setting. A workspace holding
an open Person or Family view keeps working.

## Open Questions

None. The one question this change could have raised — how to report the place
of a citation when a structure has no identity — is answered above by reporting
its tag, which is what the format lets anyone say honestly.
