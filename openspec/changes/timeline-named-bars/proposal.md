## Why

The timeline writes the names in a column at the left, which takes a fifth of the width that the years need, and the only colour is sex, so two branches of a family look alike. Rows are kept, one to a person, as they are now.

## The user's decisions (2026-11-06)

Added later the same day, in Russian: «живой человек с полоской «до сегодня» тоже пусть отображается».

In Russian: «убрать левую полоску с именами и писать имена прям внутри полосок, которые отображают время жизни». The second idea, packing several people into one row, was tried and withdrawn: «теряется визуальная связь между прямыми родственниками… я хочу чтобы не было такого, что занимается свободное место — пусть у каждой персоны своя строчка будет». Then, after a mock-up of both: the colour comes from the surname, and the more the surnames differ the more the colours differ, «Лобанов и Лобанова — почти один и тот же цвет»; a click selects and lights a person's family; the years of life are not written inside the bar; the ends of a bar say how sure the dates are; events are marks on the bar; the tooltip holds the name and surname only («в подсказке только имя и фамилию оставь»); a double surname is one surname («это две разные фамилии же»); a person with no data is not drawn («в дереве без данных предок — может и не стоит»); the selected person gets an age ruler; the board is virtualised; the phone is kept. Recorded as given; none of it is open.

## What Changes

- **No column of names.** The board is the axis of years and the bars. A person's name is written inside their bar, in the bar's own colour family, without the years of life.
- **A row per person, kept.** Every person keeps a row of their own, in the order the rows have now — by generation and family — so that relatives stay where a reader looks for them. A name wider than its bar is cut with an ellipsis inside it.
- **Colour by surname.** A bar is coloured by the person's whole surname. Two surnames that read alike — `Лобанов` and `Лобанова`, `Жуков` and `Zhukov` — get almost the same hue and two that do not read alike get hues far apart; a double surname is one surname. A person without a surname is grey. **BREAKING:** sex no longer colours the bar, and the timeline shows it nowhere.
- **Honest ends.** A start or an end dated as approximate is drawn soft. A person with no recorded death who could still be alive — born less than a hundred years ago — is drawn running to today, to the current year, and ends in a straight cut edge; a death not recorded for someone born longer ago fades out, as it does now.
- **A tooltip with the name.** Pointing at a bar (a first touch on a phone) shows the person's full name and nothing else — for the name a short bar cuts.
- **Links only for the lit person.** A click selects a person and lights them and their family and draws their links: a vertical line with an arrowhead from each parent's bar at the year of the person's birth, the same from the person down to each child, and a dashed vertical between spouses at the year of the marriage — or, where the marriage is undated, the birth of the first child they share. Nothing is drawn for anyone else, and the colour is never the only difference between the two kinds of link.
- **An age ruler for the selected person.** The year cursor's label on the axis also gives the selected person's age at that year.
- **Branch moves out of the names.** The names were where Branch lived; it becomes a button on the selected person's bar, and a command **Branch of the selected person** for the keyboard.
- **People with no dated event are not drawn** and are not mentioned on the timeline; a search does not find them. The List and the card still hold them.
- **Zoom.** Fit takes the whole board's width. On a phone a pinch zooms the axis.
- **Virtual window.** Only the rows and years in view are drawn, as now.

Repository or upstream: **this repository only.** The model already holds the families (`FileTimeline.families` with `spouses`, `children` and `marriage`) and `readNameParts` already splits a surname; nothing in the parser or the language service changes.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `genealogy-file-timeline`: a person is a named bar in a row of their own with no column of names, coloured by surname; the tooltip, the age ruler and the lit person's links are restated; the requirements that name the column of names or the corner above it are restated for the bars.

## Non-goals

- Squeezing the empty stretches of the axis, and a historical background of wars and epidemics. Both are deferred.
- A switch back to a row per person, or a setting for either layout.
- Writing years of life inside the bar. They stay in the tooltip.
- Deciding that a person is living from anything but their dates: the plugin reads no `living` flag and writes none; "could still be alive" means a birth, christening or earliest event within the hundred years before the present and no death, burial or cremation.
- Colouring by sex, by branch or by any other key, and a setting to choose the key.
- Links for people who are not lit, and a switch to show them.
- Dates, places, sex or age in the tooltip, and a mention of people who are not drawn.
- Changes to the parser, the language service, the read model or the file graph.
- Raising `minAppVersion`.

## Impact

- **Layout and drawing**: `src/desk/timelineLayout.ts` (the bar with its name, a living person's cut end), a new `src/desk/surnameHue.ts` (colour), `src/desk/fileTimelineView.ts` (no names column, the Branch button on the bar, the tooltip, the age ruler, the pinch, the links), `src/desk/timelineEvents.ts` (the names' scroll wiring goes), `src/desk/timelineHits.ts` (a bar hit for the tooltip), `src/desk/commands.ts` (the Branch command), `src/desk/labels.ts` (`lifelineYears` goes), `src/desk/axisTicks.ts` only where the corner above the names goes.
- **Model**: `src/desk/fileTimeline.ts` reads the surname of each person and the dated marriage or first shared child of each family.
- **Strings and styles**: `src/i18n/en.json`, `src/i18n/ru.json`, `styles.css`.
- **Tests**: `src/desk/fileTimeline.test.ts`, `src/desk/fileTimelineView.test.ts` (it also holds the layout tests), `src/desk/fileViews.test.ts`, `src/commands.test.ts`, new `src/desk/surnameHue.test.ts`; `tests/fileTimeline.spec.ts`, `tests/fileViews.spec.ts`, `tests/fileList.spec.ts`.
- **Documents**: `README.md`, `demo-vault/Start here.md`.
- **Dependencies and `minAppVersion`**: none changed.
