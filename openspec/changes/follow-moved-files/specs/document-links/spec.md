## MODIFIED Requirements

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
left. A closed GEDCOM file that the move cannot concern SHALL NOT be parsed, and
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
  reports the renames in, and no notice is shown

#### Scenario: A folder of media
- **WHEN** a GEDCOM 7.0 file at the vault root holds `1 FILE media/a.jpg` and
  `1 FILE media/x%20y.jpg`, and the reader renames `media` to `pics`
- **THEN** the payloads read `pics/a.jpg` and `pics/x%20y.jpg`, and a notice says
  two media links were repointed in one file

#### Scenario: A payload naming a missing file in a moved GEDCOM file
- **WHEN** `a/tree.ged` declares GEDCOM 7.0 and holds `1 FILE gone/z.jpg`, which
  the vault does not hold, and the reader moves it to `tree.ged`
- **THEN** the payload reads `a/gone/z.jpg`

#### Scenario: A spelling that still names its file
- **WHEN** `family/tree.ged` declares GEDCOM 5.5.1 and holds
  `1 FILE ./photos/a.jpg`, and the reader renames `family` to `kin`
- **THEN** the payload still reads `./photos/a.jpg`
