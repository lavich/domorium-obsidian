## MODIFIED Requirements

### Requirement: The panel lives in the right sidebar and follows the selection

While the **Genealogy interface** setting is on, the plugin SHALL offer an
evidence view, named **Evidence**, in the right sidebar. It SHALL be placed
there, without taking the focus, the first time in a session a GEDCOM file is
shown as genealogy, or a person is selected in Graph or Timeline mode, and no such
view is open; a reader who then closes it SHALL
not have it put back until the plugin loads again. It SHALL open from a command,
and selecting a fact on a desktop SHALL bring it into view. On a phone it SHALL
be reached as Obsidian's other sidebar views are, from the right drawer, and
from the action beneath a tapped fact. While the setting is off, the plugin
SHALL NOT place the view, SHALL NOT offer the command, and SHALL close an
evidence view that is open.

The panel SHALL show the selection of the GEDCOM tab most recently active: in
Genealogy mode, a fact of the person or family shown, or the whole record when
no fact is selected; in Graph or Timeline mode, the whole record of the person
selected in the view. Its heading SHALL name what it shows — the fact with its
date and place, or *Whole record* with the person's or family's name — and
SHALL offer *Whole record* when a fact is selected and Show in source always.

Where no GEDCOM tab is in Genealogy mode, and none is in Graph or Timeline mode
with a person selected, it SHALL say so. A tab in Source mode shows no selection.

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

#### Scenario: The interface is off
- **WHEN** the Genealogy interface is off and the reader opens `curie.ged`
- **THEN** no Evidence view is placed and the palette does not offer to open it

#### Scenario: A tab in Graph mode with nobody selected
- **WHEN** the Evidence view is open and the active GEDCOM tab is in Graph mode
  with no person selected
- **THEN** the panel asks to open a GEDCOM file as genealogy, as it does with no
  GEDCOM tab open

#### Scenario: A person selected in the graph
- **WHEN** the active GEDCOM tab is in Graph mode and the reader activates Pierre
  Curie's row in the index
- **THEN** the panel shows Pierre Curie's whole record
