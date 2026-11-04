## MODIFIED Requirements

### Requirement: The genealogy interface is off until the reader turns it on

The plugin SHALL have a setting, **Genealogy interface**, that SHALL be off by
default for every reader, including one whose settings were saved before the
setting existed. It SHALL be changed only in the plugin settings. While it is
off, the plugin SHALL NOT offer Genealogy mode, the Index, the Evidence panel,
the timeline of the file, the ribbon icon, the header action that opens the
timeline, or the commands that open any of them.

Turning the setting on or off SHALL take effect in every open tab and sidebar
without restarting Obsidian. A mode a tab was last in, and the *Open GEDCOM files
as* value, SHALL be kept while the setting is off and honoured again when it is
turned on; the *Open GEDCOM files as* setting SHALL stay in the settings and
say that it applies only while the interface is on.

#### Scenario: A reader who never touched the setting
- **WHEN** the plugin is installed or updated and the setting is not changed
- **THEN** no ribbon icon, no Index, Evidence or timeline command, and no mode
  switch or timeline action in a tab header is offered

#### Scenario: A reader who used Genealogy mode before
- **WHEN** the plugin updates and their saved settings name Genealogy in *Open
  GEDCOM files as*
- **THEN** `curie.ged` opens in Source mode until they turn the setting on

#### Scenario: Turning it on with a tab open
- **WHEN** `curie.ged` is open in Source mode and the reader turns the setting
  on
- **THEN** the mode switch appears in the tab header, the ribbon icon appears,
  and the tab stays in Source mode

#### Scenario: Turning it off with panels open
- **WHEN** a tab is in Genealogy mode, the Index and Evidence panels and the
  timeline of the file are open, and the reader turns the setting off
- **THEN** the panels and the timeline close, the tab shows the source, and the
  mode switch, the timeline action and the ribbon icon are gone

#### Scenario: Turning it on again
- **WHEN** a tab was in Genealogy mode, the setting was turned off and then on
- **THEN** the tab is in Genealogy mode again, showing the record it showed

#### Scenario: A tab opened while it is off
- **WHEN** the interface is off, `curie.ged` is opened and the reader then
  turns the interface on
- **THEN** the tab is still in Source mode
