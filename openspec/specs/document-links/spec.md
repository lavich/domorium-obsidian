# document-links Specification

## Purpose

Links from a GEDCOM file to other files in the vault — a `FILE` payload naming
a vault path — and where following one takes the reader, so that a click lands
on the file without losing the place it was clicked from.

## Requirements

### Requirement: A file already open is revealed where it is

Following a link to a vault file that is already open somewhere in the
workspace SHALL bring that file's existing tab to the front, wherever it is,
rather than open the file a second time. A tab in a collapsed sidebar counts:
the sidebar is opened and the tab shown. The GEDCOM tab the link was followed
from SHALL keep showing the GEDCOM file, so that the reader's place in it is not
lost.

#### Scenario: The file is open in a tab of the main area
- **WHEN** the reader follows a `FILE` link to `Media/marie.jpg`, which is
  already open in another tab of the main area
- **THEN** that tab comes to the front and gains focus, no new tab opens, and
  the GEDCOM tab still shows the GEDCOM file

#### Scenario: The file is open in a collapsed sidebar
- **WHEN** the reader follows a `FILE` link to a file that is open in a tab of
  a sidebar that is currently collapsed
- **THEN** the sidebar opens, that tab is shown, no new tab opens, and the
  GEDCOM tab still shows the GEDCOM file

#### Scenario: The file is not open anywhere
- **WHEN** the reader follows a `FILE` link to a vault file no tab is showing
- **THEN** the file opens in a new tab, and the GEDCOM tab still shows the
  GEDCOM file

#### Scenario: The file is not in the vault
- **WHEN** the reader follows a `FILE` link to a path no vault file has
- **THEN** nothing opens and a notice names the path that was not found
