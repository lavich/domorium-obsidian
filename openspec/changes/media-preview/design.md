## Context

See proposal.md — Why. What shapes the approach is what the 2.1.0 packages do
and do not hand over.

`@domorium/language-service` 2.1.0 answers the parsing:

```ts
getMediaAt(position: Position): MediaReference | null
interface MediaReference extends DocumentLink { // range, targetText, kind
  mediaKind: "image" | "audio" | "video" | "document" | "unknown"
  title?: string
  crop?: MediaCrop  // { top, left, height, width }
}
```

`@domorium/codemirror` 2.1.0 does **not**. It carries `recordPreviewHover` for
records and nothing for media, and `EditorLanguageService` — the wrapper this
repository holds — exposes `getReferences`, `getDocumentHighlights`,
`getDocumentLinks` and `prepareRename`, but not `getMediaAt`. It does expose
`readonly service: GedcomLanguageService`, and `update(doc)` returns that same
service, so the query is reachable without an upstream change:

```ts
options.language.update(view.state.doc).getMediaAt(offsetToPosition(doc, offset))
```

`offsetToPosition` and `positionToOffset` are exported from
`@domorium/codemirror`; `HOVER_TIME_MS` is too.

What already exists here: `resolveVaultRelativePath` and `routeDocumentLink` in
`src/editor/service.ts`, the `PreviewGesture` abstraction in
`src/editor/previewGesture.ts`, `HoverPopover` and the `showPreview`/`hidePreview`
callbacks threaded through `createGedcomComposition`, and
`vault.getResourcePath(file)`, which returns an `app://` URL an `<img>` takes
without anything being read into memory.

Two constraints bind the shape. Node built-ins are unavailable under `src/`, so
nothing measures or decodes an image file — the browser does. And the Playwright
harness mounts `createGedcomComposition` with no Obsidian and no vault, so
anything the browser specs must reach has to be injectable.

## Goals / Non-Goals

**Goals:**

- One place that turns a `MediaReference` into what the popover should draw, as
  a pure function, unit-testable without a DOM or a vault.
- The `.ged` editor and the harness share that path, so the browser specs
  exercise the real rendering against a stub resolver.
- Media preview never fires two popovers with the record preview it overlaps.

**Non-Goals:**

- Adding `getMediaAt` to `EditorLanguageService`, or a `mediaPreviewHover` to
  `@domorium/codemirror`. Both would be welcome upstream; neither blocks this,
  and proposing them belongs in `lavich/domorium`.
- Reusing `recordPreviewHover` for media by widening it. It answers with a
  `RecordPreview` — offsets into the document — which is the wrong answer type.

## Decisions

### The media hover is a host extension, not an upstream one

A `mediaPreviewHover` in `src/editor/mediaPreviewHover.ts`, modelled on
`recordPreviewHover`'s options shape (`language`, `trigger`, `delay`, `show`,
`hide`) so the two read alike in `composition.ts`. It resolves the position
under the pointer through `language.update(state.doc).getMediaAt(...)` and calls
`show` with the `MediaReference` and the mouse event.

_Alternative — wait for upstream to ship the extension._ It would be a second
release round for something the host can write in a file, and the host still has
to draw the popover, resolve the vault path and clamp the rectangle. Rejected;
if the extension proves worth sharing across the VS Code and JetBrains hosts, it
can move upstream later without changing this repository's behavior.

### The popover is drawn here, not delegated to Page preview

Obsidian has an idiomatic path for this that we do not take, and the reason
should be on the record.

`Workspace.registerHoverLinkSource(id, { display, defaultMod })` enrols a view
with the core **Page preview** plugin; firing
`workspace.trigger("hover-link", { event, source, hoverParent, targetEl,
linktext, sourcePath })` then makes Obsidian draw its own popover for the
target. It renders vault images, so the plain `FILE` case would come for free,
it composes with
[Hover Editor](https://github.com/nothingislost/obsidian-hover-editor) — which
otherwise replaces the popover through unexposed API and warns it may break —
and `defaultMod` puts the modifier question in the Page preview settings the
reader already knows.

It cannot do the rest. `CROP` is the interesting half of this change and Page
preview knows nothing of rectangles; it cannot say "remote, and this plugin does
not fetch it"; and it cannot say "the vault does not hold this file" — a link to
nothing simply previews nothing. Delegating the plain case and drawing the rest
ourselves would put two different-looking popovers on one gesture, which is
worse than one consistent popover.

So `HoverPopover` it is, as `GedcomView` already does for record previews. If
Page preview ever learns rectangles, this decision is worth revisiting.

_Note for the setting below_: `defaultMod` is precedent that the modifier is a
per-source reader choice rather than a plugin constant, which is what the new
setting encodes.

### Media wins where it overlaps the record preview

`1 OBJE @O1@` is an XREF pointer, so `recordPreviewHover` already fires there and
shows the `OBJE` record's text. With this change the same position also answers
`getMediaAt`. Two popovers on one gesture is not a behavior worth having, and the
picture is what the reader wanted.

The composition arbitrates: it wraps the `show` it hands `recordPreviewHover`
and, before passing a record preview on to the host, asks `getMediaAt` at the
preview's pointer — if it answers, the record preview is declined and the media
hover draws instead. No upstream filter is needed.

It asks one more thing first: whether the media gesture opens on *this* event.
Standing aside for a preview that is never coming is how `1 OBJE @O1@` became a
position that showed nothing at all — media preview off, or asking for a
modifier the pointer is not holding, and both previews declined. The rule is
that the picture outranks the record where the picture will actually appear,
which is a different sentence from the one the code first said.

Implementation moved this from `GedcomView.showPreview`, where this document
first put it, into `createGedcomComposition`. Same observable behaviour, but the
browser harness mounts the composition and so inherits the rule rather than
restating it — which is what "one place" was supposed to mean.

_Alternative — one popover carrying both the image and the record text._ It
answers a question nobody asked and doubles the size of the thing hanging under
the pointer. Rejected.

_Alternative — order the extensions so one shadows the other._ CodeMirror gives
no ordering guarantee that holds across both a `mousemove` plugin and a delayed
one. Rejected as fragile.

### Deciding what to draw is a pure function

`mediaPreviewContent(reference, resolve)` in `src/editor/media.ts` returns a
discriminated union — the whole thing the popover needs, with no DOM in it:

```ts
type MediaPreviewContent =
  | { kind: "image"; url: string; title?: string; crop?: MediaCrop }
  | { kind: "file"; mediaKind: MediaKind; name: string; title?: string }
  | { kind: "remote"; url: string; title?: string }
  | { kind: "missing"; target: string }
```

`resolve` is `(vaultPath: string) => string | null` — the vault's
`getResourcePath` in the plugin, a stub in the harness. Ordering inside: an
`http` kind is `remote` before anything else is considered, because the promise
about network requests outranks the question of what the file is; then the path
is resolved (`missing` when it does not resolve or the vault does not hold it);
then `mediaKind` splits `image` from `file`.

This puts every branch of the spec under Vitest with no DOM and no Obsidian, and
leaves `GedcomView` with a `switch` that only builds elements.

_Alternative — decide inside the renderer._ Every branch would then need a
browser spec and a vault. Rejected.

### The rectangle is clamped against the loaded image, behind a staleness guard

The crop is a container with `overflow: hidden` holding an offset `<img>`, as
the issue describes — no canvas, no decoding. The image's natural size is not
known until it loads, and reading it is the one thing that needs the `load`
event:

- The container is sized to the rectangle and the image, behind it, moved so
  the rectangle's corner meets the container's.
- On `load`, `naturalWidth`/`naturalHeight` are compared with the rectangle. A
  rectangle reaching past an edge has its container shrunk to the overlap; a
  rectangle with no overlap drops the offset and shows the whole image.
- Both are then subject to the bound below, so the popover never jumps larger
  after the image arrives.

Clamping arithmetic — rectangle plus natural size to a drawn rectangle — is a
second pure function in `src/editor/media.ts`, unit-tested with numbers.

**The container must not size the image.** The move is a `transform` and the
container is not a flex container, both for the same reason: a flex line
stretches its item to the line's height, and an item with a negative cross
margin is stretched by that much again. The image then renders at a size the
rectangle was never measured against, and the offset lands somewhere else
entirely — every cropped preview showing the wrong part of the picture, while
every assertion about the container's size still passes. Found in review, and
the reason a spec now samples the pixels on screen rather than the geometry
around them.

**A rectangle larger than the bound is scaled, not cut.** `cropScale(crop,
bounds)` is the third pure function: the tighter of the two ratios, never above
1, and the container's size and the image's transform take it together. Cutting
the rectangle down to the bound would answer the reference with a corner of what
it asked for — for a face out of a large scan, with somebody else's shoulder.

**`load` outlives the popover.** It fires whenever the browser finishes, which
may be after the reader moved to another media position or closed the preview
entirely — and then the clamp would resize a container belonging to a different
picture, or one already detached. Every handler that runs after the popover is
built therefore checks it is still the current one before touching the DOM: the
show path captures the popover it created, and the handler returns early unless
that is still `this.mediaPreview`. This is the `isCurrent()` guard
[Reference Linker](https://github.com/max-fluff/obsidian-reference-linker) puts
around every awaited render in `src/hover.js`, for the same reason.

_Alternative — clamp before showing, by loading the image to read its size._
That is a decode the reader waits on, for a case that is rare, and it does not
remove the need for the guard — the decode itself can outlive the gesture.
Rejected.

### The bound is the editor pane, not the window

`vh`/`vw` measure the whole window, and the editor is not the whole window: with
both sidebars open, `60vw` is wider than the pane the popover hangs in.
[obsidian-hover-preview](https://github.com/Shin2W/obsidian-hover-preview) hit
this and resolved it by measuring `.workspace-split.mod-root .workspace-leaf
.mod-active .view-content` and bounding against that rectangle.

Measuring a selector chain is a reach into markup Obsidian does not promise, so
this takes the same measurement from a handle it already holds: the view's own
`contentEl`. On show, its `clientWidth`/`clientHeight` set two custom
properties on the popover element, and `styles.css` uses them with the window as
a fallback:

```css
.gedcom-media-preview {
  max-width:  var(--gedcom-media-max-w, 60vw);
  max-height: var(--gedcom-media-max-h, 40vh);
  object-fit: contain;
}
```

**The popover has a width of its own.** `.popover.hover-popover` is a fixed
`--popover-width` with its overflow hidden, and that width is narrower than the
bound on any ordinary pane — 400px against 540. A picture scaled correctly to
the bound was therefore cut off at the popover's right edge, and every
measurement of the picture still agreed with the bound, which is why nothing
caught it. The popover the media preview opens carries a class that lets it take
the size of its content; the bound is what limits that content, so the popover
needs no width of its own. The frame's clipping now belongs to the rectangle
alone — an image shown whole is scaled to fit, never trimmed — and the harness
grew Obsidian's popover box, without which a popover there shrink-wraps its
content and the whole class of bug is invisible.

The px ceilings stay, but only in `media.ts`: `previewBounds` already caps what
it measures, so repeating the numbers in a `min()` here would be one more place
for them to disagree. The `vw`/`vh` is the fallback for anything that mounts the
popover without measuring a pane. The fractions
of the pane (60% and 40%) keep the phone case working, where the pane _is_ the
window. The rule stays in CSS, so the browser does the scaling and the file's
own pixel count never matters.

_Alternative — pure `vh`/`vw`._ Simpler, and wrong on any desktop with a sidebar
open. _Alternative — a fixed px box_, as Reference Linker's `PREVIEW_WIDTH = 420`
does. Predictable, but it cannot know a phone from a monitor. _Alternative — a
size setting._ A third setting for a question we have no phone data on (#78
stands); the bound can be revisited when there is. All rejected.

### Media preview gets its own setting

`mediaPreview: RecordPreviewTrigger` in `GedcomSettings`, taking its default
from `recordPreview` — `"modifier"` at first, `"hover"` by the time both moved
together below — and reusing `RECORD_PREVIEW_TRIGGERS`,
`RECORD_PREVIEW_OPTIONS` and the existing dropdown definition shape.
`parseSettings` gains one branch, `changedSetting` needs none — it reads
`DEFAULT_SETTINGS` generically.

Reusing the trigger type rather than inventing a second one keeps
`previewGesture(trigger, modifierHeld)` unchanged; the composition builds two
gestures from two settings.

_Alternative — one setting for both._ A reader in a vault of 12-megapixel scans
could not keep record previews and turn photographs off, which is the case the
setting exists for. Rejected.

_Alternative — no setting, taking the reader's Page preview choice via
`defaultMod`._ Only available to a plugin that delegates to Page preview, which
the decision above declines. The precedent stands, though: the modifier is the
reader's to choose per source, which is what this setting gives them.

### Media that cannot be drawn is still announced

Prior art goes the other way. Reference Linker gates on
`previewable(entry)` — a type no handler can draw never even schedules a
popover — and that is reasonable where almost every type has a handler, so the
silent case is vanishingly rare.

Here it would not be rare: `MEDI` and `FORM` allow audio, video and PDF
throughout ordinary genealogy files, and this change deliberately does not play
or render any of them. Gating would leave the gesture silent over a large share
of real `FILE` lines, which reads as the feature being broken rather than as the
file being unshowable. The issue says as much, so the row wins.

The cost is a branch and a small visual vocabulary — an icon per kind — which
the `MediaPreviewContent` union already isolates.

### The line under the pointer answers, and the highlight style dresses it

The gesture answering the whole line and the line looking like it would answer
are the same question asked twice — which lines name media, and over what
extent — and the spec requires the two not disagree.

They agree by being answered in different places, not by sharing a list. The
dressing comes from the highlight style, which already calls a `FILE` payload a
link and an `OBJE` pointer a reference to a record; nothing media-specific has
to be drawn for a media line to look live. So the hover asks about one line:
`mediaLineAt(state, language, offset)` in `src/editor/mediaLine.ts` takes the
line under the pointer, skips it on a cheap match unless its tag is `FILE` or
`OBJE`, refuses the level number that opens it, and otherwise asks `getMediaAt`
at the payload. The whole line from the tag onward answers — a reader aiming
near the thing should hit it.

The prefilter matters either way: without it this is a `getMediaAt` per movement
of the pointer, and resolving a pointer walks to its record.

_Written first as a pass over every visible line_, `mediaSpans(state, language,
ranges)`, so a `ViewPlugin` could turn the same list into mark decorations and
the hover could look the pointer up in it. Once the dressing came from the
highlight style, the decorations went — and with them the only reason to walk
the viewport. What was left computed every visible span on every pointer
movement in order to use one of them. Found in review; the walk is gone and the
lookup is by line.

_Alternative — dress the payload only._ It is what a `FILE` payload already gets
for free, being a document link, and it leaves the `OBJE` pointer — where `CROP`
lives — with no affordance at all. Rejected.

### Both previews default to hover, and both wait

The modifier was inherited: `recordPreview` has defaulted to `"modifier"` since
1.6.0, and `mediaPreview` copied it. Obsidian's own Page preview asks for the
modifier in the editor too, and `HoverLinkSource.defaultMod` says the question
is a per-source choice.

For records the modifier earns its place by density — `@F1@` pointers are
everywhere in a file, and a popover on every pass of the pointer would fight the
typing. Media lines are a handful per file. But the deciding argument is that a
rest interval solves the same problem with none of the cost: `HOVER_TIME_MS` is
what the tag tooltip already waits, and a pointer travelling across a line never
stops long enough to trigger anything.

So both settings default to `"hover"`, and `hoverDelay(trigger)` supplies
`HOVER_TIME_MS` for hover and `0` for the modifier — to `recordPreviewHover` as
well, which until now was passed no `delay` at all and would have fired on the
first movement.

Stored settings win over defaults, as `parseSettings` already arranges, so a
reader who chose the modifier keeps it.

_Alternative — change only the media default._ Two previews on one gesture with
two different triggers, which is worse than either default. Rejected.

### The modifier does not wait

The modifier is already the reader's declaration of intent, so waiting after it
would only feel slow. `hoverDelay` returns `0` for it and `HOVER_TIME_MS` for
bare hover, and both hovers take their delay from that one function.

## Risks / Trade-offs

- **Two hover plugins on the same `mousemove`.** → Both do a cheap offset lookup
  before asking the service, and `EditorLanguageService.update` compares `Text`
  identity, so an unchanged document costs no reparse. The arbitration in
  `showPreview` adds one `getMediaAt` per record preview, on a gesture that
  already opens a popover.
- **`getResourcePath` on a large file.** → It returns a URL and reads nothing;
  the cost is the browser's decode, bounded by the CSS box. Nothing is held.
- **The clamp reflows the popover after `load`.** → Only when the rectangle
  exceeds the image, and only smaller. The bound is applied first so it never
  grows.
- **A `load` arriving after the gesture moved on.** → The staleness guard above.
  Without it the clamp resizes the wrong popover or a detached one; this is the
  failure the prior art guards, so it is treated as expected rather than
  unlikely, and the browser spec covers it by moving the pointer to a second
  media position while the first image is still loading.
- **`contentEl` measured at the wrong moment.** → It is read on show, when the
  view is laid out; a pane resized while the popover is open leaves a stale
  bound until the next hover. The px ceiling means the error can only be a
  popover narrower than it might have been, never one overflowing the pane.
- **Not composing with Hover Editor.** → Accepted, and named in the decision
  above. Drawing our own popover means a reader who uses Hover Editor gets the
  plugin's popover for media, as they already do for record previews. Nothing
  regresses; the opportunity is declined.
- **A vault path that escapes the vault.** → `resolveVaultRelativePath` already
  returns `null` there, and that lands in `missing`. No file outside the vault is
  reached, which is the same rule `routeDocumentLink` follows for clicks.
- **The harness has no vault, so the browser specs prove the rendering, not the
  resolution.** → The split is deliberate: resolution and clamping are pure and
  covered by Vitest; the popover, the gesture and the box are covered by
  Playwright against a stub resolver. Nothing is covered only by hand.
- **A `getMediaAt` per visible media line on every viewport change.** → The tag
  prefilter keeps ordinary lines to a regex. A file that is mostly `OBJE` links
  is the worst case; if it shows, the spans can be cached against the document
  version, since `EditorLanguageService` already tracks one.
- **Dressing a line as a link where clicking it does nothing.** → A `FILE`
  payload is a document link and does open; an `OBJE` pointer already navigates
  to its record on the same gesture. Neither is dressed as a promise the editor
  does not keep.
- **`getMediaAt` reached through `language.service` rather than a wrapper
  method.** → It is a documented public member of `EditorLanguageService`, not a
  private reach. If a wrapper method lands upstream later, one call site changes.

## Migration Plan

None. Additive: a new setting defaults to the current record-preview default, no
persisted data changes shape, and `parseSettings` supplies the default for
settings files written before this change. Rollback is reverting the commit.

## Open Questions

- Whether the same preview should work in `src/notes/` — GEDCOM inside Markdown
  notes has its own preview path. Deliberately out of scope here; answering it
  does not change these specs, this approach, or these tasks.
- Whether `mediaPreviewHover` is worth contributing to `@domorium/codemirror` so
  the VS Code and JetBrains hosts get it too. Answerable after this ships.
