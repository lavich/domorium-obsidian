## Why

The expanding search of the graph, the timeline and the list opens over a moment but
closes in one frame: the arrows, the cross and the counter vanish at once, so the bar
jumps shut while only the field narrows smoothly.

## User requirement

2026-11-07: "когда поисковая строка закрывается, то она слишком быстро схлопывается — без
анимации, пусть она закрывается так же плавно как при открытии".

## What Changes

- Closing the search SHALL narrow and fade the whole bar over the same duration and easing
  as opening it, including the clear, previous, next and count controls.
- Reduced motion keeps the instant change.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `genealogy-view`: the search of the graph, timeline and list closes as smoothly as it opens.

## Impact

`styles.css` only. No API above `minAppVersion`, nothing upstream, no new strings.
