## Why

The person browser gave a reader people. A GEDCOM holds two kinds of thing,
and the other one is the family: who married whom, when, where, and which
children came of it. Today a reader can reach a family only sideways, through
a person who belongs to one, and the marriage the family records — its date and
its place — is on no page at all.

The sidebar already carries the control for this. It has a selector naming what
of the document is being listed, with one entry in it, put there because
families were the obvious second and a reader should see that before there are
two. This change fills it.

It is also the cheapest possible test of the architecture the last change
settled, while that is still cheap to change. A family is a different subject
with the same shape: a row in the same list, a page of the same kind, addressed
the same way, navigated the same way. If any of those decisions were wrong, a
second subject is where it shows.

## What Changes

- The sidebar's subject selector gains **Families**. Choosing it lists the
  document's families: who they join, the year and place of the marriage, and
  how many children.
- A **Family view** opens as a workspace tab: the spouses, the children, the
  events the family record carries, and the identifier back to the `FAM` line.
  Every person on it opens their own page.
- A **Person view** gains the families a person belongs to — the one they were
  a child in, and the ones they were a spouse of — so the trail runs both ways
  and a reader can move from a person to the marriage and back out to anybody
  else in it.
- The read model reports families: who is in them and in which role, the events
  the record carries, and a name assembled from the spouses, since a family
  record carries no name of its own.

This change belongs in **this repository**. It adds no parsing and no
language-service behaviour: `getDocumentSymbols()` already reports a `FAM`
record's `HUSB`, `WIFE` and `CHIL` pointers and its `MARR` with the date and
place beneath it, which is what the model already walks to resolve a person's
relatives.

## Capabilities

### New Capabilities

- `family-view`: the page for one family — the spouses, the children, the
  events, how it links to the people in it, and how it reaches the record.

### Modified Capabilities

- `genealogy-read-model`: gains what a family is — who is in it and in which
  role, the events it records, how it is named where the format names it
  nothing, and which families a person belongs to.
- `people-browser`: the subject selector stops being a control with one entry.
  Choosing families lists families, the rows say what a family row says, and
  the search matches what a family is searchable by.
- `person-view`: a person's page gains the families they belong to, as a way
  into the marriage rather than only to the people around it.

## Impact

- `src/genealogy/` — families as rows and in full, family events, a name from
  the spouses, and a person's families. The module still imports nothing from
  `obsidian` and names nothing in a reader's language.
- `src/people/` — the list draws either subject, and the sidebar switches
  between them.
- `src/family/` — new: the Family view and its page.
- `src/person/` — a section of families on a person's page.
- `src/main.ts` — registers the Family view and opens one.
- `src/i18n/en.json`, `src/i18n/ru.json` — the family sections, the family
  event names and the subject, in both languages.
- `styles.css` — the family page, on Obsidian's own variables.
- `manifest.json` — unchanged. Nothing here needs an API above the 1.8.7 floor.

## Non-goals

- **A family tree.** No canvas, no pedigree chart. This change makes the
  family a thing a reader can open; drawing the graph is its own change and
  will build on this one.
- **Editing anything.** No forms, no adding or removing a spouse or a child,
  no writing to the file.
- **Everything else on the roadmap.** Sources UI, media gallery, research
  notes, maps, timelines, tree health, duplicate detection, diff, merge,
  branch extraction.
- **Inventing a family where the file records none.** Two people with children
  and no `FAM` record between them are not a family here. The model reports
  what the document states.
- **Naming a family anything but its spouses.** A family record carries no name
  of its own. Upstream can assemble one, but only for a caller that can resolve
  a pointer, which the symbol interface does not let this model be; so the name
  is assembled here from the spouses already resolved. Where a family has no
  spouse the reader sees the identifier rather than an invented name.
- **A correct GEDCOM date parser.** As before: a year is read only where the
  date plainly states one, and reported as a hint saying how exactly.
- **Ordering children by birth.** They are listed in the order the record
  writes them, which is what the model reports for everything else.
