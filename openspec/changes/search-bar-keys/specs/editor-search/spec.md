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
bar's fields or in the document, which are the keys Obsidian's own bar takes
without a gate: `F3` and `Mod+G` find the next match; `Shift+F3` and
`Mod+Shift+G` find the previous one; `Escape` closes the bar.

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

#### Scenario: The keys stop when the bar does
- **WHEN** the bar has been closed
- **THEN** `F3`, `Mod+G`, `Shift+F3` and `Mod+Shift+G` do nothing, and `Escape`
  reaches the document as it would with no bar open

### Requirement: The keys belong to the file being looked at

The bar's keys answer app-wide while it is open, so they SHALL answer only while
the GEDCOM file they belong to is the one being looked at. A bar left open in a
background tab MUST take no key: not `Escape`, which would otherwise be swallowed
where the reader needs it, and above all not `Mod+Alt+Enter`, which writes.

#### Scenario: The reader moves to another tab
- **WHEN** the bar is open in a `.ged` file and the reader switches to another
  tab, or to a pane in the sidebar
- **THEN** none of the bar's keys answer any more: each reaches whatever is being
  looked at, as it would with no bar open anywhere

#### Scenario: The reader comes back
- **WHEN** the reader returns to the tab whose bar is still open
- **THEN** the bar's keys answer again, unchanged

#### Scenario: Two GEDCOM files with a bar open
- **WHEN** two `.ged` files are open in separate tabs, each with the bar open,
  and the reader presses one of the bar's keys
- **THEN** it acts on the file being looked at, never on the other one

### Requirement: Keys that answer only from the bar's own fields

`Enter`, `Shift+Enter`, `Tab`, `Shift+Tab` and `Alt+Enter` SHALL act only while
one of the bar's fields has the focus, and `Mod+Alt+Enter` only while the replace
row is open with the focus in it — the gates Obsidian's own bar keeps on the same
keys. With the focus in the document each of them MUST reach the editor
unchanged, so that typing and indenting are unaffected by an open bar.

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

#### Scenario: Selecting every match from a field
- **WHEN** the focus is in the find or the replace field and the reader presses
  `Alt+Enter`
- **THEN** the key runs the same select-all-matches the bar's own button runs
- **AND** the editor holds one selection range, so what a reader sees today is
  the selection landing on a match rather than on every one; key and button will
  select every match together, unchanged, once the editor allows more than one
  range

#### Scenario: Replacing every match from the replace field
- **WHEN** the replace row is open, the focus is in it, and the reader presses
  `Mod+Alt+Enter`
- **THEN** every match in the file is replaced

#### Scenario: Replace-all with the replace row collapsed
- **WHEN** the bar is open on find alone — the replace row collapsed, and with it
  the replacement the query still carries from an earlier replace — and the reader
  presses `Mod+Alt+Enter`
- **THEN** nothing is replaced: a replacement the reader cannot see never reaches
  the file

#### Scenario: The writing keys from the document
- **WHEN** the reader clicks into the document and presses `Alt+Enter` or
  `Mod+Alt+Enter`
- **THEN** neither is the bar's: each reaches the editor unchanged

### Requirement: A key pressed mid-composition is the input method's

While an IME composition is in progress, none of the bar's keys SHALL answer:
`Enter` there commits a candidate, and taking it would both lose the candidate
and search for a term the reader had not finished typing.

#### Scenario: Committing a candidate in the find field
- **WHEN** the reader is composing a term in the find field and presses `Enter`
  to commit the candidate
- **THEN** the candidate is committed and the bar searches for nothing yet; the
  next `Enter`, with no composition in progress, finds the next match

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
line below the label, spelt for the reader's own platform the way Obsidian
spells one: its own symbols, in its own order, joined by a space on macOS and
by " + " elsewhere. `Mod` is a token of the API and SHALL reach no tooltip.

#### Scenario: Reading a button's tooltip on macOS
- **WHEN** the reader hovers a button of the bar on macOS
- **THEN** the tooltip reads the label and then the key on a line of its own:
  "Next" with `F3`, "Previous" with `⇧ F3`, "Select all matches" with
  `⌥ Enter`, "Replace" with `Enter`, "Replace all" with `⌘ ⌥ Enter`

#### Scenario: Reading a button's tooltip off macOS
- **WHEN** the reader hovers the same buttons on Windows or Linux
- **THEN** the keys read `F3`, `Shift + F3`, `Alt + Enter`, `Enter` and
  `Ctrl + Alt + Enter`, and no tooltip anywhere reads `Mod`

#### Scenario: A tooltip promises only a key that works
- **WHEN** a button's tooltip names a key
- **THEN** pressing that key runs what the button runs
