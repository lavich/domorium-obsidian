This change archives after `timeline-named-bars`, whose `surnameHue.ts` it uses.

Every group ends with `npm run check` exiting 0.

## 1. The card

- [x] 1.1 `src/desk/surnameHue.ts`: `paintStyle`; the properties renamed `--gedcom-surname-*`; `src/desk/timelineLayout.ts` and `styles.css` follow. Test in `src/desk/surnameHue.test.ts` (the names of the properties).
- [x] 1.2 `src/desk/graphCanvas.ts`, `src/desk/cardRender.ts`, `src/desk/fileGraphView.ts`: the card carries `paint` and no longer its sex. Test in `src/desk/fileGraphView.test.ts`: `Лобанов` and `Лобанова` within 3°, `Сидорова` over 50° away, no surname grey, no sex class.
- [x] 1.3 `styles.css`: the card's background and the lines take the fill and the ink, in both schemes; the sex tints go. Spec in `tests/fileGraph.spec.ts`: every card's lines at 4.5:1 in both schemes, Marie's and Pierre's tints differ, light and dark differ.

## 2. Documents

- [x] 2.1 `README.md` says the graph colours a card by surname. Test: none.

## 3. Verify

- [x] 3.1 `npm run check`, `npm run test:browser` and `npm run openspec:validate` pass.
- [ ] 3.2 By hand in Obsidian on `demo-vault/`, desktop and phone (leave unticked until someone has done it): the cards of `curie.ged` and of the large Gramps export in both schemes, the selected and lit cards still telling from the tint, the Russian text.
