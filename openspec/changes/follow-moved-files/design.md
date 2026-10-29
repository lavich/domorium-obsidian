## Context

Today `src/main.ts:214` listens to `vault.on("rename")`, ignores anything but a
`TFile`, and for each event calls `followRenamedFile(from, to)`: every GEDCOM file
in the vault — through `GedcomView.followRenamedFile` when open, through
`rewriteClosedFile` and `planClosedRewrite` (`src/vault/renamedMedia.ts`) when
closed — retargets payloads naming `from` with the deprecated
`retargetFileLinks`, from the document's path at that moment.

Obsidian 1.14.5 (`obsidian-1.14.5.asar`): both file-system adapters, after
renaming a folder, trigger `renamed` for the folder and then, in a synchronous
loop over their file table, for every path under it; the vault turns each into
`rename(file, oldPath)` synchronously. So one folder rename arrives as one
`TFolder` event followed by one `TFile` event per file beneath it, all in the
same task, in table order.

Probed with `@domorium/language-service` 2.3.0, composing the functions below
over `getDocumentLinks()` and `getDocument().getDialect()`:

| Move | Payload | Result |
| --- | --- | --- |
| 5.5.1 `tree.ged` → `family/tree.ged` | `media/a.jpg`, `media\c.jpg` | `../media/a.jpg`, `../media/c.jpg` |
| 7.0 `tree.ged` → `family/tree.ged` | `media/a.jpg` | stranded |
| 7.0 `family/tree.ged` → `tree.ged` | `photos/a.jpg` | `family/photos/a.jpg` |
| 5.5.1 `family/tree.ged` → `tree.ged` | `../shared/a.jpg` | `shared/a.jpg` |
| folder `family` → `kin`, GEDCOM file inside | `photos/a.jpg` | unchanged |
| folder `media` → `pics` | `media/x y.jpg` | `pics/x%20y.jpg` |
| 7.0 `a/tree.ged` → `tree.ged`, target missing | `gone/z.jpg` | `a/gone/z.jpg` |
| 5.5.1 folder `family` → `kin` | `./photos/a.jpg` | unchanged |
| 5.5.1 `photos/a.jpg` → `photos/a\b.jpg` | `photos/a.jpg` | stranded: the spelling reads back as `photos/a/b.jpg` |

## Goals / Non-Goals

**Goals:**
- One answer per action, correct whatever order Obsidian reports its renames in.
- One rule for every case: read from where the document stood, write from where
  it stands.

**Non-Goals:**
- Renames outside Obsidian, absolute or `file:` payloads, a missing-file
  diagnostic, new notices.

## Decisions

### A move is the renames of one task

A `RenameBatch` in `src/vault/` collects `(newPath, oldPath, isFolder)` from the
`rename` listener and flushes once, on a zero-delay timer, into a `Move`: exact
file moves, and folder moves as prefixes. Every event of a folder rename arrives
in the same task, so the flush sees them all; two renames the reader makes one
after the other are two flushes. The scheduler is a constructor argument so a
test flushes by hand.

`Move` answers `after(path)` — a file's own entry first, then the longest
renamed folder it sits under — and `before(path)`, its inverse over the same
entries.

### Each payload is read from before and written from after

For a GEDCOM file at `D1` now, `D0 = move.before(D1)`. For each
`file-relative` link of its service:

1. `P0 = resolveFileTarget(D0, targetText, dialect)`; `null` — not a vault
   path — is left alone.
2. `P1 = move.after(P0)`.
3. If `resolveFileTarget(D1, targetText, dialect) === P1`, the payload already
   says it; leave it, whatever spelling the author used.
4. Otherwise `text = encodeFileTarget(relativeFilePath(D1, P1), dialect)`; if
   `resolveFileTarget(D1, text, dialect) === P1` it is an edit over the link's
   range, else the payload is stranded.

The edit carries the version of the service that produced the links — the file
view's `EditorLanguageService.getVersion()` when open, `0` for a fresh service
over a closed file's text. The read-back in step 4 is what refuses GEDCOM 7's
`..` and a 5.5.1 name holding `\`, so the plugin's own `..` check and
`retargetFileLinks` both go. `planRetarget`, `retargetMedia` and
`planClosedRewrite` become `planMove(service, documentPath, move)` and
`planClosedMove(text, documentPath, move)`.

Alternative: keep answering each event on its own and order them. Rejected:
nothing says which order is right without knowing the whole move, and the whole
move is what the batch is.

### A closed file is parsed only where the move may concern it

A closed GEDCOM file is parsed when it moved itself, when `mentionsFile(text,
old)` holds for an old path of a moved file, or when its text contains the old
name of a renamed folder followed by `/` or `\`. Anything else cannot hold a
payload the move changes, and is neither parsed nor written.

## Risks / Trade-offs

- [A 5.5.1 payload's separators are normalized when it is rewritten —
  `media\c.jpg` becomes `../media/c.jpg`] → only where it had to change; a
  payload still naming its file keeps its spelling.
- [Obsidian could one day report a folder's files in later tasks] → each would
  then be its own flush, the per-file behavior of today; the order bug would
  return only for that case. The spec of the batch is pinned by a unit test of
  the collector, not of Obsidian.
- [A move touching many GEDCOM files rewrites them all at once] → as a rename of
  one photograph already can; each closed file is written once.
