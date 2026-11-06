## Why

A family is named by its spouses joined by a word — `Pierre Curie and Marie Skłodowska-Curie`, «Пьер Кюри и Мария Склодовская-Кюри» — which reads as a sentence in the titles of cards and rows, in tooltips and in the accessible names built from them. The user wants a sign instead.

## The user's decision (2026-11-06)

In Russian: «сейчас название семьи создается с помощью слова and — давай заменим на знак плюса "+" или вертикальной черточкой "|"». A plus was tried first; the vertical bar was set aside because it breaks a Markdown table and the alias of an Obsidian link — `[[file#@F3@|Pierre | Marie]]` — wherever a title is written into a note. Asked how other projects do it, the answer was the marriage sign of printed genealogies, and the user said «ставь ⚭» (U+26AD). Recorded as given.

## What Changes

- **A couple is named `A ⚭ B`** in every place the plugin names a family by its spouses: the title of the card, the rows of the list and of the events, the tooltip and the accessible name of a node in the graph, and the labels in the commands. The word «and» («и» in Russian) goes.
- A family with one spouse or none is named as before.

Repository or upstream: **this repository only.**

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `genealogy-view`: a requirement that a couple is named with the marriage sign.
- `genealogy-list`: the family row of the Curies reads with the marriage sign.
- `genealogy-file-graph`: the tooltip of the Curies' node reads with the marriage sign.

## Non-goals

- Telling a married couple from one that is not: the sign names the pair, as the word did, and a family with no marriage stated is written the same way.
- A fallback for a font that lacks `⚭`; the platforms the plugin targets draw it.
- A setting to choose the joiner, or the vertical bar.
- Changing how the file's `HUSB` and `WIFE` names are read, or the family name the index keeps (`A / B`), which is not shown.
- Rewording the prose of other specs that says «the family of Pierre Curie and Marie»; it describes a family, and the rule above names how it is written.

## Impact

- `src/i18n/en.json` and `src/i18n/ru.json` (`desk.couple`).
- Tests that name a couple: `src/commands.test.ts`, `src/desk/fileGraphView.test.ts`, `src/desk/familyPage.test.ts`, `src/desk/fileList.test.ts`, `src/desk/recordCard.test.ts`, `src/desk/listRows.test.ts`, `src/desk/eventRows.test.ts`, `tests/fileList.spec.ts`, `tests/desk.spec.ts`.
