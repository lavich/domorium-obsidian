## Context

The field and the toggle already animate width and opacity over 180 ms on `is-open`
(`styles.css`, the find rules). The clear, prev, next and count controls were switched
off with `display: none` when `is-open` went away, which cannot be transitioned.

## Decisions

- Transition the same properties on those controls instead of toggling `display`: width,
  min-width, padding and opacity over 180 ms ease-out, with `visibility` delayed by the
  duration on close so the hidden controls leave the tab order and the accessibility tree
  once they are gone.
- The count has no fixed width, so it animates `max-width` (20em open, 0 closed). Buttons
  animate `width` and carry a fixed `max-width` equal to their size, so the clamp never fights it.
- Reduced motion: `transition: none`, as the field and the toggle already do.

## Risks

Keyboard focus stays governed by the `tabIndex` that `FloatingSearch.close()` sets; the
CSS only changes paint.
