## REMOVED Requirements

### Requirement: The timeline of a file is a tab of its own

**Reason**: The timeline of a file is no longer a tab of its own; it is a mode of the file's tab.

**Migration**: "The timeline is a mode of the file's tab" says what the timeline does in the tab. A tab of the timeline saved by an earlier version is closed when the workspace loads, as "A workspace saved with the file's overview in a tab of its own opens without it" in `genealogy-view` says.

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

A file of more than 500 people SHALL show its timeline, the first time the tab
does, on the branch of the person the tab had in view when it was brought to the
timeline — the page's person in Genealogy mode, the person at the cursor in
Source mode — or of the first person the file declares where neither names one. A
smaller file SHALL open on all of it. Once the tab has shown the timeline, the
scope the reader leaves it on SHALL be kept, the whole file included.

#### Scenario: Irène's branch
- **WHEN** the reader chooses Irène's branch in the timeline of `curie.ged`
- **THEN** her parents and grandparents, Frédéric, and their two children are
  shown, and the timeline says this is 10 of 17 people

#### Scenario: Branch again
- **WHEN** Irène's branch is shown and the reader chooses Branch on Irène's row
- **THEN** the whole file is shown with Irène's row in view, and no line about
  the scope is shown

#### Scenario: A large file
- **WHEN** a file of 2 000 people is open on a person's page and the reader
  switches the tab to Timeline mode
- **THEN** the timeline shows that person's branch, with the way back to the
  whole file

#### Scenario: A large file opened as a timeline
- **WHEN** *Open GEDCOM files as* names Timeline and the reader opens a file of
  2 000 people
- **THEN** the timeline shows the branch of the first person the file declares

#### Scenario: The whole file, chosen, stays
- **WHEN** the reader returns a large file's timeline to the whole file, switches
  to Source mode and back to Timeline mode
- **THEN** the whole file is shown

### Requirement: The timeline leads to the page and to the source

Activating a person's name or lifeline SHALL show that person's page in the
same tab, as a row of the index does: the tab leaves Timeline mode for Genealogy
mode, and Back SHALL return it to the timeline, at the scope and zoom it had.
Activating a mark SHALL show the lines of its event in the source: the tab
leaves Timeline mode for Source mode with those lines selected and in view.
Activating either SHALL open no other tab.

#### Scenario: From the timeline to Irène's page
- **WHEN** the tab of `curie.ged` is in Timeline mode and the reader activates
  Irène's lifeline
- **THEN** the same tab is in Genealogy mode showing Irène's page, and no other
  tab has opened

#### Scenario: Back to the timeline
- **WHEN** Irène's page was opened from the timeline of Irène's branch, and the
  reader presses back
- **THEN** the tab is in Timeline mode again, showing Irène's branch at the zoom
  it had

#### Scenario: From a mark to the source
- **WHEN** the reader activates the mark of Marie's birth
- **THEN** the tab is in Source mode with her `1 BIRT` lines selected — `1 BIRT`,
  `2 DATE 7 NOV 1867` and `2 PLAC Warsaw, Congress Poland` — and in view

## ADDED Requirements

### Requirement: The timeline is a mode of the file's tab

A GEDCOM tab SHALL offer a **Timeline** mode that shows the whole of its file as
the timeline of the file, in the tab itself, with no tab of its own. The tab
SHALL enter it from the mode control in its header, from a command, and from the
tab's menu, as the requirement on the mode control of a GEDCOM tab says.
Entering it SHALL NOT open another tab.

The timeline SHALL show the file as the tab holds it, including text typed in the
tab and not yet saved, and SHALL show every later change to it: at once while the
tab is in view, and the next time it is brought into view otherwise. It SHALL keep
its scope and zoom across leaving the mode and coming back and across closing and
reopening the workspace, and SHALL stay on the file when it is renamed or moved,
as the tab does.

Like the rest of the plugin's genealogy modes, nothing in the timeline SHALL
write to the file.

#### Scenario: Choosing it from the mode control
- **WHEN** `curie.ged` is open in Genealogy mode and the reader chooses Timeline
  from the mode control in its header
- **THEN** the same tab shows the timeline of `curie.ged`, with a row for each of
  its 17 people, and no new tab is open

#### Scenario: An edit not yet saved
- **WHEN** the reader changes Marie's year of death in Source mode, the file is not
  yet saved, and the reader switches to Timeline mode
- **THEN** her lifeline in the timeline ends at the new year

#### Scenario: Leaving the mode and coming back
- **WHEN** the tab is in Timeline mode, zoomed in, on Irène's branch, and the
  reader switches to Source mode and then to Timeline mode again
- **THEN** the timeline shows Irène's branch at the same zoom

#### Scenario: The file is renamed
- **WHEN** the tab of `curie.ged` is in Timeline mode and the file is renamed to
  `family.ged`
- **THEN** the tab is named `family.ged` and still shows the timeline

#### Scenario: Restored with the workspace
- **WHEN** a tab of `curie.ged` is in Timeline mode, zoomed in, on Irène's branch,
  and Obsidian is restarted
- **THEN** the tab shows the timeline of Irène's branch at the same zoom
