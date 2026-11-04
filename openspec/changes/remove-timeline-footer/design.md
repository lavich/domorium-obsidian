## Context

The board of the timeline was one scroll container with a sticky column of
names and a sticky axis, so its vertical bar ran over the axis and its
horizontal bar under the names. The user asked for the bars to belong to the
rows and years only.

## Decisions

- The board is a grid of four cells: the corner, the axis, the names and the
  plot. Only the plot (rows by years) is the scroller, so its bars lie inside
  its own cell and cannot reach the others.
- The names and the axis are scrollers of their own with their bars hidden, so
  a swipe on the names still scrolls the rows on a phone with the platform's own
  momentum. Each follows the plot in its `scroll` event, and the plot follows
  them, which is how a name focused from the keyboard brings its row into view.
  A follower writes only when the offsets differ, so the two never ping-pong.
- The names column is as tall as the plot less its horizontal bar, and the axis
  as wide as the plot less its vertical bar, so that every scroller has the same
  maximum. Both gutters are measured from the plot and are zero where bars
  overlay the content, as on macOS and iOS.
- The zoom buttons keep clear of the bars by the same two measures.
- The spec states only that the names and the axis stay in place while the rows
  and years scroll, which still holds; it is not modified for this.
