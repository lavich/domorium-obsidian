## 1. The move

- [x] 1.1 Add `Move` (`after`, `before`, built from file and folder renames, folders bounded by `/`) and `RenameBatch` (records a folder's descendants as expected, flushes when none are left or after the fallback, through an injected timer) in `src/vault/movedFiles.ts`; test both in `src/vault/movedFiles.test.ts` — a folder and its entries in either order and in the same or a later task give one move, `media` does not cover `media2`, nested folders, the longest folder wins, `before` inverts `after`, the fallback flushes, an unexpected event flushes the waiting batch first, two separate renames are two flushes — and verify it passes
- [x] 1.2 Add `planMove(service, documentPath, move)` and `planClosedMove(text, documentPath, move)` to `src/vault/movedFiles.ts`, built as design.md describes, with the parse-back check, the `CONC`/`CONT` rule and the closed-file prefilter; cover every scenario of the `document-links` delta, the 5.5.1 `\` read-back and a `CONC`-continued payload in `src/vault/movedFiles.test.ts`, and verify it passes

## 2. Wiring

- [ ] 2.1 Feed every `rename` — `TFile` and `TFolder` — into one `RenameBatch` in `src/main.ts`, and on flush run the move over every GEDCOM file: open ones through a `GedcomView.followMove(move)` that applies the edit at the editor's version, closed ones through `planClosedMove` and `vault.process` as `rewriteClosedFile` does now; keep the three notices; run flushes one after another and cancel a pending one on unload. Verify `npm run typecheck`, and extend `src/vault/movedFiles.test.ts` with a closed file re-planned when its text changed between read and write
- [ ] 2.2 Delete `planRetarget`, `retargetMedia`, `planClosedRewrite` and `GedcomView.followRenamedFile`, moving what `src/vault/renamedMedia.ts` still holds (`isGedcomPath`, `applyEdits`, the notice texts) beside the new code and repointing its importers, `src/notes/recordSuggest.ts` among them, and fold `src/vault/renamedMedia.test.ts` into `src/vault/movedFiles.test.ts`; verify `npm run lint` reports no warnings and `npm run test` passes

## 3. Docs and verification

- [ ] 3.1 Extend the `README.md` sentence on renames to say a renamed folder and a moved GEDCOM file are followed too; verify by reading it against the delta (no test file)
- [ ] 3.2 Run `npm run openspec:validate`, `npm run check` and `npm run test:browser`, and verify all three pass
