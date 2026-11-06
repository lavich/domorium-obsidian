---
tags:
  - gedcom
  - demo
---

# The Curie family

A demonstration vault for the [GEDCOM plugin](https://github.com/lavich/domorium-obsidian).
Four generations of the Skłodowski, Curie and Joliot families live in
[[curie.ged]] — seventeen people, five families, three sources and two
repositories — and the notes around it are ordinary notes that happen to point
into it.

Enable **GEDCOM** in Settings → Community plugins, then try these in order. To
see the graph, timeline, index and record card, also turn on **Genealogy interface** in
the plugin's settings.

## Open the tree

Open [[curie.ged]]. It opens in the plugin's editor rather than as plain text:
levels, tags and identifiers are coloured, nested lines are indented without the
file being changed, and the status bar names the specification the file is
checked against. Ctrl/Cmd-hover any `@I1@` to see the record it points at.

## Follow a link into it

[[curie.ged#@I1@|Marie Skłodowska-Curie]] opens the file on her record. Hover it
first: the record appears without opening anything.

## Browse the places

With the **Genealogy interface** on, switch [[curie.ged]] to **List** and choose
**Places**: each place the file names is listed once, with its number of events
and their years. Click one and its card opens in the right panel, with every
event held there; press an event to go to the person or family. From a person's
card, press a place in its **Places** section to land on its row.

## Browse the events

Choose **Events** in the same **List** to see every event of the file, one row each, with
its record, date and place: an occupation or an award reads with its text. Sort by
Date to order them by year. Click a row and the card of the event opens in the
right panel, with its record, date, place and sources.

## Read the timeline

Switch [[curie.ged]] to **Timeline**. Each person is a bar from birth to death
with the name inside it, in a row of its own. The colour comes
from the surname, so the Curies look alike. Someone born in the last hundred years
with no death recorded, such as Pierre Joliot, runs on to today in a straight
edge; an older bar with no death fades out instead. Click a bar and
that person's parents and children are joined to it by lines with arrowheads and
the spouse by a dashed line at the year of the marriage, and **Branch** appears
at the end of the bar.

## Write one yourself

Type `[[curie.ged#` on the line below and the records of that file are offered by
name. Pick one, then hover what you wrote.

Every note here is tagged, so the tag pane holds the vault's own shape:
`person`, `topic`, `source`, and `family/curie` beside `family/joliot` and
`family/sklodowski`.

## See what the vault knows

Open [[curie.ged]] and look at the Backlinks pane: every note that mentions a
record is listed there, and the graph draws an edge to each. Nothing in this
vault maintains that — the links are ordinary links.
