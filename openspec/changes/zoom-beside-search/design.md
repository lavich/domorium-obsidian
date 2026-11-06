## Context

`FloatingSearch` and `zoomControls` each positioned themselves absolutely, search at the top and
zoom at the bottom. The field's width changes as it opens, so a zoom group placed beside it by
offsets would depend on that width.

## Decisions

- **One dock.** `floatingDock(parent, prefix)` makes a `*-dock` element that is the only absolutely
  positioned thing; the search and the zoom group are static flex children of it, search first.
  The dock is anchored to the end corner, so the field grows away from the zoom group. Rejected:
  offsetting the search by the zoom group's width, which breaks when the width changes (phone
  buttons are 44 px).
- **Timeline offsets** (under the axis, clear of the vertical scrollbar) belong to the dock, so
  `--gedcom-ft-hbar`, which only the bottom zoom group used, is removed.
- **Tooltips** of the zoom buttons are placed `bottom`.
- **Archive order.** `timeline-named-bars` is archived first; the MODIFIED requirement of the
  timeline restates its text as that change leaves it.

## Risks / Trade-offs

- A phone's narrow canvas: the dock has the canvas width less its margins as its maximum, and the
  field shrinks (`min-width: 0`) before it covers the zoom group; the zoom group itself is `flex: none`, so it is never squeezed.
