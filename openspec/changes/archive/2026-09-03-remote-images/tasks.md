## 1. Prove the popover can be reached

- [x] 1.1 In `demo-vault`, open a `.ged` with a media line, hold the preview gesture, and move the pointer into the popover; record whether Obsidian's `HoverPopover` keeps itself open once the plugin stops closing it. Verified by the observation itself — if it closes on its own, stop here and say so rather than building the offer on top
- [x] 1.2 Give `mediaPreviewHover` a `holds?: (node: Node | null) => boolean` option and consult it with `event.relatedTarget` on `mouseleave`, so a pointer leaving the editor for the preview does not clear the session. Verify with cases in `src/editor/mediaPreviewHover.test.ts`: held node keeps, unheld node clears, `null` clears
- [x] 1.3 In `GedcomView`, supply that predicate from the open popover's `hoverEl` and register a `mouseleave` on the popover that clears the preview unless the pointer went back into the editor. Verify in `tests/mediaPreview.spec.ts`: the popover survives the pointer entering it and closes when it leaves for elsewhere

## 2. Decide the three answers in the pure function

- [x] 2.1 Add the reader's answer as an input to `mediaPreviewContent` and turn the `remote` content into `{ kind: "remote"; url; title?; state }` carrying why it is not drawn — unanswered, unencrypted, or not an image. Verify in `src/editor/media.test.ts`, one case per state
- [x] 2.2 Return `kind: "image"` for an allowed `https` image, carrying the URL, the crop and the title, so the existing image path draws it. Verify in `src/editor/media.test.ts` that a cropped remote link returns the same shape a cropped vault link returns
- [x] 2.3 Keep `http` refused with the answer given, and keep remote audio, video and documents named rather than fetched. Verify in `src/editor/media.test.ts`

## 3. Draw the offer

- [x] 3.1 Draw the note for each `remote` state in `renderMediaPreview`, and draw the two buttons only for the state that asks and only where the host supplied the callbacks. Verify in `src/editor/mediaPreviewView.test.ts` (new file, the renderer having no unit test today): buttons for the unanswered state, none for the other two
- [x] 3.2 Say "could not be loaded" and name the URL when an allowed remote image does not draw, rather than the vault image's "could not be drawn". Verify in `src/editor/mediaPreviewView.test.ts` by firing the `img` error event
- [x] 3.3 Style the row's buttons in `styles.css` from Obsidian's own variables, and check them in both themes in `tests/mediaPreview.spec.ts`

## 4. Hold the answer

- [x] 4.1 Add `remoteImages: boolean`, default `false`, to `GedcomSettings`, `DEFAULT_SETTINGS` and `parseSettings`, and verify in `src/settings.test.ts` that a settings file written without it loads with it off
- [x] 4.2 Add the setting to `SETTING_DEFINITIONS` as a toggle, and correct the media preview setting's description, which says a remote file is never fetched. Verify in `src/settings.test.ts`, which already asserts the whole list
- [x] 4.3 Hold the session's "yes, once" on the plugin, hand it to the views, and resolve it with the setting into the one answer the content function takes. Verify in `tests/mediaPreview.spec.ts` that a second remote line in the same session draws without asking again
- [x] 4.4 Wire the second button to write the setting and the first to set the session's answer, re-rendering the open popover in place. Verify in `tests/mediaPreview.spec.ts` that the image replaces the row, and that turning the setting off restores it

## 5. Prove the request

- [x] 5.1 Serve the remote image in the harness through `page.route()` in `tests/mediaPreview.spec.ts`, counting the times it is asked. Verify the count is zero while the row is showing and one after the reader says yes
- [x] 5.2 Add the plain `http` and the failed-load cases to `tests/mediaPreview.spec.ts`, the second by routing the request to a response that is not an image

## 6. Say what the plugin does

- [x] 6.1 Rewrite the privacy paragraph in `README.md`: the plugin makes no network request until the setting is turned on, the setting is off until asked, and it permits drawing an image a media position names and nothing else. Verified by reading it beside the setting's own wording
- [x] 6.2 Point `demo-vault/curie.ged` at a photograph that exists, the caption on `@O6@` having promised the plugin would never fetch it, and give someone a pointer at that record. Verify the tree still reports no problems
- [x] 6.3 Run `npm run check` and `npm run test:browser`
