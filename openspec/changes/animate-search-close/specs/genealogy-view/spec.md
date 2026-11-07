## ADDED Requirements

### Requirement: The search closes as smoothly as it opens

The expanding search of the graph, the timeline and the list SHALL, when it closes, narrow
and fade its field, its clear, previous and next controls and its counter over the same
duration and easing as it opens, while the icon returns, instead of dropping any of them in one
frame. Where the reader's system asks for reduced motion it SHALL change at once.

#### Scenario: Closing the search
- **WHEN** the reader closes an open search
- **THEN** the controls and the field narrow and fade together over the time opening takes, and the icon is back when they are gone

#### Scenario: Reduced motion
- **WHEN** the reader's system asks for reduced motion and the reader closes the search
- **THEN** it is closed at once
