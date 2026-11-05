## Why

In the timeline, resting the pointer on a person fades everyone else, and the
reader finds that unpleasant: the board changes under a hand that is only
moving across it. The family's light is wanted, but when it is asked for.

## What Changes

The user's requirement, in their words (2026-11-05):

- «в таймлайне мне не нравится выделение по ховеру — когда все остальные
  дизейблятся. пусть только по клику этот функционал работает».

This repository is the right place: the change is the timeline's own drawing and
its spec; nothing in parsing, validation or the language service is involved.

Proposed scope (decisions that are mine are marked):

- **Pointing lights nothing.** The pointer-rest timer, the light, the fading and
  the arrows that followed the pointer go from the timeline. What does not fade
  anyone stays: the background of the name under the pointer, the pointer cursor,
  the tooltip of a mark, the year cursor and the ages (they are the cursor, not
  the highlight).
- **A click lights.** A click on a person's name or lifeline (mouse or pen), and
  Enter or Space on a name, selects them as now and lights their row and
  lifeline, their parents, spouses and children, fades everyone else and draws
  the arrows from each parent to the birth and to each child. The light is on at
  once, with no wait (mine: a click is deliberate).
- **Putting it out** (mine): a click on the board where there is no person and
  no mark, Escape, a change of scope or mode, or another record selected from
  elsewhere. Clicking another person moves it. Putting it out leaves the
  selection as it is.
- **Keyboard** (mine): focus alone lights nothing, so Tab through the names fades
  nothing; Enter or Space on a name is a click.
- **Phone**: the first touch still lights and the second still selects; a touch on
  empty space puts the light out; the light stays after the second touch.
- The eased colour transition stays for the light turning on and off. The search's
  current-match ring, the selected mark, the glide to a match are untouched.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `genealogy-file-timeline`: «The person under the pointer and their family stand
  out» becomes «A click on a person lights their family» (renamed and restated);
  «The timeline holds up at size», «The timeline on a phone», «A selected row» and
  «A name or a lifeline selects a record, and a mark leads to the source» are
  restated where they speak of the pointer's light.

## Non-goals

- The graph keeps the light it gives to the pointer, and the delay it waits
  (`HOVER_DELAY`, `HoverDelay`); the user asked about the timeline only.
- No setting to choose between hover and click.
- No change to the selection, the record card, the Index, search or zoom.
- No new strings, no change to `minAppVersion`.

## Impact

- `src/desk/fileTimelineView.ts`, `src/desk/fileViews.ts` (hiding a view),
  `styles.css` (`.gedcom-ft-*`), `README.md` (one sentence).
- Tests: `src/desk/fileTimelineView.test.ts`, `src/desk/fileViews.test.ts`,
  `tests/fileTimeline.spec.ts`.
- Spec: `openspec/specs/genealogy-file-timeline/spec.md`.
