## MODIFIED Requirements

### Requirement: Search

A search field SHALL narrow the list as the reader types. For people it SHALL
match the name, any other name the record states, the years shown and the place
shown; for families the spouses' names, the year and the place; for sources the
title and the author. A year before the common era SHALL be matched by its
digits as the file writes them, not by the mark of the era shown beside it, so
the same search finds it in any language. Case SHALL NOT matter. A search
matching nothing SHALL say so and say what it searches.

#### Scenario: Searching by year
- **WHEN** the reader types `1867` in the people index of `curie.ged`
- **THEN** Marie Skłodowska-Curie is listed

#### Scenario: Searching by another name
- **WHEN** the reader types `salomea`
- **THEN** Marie Skłodowska-Curie is listed, through the birth name her record
  states

#### Scenario: Searching by a year before the common era
- **WHEN** a person's birth and a family's marriage are dated `1401 BCE` in a
  7.0 document, and the reader types `1401` in the people index and in the
  families index
- **THEN** that person and that family are listed
