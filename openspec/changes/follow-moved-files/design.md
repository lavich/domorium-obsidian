## Context

Today `src/main.ts:214` listens to `vault.on("rename")`, ignores anything but a
`TFile`, and for each event calls `followRenamedFile(from, to)`: every GEDCOM file
in the vault — through `GedcomView.followRenamedFile` when open, through
`rewriteClosedFile` and `planClosedRewrite` (`src/vault/renamedMedia.ts`) when
closed — retargets payloads naming `from` with the deprecated
`retargetFileLinks`, from the document's path at that moment.

Obsidian 1.14.5 (`obsidian-1.14.5.asar`): both file-system adapters, after
renaming a folder, trigger `renamed` for the folder and then, in a loop over
their file table, for every file and folder under it; the vault turns each into
`rename(entry, oldPath)` synchronously. The Capacitor adapter runs that loop at
once. The desktop adapter, where the folder has a watcher of its own, first
awaits `startWatchPath` — a `realpath` — and every folder has one on Linux
(`tc = darwin || win32` is false there) and a symlinked folder has one anywhere.
So a folder's children may arrive in a later task than the folder. When the
folder's event fires, `TFolder.setPath` has renamed the folder alone: its
descendants still carry their old paths until their own events.

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

### A move is the renames of one action

A `RenameBatch` in `src/vault/` collects the `rename` listener's events into a
`Move`: exact file moves, and folder moves as prefixes bounded by `/`. On a
folder's event it records the old paths of every entry beneath it — still old
at that moment — as expected; an entry's own event under a recorded folder only
clears it from the expected set. An event that is neither expected nor under a
recorded folder belongs to another action: it flushes the current batch first
and opens a new one, so `media → pics` then `pics → img` are never folded into
one move. The batch flushes on a zero-delay timer once
nothing is expected, and after a fallback of two seconds if something still is.
Flushes run one after another on a promise chain, each reading `file.path` as it
plans, and `onunload` cancels a pending timer. Timer and clock are constructor
arguments so a test drives them.

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
4. Otherwise `text = encodeFileTarget(relativeFilePath(D1, P1), dialect)`. It is
   parsed back as `0 HEAD / 1 GEDC / 2 VERS <dialect> / 0 @O1@ OBJE /
   1 FILE <text>` — a header, because the fragment option's `dialect` is not
   honored in 2.3.0 — and kept only if that gives exactly one `file-relative`
   link resolving to `P1` from `D1`: an edit over the link's range. Anything
   else is stranded: GEDCOM 7's `..`, a 5.5.1 `\` in a name, a segment like
   `@fam@` that parses as a pointer.

A payload continued by `CONC` or `CONT` — `targetText` holds its first line
only — is left and counted stranded rather than rewritten from half of it. It is
recognized by the line after the link's: a `CONC` or `CONT` one level deeper
than the `FILE` line.

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
old)` holds for an old path of a moved file, when its text contains the last
segment of a renamed folder's old path followed by `/` or `\`, or when it
contains a `%` followed by two hex digits, which may spell either. Anything else
cannot hold a payload the move changes, and is neither parsed nor written.

## Risks / Trade-offs

- [A 5.5.1 payload's separators are normalized when it is rewritten —
  `media\c.jpg` becomes `../media/c.jpg`] → only where it had to change; a
  payload still naming its file keeps its spelling.
- [Obsidian fails to report some of a folder's entries] → the fallback flushes
  after two seconds with the folder's prefix, so payloads are still mapped; a
  GEDCOM file whose own event never came is read at the path the vault gives it.
- [The stranded notice names GEDCOM 7's folder rule] → it is the case readers
  meet; the rarer refusals — `CONC`, a pointer-like segment — share its text,
  which for a 5.5.1 file is plainly wrong about the reason. Known and accepted.
- [A move touching many GEDCOM files rewrites them all at once] → as a rename of
  one photograph already can; each closed file is written once.
