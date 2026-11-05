## Context

The board is a grid of corner, axis, names and plot. The corner (`.gedcom-ft-axis-pad`)
and the band of years (`.gedcom-ft-axis-band`) share `--background-secondary` and a
bottom border, and nothing separates them; the names column below has a border on
its inline end, which stops at the corner. The axis is an SVG as wide as the plot,
scrolled in step with it, holding one `text` per label. The plot's gridlines are
every ten years, faded where the label step is wider.

## Goals / Non-Goals

**Goals:** a header row that reads as one; ticks that make a year readable
between labels; no cost at size.
**Non-Goals:** the labels, the gridlines, the gutters of the scrollbars.

## Decisions

### A divider, not a second colour

The corner gets the border on its inline end, which joins the names' border into
one line from the top of the names down to the plot's bottom. The border under the
header row already runs under both cells. A different shade for the corner was
weighed and declined: with a line and ticks it adds a third thing to tell apart in
a header that is only a label strip, and it would have to be checked against every
theme's secondary and primary backgrounds. Theme variables only:
`--background-modifier-border` for the lines.

### Ticks are a pure function of zoom and span

`src/desk/axisTicks.ts` returns the years to tick for a span of years and the
pixels per year. Long ticks every 10, medium every 5 (not already long), short
every year (neither of those) where a year is at least 4.5 px. The zoom range is 2
to 16 px per year, so at the narrowest the axis has medium and long ticks only,
and at the initial 6 px all three. Ticks do not follow the label step: labels are
every 50, 20 or 10 years and always on a multiple of ten, so each carries a long
tick.

### Virtualised, one shape per kind

`draw()` already redraws the plot's items for the window and a screen on each
side. The ticks join it: the years of that span, three `path` elements (one per
kind) in a group in the axis SVG, recreated with the draw. This is bounded by the
window, not by the file. A kind with more than 1000 ticks in the span is not drawn
(the cap), which at the zoom range happens only for a window of several thousand
years, not for a file of any size.

### Drawn from the bottom edge, under the labels and the cursor

The band is 26 px including its 1 px bottom border, so the ticks start at 25 and
rise 3, 5 and 7 px; the labels' baseline is 17, so the long tick stays below it.
The group is the first child of the SVG so labels and the year cursor's flag paint
over it. Strokes use `crispEdges` so a tick is one pixel wide at any fractional
zoom; the gridlines are not changed.

### Colour

`--text-faint`, with the yearly ticks at 0.55 opacity so the 5 and 10 stand out.

## Risks / Trade-offs

- The ticks and the gridlines may differ by half a pixel at a fractional zoom,
  because ticks snap to the pixel grid and the plot's lines are antialiased.
- At 2 px per year there are no yearly ticks: the axis says only 5 and 10.

## Migration Plan

None; nothing is saved.

## Open Questions

None.

## Implementation

What differs from the plan above, or was settled while building it.

- **The divider is one border on the corner (mine).** Both header cells keep
  `--background-secondary`; the bottom border was already there. Looked at in light
  and dark at 1400 and 390 px: the line reads at both, and the ticks stay clear of
  the labels and under the year cursor's flag.
- **The ticks are three `path`s in a `g.gedcom-ft-ticks`, one `M x y v -h` per tick (mine).**
  Drawn from `drawn.left` to `drawn.right`, clipped to the layout's decades.
- **Cap (mine):** a kind is dropped when its span holds more than 1000 ticks
  (`MAX_TICKS_PER_KIND`); short ticks are also dropped under 4.5 px per year.
- **Tick heights (mine):** 3, 5 and 7 px from y = 25, since the band's last pixel is
  its border.
- **Not changed:** labels, gridlines, the gutters of the scrollbars.
