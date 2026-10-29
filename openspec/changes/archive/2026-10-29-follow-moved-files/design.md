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
Flushes run one after another on a promise chain. Obsidian moves a file before
reporting it, and a batch is flushed inside the report of the action after it,
so by the time a move is followed its GEDCOM files may already stand where later
moves put them. The moves flushed but not yet followed are kept in order, with
the open batch's renames as a last, partial move; a GEDCOM file's path right
after move k is its `file.path` taken through `before` of every later one,
newest first, at the moment the path is read — for the plan, and again for the
re-plan inside `process`. An open view is found by its file, not its path.
`onunload` cancels a pending timer and stops the follower: it checks before each
file and before any notice, so a move still on the chain does nothing. Timer and clock are constructor
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

A payload continued by `CONC` or `CONT` is never rewritten: `targetText` holds
its first line only, and the payload is not reconstructed from the lines after
it. It is counted stranded where that first line, read alone, would be rewritten
— it names a moved file or folder, or the GEDCOM file moved — and is otherwise
left without a count: a move of the file the whole payload names, which its
first line does not show, goes unnoticed. It is recognized in the parse: a
`FILE` node with a `CONC` or `CONT` child.

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
- [A child's event arrives after the two-second fallback] → it is answered as
  a move of its own, as every rename was answered on its own before this
  change. A GEDCOM file whose own event comes that late is planned at its old
  path for the folder's move, so a 5.5.1 payload beside it passes through `../`
  and comes back, and a GEDCOM 7 one may be reported left though it ends
  unchanged.
- [The stranded notice names GEDCOM 7's folder rule] → it is the case readers
  meet; the rarer refusals — `CONC`, a pointer-like segment — share its text,
  which for a 5.5.1 file is plainly wrong about the reason. Known and accepted.
- [A move touching many GEDCOM files rewrites them all at once] → as a rename of
  one photograph already can; each closed file is written once.

## Implementation

None of these changes what a reader sees.

- `planMove` takes the version as a fourth argument, defaulting to `0`:
  `GedcomLanguageService` does not expose the version it was updated with, so
  the file view passes `EditorLanguageService.getVersion()`.
- `RenameBatch` takes the timers alone. The fallback is a timer, so no clock is
  needed.
- The read, plan, `process` and re-plan of a closed file live in
  `moveClosedFile` beside the plan, taking `read` and `process` from the plugin,
  so the re-plan has a unit test.
- A continued payload is found in the parse rather than the text: the `FILE`
  node with a `CONC` or `CONT` child. It is the same line one level deeper, and
  the service does not expose its text. It is counted only where the move would
  rewrite its first line, as for any other refusal.
- The batch, the chain and the loop over the vault's files live in a
  `MoveFollower` beside the plan, taking the files, an open view, `read`,
  `process` and the notices from the plugin, so the ordering and the stop on
  unload have unit tests. `GedcomView.followMove` takes the path to plan from
  rather than reading its own.
- `moveClosedFile` takes the document's path as a function, read once for the
  plan and again inside `process`, and returns the count and stranded payloads
  of the plan that `process` wrote.
- "Either order" is the order of a folder's entries after the folder's own
  event, which Obsidian always reports first; an event before its folder's is
  not recognized as part of it.
