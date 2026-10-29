## Why

The plugin still carries its own copies of arithmetic the library now ships, and
one of them reads GEDCOM 7 against the format: `resolveVaultRelativePath` looks
for `FILE photos/my%20photo.jpg` under that literal name, so the photograph does
not open, preview or show on a desk page, and the preview names it
`my%20photo.jpg`. A closed GEDCOM file is parsed on every rename if it contains
the word `FILE` anywhere.

`@domorium/language-service` 2.3.0 and `@domorium/codemirror` 2.2.0 ship
`resolveFileTarget`, `relativeFilePath`, `drawnCrop`, `moveFileLinks` and
`mentionsFile` (lavich/domorium#380, #188, #260), read dates in a document
whose version is undetermined (#453), and complete one token instead of
`@@I1@` (#468).

## What the user decided

On 2026-10-29 the user chose, of the options offered:

- "Да, как читает библиотека" — years are shown in a document with no
  `GEDC.VERS`, a PAF export, or an unsupported version, as the library now
  reads them.
- "Да, по формату" — a `FILE` payload is read by its dialect's rules: in GEDCOM 7
  `my%20photo.jpg` opens `my photo.jpg`; 5.5.1 is unchanged. (`photos\a.jpg` and
  `../a.jpg` in GEDCOM 7, which the question named, turned out not to be links
  already: the service offers neither, and reports both.)
- "Да, как библиотека" — a document with no `GEDC.VERS` reads its paths as
  GEDCOM 7, as the service already decides which of its payloads are links.
- "Issue upstream, ждать фикса" — `moveFileLinks` calls `String.isWellFormed`,
  which iOS before 16.4 lacks, so renames stay on `retargetFileLinks` until the
  library avoids it; the issue goes to lavich/domorium.

## What Changes

- Raise `@domorium/language-service` to `^2.3.0` and `@domorium/codemirror` to
  `^2.2.0`. Completing a pointer or a calendar escape now writes one token
  (#468); nothing in the plugin builds a completion item, so that comes with the
  dependency.
- A year is read from a date in a document whose GEDCOM version is undetermined,
  as the language service reads it. A year 0 remains no year.
- Every `FILE` payload the plugin follows, previews or shows on a desk page is
  resolved by `resolveFileTarget` in the document's dialect. The plugin's own
  `resolveVaultRelativePath` and `relativeToDocument` go.
- A closed GEDCOM file is parsed on a rename only where `mentionsFile` says it
  may name the renamed file. Following the rename itself is unchanged.
- The name a preview and a desk tile show for a vault file is the resolved
  file's, so `my%20photo.jpg` in GEDCOM 7 is shown as `my photo.jpg`.
- `drawnCrop` comes from the library; the plugin's copy goes. Behavior is
  unchanged.

This change belongs in **this repository**: each piece adopts what the language
service now ships. One piece it does not adopt, `moveFileLinks`, waits on an
upstream issue: it needs an ES2024 string method the oldest supported iOS lacks,
it matches fewer spellings of a path than `resolveFileTarget` opens, and in 5.5.1
it writes a name with `\` that reads back as a different file. The plugin keeps
its present rename code rather than working around any of the three.

## Non-goals

- Following a rename with `moveFileLinks`, until the upstream issue is fixed.
- A renamed folder or a moved `.ged` file (#72): the next change, on the
  library's `moveFileLinks` and `relativeFilePath`.
- Accepting a GEDCOM 7 payload the format does not allow, as a fallback.
- Any change to what a crop draws, or to how a remote image is offered.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `genealogy-read-model`: the year requirement no longer refuses every date of a
  document whose version cannot be determined.
- `document-links`: gains how a `FILE` payload is read into a vault path, by the
  dialect of its document, and how a renamed file is followed into the payloads
  that name it — the second is behavior the plugin has had without a spec.

## Impact

- `package.json`, `package-lock.json`.
- The editor's media and link helpers, the file view, the desk's media, the
  renamed-media handling in the vault and the plugin entry, and their tests.
- The browser harness, which builds media previews the way the view does.
- `README.md`, where it describes following media; it says nothing yet of
  renames, and gains a sentence.
- The problem count of a file with a year 0 rises by one: validator 2.2.0 reports
  it as `VAL016`.
