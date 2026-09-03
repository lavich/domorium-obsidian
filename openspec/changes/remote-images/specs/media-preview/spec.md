## MODIFIED Requirements

### Requirement: A media position answers the preview gesture

The editor SHALL show a media preview when the configured preview gesture is
held over a position the language service reports media for, and SHALL show
nothing when it reports none.

The two positions the format distinguishes SHALL be distinguished here: a `FILE`
payload refers to the whole file, and the pointer payload of a multimedia link
refers to what that link asks for.

The gesture SHALL be answered anywhere from the tag of such a line through the
end of its payload, not on the payload alone. A reader should not have to aim at
one token to find out a picture is there.

Media preview SHALL NOT change whether a media position can be opened by click,
only where the opened file appears — see below.

An open popover SHALL survive the pointer entering it. The preview closes when
the pointer is in neither the media position nor the popover, and a popover the
pointer is inside SHALL stay open however long it stays there. What the popover
offers can then be reached; a popover dismissed by the movement toward it offers
nothing.

#### Scenario: A FILE payload under the gesture

- **WHEN** the preview gesture is held over the payload of `1 FILE media/marie.jpg` in a multimedia record, and the vault holds that file
- **THEN** a popover appears showing the whole image

#### Scenario: The tag of the same line

- **WHEN** the gesture is held over the `FILE` tag of that line rather than its payload
- **THEN** the same popover appears

#### Scenario: The level number of the same line

- **WHEN** the gesture is held over the level number that opens the line
- **THEN** no preview appears

#### Scenario: A multimedia link under the gesture

- **WHEN** the preview gesture is held over the pointer payload of `1 OBJE @O1@`, and the record it names carries a `FILE` the vault holds
- **THEN** a popover appears showing that record's image

#### Scenario: A line that names no media

- **WHEN** the preview gesture is held over a payload the language service reports no media for — a `HEAD.FILE`, a date, a name
- **THEN** no media preview appears

#### Scenario: The gesture ends

- **WHEN** the pointer leaves the media position for neither the popover nor another media position, or the gesture's modifier is released while the popover is open
- **THEN** the popover closes

#### Scenario: The pointer moves into the popover

- **WHEN** the pointer leaves the media position by moving into the popover it opened
- **THEN** the popover stays open, and stays open while the pointer rests inside it

#### Scenario: The pointer leaves the popover

- **WHEN** the pointer leaves the popover for neither the media position it belongs to nor the popover itself
- **THEN** the popover closes

## ADDED Requirements

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

A remote target that is not an image SHALL be named and not fetched, whatever
the setting says, as it is today.

#### Scenario: An http FILE payload with nothing asked for

- **WHEN** the gesture is held over `1 FILE https://example.org/marie.jpg`, and neither answer has been given
- **THEN** a popover appears saying the file is remote and not loaded, showing the URL
- **AND** no network request is made

#### Scenario: The reader asks for this image

- **WHEN** the reader takes the offer to show this image
- **THEN** the popover draws it in place of the row

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

### Requirement: A URL the plugin will not fetch is refused with its reason

A plain `http` URL SHALL be refused whatever the reader has answered, and the
popover SHALL say that it is refused for being unencrypted rather than say
nothing or fail silently. Drawing it would make a mixed-content request from the
renderer, and the promise the address implies is weaker than the one the plugin
can keep on the reader's behalf.

Where a request the reader asked for does not produce an image — no network, a
target that is gone, a host answering something that is not a picture — the
popover SHALL say the image could not be loaded, naming the URL. A reader who
has just answered a question SHALL NOT be left wondering whether the answer took
effect.

#### Scenario: A plain http payload

- **WHEN** the gesture is held over `1 FILE http://example.org/marie.jpg`, with the setting on
- **THEN** the popover says the address is not encrypted and the file is not loaded, showing the URL
- **AND** no network request is made

#### Scenario: A request that brings back no image

- **WHEN** the reader has asked for remote images and the gesture opens a preview of a URL that does not answer with one
- **THEN** the popover says the image could not be loaded, naming the URL

### Requirement: Loading images from the web is governed by its own setting

The plugin SHALL offer a setting that decides whether remote images are drawn.
It SHALL take two values, not the three the preview settings take: the question
is whether the plugin may reach the network at all, and a gesture is not an
answer to it.

The setting SHALL default to off. It SHALL be worded as what it does rather than
as a key the reader has to guess the meaning of, and it SHALL be reachable both
from the settings tab and from the offer in the popover.

Changing it SHALL take effect without reopening the file, and SHALL NOT change
either preview setting. Turning it off again SHALL restore the row, including
for a reader who had taken the offer to show one image: the setting is the
stronger answer.

#### Scenario: The setting off, which is where it starts

- **WHEN** a vault has never touched the setting and the gesture is held over a remote `FILE`
- **THEN** the row is shown and nothing is fetched

#### Scenario: The offer writes the setting

- **WHEN** the reader takes the offer to always show images from the web
- **THEN** the image is drawn, and the settings tab shows the setting on

#### Scenario: The setting changed with a file open

- **WHEN** the setting is turned on in the settings tab while a GEDCOM file is open
- **THEN** the next gesture over a remote `FILE` draws the image, without the file being reopened

#### Scenario: The setting turned off again

- **WHEN** the reader turns the setting off after remote images have been drawn
- **THEN** the next gesture over a remote `FILE` shows the row again

## REMOVED Requirements

### Requirement: A remote target is never fetched, and says so

**Reason**: The refusal is now the default rather than the whole behaviour. What
the requirement demanded of an unanswered remote target — no request, a row
naming it as remote and not loaded, the URL as the document wrote it — is kept
word for word by "A remote image is drawn only after the reader asks", which
adds what happens when the reader answers.

**Migration**: None for a reader: the setting it introduces is off, so a vault
that never touches it behaves as before, and the flat promise it replaces was
never anything a vault could depend on beyond that.
