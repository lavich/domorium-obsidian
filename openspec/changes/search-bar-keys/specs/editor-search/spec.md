## Purpose

The search and replace bar in the GEDCOM file view: which commands open it,
which keys it answers and from which focus, so that a reader who knows
Obsidian's document search knows this one without learning a second set of
keys.

## ADDED Requirements

### Requirement: The keys that open the bar

The bar SHALL open on the key a reader already uses for document search in
Obsidian, and on a key of the plugin's own for the replace row. Throughout this
spec `Mod` means Command on macOS and Control elsewhere.

#### Scenario: The reader presses the document search key in a GEDCOM file
- **WHEN** the reader presses `Mod+F` with a `.ged` or `.gedcom` file focused
- **THEN** the search bar opens with the replace row collapsed and the find
  field focused, its text selected

#### Scenario: The reader has rebound the document search key
- **WHEN** the reader has reassigned Obsidian's own "Search current file" to
  another key and presses that key in a GEDCOM file
- **THEN** the search bar opens, because the plugin claims no key of its own for
  find

#### Scenario: The palette and the pane menu still open the bar
- **WHEN** the reader runs the plugin's "Find..." or "Replace..." command from
  the command palette or the pane menu
- **THEN** the bar opens, with the replace row expanded for "Replace..." and
  collapsed for "Find..."

#### Scenario: Replace opens on a key of the plugin's own
- **WHEN** the reader presses `Mod+Alt+F` on macOS, or `Mod+H` on any other
  platform, in a GEDCOM file
- **THEN** the bar opens with the replace row expanded
- **AND** the binding is listed for the replace command in Settings → Hotkeys,
  where the reader can reassign it

### Requirement: Keys that answer wherever the focus sits

While the bar is open, these keys SHALL act whether the focus is in one of the
bar's fields or in the document: `F3` and `Mod+G` find the next match;
`Shift+F3` and `Mod+Shift+G` find the previous one; `Alt+Enter` runs
select-all-matches; `Mod+Alt+Enter` replaces every match; `Escape` closes the
bar.

#### Scenario: Finding the next match from the document
- **WHEN** the bar is open with a term entered, the reader clicks into the
  document, and presses `F3` or `Mod+G`
- **THEN** the selection moves to the next match and the bar's count follows it

#### Scenario: Finding the previous match from either focus
- **WHEN** the reader presses `Shift+F3` or `Mod+Shift+G`, with the focus in the
  find field or in the document
- **THEN** the selection moves to the previous match

#### Scenario: Closing the bar from the document
- **WHEN** the reader clicks into the document and presses `Escape`
- **THEN** the bar closes

#### Scenario: Replacing every match from the document
- **WHEN** the reader clicks into the document and presses `Mod+Alt+Enter` with
  a replacement entered
- **THEN** every match in the file is replaced

#### Scenario: Selecting every match from the document
- **WHEN** the reader clicks into the document and presses `Alt+Enter`
- **THEN** the key runs the same select-all-matches the bar's own button runs,
  and answers alike from either focus
- **AND** the editor holds one selection range, so what a reader sees today is
  the selection landing on a match rather than on every one; key and button will
  select every match together, unchanged, once the editor allows more than one
  range

#### Scenario: The keys stop when the bar does
- **WHEN** the bar has been closed
- **THEN** `F3`, `Mod+G`, `Shift+F3`, `Mod+Shift+G`, `Alt+Enter` and
  `Mod+Alt+Enter` do nothing, and `Escape` reaches the document as it would
  with no bar open

### Requirement: Keys that answer only from the bar's own fields

`Enter`, `Shift+Enter`, `Tab` and `Shift+Tab` SHALL act only while one of the
bar's fields has the focus. With the focus in the document each of them MUST
reach the editor unchanged, so that typing and indenting are unaffected by an
open bar.

#### Scenario: Enter in the find field
- **WHEN** the focus is in the find field and the reader presses `Enter`
- **THEN** the selection moves to the next match
- **AND** `Shift+Enter` moves it to the previous one

#### Scenario: Enter in the replace field
- **WHEN** the focus is in the replace field and the reader presses `Enter`
- **THEN** the match is replaced

#### Scenario: Enter in the document with the bar open
- **WHEN** the reader clicks into the document and presses `Enter`
- **THEN** a line break is inserted, the bar neither searching nor closing

#### Scenario: Tab in the document with the bar open
- **WHEN** the reader clicks into the document and presses `Tab`
- **THEN** the editor indents as it does with no bar open

### Requirement: Moving between the find and the replace field

`Tab` and `Shift+Tab` SHALL move the focus between the find and the replace
field, and SHALL do nothing of their own while the replace row is collapsed —
the key is then not the bar's, as it is not in Obsidian's own bar.

#### Scenario: Tab reaches the replace field
- **WHEN** the bar is open with the replace row expanded and the focus is in the
  find field, and the reader presses `Tab`
- **THEN** the focus moves to the replace field
- **AND** `Shift+Tab` from the replace field moves it back to the find field

#### Scenario: Tab with the replace row collapsed
- **WHEN** the bar is open with the replace row collapsed and the focus is in
  the find field, and the reader presses `Tab`
- **THEN** no replace field appears and the bar takes no part: the focus moves on
  to the next control the way it would with no binding at all

### Requirement: Every button names its key

Each of the bar's buttons SHALL carry its binding in its tooltip, on a second
line below the label, the way Obsidian's own search bar spells one.

#### Scenario: Reading a button's tooltip
- **WHEN** the reader hovers a button of the bar
- **THEN** the tooltip reads the label and then the key on a line of its own:
  "Next" with `F3`, "Previous" with `Shift+F3`, "Select all matches" with
  `Alt+Enter`, "Replace" with `Enter`, "Replace all" with `Mod+Alt+Enter`

#### Scenario: A tooltip promises only a key that works
- **WHEN** a button's tooltip names a key
- **THEN** pressing that key runs what the button runs
