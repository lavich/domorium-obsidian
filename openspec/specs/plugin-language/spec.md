# plugin-language Specification

## Purpose

The language the plugin speaks to a reader: where it learns it, which text
follows it and which stays as written, how counts are spelt in it, and the
minimum app version the plugin declares in order to ask.

## Requirements

### Requirement: The plugin speaks the language the app is set to

Every piece of text the plugin itself writes for a reader SHALL be shown in the
language Obsidian is set to when that language is one the plugin carries, and in
English otherwise. The plugin carries English and Russian. This covers the
command names in the palette and the pane menu, every notice, the names and
descriptions in the settings tab and the options of its dropdowns, the status
bar, the search bar's placeholders and button tooltips, the rows and buttons of
the media popover, the record switcher's placeholder, the rename dialog, and the
"line N" prefix of a problem listed under a `gedcom` block in a note.

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

### Requirement: Counts are spelt by the rules of the language shown

Wherever the plugin spells a count — the problems in the status bar, the
references found, the media links and files a rename repointed — it SHALL pick
the noun's form by the plural rules of the language shown, not by whether the
count is one.

#### Scenario: Russian problem counts in the status bar
- **WHEN** the app is Russian and a GEDCOM file has 1, 2, 5 and 21 problems in
  turn
- **THEN** the status bar spells the noun in the form Russian uses for each:
  the singular for 1 and 21, the paucal for 2, the plural for 5

#### Scenario: English problem counts in the status bar
- **WHEN** the app is English and a file has 1 problem, then 2
- **THEN** the status bar reads `1 problem`, then `2 problems`

#### Scenario: No problems
- **WHEN** a file has no problems
- **THEN** the status bar says so in words in the language shown, not with a
  count of zero

#### Scenario: Two counts in one notice
- **WHEN** a renamed media file is repointed in 3 links across 1 file
- **THEN** the notice spells each count's noun in the form its own count calls
  for

### Requirement: Text that stays as written

The plugin SHALL NOT translate, transliterate or reorder: GEDCOM tags and
values, cross-reference identifiers, file names, paths and URLs, the word
`GEDCOM` and version numbers, the name of a key or modifier in a tooltip, and
any text produced by the language service — diagnostic messages, hover text,
quick-fix titles, completion details and refusal messages. Such text is shown
as it was produced, embedded in the plugin's own sentence in the language shown.

#### Scenario: A problem under a note's GEDCOM block, in Russian
- **WHEN** the app is Russian and a `gedcom` block in a note has a problem on
  its third line whose message the language service wrote in English
- **THEN** the list item opens with the Russian word for "line" and the number
  3, followed by the message exactly as the language service wrote it

#### Scenario: A tooltip with a key
- **WHEN** the app is Russian and the reader hovers the search bar's next
  button on a non-Mac
- **THEN** the tooltip's first line is Russian and its second line reads `F3`,
  and the replace-all button's second line reads `Ctrl + Alt + Enter`

#### Scenario: A notice naming an identifier
- **WHEN** the app is Russian and the reader copies a link to record `@I1@`
- **THEN** the notice is in Russian and contains `@I1@` unchanged

### Requirement: The editor's own panels speak the same language

The text CodeMirror writes into the GEDCOM editor on the plugin's behalf — the
problems panel's title, its line for a file with no problems, its close button's
label, the placeholder that stands for folded lines and its "unfold" label, and
the label of the completion list — SHALL be in the language the plugin speaks.

#### Scenario: The problems panel in Russian, nothing wrong
- **WHEN** the app is Russian and the reader opens the problems panel on a file
  with no problems
- **THEN** the panel's title and its only line are Russian

#### Scenario: A folded record in Russian
- **WHEN** the app is Russian and the reader folds a record
- **THEN** the placeholder that stands for the folded lines carries a Russian
  label

#### Scenario: The problems panel in English
- **WHEN** the app is English and the reader opens the problems panel
- **THEN** the panel reads as CodeMirror ships it, which is what it read before

### Requirement: No text is missing in either language

Every string the plugin carries SHALL exist in both English and Russian, with
the same placeholders on both sides, so that no reader is shown a key, an empty
string, or a sentence with a hole in it. Where a Russian entry is nonetheless
absent at runtime, the English text SHALL be shown in its place.

#### Scenario: A string added in one language only
- **WHEN** a string is added to the English side and not to the Russian side
- **THEN** the project's checks fail before the change is released

#### Scenario: A placeholder that differs between the sides
- **WHEN** the English side of a string names a placeholder the Russian side
  does not, or the other way round
- **THEN** the project's checks fail before the change is released

### Requirement: The minimum app version

The plugin SHALL declare Obsidian 1.8.7 as its minimum app version, the release
in which the app began to tell a plugin its language. A reader on an older app
keeps the last plugin release that supported it and is offered no newer one.

#### Scenario: A reader below the floor
- **WHEN** a reader on Obsidian 1.8.6 checks for plugin updates
- **THEN** the plugin stays at its last release with a 1.5.0 floor and nothing
  about it stops working

#### Scenario: A reader at the floor
- **WHEN** a reader on Obsidian 1.8.7 checks for plugin updates
- **THEN** the release carrying this change is offered
