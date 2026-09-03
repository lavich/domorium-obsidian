## Why

A GEDCOM exported from a web tree can name every photograph by URL, and for
that file the media preview is a row of refusals: it resolves the target,
recognises it as remote, says **Remote file, not loaded**, and hands the reader
nothing to say yes with. The refusal is the right default — a hover firing off a
request to a stranger's host is a statement about a family, made without asking
— but a default is not an ending. The reader should be able to answer it.

## What Changes

- A setting, **Load images from the web**, off. A yes or a no; the third state
  the preview settings have does not belong here.
- The refusal row carries the way out beside it: **Show this image**, which
  draws this one and leaves the setting alone, and **Always show images from
  the web**, which writes the setting and draws it. The reader answers where the
  question was asked rather than in the settings tab.
- A "yes, once" holds until the plugin is unloaded. A reader who says yes to one
  face in a group photograph will say yes to the other four in the next minute,
  and nothing is written to disk for an answer that short-lived.
- With the answer given, a remote image behaves like a vault image: drawn,
  cropped by `CROP`, bounded by the same rule, captioned by the same `TITL`.
  Loading it is `<img src>`, which is what the crop machinery already draws.
- The popover stays open while the pointer is inside it, and closes when the
  pointer is in neither the media position nor the popover. Today the editor's
  `mouseleave` closes it, so a control inside it is unreachable by construction:
  moving toward the button is what dismisses it. Obsidian's own hover popovers
  stay; this one has to learn the same trick before an offer inside it means
  anything.
- A plain `http` URL is refused and told why, whatever the setting says. The
  renderer would make a mixed-content request, and the promise the padlock
  implies is not one this plugin can keep on the reader's behalf.
- A remote image that does not arrive says so, rather than leaving the reader to
  wonder whether the answer took effect.
- The privacy paragraph in the README stops saying the plugin makes no network
  requests, flatly, and says instead what the setting does and that it is off
  until asked.

This change belongs in **this repository**. The language service already reports
a remote target as `kind: "http"`, which is all that is asked of it; what to do
with that answer is Obsidian's side of the line.

## Capabilities

### New Capabilities

None. The behaviour is the media preview's, and it has a spec.

### Modified Capabilities

- `media-preview`: the requirement that a remote target is never fetched becomes
  a requirement that it is not fetched until the reader asks; the popover gains
  a lifetime that survives the pointer entering it, which the gesture-ends
  scenario currently forbids; and the offer, the setting, and what a failed load
  says are requirements the spec does not have yet.

## Impact

- `src/editor/media.ts` — `mediaPreviewContent` takes the answer as an input.
  The `remote` branch is where it is decided, and it is a pure function with
  tests.
- `src/editor/mediaPreviewView.ts` — the refusal row grows two buttons, the
  first interactive thing in the popover; a granted remote target draws through
  the same path as a vault image.
- `src/editor/mediaPreviewHover.ts` — the pointer leaving the editor no longer
  means the preview is over.
- `src/GedcomView.ts` — holds the session's answer, hands it to the content
  function, and writes the setting when the second button is pressed.
- `src/settingsData.ts`, `src/settingDefinitions.ts` — one boolean, the way
  `mediaPreview` took its dropdown.
- `styles.css` — the row's buttons.
- `harness/mount.ts` and `tests/mediaPreview.spec.ts` — the harness serves the
  remote image from its own bytes; the specs are where the offer and the sticky
  popover are proved.
- `README.md` — the privacy paragraph.

## Non-goals

- **A list of allowed hosts.** `Always show images from example.org` is a
  smaller thing to agree to, and a better shape for a vault naming one or two
  hosts, but it is a stored list to migrate, edit and show. The toggle answers
  the issue; the list is a change of its own, and this one should not pretend to
  be a first draft of it.
- **`requestUrl` and a data URI.** It would name the failure precisely and
  sidestep CORS, at the cost of holding the bytes and converting them. `<img>`
  does not meet CORS for a plain image and already reports that it could not
  draw one.
- **Remote audio, video and documents.** They are named rather than drawn today
  and stay that way; nothing about them is fetched.
- **Caching a fetched image into the vault, or anywhere on disk.** The GEDCOM
  file stays the source of truth, and a downloaded photograph is a second copy
  of it.
- **A separate answer for mobile.** #78 stands: nothing here has been run on a
  phone, and inventing a per-platform value from a desktop is guessing at a
  question that issue exists to answer.
- **Any other network request.** The setting permits drawing an image a media
  position names, and nothing else.
