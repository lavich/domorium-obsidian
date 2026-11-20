# Using GEDCOM for Obsidian

The full guide to the plugin. The [README](../README.md) is the overview.

## Getting started

1. Enable **GEDCOM** in **Settings → Community plugins**.
2. Open a `.ged` or `.gedcom` file in your vault. It opens in **Graph** mode,
   and the mode buttons in the view header, with the commands **Show as
   graph**, **Show as timeline**, **Show as list** and **Show as source**, go
   between its four modes; the next file opens in the mode you chose last.
   Obsidian saves changes back to the same file.
3. The genealogy interface is still a beta and may change. To work in the
   source editor alone, turn off **Genealogy interface (beta)** in the plugin
   settings. Files then open in the editor. If you changed any setting on an
   earlier version, the interface may still be off; turn it on there.

## Modes of a tab

The next paragraphs — the modes of a tab and the record card — are
part of the genealogy interface and appear only while it is on; turning it off
hides it and closes its panels without losing the mode a tab was in. The
editor features after them need no setting.

A GEDCOM tab shows its file in four modes — **Graph**, **Timeline**, **List**
and **Source** — which the four buttons in the tab's header choose, left to
right in that order, the current mode's in the accent colour. The commands
**Show as graph**, **Show as timeline**, **Show as list** and **Show as
source**, from the command palette or the tab's menu, do the same, and **Switch
between source and the last view** goes back and forth between Source and the
mode before it. The graph, the timeline and the list read the tab's own text, so
what is typed and not yet saved is already in them. **Find**, and its key, opens
the search of the mode the tab is in: the editor's panel in Source, the search
over the board in Graph and Timeline, and the filter field in List;
**Replace** stays in Source.

## List

In **List** mode the tab shows the file's people, families, sources,
media, shared notes, repositories or other records as a table, switched by the
buttons at its top, or by one dropdown where the toolbar is too narrow for the
seven buttons in the language shown. People show name, years, place and
how many sources the record cites, with a mark where it cites none; families
show the spouses, the year and place of the marriage and the number of
children; sources show the title, author, repository and how many records cite
them. Media show the title, file,
format and how many records link them; notes their first line and how many
records link them, and the search reads their whole text; repositories their
name, address and how many sources point at them; and **Other** lists the file's
header first, then submitters, submission records and records of the file's own,
with their kind and name. A click on a column header sorts by it, a second click reverses the order
and a third restores the file's; a filter field narrows the rows by name, year
and place. Sorting people by Sources puts those whose records cite no source
first. A count says how many rows are shown. Clicking a row, or pressing Enter
or Space on it, selects that record. The row of the selected record is marked
and brought into view when it was selected elsewhere. The arrow keys, Home,
End and the page keys move through the rows. A file of twenty thousand people
draws only the rows in view. On a phone, and in a tab narrower than
640 pixels, each row takes two lines and a selector with a direction button
replaces the column headers.

## The record card

A tab selects one record at a time, and the **record card** in the right sidebar
shows it, whatever the mode. While **Open the record card when selecting** is on, which it is by default,
clicking a card, a node, a row or a link opens the card in the right sidebar,
putting it there if it is closed and expanding a collapsed sidebar, and the view
you clicked in keeps the focus; a card already open is left alone, and one you
collapse or close comes back with the next click. The left sidebar is never
opened. Following the cursor in Source and moving inside the card open
nothing. With it off, the first selection in a session puts the card in the
right sidebar without expanding it. **Show the record
card** brings it back, opens a collapsed sidebar and gives it the focus; on a
phone it is in the right drawer, which a second touch on a card, or a tap on a
row of the list, opens. The card of a person, a family, a source, a medium, a shared note, a repository, a submitter, the file's header or any other record is the **lines of the record as a tree** and nothing else: no heading, no section of relatives, pictures or timeline. The tree runs in the
order the file writes the lines and nests them as the file nests them, with no sections of the plugin's
own: names, events, attributes, notes, associates, identifiers and a custom tag all stand where
the file puts them, in the reader's language. Every node starts closed with a one-line summary — an event shows its date
and place, an attribute its value — and a quiet dot after it where it cites a source; what you
open comes back open when you return to that record. Each node has an arrow, and a press on its row opens or closes it; the icon in the header above the tree, as in Obsidian's file explorer, opens or closes every node and is always shown. A place is text in a closed fact and a field like any value once
its event is opened; it opens no card. Every control of a card shows a focus ring for the
keyboard and, on a phone, can be hit over at least 32 pixels, a block button over 44. A pointer
to a shared note shows the note's text where it stands, with an **Open note** control beside it
that opens the note's own card. The text of a shared note and the value of a record of the file's
own are a field on the root of its tree. The file of a medium shows its picture where it is an
image in the vault, and its path beside a file icon otherwise. The card has no header: select a record again in the
graph, the timeline or the list to return to it. **Show in source** on a pointer to a record the file does not
declare switches to Source with that line selected.

## Editing a record in the card

The tree also **edits the record**, always through the language service, so the
file stays the source of truth and every change is one step that Undo in Source
takes back. A value is a field: while you type in it, it holds the value as the
file writes it — a name with the slashes around its surname — and it is written
when you leave it or press Enter (in a note, Enter starts a new line and leaving
writes). Escape, or the round arrow beside a changed field on a phone, puts the
file's value back. A value the standard lists is a dropdown, one that may hold
several of them a menu of checked values, and a pointer has a list of the records
it may point at; a family, spouse or child link is changed on the other record.
The **+** of a line opens a menu of what may be added beneath it, in the file's
dialect: an event is written at once as `Y`, a pointer once you choose its record,
and anything else waits as an unwritten row until it has a value and what the
standard requires beneath it — a role for an associated person, for instance. The
bin of a line removes it with everything beneath it, asking first when lines go
with it. The six-dot grip at the end of a row drags the line, with everything
beneath it, to another place among its siblings, with a mouse or a finger; a
place that would change how the file is read is refused. What the service refuses is not written, and the reason is shown under
the field; a change made against text that has moved since the card was drawn —
an edit in Source, a second press — is refused and the card is drawn again from
the file. The header edits as any record, and the language service refuses what
would change how the file is read, its GEDCOM version for one. A file with no GEDCOM version the plugin can check is shown read-only,
with a line saying so.

## A medium's file

Pressing the picture or the path of a medium's file offers two choices. **Choose
from the vault** lists the vault's files, images first, and writes the one you
pick as a path relative to the GEDCOM file; a GEDCOM 7 file names only files in
its own folder or beneath it. **Upload from device** opens your device's file
picker and copies the file into the vault — beside the file the line names, or
into a `Media` folder beside the GEDCOM file — numbering the name where it is
taken, then writes its path. Where the line states a format, the same change
writes the new file's (`image/png` in GEDCOM 7, `png` in 5.5.1, where the
standard lists it). Nothing is copied before you choose a file, and a copy is
never removed by the plugin.

## Selecting a record

What selects a record: a click or tap on a card or a node in Graph, or a bar in
Timeline, marks the person and shows the card without moving the
view, and a click on a row in List marks the row; a link to a record and **Go to
record** also glide to the person or bring the row into view; a relative, a
citation or a tile in the card selects that record. In
Source a link or the card puts the cursor on the record's
first line, and the cursor, once it rests in a record that has a card, selects
it when it is a person, a family, a source or a media record — a note, a repository, a
submitter, a record of the file's own or the header at the cursor leaves the selection alone. The
selection is kept when the tab changes mode and across a restart.

The command **Open the list of the GEDCOM file** brings the GEDCOM tab
you used last to the front as a list, wherever it is; with no GEDCOM tab open it
says so.

## Timeline

In **Timeline** mode the tab shows each person as a bar on an axis of years, from
birth to death, with their name written inside it and no years on it. Each person has a row of their own, in the order of
generations. A bar takes its colour from
the surname — `Лобанов` and `Лобанова` look alike, `Лобанов` and `Сидорова` do
not — and a person with no surname is grey. A soft end means the date is
approximate; a bar with no recorded death fades out a hundred years after it
begins, while one that begins at a birth in the last hundred years runs to the
present in a straight cut edge, as the bar of a person who may be alive. A name too long for its bar is cut with an ellipsis inside it, and pointing at a bar shows the whole name. Dated events are marks along the bar's lower edge, an approximate
date is drawn dashed and a period as a span; a person with no dated event has no
bar. Clicking a bar selects the person and picks out their whole branch — all their
ancestors and descendants and the spouses of each — with a line and an arrowhead
from each parent down to each child, and a dashed line with a dot at each end to a
spouse at the year of the marriage. A year cursor gives the age everyone alive
reached that year, and the selected person's age on the axis. A search icon over
the board opens into a field that fades everyone else and steps from match to
match with arrows, and the zoom buttons widen, narrow or fit the years; on a
phone a pinch zooms the axis. **Branch**, on the selected bar or from the command
**Branch of the selected person**, narrows the board to one person's ancestors
and descendants (all generations), and a file of more than 500 people opens on the branch of the
person selected. An event shows its lines in Source. On a phone the first touch
picks a person out and places the year cursor, and a second touch selects them.

## Graph

In **Graph** mode the tab shows a card per person, generations from top to
bottom and tinted by surname, as the bars of the timeline are. Spouses stand side by side, a husband to
the left of his wife, joined by a node with the year of their marriage — hollow
where it is undated — from which lines run, turning at rounded right angles, to their children; the
husband's family tends to stand on the left and the wife's on the right, and the
rows are ordered to cross as few lines as it can find. The graph is laid out by
family: people are grouped into the families the file declares — adoptive and
foster links, several marriages and unknown parents included, though the graph
draws every link alike — before any card is placed, and a person who belongs to
several families stays one card. Pointing at a person
lights their whole branch, as the timeline does; pointing at a node shows the
marriage and the number of children. Drag or scroll with two fingers to move,
use the wheel or pinch to zoom, and **Fit** to see the whole scope; far out the
cards are drawn without names. The search, **Branch** and the 500-person rule
work as in the timeline. Choosing a branch, or returning to the whole file, moves
the cards that stay to their new places as the view glides, fading the others in or
out and bringing the lines back once the cards have arrived; with reduced motion, or
where more than 400 cards are drawn, the change is immediate. A card selects the person, a node the family, and every
card and node can be reached and activated from the keyboard.

## What a tab remembers

Each tab remembers its mode and its selected record, and the branch, position and
zoom of its graph and its timeline, across a restart. A file
opened in a new tab, or a tab navigated to another file, starts in the mode you last
chose in a GEDCOM tab with the header buttons or a **Show as** command — Graph the
first time — so working in Source or in Timeline carries over from file to file.
Only a choice of yours counts: opening a file, restoring a workspace or Back never
changes it.

## The source editor

Use **Go to GEDCOM definition** from the command palette to jump from an XREF
usage to its record declaration. **Find GEDCOM references** moves between
matching declarations and usages, and **Rename GEDCOM reference** updates the
current XREF atomically. Editor behavior can be adjusted in the plugin settings.

## GEDCOM in notes

A record pasted into a note is highlighted and checked when it is fenced as
`gedcom`. A block carries no header, so it is read as GEDCOM 7 unless the fence
names another specification — ```` ```gedcom 5.5.1 ````.

A note can link to a record. **Copy link to record** puts
`[[tree.ged#@I47@|Marie /Curie/]]` on the clipboard — a link the vault indexes,
so the file's Backlinks pane lists the notes that mention it and the graph draws
an edge to each. It is spelt the way this vault spells its own links, and shows
the name the record carries rather than a path. **Copy Obsidian URL to
record** writes the `obsidian://domorium?vault=…&file=…&xref=@I47@` form instead,
which a browser or another application can follow. Either one opens the file with
the cursor on that record.

## Photographs

Hovering a `FILE` payload shows the photograph it names, and hovering the
pointer of `1 OBJE @O1@` shows the part of that photograph the link's `CROP`
asks for — so one group portrait shows a different face under each person who
references it. Media that is not an image is named rather than drawn, and a
`FILE` naming a web address says so instead of being fetched. A `FILE` payload
is read by its file's GEDCOM version, so in GEDCOM 7 `photos/my%20photo.jpg`
names `photos/my photo.jpg`, and a vault file that is renamed or moved is
followed into the payloads naming it — as is a renamed folder, and a GEDCOM file
moved to another folder, whose payloads are spelled again from where it now
stands — or a notice says how many it could not follow. **Media preview**
in the plugin settings chooses the gesture, or turns it off, independently of
**Record preview**. Both open on a resting hover by default; either can be set
to ask for Ctrl/Cmd instead, and a gesture already chosen is kept.

## Previews and embeds of a record

Typing `[[tree.ged#` in a note offers the records in that file, by name where
the format gives one. Hovering a link to a record shows the record, highlighted,
without opening the file, and `![[tree.ged#@I47@]]` embeds it in the note the
same way.
