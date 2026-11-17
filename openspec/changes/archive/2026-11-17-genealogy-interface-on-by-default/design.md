## Context

`parseSettings` fills a key missing from `data.json` from `DEFAULT_SETTINGS`, and every save writes the whole settings object back. So the value a reader's `data.json` holds for `genealogyInterface` is either one they chose or the old default, written when they changed any other setting; the plugin cannot tell the two apart.

## Goals / Non-Goals

**Goals:** a reader with no `data.json`, or one without the key, gets the interface on; a stored boolean is honoured.

**Non-Goals:** telling a chosen `false` from a stored default.

## Decisions

- **Change the default only.** `DEFAULT_SETTINGS.genealogyInterface` becomes `true`; `parseSettings` is unchanged. This is the user's decision «Новым и не трогавшим». The alternative — a one-off migration that flips a stored `false`, or a version marker to tell a chosen value from a stored default — was declined: it would override a reader who did turn the interface off.
- **First open follows the existing rule.** With the interface on and `lastMode` at its default `graph`, a file with no mode of its own opens in Graph mode, which is what *A GEDCOM tab is in one of four modes* already says. No code changes for it.
- **The name and description stay.** «Still in beta… While this is off, GEDCOM files open in the source editor» reads as true with the interface on by default, so neither catalogue changes.

## Risks / Trade-offs

- [A reader who never touched this toggle but changed another setting on an earlier version has `genealogyInterface: false` stored, and keeps the interface off] → Accepted by the user's decision; the README tells them where the setting is.
- [A reader updating with no stored value meets Graph mode where they had Source] → The mode control and **Show as source** are in the tab header; choosing Source is remembered for the next file.
