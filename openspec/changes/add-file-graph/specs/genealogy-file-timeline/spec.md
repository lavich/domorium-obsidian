## MODIFIED Requirements

### Requirement: A branch scope shows one person's ancestors and descendants

The reader SHALL be able to choose, from a person's row, to show only that
person's branch: their ancestors up to a number of generations, their
descendants down to a number of generations, and the spouses of everyone so
shown. Both numbers SHALL start at two and be changed in steps of one, from zero
to nine. The timeline SHALL say whose branch it shows and how many of the file's
people that is, and SHALL return to the whole file on request. Choosing Branch
again on the person whose branch is shown SHALL return to the whole file, and
that person's Branch SHALL read as pressed while their branch is shown. While
the whole file is shown, no line about the scope SHALL be shown.

A file of more than 500 people SHALL open on the branch of the person shown by
the GEDCOM tab the timeline was opened from — the page's person in Genealogy
mode, the person at the cursor in Source mode — or of the first person the file
declares where neither names one. A smaller file SHALL open on all of it.

#### Scenario: Irène's branch
- **WHEN** the reader chooses Irène's branch in the timeline of `curie.ged`
- **THEN** her parents and grandparents, Frédéric, and their two children are
  shown, and the timeline says this is 10 of 17 people

#### Scenario: Branch again
- **WHEN** Irène's branch is shown and the reader chooses Branch on Irène's row
- **THEN** the whole file is shown with Irène's row in view, and no line about
  the scope is shown

#### Scenario: A large file
- **WHEN** a file of 2 000 people is open on a person's page and the reader opens
  its timeline
- **THEN** the timeline shows that person's branch, with the way back to the
  whole file
