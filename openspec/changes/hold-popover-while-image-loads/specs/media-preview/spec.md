## MODIFIED Requirements

### Requirement: A remote image is drawn only after the reader asks

The plugin SHALL make no network request for a media position until the reader
has asked for one. A fetch tells a host that some vault holds a line naming that
file, when it was read and from where; for a genealogy vault that is a statement
about a family, and it is the reader's to make.

Until it is asked for, the preview SHALL show a row stating that the file is
remote and is not loaded, together with the URL as the document wrote it. That
row SHALL carry the two answers beside it rather than send the reader to the
settings tab: one that draws this image alone and leaves the setting as it was,
and one that turns the setting on so that the question is not asked again.

An answer that draws this image alone SHALL hold until the plugin is unloaded,
and SHALL NOT be written to disk. A reader who says yes to one face in a group
photograph has answered for the other four.

Once the reader has asked, by either answer, a remote image SHALL be shown the
way a vault image is shown: cropped to the rectangle the reference names,
bounded by the same rule, captioned by the same title, and no more able to alter
a popover the gesture has moved on from.

An answer SHALL NOT close the popover it was given in. The image is drawn in
place of the row, and it has no size until it arrives; in the meantime, and
after, the popover SHALL be no smaller than it was when the question was asked,
so that the pointer that pressed the answer is still inside it. The picture
grows the popover where it is larger; nothing the answer draws — the picture,
the row that says it did not arrive, or the frame between the two — shrinks it
under the pointer. A popover that has never asked a question is sized to what it
holds, as before.

A remote target that is not an image SHALL be named and not fetched, whatever
the setting says, as it is today.

#### Scenario: An http FILE payload with nothing asked for

- **WHEN** the gesture is held over `1 FILE https://example.org/marie.jpg`, and neither answer has been given
- **THEN** a popover appears saying the file is remote and not loaded, showing the URL
- **AND** no network request is made

#### Scenario: The reader asks for this image

- **WHEN** the reader takes the offer to show this image
- **THEN** the popover draws it in place of the row

#### Scenario: The popover between the answer and the image

- **WHEN** the reader takes the offer and the image has not yet arrived
- **THEN** the popover is still open and no smaller than it was with the offer in it, and the pointer that pressed the answer is still inside it

#### Scenario: A picture smaller than the question

- **WHEN** the image the reader asked for arrives and is smaller than the row and its offer were
- **THEN** the popover stays the size it was, with the picture in it, rather than shrinking around the picture

#### Scenario: A picture larger than the question

- **WHEN** the image the reader asked for arrives and is larger than the row and its offer were
- **THEN** the popover grows to the picture, bounded as any picture is

#### Scenario: The next remote image in the same session

- **WHEN** the gesture is then held over another remote `FILE` in that file or another one
- **THEN** it is drawn, and the row is not shown again

#### Scenario: The answer does not outlive the session

- **WHEN** the plugin is reloaded after the reader took that offer, and the gesture is held over a remote `FILE`
- **THEN** the row is shown again, the setting never having been written

#### Scenario: A remote image a link crops

- **WHEN** a remote image is drawn for a link whose `CROP` names a rectangle
- **THEN** the popover shows that rectangle, bounded and captioned as a vault image would be

#### Scenario: Remote media that is not an image

- **WHEN** the gesture is held over a `FILE` naming a remote audio or video file, and the setting is on
- **THEN** the popover names it as it does today, and nothing is fetched
