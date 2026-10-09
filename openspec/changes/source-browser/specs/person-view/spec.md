## ADDED Requirements

### Requirement: The page shows what the person is sourced from

The page SHALL show the citations the person's record makes: each naming the source
cited, openable so the reader reaches that source's page, the page or entry the
citation states where it states one, and what within the record the citation
was attached to where it was attached to a structure rather than to the record
itself.

A person's record citing nothing SHALL be shown without this section, rather than
with an empty one.

A citation naming a source the document does not declare SHALL be stated as an
unresolved reference, as other unresolved pointers already are.

#### Scenario: A record citing a source
- **WHEN** the record cites a source with a page
- **THEN** the page shows the source's title and that page, and the source
  opens when chosen

#### Scenario: A citation attached to an event
- **WHEN** a citation sits beneath an event of the record
- **THEN** the page says which event it belongs to

#### Scenario: A record citing nothing
- **WHEN** the record cites no source
- **THEN** the page shows no citations section
