## ADDED Requirements

### Requirement: The genealogy interface is off until the reader turns it on

The plugin SHALL have a setting, **Genealogy interface**, that SHALL be off by
default for every reader, including one whose settings were saved before the
setting existed. It SHALL be changed only in the plugin settings. While it is
off, the plugin SHALL NOT offer Genealogy mode, the Index, the Evidence panel,
the ribbon icon or the commands that open them.

Turning the setting on or off SHALL take effect in every open tab and sidebar
without restarting Obsidian. A tab's last mode, and the *Open GEDCOM files as*
value, SHALL be kept while the setting is off and honoured again when it is
turned on.

#### Scenario: A reader who never touched the setting
- **WHEN** the plugin is installed or updated and the setting is not changed
- **THEN** no ribbon icon, no Index or Evidence command and no mode switch is
  offered

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
- **WHEN** a tab is in Genealogy mode, the Index and Evidence panels are open,
  and the reader turns the setting off
- **THEN** the panels close, the tab shows the source, and the mode switch and
  ribbon icon are gone

#### Scenario: Turning it on again
- **WHEN** a tab was in Genealogy mode, the setting was turned off and then on
- **THEN** the tab is in Genealogy mode again, showing the record it showed

## MODIFIED Requirements

### Requirement: A GEDCOM tab has a Genealogy mode and a Source mode

A tab showing a `.ged` or `.gedcom` file SHALL be in one of two modes. In
**Genealogy** mode it shows one record of the file as a page. In **Source** mode
it shows the file in the editor the plugin has today, with everything that
editor does. While the **Genealogy interface** setting is off, every tab SHALL
be in Source mode.

While the setting is on, the view header SHALL carry a switch between the two
modes, and a command SHALL switch the active GEDCOM tab between them. Switching
SHALL NOT change, save or mark as changed the file, and SHALL NOT discard text
typed but not yet saved in Source mode.

Switching to Source mode SHALL put the cursor at the start of what the page
shows — the selected fact, or else the whole record — and scroll it into view,
unless the cursor is already within those lines.

Each tab SHALL remember its own mode, and its record, across closing and
reopening the workspace. While the setting is on, a file opened anew SHALL open
in the mode the *Open GEDCOM files as* setting names, which SHALL be shown only
then, SHALL offer Genealogy and Source and SHALL default to Genealogy.

#### Scenario: A file opened with the default setting
- **WHEN** the reader has turned the Genealogy interface on, leaves *Open GEDCOM
  files as* unchanged and opens `curie.ged`
- **THEN** the tab is in Genealogy mode and shows a page

#### Scenario: A reader who prefers the source
- **WHEN** the Genealogy interface is on, the setting names Source and the
  reader opens `curie.ged`
- **THEN** the tab opens in Source mode, as the plugin did before this change

#### Scenario: The interface is off
- **WHEN** the Genealogy interface is off and the reader opens `curie.ged`
- **THEN** the tab is in Source mode, its header has no mode switch, and the
  mode command is not offered

#### Scenario: Switching with unsaved text
- **WHEN** the reader types in Source mode, switches to Genealogy before the
  file is saved, and switches back
- **THEN** the typed text is still there, and the page in between reflected it

#### Scenario: Switching to the source from Marie's birth
- **WHEN** Marie's birth is selected on her page and the reader switches to
  Source mode
- **THEN** the cursor is on her `1 BIRT` line, in view

#### Scenario: A tab restored with the workspace
- **WHEN** the interface is on, a tab in Source mode and a tab in Genealogy mode
  showing Pierre Curie are open, and Obsidian is restarted
- **THEN** the first is in Source mode and the second shows Pierre Curie
