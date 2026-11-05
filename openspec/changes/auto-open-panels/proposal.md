## Why

Step 2 (`record-card-panel`, 1.15.0) moved a record's page into a card in the right
sidebar and left the Index in the left one. Both panels are opened by hand: the card
is placed once per session but a collapsed sidebar stays collapsed on desktop (a
deliberate earlier decision, so that a click never shifts the reader's layout), and
the Index is only ever opened from the ribbon icon or its command. A reader who
clicks a person in the graph is left looking at a graph with two shut sidebars and
no sign that a card exists.

## What Changes

The user's request (2026-11-05):

«а можно сделать так, чтобы при клике на карточки и панели слева и справа сами
открывались?»

- A new setting, **Open the side panels when selecting**, on by default. While it
  and the genealogy interface are on, a reader's own selection gesture on a desktop
  — a click on a graph card, a family node, a timeline row, a link into a record, a
  row of the Index — makes sure the Index is in the left sidebar and the record card
  in the right one: each is put there if it is not open, and its sidebar is expanded
  if it is collapsed. The view the reader clicked in keeps the focus.
- A panel that is already open in an expanded sidebar is left alone, also when
  another tab of that sidebar is in front. A sidebar the reader collapses again
  stays collapsed until the next selection gesture; a panel the reader closed is
  put back by the next one. That is what the setting is for.
- Cursor following in Source, a restored selection, and Back and Forward and the
  relatives and citations in the card never open a panel: they are not a reader
  reaching for a card, or they happen inside one.
- With the setting off the plugin behaves exactly as in 1.15.0: the card is placed
  once per session, no sidebar is expanded on desktop, the Index is never opened by
  a selection.
- On a phone nothing changes: a second touch, or a row of the Index, opens the right
  drawer; the left drawer is never opened by a selection, since a drawer covers the
  screen.
- With the genealogy interface off nothing opens, as everything else.

## Capabilities

### Modified Capabilities

- `genealogy-record-card`: where the card is placed and when its sidebar expands.
- `genealogy-index`: a selection gesture opens the Index.
- `genealogy-view`: the new setting, its default, where it applies and the origins
  that open the panels.

## Non-goals

- Focusing a panel, or moving the reader's active tab. The panels open behind the
  view the reader is in.
- Opening the left drawer on a phone, or any panel from the cursor following in Source.
- Bringing the Index or the card to the front of a sidebar that is already expanded
  with another tab in front.
- Raising `minAppVersion`: `WorkspaceSidedock.expand` (0.12.11) and `ensureSideLeaf`
  (1.7.2) are below the floor 1.8.7.

## Impact

- `src/desk/sidePanels.ts` (new, pure), `src/main.ts`, `src/settingsData.ts`,
  `src/settingDefinitions.ts`, `src/i18n/{en,ru}.json`, README.
- No change to the saved state of a tab or the file format.
