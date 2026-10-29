## Why

Issue #72: two moves leave `FILE` payloads pointing at nothing, and a third
corrupts them.

- **A moved GEDCOM file.** A relative payload is read from the folder of its
  GEDCOM file, so moving `tree.ged` from the vault root into `family/` breaks
  every relative payload it holds at once. The plugin answers that rename as a
  media rename — "who names this file" — and finds nothing to do.
- **A renamed folder holding a GEDCOM file and its media.** Obsidian 1.14.5 fires
  `rename` for the folder and then once for every file and folder under it, on
  desktop and mobile alike (the adapters loop over the folder's entries and
  trigger `renamed` for each). On Linux, and for a symlinked folder anywhere, the
  desktop adapter restarts its watcher between the folder's event and its
  children's, so they can arrive in a later task. The plugin answers each file on
  its own, against whatever path the GEDCOM file has at that moment. When a photograph's event comes before its
  GEDCOM file's, `photos/a.jpg` is rewritten to `../kin/photos/a.jpg` — or left
  stranded in GEDCOM 7 — and the GEDCOM file then moves beside it, so a link that
  never needed to change is broken.
- **A renamed folder holding only media** already works, one event per file; the
  issue assumed it did not.

## What the user decided

On 2026-10-29 the user chose, of the options offered:

- "Переписывать" — payloads are rewritten, not only reported.
- "Один перенос на пачку событий" — the renames of one action are taken as one
  move, and every GEDCOM file's relative payloads are read again from where it
  now stands to where each target now stands.
- "Да, чтобы указывала туда же" — a payload naming a file the vault does not hold
  is rewritten too, so it keeps naming the same vault path.

## What Changes

- The rename events Obsidian fires for one action — a file, or a folder and every
  file under it — are collected and answered once, as a single move from old
  paths to new.
- For every GEDCOM file, open or closed, each relative `FILE` payload is read from
  where the file stood, mapped through the move, and spelled again from where the
  file stands now, in its dialect. A payload that still reads as the same place is
  left as written. One that its dialect cannot spell from the new place — GEDCOM 7
  above the file's folder — is left and counted as stranded, as today.
- The rewrite is built from the library's `getDocumentLinks`, `resolveFileTarget`,
  `relativeFilePath` and `encodeFileTarget`; each new spelling is parsed back as
  a `FILE` line of its dialect before it is written, and a payload continued by
  `CONC` or `CONT` is never rewritten, and counted where its first line shows the
  move concerns it. It replaces the deprecated `retargetFileLinks`, so renames no longer
  wait on lavich/domorium#480 and lint loses its two deprecation warnings.
- The notices stay as they are: how many links were repointed in how many files,
  how many were left, how many files could not be read.

This change belongs in **this repository**: it composes functions the language
service exports for exactly this — `relativeFilePath` is documented as the
inverse of `resolveFileTarget` — around Obsidian's rename events. None of them
reaches the `String.isWellFormed` of lavich/domorium#480. A single library call
for "this document moved", and the writability check `moveFileLinks` keeps
private, would serve other hosts too and are worth raising upstream, but nothing
here waits on them.

## Non-goals

- A diagnostic for a `FILE` that names a file the vault does not hold.
- Following a rename done outside Obsidian, which fires `delete` and `create`.
- Rewriting absolute paths, `file:` URIs or web addresses, or a 5.5.1 payload
  that already climbs out of the vault.
- Changing the notices' wording.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `document-links`: the rename requirement covers a renamed folder and a moved
  GEDCOM file, takes one action's renames as one move, and keeps a payload that
  names a missing file naming the same place.

## Impact

- The rename handling in the plugin entry and the renamed-media module, the file
  view's rename entry point, and their tests.
- No new strings, no setting, no API above `minAppVersion`.
