## Context

See proposal.md — Why. What the code already gives this change, and what it does
not:

- `mediaPreviewContent` is a pure function with tests, and `kind: "http"` is
  answered before anything else is looked at — including `mediaKind`, which the
  language service fills in for a remote target as it does for a local one.
- `renderMediaPreview` draws into a container it is handed, with an injected
  `setIcon`, so the harness mounts the same code without Obsidian. Nothing it
  draws is interactive.
- The image path already loads late, clamps a rectangle against the loaded
  image, bounds the box, and replaces itself with a row when the image does not
  draw. A remote image that is allowed needs none of that written again.
- `mediaPreviewHover` closes the preview from the editor's own `mouseleave`, and
  the popover is an Obsidian `HoverPopover` outside the editor's DOM. The
  pointer moving toward a button in it is therefore the gesture that dismisses
  it. This is the one part of the change that is not additive.

## Goals / Non-Goals

**Goals:**

- Keep the decision in the pure function. Whether a target is drawn, refused, or
  offered is content, not DOM, and it should stay testable at the unit level.
- Keep one drawing path for images. A remote image that the reader has allowed
  is an image; crop, bound, caption and the late-load guard should not be
  written twice.
- Keep proving "no network request is made" once a request becomes possible.
  `tests/mediaPreview.spec.ts` already watches the page's requests for the
  refusal; what is missing is the other half, a request that does happen.

**Non-Goals:**

- Reworking the preview into a component that manages its own lifetime. The
  popover learns one thing — that the pointer inside it is not the pointer gone.
- Any state on disk beyond the one boolean.

## Decisions

### The answer is one input to the pure function

`mediaPreviewContent` takes a third argument for the reader's answer, and the
host resolves it: the persisted setting, or the session's "yes, once". The
function stays free of where the answer came from, and the unit tests keep
covering every branch of it.

The session's answer lives on the plugin, not on the view. A vault is a reader,
and a `.ged` opened in two panes should not ask twice. It is a field, so
unloading the plugin is what forgets it — which is exactly the lifetime the
spec asks for, with nothing to write or expire.

*Alternative considered:* a `Set` of answered URLs, or of hosts. That is the
allowlist the proposal rules out of scope, arrived at by accident.

### `remote` gains a state rather than splitting into three kinds

The refusal row is one row with three reasons behind it: the reader has not
answered, the address is unencrypted, or the target is remote and not an image.
Modelling it as `{ kind: "remote"; url; title?; state }` keeps one branch in the
renderer, and the state is what decides the note's wording and whether the two
buttons are drawn. Splitting it into `insecure` and `not-an-image` kinds would
give the renderer three cases that draw the same row.

An allowed remote image returns `kind: "image"` with the URL as its `url`, and
the existing path draws it. That is the whole of "behaves like a vault image".

### The buttons are callbacks on the host

`MediaPreviewHost` gains the two answers as optional callbacks. The renderer
draws a button only where the host supplied one and the state is the one that
asks, so the harness mounts the same row with its own callbacks and the unit
tests keep working with none.

Taking an answer re-renders the popover in place: the host clears the container
and calls `renderMediaPreview` again with content built from the new answer.
There is no partial update to get wrong, and `isCurrent` keeps meaning what it
meant.

### The popover is held by asking the host, not by knowing about Obsidian

`mediaPreviewHover` cannot import `HoverPopover`; the harness has none. It gains
a predicate — *is this node inside what the preview opened* — that the host
supplies, and consults it with `relatedTarget` on `mouseleave`. A pointer
leaving the editor for the popover is not a pointer leaving the preview; a
`relatedTarget` of `null`, which is what leaving for the window chrome gives,
closes as before.

The other half is the popover's own `mouseleave`, registered by the host, which
clears the preview unless the pointer went back into the editor. Between the two
handlers the preview closes exactly when the pointer is in neither.

*Settled, and it settles more than it was asked to.* `HoverPopover`'s
constructor puts `mouseover` and `mouseout` on its own `hoverEl`, keeps an
`onHover` flag beside `onTarget`, and shows while either is true; leaving starts
a `waitTime` timer rather than closing. So the popover already holds itself
under the pointer, and the plugin's `mouseleave` was the only thing taking it
away.

That makes the popover's own end the better signal: rather than the host
watching the pointer leave, the view registers a callback on the popover, and
whatever hides it — the pointer, another preview, the file closing — clears the
session with it.

### Playwright routes the image, which is how "no request" becomes testable

The harness cannot serve `https://example.org/marie.jpg`, and no spec should
reach the real internet. `page.route()` answers the request with the harness's
own bytes and counts the times it was asked, so one mechanism gives us both
halves: the picture that appears when the reader says yes, and the request that
never happens when they do not.

*Alternative considered:* a `data:` URL in the document. It would draw without
the network, and it would prove nothing about a URL, because a `data:` payload
is not what the language service calls remote.

*Fallback if a `file://` page's subresources turn out not to be routable:* the
spec asserts the `<img>` carries the exact URL, and the no-request half stays a
unit-level assertion that the content function returned a row rather than an
image. Weaker, and worth one attempt at the stronger form first.

### `http` is decided from the URL, not from a request that fails

The scheme is in the payload. Refusing it in the pure function means the reader
is told why without anything being attempted, and means the rule holds with the
setting on — which is what the spec asks for and what a request-time refusal
could not promise.

## Risks / Trade-offs

- ~~**`HoverPopover` closes itself despite the change**~~ → Settled: it holds
  itself while hovered, and the view now ends the session when it hides. See the
  decision above.
- **A button inside a hover popover is still a small target on the way out of
  the editor** → The popover opens next to the line, and the pointer travels a
  short distance; Obsidian's own previews ask the same of the reader. If it
  proves fiddly, the row is still readable and the settings tab still works.
- **The setting is a promise the README currently makes flatly** → The paragraph
  is rewritten in the same change, not left for later. A plugin whose README
  says it makes no network requests while a setting says otherwise is worse than
  either.
- **`<img>` cannot say why a load failed** → Accepted. The row says the image
  could not be loaded and names the URL; naming the reason precisely is what
  `requestUrl` would buy, at a cost the proposal declines.
- **A remote image is fetched every time the popover opens** → No cache, by
  design: a cache is a copy of a photograph the vault did not ask for. The
  renderer's own HTTP cache is whatever the platform gives it.

## Migration Plan

None to run. `parseSettings` gains a boolean with a default of `false`, so a
settings file written by any earlier version loads unchanged and the plugin
behaves as it did. Turning the setting off restores every earlier behaviour,
which is the rollback.
