## ADDED Requirements

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

When a vault file is renamed or moved, every relative `FILE` payload the language
service matches to it, in an open GEDCOM tab or a closed GEDCOM file, SHALL be
rewritten to name its new place, spelled as that payload's document spells a
path — percent-escaped in GEDCOM 7. Where the document cannot spell the new
place, as GEDCOM 7 cannot spell one above its folder, those payloads SHALL be
left as they are and the reader told how many were left. A closed GEDCOM file
that cannot name the renamed file SHALL NOT be parsed, and one with nothing to
rewrite SHALL NOT be written, so its modification time does not change.

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
