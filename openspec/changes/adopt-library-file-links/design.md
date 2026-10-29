## Context

Checked against `@domorium/language-service` 2.3.0, `@domorium/codemirror` 2.2.0
and `@domorium/validator` 2.2.0, installed from npm in a scratch directory.

Where the plugin does the library's work today:

- `src/editor/service.ts` — `resolveVaultRelativePath(documentPath, target)`
  splits on `/` and `\` and walks `..`; `relativeToDocument(documentPath, path)`
  spells a path back. Callers: `mediaPreviewContent` in `src/editor/media.ts`,
  `routeDocumentLink` in the same file as the helpers, `GedcomView.mediaItem`,
  and `planRetarget` in `src/vault/renamedMedia.ts`.
- `src/editor/media.ts:123` — `drawnCrop`, the same function the library now
  exports. Callers: `src/editor/mediaPreviewView.ts:233`, `src/desk/media.ts:51`.
- `src/vault/renamedMedia.ts:52-76` — `planRetarget` decides GEDCOM 7 from
  `getVersionResolution()`, refuses a new path with a `..` segment itself, counts
  what it strands with `retargetFileLinks(old, old)`, and otherwise calls
  `retargetFileLinks(old, new)`.
- `src/vault/renamedMedia.ts:18` — `mayNameAFile`, `text.includes("FILE")`,
  decides whether `src/main.ts:479` parses a closed GEDCOM file at all.
- `src/editor/media.ts:45` — `fileName(target)` splits the payload on `/` and
  `\` for the name a preview and a desk tile show.
- `harness/mount.ts:273` and `harness/desk.ts:118` build media previews through
  `mediaPreviewContent`, with a `MediaVault` of their own; `harness/desk.ts:122`
  gives the payload itself as a tile's path.

What the library answers, probed:

| Payload in `family/tree.ged` | `resolveFileTarget` 7.0 | 5.5.1 | today |
| --- | --- | --- | --- |
| `photos/a.jpg` | `family/photos/a.jpg` | same | same |
| `photos/my%20photo.jpg` | `family/photos/my photo.jpg` | `family/photos/my%20photo.jpg` | `…/my%20photo.jpg` |
| `photos%2Fa.jpg`, `a%5Cb.jpg`, `%2E%2E/a.jpg` | `null` | literal | literal |
| `a%23b.jpg` | `family/a#b.jpg` | literal | literal |
| `photos\a.jpg`, `../a.jpg` | `null` | `family/photos/a.jpg`, `a.jpg` | 7.0: not a link (VAL002) |
| `/abs`, `C:\…`, `file:…`, empty | `null` | `null` | not `file-relative` |
| any, dialect `undefined` | `null` | | |

In GEDCOM 7, and in a document with no version, `\`, `../`, `#` and `?` already
make a payload no link at all: `getMediaAt` answers nothing and the diagnostics
report it, on 2.2.0 as on 2.3.0. The visible change is the percent-escape.

`GedcomDocument.getDialect()` is the dialect the service itself reads links and
moves by: `7.0` for a header with no version, `5.5.1` for 5.5 and 5.5.5,
`undefined` for PAF or an unsupported version, where `getMediaAt` already
answers nothing.

`moveFileLinks` is not adopted here. Its target check calls
`String.prototype.isWellFormed` (ES2024; Safari 16.4, Chromium 111), which
`retargetFileLinks` never reaches, and the bundle targets ES2021 without
polyfills, so on an older iOS a rename would throw and the file be reported
unreadable. It also matches only canonical spellings — `photos//a.jpg`,
`photos/./a.jpg` and `x/../photos/a.jpg` in 5.5.1 open the file through
`resolveFileTarget` but are not moved — and in 5.5.1 it writes
`photos/a\b.jpg` for a file renamed to that name, which reads back as
`photos/a/b.jpg`. All three are
[lavich/domorium#480](https://github.com/lavich/domorium/issues/480).

`readDate` in a document with no version, a PAF header or an unsupported version
now reads by 5.5.1 and then 7.0: `ABT 1867` gives 1867. A year 0 answers `null`.
The two tests that hold today's "no year" are
`src/genealogy/dates.test.ts:130` and `src/genealogy/index.test.ts:70`.

`@codemirror/autocomplete` is pinned at 6.20.3, inside the `^6.6.1` that
codemirror 2.2.0 asks for. No plugin code builds a `CompletionItem` or switches
over `EditRefusalCode`.

## Goals / Non-Goals

**Goals:**
- One reading of a `FILE` payload, the library's `resolveFileTarget`, behind
  following, previewing and showing on a desk page; and one dialect, the
  document's own, behind those and the rename check.
- No plugin code that repeats a function the library exports.

**Non-Goals:**
- Folder renames and moved `.ged` files (#72); a fallback for payloads GEDCOM 7
  does not allow; any change to crop drawing.

## Decisions

### The dialect is the document's own

Every resolution passes `service.getDocument().getDialect()`, not the dialect of
`getVersionResolution()`. It is what `getMediaAt`, `getDocumentLinks` and
`retargetFileLinks` use, so a payload the service offers as a link is resolved by the
rules it was offered under. `MediaVault` gains `dialect: GedcomDialect | undefined`
beside `documentPath`; `routeDocumentLink` takes it as an argument.

Alternative: derive it from `getVersionResolution()`, as `planRetarget` does now.
Rejected: an undetermined resolution carries a dialect the document does not
validate by, and a second derivation is a second place to disagree.

### The helpers go, not wrap

`resolveVaultRelativePath` and `relativeToDocument` are deleted and their callers
call `resolveFileTarget` and `relativeFilePath`. `drawnCrop` is deleted from
`src/editor/media.ts` and imported from `@domorium/language-service` where it is
drawn. Their tests in `src/editor/service.test.ts` and `src/editor/media.test.ts`
go with them; what they held is now held upstream, and what the plugin owns —
that the dialect reaches the call — is tested at the callers.

### A rename stays on `retargetFileLinks`

`planRetarget` keeps its present logic, with `relativeFilePath` in place of
`relativeToDocument`, which spells the same paths, and with its GEDCOM 7 test
read from `service.getDocument().getDialect()` like every other resolution — the
same answer `getVersionResolution()` gives today, without a second derivation.

Its two `retargetFileLinks` calls stay unsuppressed and lint reports them as two
deprecation warnings, which do not fail `npm run lint`. The obsidianmd
recommended config forbids disabling `@typescript-eslint/no-deprecated` in a
comment, and turning it off in `eslint.config.mjs` would hide the next
deprecation in that file too; the warnings name the call to replace when the
upstream issue is fixed.

### A closed file is parsed only where it may name the file

`mayNameAFile(text)` becomes `mentionsFile(text, from)`, with `from` the vault
path of the renamed file. It looks for the name as written or percent-escaped at
a line's end; probed against `\`, `./`, `%20`, lower-case hex, CRLF and a BOM it
misses nothing `retargetFileLinks` would match. The decision `rewriteClosedFile`
makes in `src/main.ts` — read, parse, write — moves into a pure
`planClosedRewrite(text, documentPath, from, to)` in the renamed-media module,
so a test holds that a file it rules out is neither parsed nor written.

### The name shown is the resolved file's

`fileName` takes the last segment of the resolved vault path where there is one,
and the payload's own last segment only for a payload that resolves to nothing.
The vault path `GedcomView.mediaItem` and `harness/desk.ts` attach to a tile is
resolved beside `mediaPreviewContent`, by one exported function, so neither
caller resolves a payload itself.

## Risks / Trade-offs

- [A file whose name holds a literal `%xx`, in GEDCOM 7 or a document with no
  version, stops opening] → the user's decision; GEDCOM 7 spells such a name
  `%25xx`.
- [A file with no version shows years it did not] → the user's decision, and what
  #453 asked for.
- [Tests that pinned the old helpers go] → replaced by tests at the callers that
  fail if the dialect stops reaching the library.
- [Renames keep the deprecated method] → two lint warnings until the upstream
  issue is fixed; the issue is recorded here.
