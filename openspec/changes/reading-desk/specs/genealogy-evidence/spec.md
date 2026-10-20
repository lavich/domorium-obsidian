## Purpose

The evidence panel in the right sidebar: what the selected fact, or the whole
record, rests on in the file, kept apart so that a source of the person is
never mistaken for a source of a fact.

## ADDED Requirements

### Requirement: The panel lives in the right sidebar and follows the selection

The plugin SHALL offer an evidence view, named **Evidence**, in the right
sidebar. It SHALL be placed there, without taking the focus, the first time in a
session a GEDCOM file is shown as genealogy and no such view is open; a reader
who then closes it SHALL not have it put back until the plugin loads again. It
SHALL open from a command, and selecting a fact on a desktop SHALL bring it into
view. On a phone it SHALL be reached as Obsidian's other sidebar views are, from
the right drawer, and from the action beneath a tapped fact.

The panel SHALL show the selection of the GEDCOM tab most recently active in
Genealogy mode: a fact of the person or family shown, or the whole record when
no fact is selected. Its heading SHALL name what it shows — the fact with its
date and place, or *Whole record* with the person's or family's name — and
SHALL offer *Whole record* when a fact is selected and Show in source always.

With no GEDCOM tab in Genealogy mode it SHALL say so.

#### Scenario: The first file shown as genealogy
- **WHEN** the reader opens `curie.ged` as genealogy with no evidence view open
- **THEN** the right sidebar gains the Evidence view as one of its tabs, and the
  page keeps the focus

#### Scenario: Selecting a fact brings the panel into view
- **WHEN** the right sidebar shows another tab, or is collapsed, and the reader
  selects Marie's birth on a desktop
- **THEN** the right sidebar shows the Evidence view, naming the birth

#### Scenario: Selecting a birth
- **WHEN** the reader selects Marie's birth
- **THEN** the panel's heading names the birth with `7 NOV 1867` and
  `Warsaw, Congress Poland`

#### Scenario: Back to the whole record
- **WHEN** a fact is selected and the reader chooses Whole record
- **THEN** the panel shows Marie's whole record and the fact is no longer
  selected on the page

### Requirement: Sources of the fact, then of the whole record

With a fact selected, the panel SHALL first list the citations that fact
itself makes. Below them, under a separate heading, it SHALL list the citations
the person's or family's record makes on itself. With no fact selected it
SHALL list only the latter.

Where the selected fact cites nothing, the panel SHALL say the fact has no
source of its own, and SHALL say either that the sources below belong to the
whole record and may not support this fact, or that the record cites nothing
either.

A fact of a family the person married into SHALL show that family event's own
citations as its own; the whole record SHALL remain the person's.

#### Scenario: A fact with no source of its own
- **WHEN** Marie's birth is selected
- **THEN** the panel says the birth has no source of its own and that the two
  sources below belong to the whole record, and lists those two below

#### Scenario: A fact with its own source
- **WHEN** a selected birth carries `2 SOUR @S2@` beneath it
- **THEN** `@S2@`'s source is listed as the birth's own, above the record's

#### Scenario: A record that cites nothing
- **WHEN** a fact of Zofia Skłodowska is selected
- **THEN** the panel says the fact has no source of its own and that the record
  cites nothing either

### Requirement: What a citation shows

Each citation SHALL show the title of the source it names, which opens that
source's page; the page or entry the citation states; the quality of evidence
it states, in words; and the author and publication the source states.

A citation of a source the file does not declare SHALL say so and offer Show in
source. A source described on the spot SHALL show the text its line states and
say that it is described in the record rather than as a source record.

#### Scenario: A citation with a page
- **WHEN** the whole record of Marie is shown
- **THEN** `The Nobel Prize in Physics 1903` is listed with
  `Nobel Prize in Physics 1903, shared with Pierre Curie and Henri Becquerel`
  and `Nobel Prize Outreach · nobelprize.org`

#### Scenario: A citation with a quality
- **WHEN** a citation carries `QUAY 3`
- **THEN** it shows that the evidence is primary

#### Scenario: Opening a source
- **WHEN** the reader activates `The Nobel Prize in Physics 1903` in the panel
- **THEN** the GEDCOM tab shows that source's page

### Requirement: The panel on a family page

On a family page the panel SHALL treat the family as it treats a person: the
selected family fact's own citations first, then those the family record makes
on itself.

#### Scenario: The Curies' marriage selected
- **WHEN** the family page of Pierre and Marie Curie is shown and the marriage
  is selected
- **THEN** the panel says the marriage has no source of its own and that the
  family record cites nothing either

### Requirement: The panel on a source page

When the GEDCOM tab shows a source page, the panel SHALL name the source and
offer Show in source.

#### Scenario: A source page shown
- **WHEN** the tab shows `Parish registers of Warsaw`
- **THEN** the panel's heading names that source and offers Show in source
