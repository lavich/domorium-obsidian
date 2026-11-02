## Why

A person's page answers who someone was; nothing in the plugin shows a whole
family through time — who lived alongside whom, where a life is empty of events,
where a date cannot be right. The user iterated a horizontal timeline of the
whole file in a mockup (`docs/design/file-timeline.html`, PR #188) and asked for
it in the plugin as the first of the overviews.

## What Changes

The user's requirement, in their words, with the decisions taken on the way
(all 2026-11-02):

- «Оставляем один плагин и идём дальше по плану, начиная с таймлайна отдельным
  изменением» — one plugin; the file timeline is the first of four changes
  (timeline, graph, local branch in a sidebar, hover preview card).
- On where an overview lives, the user accepted the proposal to follow
  Obsidian's own graph: the overview is its own tab beside the file's tab,
  clicking a person opens their page in the file's tab, and the person page
  stays in the centre — «звучит правильно и хорошо. будем делать все».
- On the header switch (Genealogy / Source): the overview is opened by a header
  action beside the switch, not made a third mode of it.
- From the mockup: «розовые - женский пол, голубые - мужской пол, серые - пол не
  указан. Убери Generation»; «в полосе жизни человека пусть отображаются его
  события как-нибудь»; «убери то что предложил» (arrows only for the person
  under the pointer, a dashed mark only for an imprecise date, no per-kind
  filters for births, marriages and deaths, facts without a date written in the
  bar only when zoomed in or under the pointer); a branch scope and a year cursor
  — «да»; «оставь только Families».
- Ages under the year cursor: «Да, только под курсором», marked approximate where
  the birth date is. The person timeline keeps showing no age. An age is the one
  reached during the year under the cursor, which is exact for a birth known by
  its year alone: the reason the reading-desk change kept ages out (an age read
  from years is off by one half the time) does not apply to it.
- What a large file opens on: «Ветку текущего человека, если файл большой».

Proposed scope:

- A new view, **Timeline of the file**, opened in a tab of its own from a header
  action on a GEDCOM tab, from a command, and from the tab's menu. It shows one
  row per person of one file, ordered by generation and family, each with a
  lifeline coloured by sex and the person's dated events on it.
- A year cursor with the age of everyone alive in that year, a **Branch** scope
  of one person's ancestors and descendants, a search, a zoom, and a switch for
  events other than births, marriages and deaths.
- Clicking a person opens their page in the file's tab; clicking an event shows
  its lines in the source.
- A file of more than 500 people opens on the branch of the person its tab shows.
- The view belongs to the genealogy interface: it is not offered, and an open
  one is closed, while **Genealogy interface** is off.
- The read model reports, for a date, the year of its second date and whether it
  states a period or an uncertain moment.

This change belongs in this repository. The language service already parses
every date this needs; the read model that reports it lives here
([lavich/domorium#379](https://github.com/lavich/domorium/issues/379) tracks its
move), and the rest adapts it to Obsidian.

## Non-goals

- The graph of the file, the branch in a sidebar, and the hover preview card:
  each is its own change, in that order.
- A map, a fan chart, ages on the person timeline.
- Editing anything from the timeline: like the rest of Genealogy mode it never
  writes to the file.
- Historical context — wars, censuses — or anything not read from the file.
- Raising `minAppVersion`.

## Capabilities

### New Capabilities

- `genealogy-file-timeline`: the timeline of a whole file — how it opens, what a
  row and a lifeline show, the order of rows, the year cursor, the branch scope,
  what clicking does, and how it holds up at size.

### Modified Capabilities

- `genealogy-view`: the genealogy interface setting also hides the file
  timeline and its header action and command.
- `genealogy-read-model`: a date reports the year of its second date and whether
  it is a period.

## Impact

- `src/genealogy/dates.ts` and its tests: the three new readings.
- New `src/desk/fileTimeline.ts` (generations, rows, branch, lifelines, the
  cursor's ages — no DOM) and `src/desk/fileTimelineView.ts` (drawing, with
  only what is in view in the DOM), with tests beside them.
- A new view class beside `IndexView` in `src/desk/DeskViews.ts`; `src/main.ts`
  registers it, its command, and folds it into `syncInterface`.
- `src/GedcomView.ts`: the header action and the pane menu item.
- `styles.css`, `src/i18n/en.json`, `src/i18n/ru.json`, `README.md`.
- A harness page and a Playwright spec for drawing, hover and size.
