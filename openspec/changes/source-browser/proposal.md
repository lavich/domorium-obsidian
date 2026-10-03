## Why

A genealogy is only as good as what it is founded on. A birth date with no
source is a rumour; the same date with a parish register behind it is a claim
somebody can check. GEDCOM records that founding — a `SOUR` record for the
register, and a citation wherever a fact leans on it — and the plugin shows
none of it.

The reader can reach the two questions that matter least and neither of the two
that matter most. What is this source, and what in my tree rests on it: the
second especially, because it is the question nobody can answer by scrolling.
A source cited by thirty people is thirty facts that stand or fall together,
and today finding them means reading the file.

This is also the first thing the plugin will show that is not a projection of
one record. A source page is mostly about records that point *at* it, and
nothing built so far reads a pointer backwards. Doing it on the third subject,
where the list and the page are already settled, is the cheap moment.

## What Changes

- The sidebar's subject selector gains **Sources**. Choosing it lists the
  document's sources: title, who wrote it, and where it is held.
- A **Source view** opens as a workspace tab: what the source is, the archive
  or library holding it, the pictures it carries, and — the point of the page —
  everything in the document that cites it, each naming what the citation
  pointed at within the record and the page or entry the citation gave.
- A **person's page** and a **family's page** gain the sources they cite, so a
  reader looking at a date can see what it rests on without leaving.
- The read model reports sources, the repositories they name, and **citations
  read in both directions**: what a record cites, and what cites a source.

This change belongs in **this repository**. It adds no parsing and no
language-service behaviour: `getDocumentSymbols()` already reports a `SOUR`
record's `TITL`, `AUTH`, `PUBL` and `REPO`, a `REPO` record's `NAME` and
address, and every `SOUR` citation with the `PAGE` beneath it, at whatever
depth the record puts it.

## Capabilities

### New Capabilities

- `source-view`: the page for one source — what it is, where it is held, and
  everything in the document that rests on it.

### Modified Capabilities

- `genealogy-read-model`: gains sources, repositories, and citations read both
  ways — what a record cites and what cites a source.
- `people-browser`: sources become a third subject of the list, with rows and a
  search of their own.
- `person-view`: a person's page gains what they are sourced from.
- `family-view`: a family's page gains the same.

## Impact

- `src/genealogy/` — sources as rows and in full, repositories, and a citation
  index built in the same pass that already walks the document. Still no
  `obsidian` import and no reader-facing text.
- `src/people/` — a third subject in the list and its row.
- `src/source/` — new: the Source view and its page.
- `src/person/`, `src/family/` — a section of citations on each page.
- `src/main.ts` — registers the Source view and opens one.
- `src/i18n/en.json`, `src/i18n/ru.json` — the source sections and the subject,
  in both languages.
- `styles.css` — the citation rows, on Obsidian's own variables.
- `manifest.json` — unchanged.

## Non-goals

- **Judging a source.** No quality rating, no confidence score, no "unsourced"
  warning on a person. The plugin reports what the document states; deciding
  whether a source is any good is the reader's, and flagging what lacks one is
  Tree Health's, which is its own change.
- **Editing anything.** No adding a citation, no attaching a source to a fact.
- **A repositories subject.** A repository is named by the sources it holds and
  a document has a handful; it is a section of a source's page, not a fourth
  entry in the selector.
- **Following a source out of the vault.** A source naming a web address shows
  it; opening it is the reader's business and the media preview's setting
  already governs what the plugin fetches.
- **Ordering citations by anything but the document.** They are listed in the
  order the file writes the records that make them, as everything else is.
- **A general backlinks mechanism.** Citations are read backwards because a
  source page needs it. Reading every pointer backwards — who points at this
  person, this family, this picture — is a larger thing and would want its own
  design.
- **Everything else on the roadmap.** Tree, media gallery, research notes,
  maps, timelines, tree health, duplicate detection, diff, merge, extraction.
