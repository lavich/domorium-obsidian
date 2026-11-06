Every group ends with `npm run check` exiting 0.

## 1. The title

- [x] 1.1 `src/i18n/en.json` and `src/i18n/ru.json`: `desk.couple` reads `{one} + {other}`. Test in `src/desk/familyPage.test.ts` and `src/i18n/i18n.test.ts` (parity): the title `Pierre Curie + Marie Skłodowska-Curie`, and no `desk.couple` that holds a word.
- [x] 1.2 The tests that expect the old title now expect the new: `src/commands.test.ts`, `src/desk/fileGraphView.test.ts`, `src/desk/fileList.test.ts`, `src/desk/recordCard.test.ts`, `src/desk/listRows.test.ts`, `src/desk/eventRows.test.ts`, `tests/fileList.spec.ts`, `tests/desk.spec.ts`.

## 2. Verify

- [x] 2.1 `npm run check`, `npm run test:browser` and `npm run openspec:validate` pass.
