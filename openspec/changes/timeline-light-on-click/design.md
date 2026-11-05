## Context

`FileTimelineBoard` (`src/desk/fileTimelineView.ts`) lights a person through
`highlight(xref)`: `is-on`/`is-hl` classes on the person's elements and name,
`has-hl` on the board (which fades what is not `is-on`), a row band and the
arrows in a `hover` layer. Three things called it: the pointer, through a
`HoverDelay` that waits 130 ms to rest and the same to leave; the focus of a name,
at once; and a first touch. The board already keeps the selection apart
(`select`, `is-selected`) and a click calls `host.select(xref)`.

## Goals / Non-Goals

**Goals:** the pointer never fades anyone; a click lights what hovering lit; the
phone behaves as it does.
**Non-Goals:** the graph, a setting, changing the selection or the card.

## Decisions

### One light, driven by a click

`highlight` stays the one way to light, and loses the timer. Its callers become:
a mouse, pen or keyboard click on a person (`activate`), the first touch, and the
clearing paths. The pointer handler keeps the tooltip and the year cursor and
no longer touches the light. `focusin` and the re-focus after a redraw no longer
call it.

### The light follows the selected person, and only a phone breaks that (mine)

Desktop click and keyboard activation light the person and call `host.select`,
which returns to the board as `select(xref)`; a `select` for the person already
lit keeps the light, any other `select` (index, card, link, Source cursor, none)
puts it out. So on a desktop the lit person is always the selected one or no
one. Clicking empty space or pressing Escape puts the light out and keeps the
selection (lighting is a view of the selection, not the selection). Alternatives
weighed: clearing both on empty space (a stray click would lose the card the
reader is reading) and an independent light (two marks on two people with no way
to tell).

On a phone the first touch lights without selecting (the rule exists so that the
second touch is deliberate), so there the light may be on another person than the
selected one until the second touch; the selected mark is drawn apart from it,
as the spec already says.

### What is "empty space"

A click whose target is neither inside `[data-p]`, a mark, a branch button, the
pop-up nor the search. It is handled in `activate`, which already sees every click
of the board; a click on the zoom controls or the search is outside the board's
element. A touch on empty space does the same.

### Escape

A `keydown` on the timeline's root, handled when the light is on and the key
is Escape; the search field's Escape stops propagation first, so Escape in the
field still closes the field and not the light.

### Scope, mode and hiding

`setScope` puts the light out before laying out; `FileViews.parkOthers` asks the
timeline board to put it out where it asked the graph to cancel its timer
(`cancelHover` stays on the graph only; the timeline gets `unlight`). Mode
changes hide the view, so the light does not come back with it (mine).

### Hover that stays

The name's own `:hover` background, the pointer cursors, mark `:hover` and the
tooltip are CSS and stay. The lifeline gets no hover change, so that no row's
opacity changes under the pointer.

### The graph

The graph keeps `HoverDelay` and its highlight on hover; `HOVER_DELAY` stays in
`src/desk/dom.ts`. The user did not ask about it (mine: left as it is; if the
same dislike applies it is a second, equally small change).

## Risks / Trade-offs

- A reader used to the hover light finds the board still: the click is the one
  gesture that was already there for selecting, so nothing new is learned.
- A drag-scroll with a mouse ends on a click event only when pressed and released
  on one element; a scroll by the wheel or scroll bars makes none.

## Migration Plan

None; nothing is saved.

## Open Questions

None.

## Implementation

What differs from the plan above, or was settled while building it.

- **The light follows the selection (mine).** As in "The light follows the
  selected person": `select` of another person puts the light out, and a click
  lights before it calls `host.select`, so the selection that returns keeps it.
  Escape and a click on empty space leave the selection.
- **Escape is a `keydown` on the board's root** and does nothing while no one is
  lit, so it does not swallow Escape for the search field (which stops it first).
- **A click on empty space** is any click of the board's element whose target is no
  person, mark or branch button; the search and zoom controls sit outside the board.
- **The timeline board loses `cancelHover`**; `FileViews.parkOthers` calls
  `unlight()` on it, and `cancelHover()` on the graph.
- **The 10 000-person browser spec** now clicks a name for the light and keeps the
  pointer moves for the cursor.
- **The hover browser spec waits 400 ms** (three times the old rest) before it asserts
  that nothing is faded, because an absence cannot be polled for.
- **Not changed (mine):** the graph's hover light; the `is-hl` name background
  that shows the branch button for a lit row; styles for the light, which already
  covered a class set from anywhere.
