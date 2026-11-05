## MODIFIED Requirements

### Requirement: A branch scope shows one person's ancestors and descendants

The reader SHALL be able to choose, from a person's card, to show only that
person's branch: the same people the timeline of the file shows for that person
and those numbers — their ancestors up to a number of generations, their
descendants down to a number, and the spouses of everyone so shown. Both numbers
SHALL start at two and be changed in steps of one, from zero to nine. The graph
SHALL say whose branch it shows and how many of the file's people that is,
SHALL return to the whole file on request, and SHALL show the rows of a branch
without empty rows between them. Choosing Branch again on the person whose
branch is shown SHALL return to the whole file, and that person's Branch SHALL
read as pressed while their branch is shown. While the whole file is shown, no
line about the scope SHALL be shown.

A file of more than 500 people SHALL show its graph, the first time the tab does,
on the branch of the person the tab had selected when it was brought to the graph
— in Source mode, the person of the record at the cursor — or of the first person
the file declares where neither names one. A smaller file
SHALL open on all of it. Once the tab has shown the graph, the scope the reader
leaves it on SHALL be kept, the whole file included.

#### Scenario: Irène's branch
- **WHEN** the reader chooses Irène's branch in the graph of `curie.ged`
- **THEN** four rows show Eugène, Sophie-Claire, Władysław and Bronisława
  Boguska; Pierre Curie and Marie; Frédéric and Irène; Hélène and Pierre Joliot
  — and the graph says this is 10 of 17 people

#### Scenario: Branch again
- **WHEN** Irène's branch is shown and the reader chooses Branch on Irène's card
- **THEN** the whole file is shown, centred on Irène's card, and no line about
  the scope is shown

#### Scenario: No ancestors and no descendants
- **WHEN** the reader shows Marie's branch with zero generations of ancestors
  and zero of descendants
- **THEN** one row shows Pierre Curie and Marie

#### Scenario: A large file
- **WHEN** a file of 2 000 people is open in Source mode with the cursor inside one
  person's record and the reader switches the tab to Graph mode
- **THEN** the graph shows that person's branch, with the way back to the whole
  file

#### Scenario: A large file opened as a graph
- **WHEN** Graph is the mode the reader last chose and the reader opens a file of
  2 000 people
- **THEN** the graph shows the branch of the first person the file declares

#### Scenario: The whole file, chosen, stays
- **WHEN** the reader returns a large file's graph to the whole file, switches to
  Source mode and back to Graph mode
- **THEN** the whole file is shown
