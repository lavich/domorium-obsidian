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

### Requirement: A FILE payload is read by its document's dialect

A relative `FILE` payload the language service offers as a link SHALL name the
vault file the language service reads it as, from the folder of the GEDCOM file
holding it and by the rules of that file's dialect, wherever the plugin uses it:
following the link, the media preview, and a picture on a desk page. A document
that declares no GEDCOM version SHALL be read as the language service reads it,
by the rules of GEDCOM 7. In GEDCOM 7 a payload is a URI reference, and a
percent-escape names the character it stands for. In GEDCOM 5.5.1 a `\`
separates folders and `..` climbs one, within the vault. A payload that names no
vault file by those rules SHALL be treated as a file the vault does not hold, and
no file outside the vault SHALL be read.

The name shown for such a file — in the preview, on a desk tile — SHALL be the
name of the file it resolves to.

#### Scenario: A percent-escaped name in GEDCOM 7
- **WHEN** `family/tree.ged` declares GEDCOM 7.0, holds
  `1 FILE photos/my%20photo.jpg`, and the vault holds
  `family/photos/my photo.jpg`
- **THEN** following the payload opens `family/photos/my photo.jpg`, and the
  preview draws it, named `my photo.jpg`

#### Scenario: A percent-escaped name in a document with no version
- **WHEN** `tree.ged` declares no `GEDC.VERS`, holds
  `1 FILE photos/my%20photo.jpg`, and the vault holds `photos/my photo.jpg`
- **THEN** following the payload opens `photos/my photo.jpg`

#### Scenario: An escaped separator in GEDCOM 7
- **WHEN** a GEDCOM 7.0 file holds `1 FILE photos%2Fmarie.jpg`, and the vault
  holds `photos/marie.jpg` beside it
- **THEN** the preview says the file is not in the vault

#### Scenario: A backslash and a parent folder in GEDCOM 5.5.1
- **WHEN** a GEDCOM 5.5.1 file in `family/` holds `1 FILE ..\photos\marie.jpg`,
  and the vault holds `photos/marie.jpg`
- **THEN** following the payload opens `photos/marie.jpg`

### Requirement: A renamed file is followed into the payloads that name it

When the reader renames or moves a vault file or a folder, the renames Obsidian
reports for that one action SHALL be taken together as one move, from every old
path to its new one. For every GEDCOM file in the vault, in an open GEDCOM tab or
closed, each relative `FILE` payload SHALL be read from the place that GEDCOM file
stood before the move, mapped through the move, and rewritten to name the same
file from the place the GEDCOM file stands after it — whether the file it names,
the GEDCOM file, or a folder holding either was moved — spelled as that
document spells a path, percent-escaped in GEDCOM 7. A payload naming a file the
vault does not hold SHALL be rewritten the same way, so it keeps naming the same
vault path. A payload that still names its file from the new place SHALL be left
as written.

Where the document cannot spell the new place, as GEDCOM 7 cannot spell one above
its folder, the payload SHALL be left as it is and the reader told how many were
left. A payload continued by `CONC` or `CONT` SHALL never be rewritten. It SHALL
be counted as left where its first line, read alone, would have to change — it
names a moved file or folder, or the GEDCOM file itself moved — and otherwise
left without a word, since only its first line is read. A closed GEDCOM file that the move cannot concern SHALL NOT be parsed, and
one with nothing to rewrite SHALL NOT be written, so its modification time does
not change.

#### Scenario: A photograph renamed with a space
- **WHEN** a GEDCOM 7.0 file holds `1 FILE photos/a.jpg`, and the reader renames
  `photos/a.jpg` to `photos/new photo.jpg`
- **THEN** the payload reads `photos/new%20photo.jpg`, and a notice says one
  media link was repointed

#### Scenario: A photograph moved above a GEDCOM 7 file
- **WHEN** a GEDCOM 7.0 file in `family/` holds `1 FILE photos/a.jpg`, and the
  reader moves `family/photos/a.jpg` to `a.jpg`
- **THEN** the payload is unchanged, and a notice says one media link was left
  pointing at the old path

#### Scenario: A photograph moved above a GEDCOM 5.5.1 file
- **WHEN** a GEDCOM 5.5.1 file in `family/` holds `1 FILE photos/a.jpg`, and the
  reader moves `family/photos/a.jpg` to `a.jpg`
- **THEN** the payload reads `../a.jpg`

#### Scenario: A closed file that does not name the photograph
- **WHEN** a closed GEDCOM file holds `FILE` payloads, none of them naming a file
  called `a.jpg`, and the reader renames `photos/a.jpg`
- **THEN** that GEDCOM file is neither parsed nor written

#### Scenario: A closed file naming the photograph percent-escaped
- **WHEN** a closed GEDCOM 7.0 file holds `1 FILE photos/my%20photo.jpg`, and the
  reader renames `photos/my photo.jpg` to `photos/b.jpg`
- **THEN** the payload reads `photos/b.jpg`

#### Scenario: A GEDCOM 5.5.1 file moved into a folder
- **WHEN** `tree.ged` declares GEDCOM 5.5.1 and holds `1 FILE media/a.jpg`, and
  the reader moves it to `family/tree.ged`
- **THEN** the payload reads `../media/a.jpg`, and a notice says one media link
  was repointed

#### Scenario: A GEDCOM 7 file moved out of a folder
- **WHEN** `family/tree.ged` declares GEDCOM 7.0 and holds `1 FILE photos/a.jpg`,
  and the reader moves it to `tree.ged`
- **THEN** the payload reads `family/photos/a.jpg`

#### Scenario: A GEDCOM 7 file moved into a folder
- **WHEN** `tree.ged` declares GEDCOM 7.0 and holds `1 FILE media/a.jpg`, and the
  reader moves it to `family/tree.ged`
- **THEN** the payload is unchanged, and a notice says one media link was left
  pointing at the old path

#### Scenario: A folder holding a GEDCOM file and its media
- **WHEN** `family/tree.ged` holds `1 FILE photos/a.jpg`, the vault holds
  `family/photos/a.jpg`, and the reader renames `family` to `kin`
- **THEN** the payload still reads `photos/a.jpg`, whatever order Obsidian
  reports the renames in and whether its children's renames come in the same
  task as the folder's or a later one, and no notice is shown

#### Scenario: A folder of media
- **WHEN** a GEDCOM 7.0 file at the vault root holds `1 FILE media/a.jpg` and
  `1 FILE media/x%20y.jpg`, and the reader renames `media` to `pics`
- **THEN** the payloads read `pics/a.jpg` and `pics/x%20y.jpg`, and a notice says
  two media links were repointed in one file

#### Scenario: A payload naming a missing file in a moved GEDCOM file
- **WHEN** `a/tree.ged` declares GEDCOM 7.0 and holds `1 FILE gone/z.jpg`, which
  the vault does not hold, and the reader moves it to `tree.ged`
- **THEN** the payload reads `a/gone/z.jpg`

#### Scenario: A missing file in a renamed folder, named percent-escaped
- **WHEN** a closed GEDCOM 7.0 file at the vault root holds
  `1 FILE my%20photos/gone.jpg`, which the vault does not hold, and the reader
  renames the folder `my photos` to `pics`
- **THEN** the payload reads `pics/gone.jpg`

#### Scenario: A new place that would not read as a link
- **WHEN** a GEDCOM 5.5.1 file holds `1 FILE photos/a.jpg`, and the reader renames
  the folder `photos` to `@fam@`
- **THEN** the payload is unchanged, and a notice says one media link was left
  pointing at the old path

#### Scenario: A payload continued on the next line
- **WHEN** `family/tree.ged` declares GEDCOM 5.5.1 and holds `1 FILE photos/my`
  continued by `2 CONC  photo.jpg`, and the reader moves it to `tree.ged`
- **THEN** both lines are unchanged, and a notice says one media link was left
  pointing at the old path

#### Scenario: A continued payload whose first line names nothing moved
- **WHEN** `tree.ged` declares GEDCOM 5.5.1 and holds `1 FILE photos/my`
  continued by `2 CONC  photo.jpg`, and the reader renames `photos/my photo.jpg`
  to `photos/b.jpg`
- **THEN** both lines are unchanged, and no notice is shown

#### Scenario: Two renames one after the other
- **WHEN** a GEDCOM file at the vault root holds `1 FILE media/a.jpg`, and the
  reader renames `media` to `pics` and then `pics` to `img`
- **THEN** the payload reads `img/a.jpg`

#### Scenario: A spelling that still names its file
- **WHEN** `family/tree.ged` declares GEDCOM 5.5.1 and holds
  `1 FILE ./photos/a.jpg`, and the reader renames `family` to `kin`
- **THEN** the payload still reads `./photos/a.jpg`
