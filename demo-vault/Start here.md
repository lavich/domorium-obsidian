# The Curie family

A demonstration vault for the [GEDCOM plugin](https://github.com/lavich/domorium-obsidian).
Four generations of the Skłodowski, Curie and Joliot families live in
[[curie.ged]] — seventeen people, five families, three sources and two
repositories — and the notes around it are ordinary notes that happen to point
into it.

Enable **GEDCOM** in Settings → Community plugins, then try these in order.

## Open the tree

Open [[curie.ged]]. It opens in the plugin's editor rather than as plain text:
levels, tags and identifiers are coloured, nested lines are indented without the
file being changed, and the status bar names the specification the file is
checked against. Ctrl/Cmd-hover any `@I1@` to see the record it points at.

## Follow a link into it

[[curie.ged#@I1@|Marie Skłodowska-Curie]] opens the file on her record. Hover it
first: the record appears without opening anything.

## Write one yourself

Type `[[curie.ged#` on the line below and the records of that file are offered by
name. Pick one, then hover what you wrote.

## See what the vault knows

Open [[curie.ged]] and look at the Backlinks pane: every note that mentions a
record is listed there, and the graph draws an edge to each. Nothing in this
vault maintains that — the links are ordinary links.

## Two files, two answers

[[paf-export.ged]] was written by Personal Ancestral File. The status bar says
`PAF, not checked` rather than pretending a specification applies to it.
