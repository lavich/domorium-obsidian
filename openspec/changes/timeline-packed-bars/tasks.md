No other open change touches the timeline (`openspec/changes/` holds `events-list` and `places-list`, both in the List and the card). The change is one branch and one PR with its plan; `openspec archive` is a separate PR after the merge.

Every group ends with `npm run check` exiting 0.

## 1. Model and pure helpers

- [x] 1.1 `src/desk/fileTimeline.ts`: expose the surname of each person (`TimelinePerson.surname`, the whole surname from `readNameParts`) and, for each family, `TimelineFamily.linkYear` (the marriage's year, else the first year of the earliest dated child's bar start). Test in `src/desk/fileTimeline.test.ts`: `Skłodowska-Curie` whole, no surname, a family with a dated marriage, with none and a dated child, with neither.
- [x] 1.2 `src/desk/fileTimeline.ts`: `Lifeline.living` as D9a (no death, begins at a dated birth/christening/baptism, begin + `OPEN_SPAN` > `now`). Test in `src/desk/fileTimeline.test.ts` with a fixed `now` of 2026: born 1990 with no death is living and ends at 2026; born 1850 is open, not living, ends at 1950; a marriage in 1930 with no birth is open, not living; a death makes neither. Update the assertions on Hélène and Pierre Joliot in `src/desk/fileTimelineView.test.ts` (`is-open`, `"1927–"`).
- [x] 1.3 New `src/desk/surnameHue.ts`: fold, Cyrillic→Latin table, gendered endings in the folded form (a test with `й`), base-27 hue, text colour for 4.5:1. Test in new `src/desk/surnameHue.test.ts`: `Лобанов`/`Лобанова` and `Petrov`/`Petrova` within 3°; `Жуков`/`Zhukov` within 3°; `Лобанов`/`Сидорова` over 50°; `Skłodowska-Curie` and `Joliot-Curie` unrelated; case and marks do not change it; no surname is grey; the same input gives the same hue; `Ковалевский`/`Ковалевская` within 3°.
- [x] 1.4 New `src/desk/timelineLanes.ts`: `packLanes` (D1). Test in new `src/desk/timelineLanes.test.ts`: the five scenarios of `Bars share lanes`, ties in declaration order, no overlap in any lane over a generated file of 10 000, and a time bound on that file.

## 2. Layout

- [x] 2.1 `src/desk/timelineLayout.ts`: `layoutOf` takes `measure`, filters `shown` to people with a lifeline, calls `packLanes`, sets `y` to lane centres and `height` to `lanes * ROW` (`ROW` 32); the bar `rect` keeps its classes and mask, the name is its own `gedcom-ft-label` item inside the unfaded part or beyond the end, a soft approximate end, a straight end for a living person, the fade for an open end that stops earlier; marks and spans along the bar's lower edge. Test in `src/desk/fileTimelineView.test.ts` (it holds the layout tests): `Marie's bar` with no years on it, a long name beyond the bar, an approximate start, a living person's end without a mask, an undated person, `y.get(xref)` the centre of the person's lane; `ROW` read from the import.
- [x] 2.2 `itemsOf` stops making the always-visible marriage items; the marriage mark stays on each bar. Test in `src/desk/fileTimelineView.test.ts`: no line between the spouses while nobody is lit (`Marie's marriage`).

## 3. View

- [x] 3.1 `src/desk/fileTimelineView.ts` and `src/desk/timelineEvents.ts`: delete `drawNames`, the `names` element, `names` and `namesScrolled` in the event surface, the names part of `fitGutters` (the scrollbar variables stay), the corner and the grid column; focusable bars (`tabindex`, `role="button"`, name as label, Enter and Space), focus kept across a redraw; the row bands become a ring on the bar; delete `lifelineYears` in `src/desk/labels.ts` with its test; update the stale comments that say "beside the names" and "row". Test in `src/desk/fileTimelineView.test.ts`: no `.gedcom-ft-names`, a bar and a name per person, Enter selects, the focus survives a scroll.
- [x] 3.2 Search and selection over bars: `matchIds` and the order of matches by bar start (declaration order for ties), `initialFocus` takes the first person with a bar, selecting a person with no bar marks nothing and does not scroll or change the scope, the scope line counts people with a bar. Test in `src/desk/fileTimeline.test.ts` and `src/desk/fileTimelineView.test.ts`: `Stepping through the matches` in the order Irène, Frédéric, Hélène, Pierre; `A person with no dated event`; `A person with no bar`; update the counts that name 17 or 18 people in `src/desk/fileViews.test.ts`.
- [x] 3.3 Links: `drawArrows` keeps the parent and child lines and gains the dashed marriage line with dots at `linkYear`, for the lit person only. Test in `src/desk/fileTimelineView.test.ts`: `Clicking Marie`, `A marriage with no date`, no link without a light, solid and dashed told apart by more than colour, `Escape` leaves no link.
- [x] 3.4 Branch: the overlay button on the selected bar, `aria-pressed` while its branch is shown, none on other bars, still there after Escape; the command **Branch of the selected person** in `src/desk/commands.ts`, with its strings. Test in `src/desk/fileTimelineView.test.ts` and `src/commands.test.ts`: `Irène's branch`, `Branch again`, `Branch on a bar that is not selected`, `The command` with the bar scrolled out.
- [x] 3.5 Tooltip: `barOf` in `src/desk/timelineHits.ts`, the bar's tooltip is the name only, a mark's wins. Test in `src/desk/fileTimelineView.test.ts` and `src/desk/timelineHits.test.ts`: `Marie's tooltip`, a name too long to fit, `On a mark`.
- [x] 3.6 Age ruler: the axis flag gives the selected person's age at the cursor's year. Test in `src/desk/fileTimelineView.test.ts`: `The ruler of the selected person`, `Before the birth`, and the ruler stays after `Escape`.
- [x] 3.7 Zoom and phone: Fit takes the whole board's width; a pinch by touch events with non-passive listeners, a CSS transform while the fingers move and one `setScope` when they lift, the year under the midpoint kept; the tooltip on the first touch and closed on empty space. Test in `src/desk/fileTimelineView.test.ts`: touch sequences, a single `setScope` per pinch, clamped to the buttons' range.

## 4. Strings and styles

- [x] 4.1 `src/i18n/en.json` and `ru.json`: the Branch command, the bar's focus label, any tooltip label. Test in `src/i18n/i18n.test.ts`: parity and sentence case.
- [x] 4.2 `styles.css`: remove the `gedcom-ft-name*` rules and the names variable; bar, label, soft end, cut end, ring, links, tooltip and the Branch overlay, in the light and the dark scheme; `touch-action` on the plot. Check by eye on `demo-vault/` in both schemes.

## 5. Browser specs and documents

- [x] 5.1 `tests/fileTimeline.spec.ts`, `tests/fileViews.spec.ts` and `tests/fileList.spec.ts`: rewrite the specs that name the column, the corner, `is-focus`, `.gedcom-ft-name` or a count of 17 people; add specs for shared lanes (fewer lanes than people), a name beyond a short bar, marks not across the name, the contrast of the name on the bar in both schemes for a spread of hues (yellow-green included, dimmed and ringed too), the lit person's links, the Branch overlay and command, a pinch, and a 10 000-person file's drawn-bar count and scroll without a blank frame. At 1400 and 390 px.
- [x] 5.2 `README.md` and `demo-vault/Start here.md` say what the bars, the colour, the cut end of a living person and the links mean. Test: none.

## 6. Verify

- [x] 6.1 `npm run check`, `npm run test:browser` (three runs) and `npm run openspec:validate` pass.
- [ ] 6.2 By hand in Obsidian on `demo-vault/`, desktop and phone (leave unticked until someone has done it): no column of names, shared lanes on the demo file, surname colours in both schemes with legible names, a click lighting a family with its links and the dashed marriage, a living person's bar running to today, the age ruler, the tooltip, Branch on the selected bar and the command, a pinch and one-finger scroll on a phone, the Russian text.
