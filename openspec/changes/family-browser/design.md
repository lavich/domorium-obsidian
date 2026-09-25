## Context

See proposal.md — Why. This change inherits a settled architecture and adds a
second subject to it, so most of the design is already made. What the code
gives it:

- **`buildIndex` already holds the families.** It fills a `families` map of
  identifier to symbol while walking the document, and `rolePointers` already
  reads the spouse and child roles out of one. Both are private to the closure;
  a family has simply never been projected outward.
- **`FAM` carries everything the list needs.** On the demo vault a family
  reports `HUSB=@I3@ WIFE=@I4@ CHIL=@I5@ … MARR` with `DATE` and `PLAC`
  beneath it. Every tag used under `FAM` there is `HUSB WIFE CHIL MARR`.
- **`tags.ts` already names the roles**, and names the person's event set with
  the reason written down: nothing in the data distinguishes an event.
- **`PeopleList` is close to subject-agnostic.** It holds rows, filters on one
  lowercase string per row, windows the drawing, marks one row and reports a
  choice. Only `drawRow` and the `PersonRow` type know it is people.
- **`PersonRef`, the cache, the crop, the header and the trail** are all
  settled and measured. Nothing here re-opens them.
- **`recordLabel` upstream can name a family** by its spouses, but takes a
  `resolve` callback and works on the AST, which this model does not have: it
  reads document symbols. The name is assembled here instead.

## Goals / Non-Goals

**Goals:**

- One list and one page shape serving two subjects, so a third is cheaper than
  the second was.
- A family that is addressed, navigated, cached and drawn by exactly the
  mechanisms a person already is, because a second subject is the test of
  whether those were right.
- No new decision where an old one answers.

**Non-Goals:**

- Generalising to a subject the change does not build. Two subjects is enough
  evidence to factor by; three would be speculation.
- A shared base class for the two pages. They show different things; what they
  share is the row, the trail and the header, which are already shared.

## Decisions

### A family is a person-shaped row, and the list stops caring which

`PersonRow` becomes one case of a `Row` the list draws: an identifier or a mark
that there is none, a title, two lines of detail, and the lowercase string the
filter tests. `FamilyRow` is the other case, carrying the spouses it is named
by, the marriage reading, the place and the child count.

`PeopleList` is renamed for what it is — a list of rows — and takes a function
that draws one. The window, the filter, the mark, the count and the bar do not
change at all, which is the point: if adding a subject had needed them changed,
the first change got them wrong.

*Alternative considered:* a second list class for families. It would duplicate
the window and the filter, which are the two parts with real logic in them, to
avoid a type union with two cases.

### The family's name is assembled here, from spouses already resolved

Reading a family resolves its spouses to people. The name is those people's
names joined, in the order the record names them. Nothing new is read for it.

Upstream's `recordLabel` does this and better, but it walks the AST and takes a
resolver, and this model reads document symbols by design — the property that
keeps it host-free and portable. Asking upstream to expose a symbol-level
equivalent is reasonable and is not a prerequisite: the rule is "join the
spouses' names", and a record with no spouse has no name rather than a made-up
one.

### The family event set is named, for the reason the person's is

`tags.ts` gains `FAMILY_EVENT_TAGS`. A family's events are a different set from
a person's — `MARR`, `DIV`, `ENGA`, `ANUL`, `MARB`, `MARC`, `MARL`, `MARS`,
`DIVF`, `CENS`, `EVEN` — and the same argument applies unchanged: nothing in
the data distinguishes an event from a pointer, and the schema that knows is
private to the validator.

Reading events is otherwise identical to a person's, so `eventsOf` takes the
set to read by rather than gaining a second copy.

### A family is addressed exactly as a person is

`PersonRef` is renamed `RecordRef`: a `DocumentRef` and an identifier, which
never said "person" in its shape. A family view's state is one, as a person
view's is. Nothing about the spelling, the equality or the round-trip changes.

The two views are separate types because they show different things, but they
share the trail: both set `navigation = true` and move by `setViewState`, so
Obsidian's history walks a reader who went person, family, person without
knowing the difference. That falls out of the mechanism rather than needing
work.

*Alternative considered:* one view type with a kind in its state. It would
make the tab title, the icon and the drawing all branch on the kind, to save a
class that is mostly a host interface.

### The person's page gains families, beside the people it already shows

Parents, partners and children answer *who*. A family answers *what the record
says about the marriage* — its date, its place — which today is on no page. The
two sit in different sections and the page does not try to merge them.

## Risks / Trade-offs

- [Renaming `PersonRow` and `PersonRef` touches every file on the last branch]
  → Mechanical, caught by the compiler, and done before anything is added so
  the additions land on the final names. The alternative is a model whose type
  names lie about what they hold.
- [A family with two spouses of the same sex, or one, or none] → The roles were
  already read without constraining what the file may say, and the naming rule
  degrades through one spouse to none. The specs carry a scenario for each.
- [The subject selector becoming two independent selections] → The spec states
  that changing one keeps the other, which is the behaviour that surprises
  nobody; the view holds both and rebuilds from whichever changed.
- [A second page doubling the styling] → The row, the trail, the header and the
  group headings are one set of rules already; the family page adds no colour
  and no new pattern.

## Migration Plan

Nothing to migrate: no stored data, no format, no setting. A workspace holding
an open Person view keeps working, its state being a shape that did not change.

## Open Questions

None. The two unknowns this feature might have raised — how a second subject
fits the list, and whether the trail spans two view types — are answered above
from mechanisms already measured on the last change.
