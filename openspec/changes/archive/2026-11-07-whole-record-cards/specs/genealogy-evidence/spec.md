## MODIFIED Requirements

### Requirement: What a citation shows

Each citation SHALL show the title of the source it names, which selects that
source; the page or entry the citation states; the quality of evidence
it states, in words; and the author and publication the source states. It SHALL also show, beneath
them, whatever else the citation's own lines state — its quoted text and date (`DATA`, `TEXT`), the event and
role it names (`EVEN`, `ROLE`), its notes and its media — each line read as the file writes it, with nothing of
the citation left out.

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
- **WHEN** the reader activates `The Nobel Prize in Physics 1903` in the Evidence
  section
- **THEN** the card shows that source

#### Scenario: A citation that quotes
- **WHEN** a citation carries `3 DATA` with `4 TEXT` and `4 DATE` beneath it
- **THEN** it shows the quoted text and the date beneath the page

#### Scenario: A citation with a note
- **WHEN** a citation carries `3 NOTE` with text
- **THEN** the text is shown with the citation
