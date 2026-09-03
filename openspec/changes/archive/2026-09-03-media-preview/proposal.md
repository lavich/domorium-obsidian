## Why

`1 FILE media/marie.jpg` can be Mod-clicked open, and until it is clicked it is
a string. In a vault full of photographs, the one thing a reader wants from that
line is to see the photograph. The record behind an XREF already appears under
the preview gesture; a picture does not.

This waited on parsing that belongs upstream, and no longer does.
`@domorium/language-service` 2.1.0 answers `getMediaAt(position)` with the file
a line refers to, whether the format calls it an image, the caption its author
wrote, and — for a GEDCOM 7 multimedia link — the rectangle of the image that
reference asks for. This repository holds the other half: resolving that file in
the vault, and drawing it.

## What Changes

- **A hover over a media position shows the media.** The preview gesture over a
  `FILE` payload shows the whole image; over the pointer of `1 OBJE @O1@` it
  shows the rectangle that link's `CROP` names. Same gesture, two lines, two
  different pictures — which is the point of `CROP`.
- **The caption is shown with the image.** `TITL` from the link where the link
  has one, otherwise the record's, rendered under the picture.
- **Media that is not a raster image gets a row, not silence.** `audio`,
  `video`, `document` and `unknown` show a type icon, the `TITL`, and the file
  name. Showing nothing quietly is the one behavior that reads as broken.
- **A remote `FILE` says why it shows no picture.** The plugin promises in
  writing that it makes no network requests, so an `http` target is never
  fetched. The popover says so and shows the URL, rather than not appearing.
- **A missing file says so.** A payload naming a file the vault does not hold
  gets the same one-line treatment, not an empty box.
- **The rectangle is clamped here.** Upstream decided deliberately that the
  extent of an image is not knowable from the document, so clamping belongs to
  whoever holds the file. A `CROP` that runs past the edge is clamped to the
  image; one that leaves no visible area falls back to the whole image.
- **Media preview gets its own setting**, with the same three values as
  `Record preview` (`Hold Ctrl/Cmd and hover`, `Hover`, `Never`). A reader in a
  vault of 12-megapixel scans can keep record previews and turn photographs off;
  one setting for both would not allow that.
- **Both previews default to a plain hover, after a short rest.** Holding
  Ctrl/Cmd to see a photograph is a gesture nobody guesses, and the rest the
  pointer must make — the wait a tag tooltip already uses — is what the modifier
  was really protecting against. **BREAKING** for a new installation only: a
  reader who already chose a trigger keeps it, because the stored value wins.
- **The whole of a media line answers the gesture**, from its tag through its
  payload, not the payload alone. Aiming at the exact token is a thing a reader
  should not have to do.
- **A position that answers is dressed as a link**, in the colour and cursor a
  vault-relative file link already wears, so it is visible that a picture is
  behind it before the pointer arrives.
- **The rendered box is bounded** before it is ever shown, in fractions of the
  editor pane with an absolute ceiling, so a large scan cannot fill the screen
  on a phone or overflow the pane on a desktop with sidebars open.
- **A load that finishes late changes nothing.** An image arrives after the
  popover opens; where the gesture has moved on or closed by then, the arriving
  image does not redraw a popover that is no longer the current one.

The one thing that changes for behaviour already shipped is the `Record preview`
default, which follows the same reasoning. A reader who has chosen a trigger
keeps it.

## Non-goals

- **Fetching remote images.** The README's promise stands. A setting to relax it
  is a separate conversation about privacy, not part of this change.
- **Playing audio or video, or rendering a PDF page.** Non-raster media gets an
  identifying row; opening it stays the click's job.
- **Editing `CROP`.** The rectangle is read, never written. No handles, no drag.
- **Previews inside Markdown notes.** `src/notes/` renders GEDCOM in notes and
  has its own preview path; this change is the `.ged` editor only. Extending it
  to notes is a follow-up.
- **Image processing.** The crop is a container with `overflow: hidden` and an
  offset image. No canvas, no decoding, nothing read into memory —
  `vault.getResourcePath(file)` returns an `app://` URL an `<img>` takes.
- **Delegating the popover to the core Page preview plugin.** Obsidian's
  `hover-link` source API would render a vault image for free, but knows nothing
  of `CROP`, cannot explain a remote file and cannot report a missing one — see
  design.md. The plugin keeps drawing its own popover, as it already does for
  record previews.
- **Anything upstream.** Parsing, `CROP` semantics, dialect differences and the
  `image`/`audio`/`video`/`document` verdict are all settled in
  `@domorium/language-service` 2.1.0 and are consumed here as given.

## Capabilities

### New Capabilities

- `media-preview`: what the editor shows when the preview gesture is held over a
  position that refers to media — for a raster image, a non-raster file, a
  remote target, a missing file, and a link carrying a rectangle — together with
  the setting that governs the gesture and the bound on the rendered box.

### Modified Capabilities

None as spec files. `Record preview` has no spec of its own yet — this is the
first change in the repository — so its default and its rest are described in
the `media-preview` spec beside the setting they sit next to, rather than in a
delta against a spec that does not exist.

## Impact

- **Code**: `src/editor/composition.ts` (a second hover extension beside
  `recordPreviewHover`, and the rest both now wait), `src/editor/service.ts`
  (resolving a `MediaReference` to a vault path, clamping a rectangle),
  `src/GedcomView.ts` (rendering the popover), `src/settingsData.ts` and
  `src/settingDefinitions.ts` (the settings and their defaults), `styles.css`
  (the popover, the crop container, the bound on the box, the dressed span).
- **Reaching outside #85**: the `Record preview` default changes with it. Two
  previews on one gesture with two different triggers would be the more
  confusing answer, and the rest applies to both.
- **Dependencies**: none new. `@domorium/language-service` and
  `@domorium/codemirror` were raised to 2.1.0 in the commit preceding this
  change; `getMediaAt` is the reason.
- **Upstream**: nothing. `lavich/domorium#189` is closed and released; this
  change is the consumer it was cut for.
- **Obsidian API**: `Vault.getResourcePath`, `Vault.getAbstractFileByPath` and
  `HoverPopover`, all already used here.
- **Docs**: README gains a line for the setting; the promise about network
  requests is reinforced rather than changed.
- **Tests**: Vitest beside the subjects for path resolution and clamping,
  Playwright in `tests/` for the popover — the harness has no vault, so the
  browser specs cover the gesture and the rendered box against a stub resolver.
