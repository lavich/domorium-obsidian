# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Genealogists who keep their research in an Obsidian vault and do not need to
know the GEDCOM format. They read a family's history, follow relatives from one
person to the next, check what a fact rests on, and correct or extend the
record. Researchers who do know GEDCOM are served too, by the existing source
editor.

## Product Purpose

Make a GEDCOM file inside a vault readable and editable as genealogy rather than
as source code: people, families, events and sources, shown in several forms and
changed through forms, with every change written back to the same file.

Success: a researcher can answer "who was Marie's father, and how do we know?"
and fix a wrong date without ever seeing `@F1@` or a level number.

## Positioning

The GEDCOM file stays the single source of truth. The plugin does not import the
tree into a database, does not turn records into Markdown, and does not send
vault data anywhere. The genealogy interface is a reading and an editor of that
one file, sitting beside the researcher's own notes and media in the same vault.

## Operating Context

- Obsidian, desktop and mobile, inside the reader's own vault.
- A `.ged` / `.gedcom` file opened in the plugin's file view, which today is a
  source editor with validation, completion, navigation and folding.
- Research notes in the vault link to records (`[[tree.ged#@I47@]]`), embed them,
  and preview them on hover.
- Photographs and documents in the vault are referenced from `FILE` payloads,
  cropped per link by `CROP`.
- The GEDCOM parser and language service live upstream in `lavich/domorium` and
  are consumed as npm packages; parsing and validation changes belong there.

## Capabilities and Constraints

Confirmed direction for the genealogy interface:

- Shown as cards and pages (person, family, source), as a tree or chart, and as
  a timeline or map.
- Edited through fields and forms; the plugin writes the change into the GEDCOM
  file. Raw GEDCOM remains reachable through the existing source view.
- Vault integration: research notes that link to a record appear with it, and a
  note can be started from a record; vault media can be attached to people and
  events from the interface.
- Reading and editing are equally complete on desktop and mobile.

Constraints:

- Supports GEDCOM 5.5.1 and 7.0.
- No Node built-ins under `src/`; must run on Obsidian mobile.
- Minimum app version 1.8.7; newer APIs are declined unless the floor moves.
- Every string follows the app's language (English and Russian today).
- No network request unless the user explicitly allows remote images.

The work on branch `feat/person-browser` (sidebar panel, person, family and
source pages, read-only) is a draft. The genealogy interface is being rethought
from the start; that work is evidence, not a constraint.

Undecided:

- Working across several GEDCOM files in one vault at once.
- How an edit is confirmed, undone, and shown against the file.

## Brand Commitments

- Plugin id `domorium`, display name **Gedcom**; part of Domorium, which ships
  the same language support to VS Code, JetBrains and the browser.
- The plugin's own icon; the sidebar panel is named **Domorium**.
- Fits Obsidian: built on Obsidian's own CSS variables and themes.

## Evidence on Hand

- `demo-vault/`: four generations of the Curie family in one GEDCOM file —
  seventeen people, five families, sources, repositories and real photographs —
  with notes linking into it.
- `images/gedcom-obsidian.png`: the current source editor.
- No user research, testimonials or usage numbers exist; none may be invented.

## Product Principles

1. The file is the truth. Every view is a reading of it, every edit lands in it,
   and nothing is kept anywhere else.
2. Genealogy, not syntax. A researcher sees people, relationships, dates and
   evidence; tags, levels and pointers stay out of sight unless asked for.
3. Every claim shows what it rests on. Sources and citations are one step away
   from the fact they support.
4. The vault is the research desk. Notes and media around the tree belong in
   the interface, not beside it.
5. Phone and desktop are equals. Nothing essential needs a large screen.
