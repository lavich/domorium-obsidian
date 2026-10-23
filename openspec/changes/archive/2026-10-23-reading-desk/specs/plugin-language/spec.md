## MODIFIED Requirements

### Requirement: The plugin speaks the language the app is set to

Every piece of text the plugin itself writes for a reader SHALL be shown in the
language Obsidian is set to when that language is one the plugin carries, and in
English otherwise. The plugin carries English and Russian. This covers the
command names in the palette and the pane menu, every notice, the names and
descriptions in the settings tab and the options of its dropdowns, the status
bar, the search bar's placeholders and button tooltips, the rows and buttons of
the media popover, the record switcher's placeholder, the rename dialog, the
"line N" prefix of a problem listed under a `gedcom` block in a note, the
Genealogy and Source switch, the headings, labels, buttons and empty states of
the person and source pages, the index and the evidence panel, the names of
events and of the relationships they are shown under, and the quality of
evidence a citation states.

Text the file itself states — a name, a place, a date, a title, a page — SHALL
be shown as the file writes it, in either language.

The language is read when the plugin loads. A reader who changes the app's
language sees the plugin follow the next time the plugin is loaded, which is
what the app does with its own text.

#### Scenario: The app is set to Russian
- **WHEN** Obsidian's language is Russian and the plugin loads
- **THEN** the palette lists the plugin's commands in Russian, a copied link is
  announced in Russian, the settings tab is in Russian, and the status bar of a
  GEDCOM file reads in Russian

#### Scenario: The app is set to English
- **WHEN** Obsidian's language is English and the plugin loads
- **THEN** every one of those reads in English, word for word what the plugin
  showed before it had a second language

#### Scenario: The app is set to a language the plugin does not carry
- **WHEN** Obsidian's language is German and the plugin loads
- **THEN** every one of those reads in English

#### Scenario: A regional variant of a carried language
- **WHEN** the app reports its language with a region, such as `ru-RU`
- **THEN** the plugin speaks Russian

#### Scenario: A person page in Russian
- **WHEN** Obsidian's language is Russian and a person page is shown for a
  record with `1 BIRT` and `2 PLAC Warsaw, Congress Poland`
- **THEN** the fact is named in Russian, its source state reads in Russian, and
  the place reads `Warsaw, Congress Poland` as the file writes it
