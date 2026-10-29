## 1. Dependencies and the upstream issue

- [x] 1.1 Raise `@domorium/language-service` to `^2.3.0` and `@domorium/codemirror` to `^2.2.0`, `npm install`, and verify `npm ls @domorium/language-service @domorium/validator` shows one copy of each (no test file: the check is the install and `npm run typecheck`)
- [x] 1.2 Update the two tests that pin "no year without a version" — `src/genealogy/dates.test.ts` and `src/genealogy/index.test.ts` — to the `genealogy-read-model` delta (1867 read with no version and with `VERS 4.0`, year 0 still none), and verify both pass
- [x] 1.3 File the lavich/domorium issue on `moveFileLinks` — `String.isWellFormed` below the oldest supported iOS, non-canonical payloads not moved, a 5.5.1 name with `\` written as a different file — with probes, and record its number in design.md (no test file)

## 2. Reading a FILE payload

- [x] 2.1 Give `MediaVault` a `dialect`; resolve through `resolveFileTarget` in `mediaPreviewContent`, and export one function that answers the vault path of a `MediaReference`, used by `GedcomView.mediaItem` and `harness/desk.ts`; take the shown name from the resolved path; pass `service.getDocument().getDialect()` from both callers in `src/GedcomView.ts` and from `harness/mount.ts` and `harness/desk.ts`. Extend `src/editor/media.test.ts` with the GEDCOM 7 percent-escape (path and name), the `%2F` and the 5.5.1 scenarios, and verify it passes
- [x] 2.2 Pass the dialect to `routeDocumentLink` and resolve there through `resolveFileTarget`; extend `src/editor/service.test.ts` with following `my%20photo.jpg` in 7.0 and in a document with no version, and `..\photos\marie.jpg` in 5.5.1, and verify it passes
- [x] 2.3 Delete `resolveVaultRelativePath`, `relativeToDocument` and the plugin's `drawnCrop`, using `relativeFilePath` in `planRetarget` and importing `drawnCrop` from `@domorium/language-service` in `src/editor/mediaPreviewView.ts` and `src/desk/media.ts`; remove their tests from `src/editor/service.test.ts` and `src/editor/media.test.ts`, and verify `npm run typecheck` and `npm run test` pass

## 3. Following a renamed file

- [x] 3.1 Read the GEDCOM 7 test in `planRetarget` from `service.getDocument().getDialect()`, leaving its two `retargetFileLinks` calls unsuppressed; verify `npm run lint` exits 0 with exactly those two deprecation warnings and `src/vault/renamedMedia.test.ts` passes its three rename scenarios
- [ ] 3.2 Move the closed-file decision out of `src/main.ts` into `planClosedRewrite` beside `retargetMedia`, gated on `mentionsFile(text, from)` in place of `mayNameAFile`; rewrite the "which files are worth parsing" tests in `src/vault/renamedMedia.test.ts` for the two closed-file scenarios of the `document-links` delta, and verify it passes

## 4. Docs and verification

- [ ] 4.1 Add a sentence to `README.md` beside media preview: a `FILE` payload is read by its file's GEDCOM version, so GEDCOM 7 percent-escapes name the file they spell, and a renamed file is followed into the payloads naming it; verify by reading it against the `document-links` delta (no test file)
- [ ] 4.2 Confirm nothing under `src/` or `harness/` still splits a `FILE` payload on `\` itself: `grep -rn 'replaceAll("\\\\"' src harness/*.ts` returns nothing (no test file: a review check)
- [ ] 4.3 Run `npm run openspec:validate`, `npm run check` and `npm run test:browser` (the media preview and desk pictures render), and verify all three pass
