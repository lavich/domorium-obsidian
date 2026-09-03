## Purpose

Lets a reader see the photograph a GEDCOM line names without leaving the line:
holding the preview gesture over a media position shows the file it refers to,
cropped to the rectangle that reference asks for, and says plainly why it shows
no picture when it cannot.

## ADDED Requirements

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

- **WHEN** the pointer leaves the media position, or the gesture's modifier is released while the popover is open
- **THEN** the popover closes

### Requirement: What a reader can go to is dressed as a link

A reader cannot hover what they cannot see. A payload that leads somewhere —
a reference to a record, a vault-relative file, a web address — SHALL wear the
colour a link wears, before any gesture is made.

A cursor SHALL promise only what a click delivers. Following such a payload
takes the platform modifier, because a plain click in an editor has to place the
caret, so the pointer cursor and the underline a link takes under the pointer
SHALL appear only while that modifier is down, and SHALL go when it is released.
The colour stays either way: it says where the payload leads, not that a click
would go there now.

A media position is covered by that rule rather than by one of its own: a `FILE`
payload is a file link and an `OBJE` pointer is a reference, and both lead
somewhere whether or not a picture is behind them.

What is dressed SHALL be the payload alone. A tag keeps the colour its own kind
gives it, and a declaration — where a reference goes, rather than a way of going
anywhere — keeps the colour and weight that tell it apart from a reference to
it.

The extent a preview gesture answers SHALL cover the dressed payload and MAY
exceed it, reaching back to the tag, so that aiming near the mark is enough. It
SHALL NOT fall short of the mark.

#### Scenario: A reference to a record

- **WHEN** a document holds `1 FAMC @F3@`
- **THEN** `@F3@` wears the link colour

#### Scenario: The pointer over a reference, with no modifier

- **WHEN** the pointer rests on `@F3@` and no modifier is down
- **THEN** the cursor is the editor's own and no underline appears, because a click there would place the caret
- **AND** a preview still opens, the gesture for it asking no modifier

#### Scenario: The modifier goes down and comes up

- **WHEN** the modifier is pressed while the pointer is on `@F3@`
- **THEN** the cursor becomes the link cursor and the underline appears, and both go when the modifier is released

#### Scenario: A declaration of the record it names

- **WHEN** the same document declares `0 @F3@ FAM`
- **THEN** that `@F3@` is not dressed as a link, and stays apart from the reference by colour and weight

#### Scenario: The tag keeps its own colour

- **WHEN** a line reads `1 OBJE @O1@`
- **THEN** `@O1@` is dressed as a link and `OBJE` is not

#### Scenario: The target is at least the mark

- **WHEN** a line names media
- **THEN** the gesture answers everywhere the payload is dressed, and on the tag beside it

### Requirement: A followed link does not take the reader's place

A file link followed from the editor SHALL leave the GEDCOM file where it was.
The file being read is the reason the link was followed, and losing it is a
worse outcome than an extra tab.

Where the target is already open, the editor SHALL bring that tab forward rather
than open the file again — including where the tab is in the background and its
view has not been loaded. Where it is open nowhere, the editor SHALL open it in
a tab of its own.

This SHALL hold for every vault file the editor can follow, not for media alone,
and SHALL work on mobile as it does on the desktop.

#### Scenario: Following a photograph

- **WHEN** the reader follows `1 FILE media/marie.jpg` from an open GEDCOM file
- **THEN** the photograph opens in another tab and the GEDCOM file stays open

#### Scenario: Returning to the file

- **WHEN** the reader closes or leaves that tab
- **THEN** the GEDCOM file is as it was, at the line the link was on

#### Scenario: Following the same photograph twice

- **WHEN** the reader follows a link to a file that is already open in another tab
- **THEN** that tab comes forward, and no second tab of the same file is made

#### Scenario: The tab is in the background

- **WHEN** the tab holding the target has not been looked at since the window opened, so its view is not loaded
- **THEN** it is still found and brought forward

#### Scenario: A file the vault does not hold

- **WHEN** the followed target names no file in the vault
- **THEN** nothing is opened and the reader is told, as before

### Requirement: A link's rectangle is what that link shows

Where the language service reports a rectangle for the position, the preview
SHALL show only that rectangle of the image. Where it reports none, the preview
SHALL show the whole image.

Because the rectangle belongs to the reference and not to the file, two links to
one photograph SHALL show two different pictures, and a `FILE` payload inside
the record SHALL show the whole photograph regardless of any link's rectangle.

The extent of an image is not knowable from the document, so the rectangle
SHALL be clamped against the image once it is loaded: a rectangle reaching past
an edge shows the part that exists, and one leaving no visible area SHALL fall
back to the whole image rather than an empty box.

What is on screen SHALL be the named rectangle of the image and nothing else:
the region shown, measured in the image's own pixels, is the rectangle the
reference asked for. A box of the rectangle's size showing some other part of
the image does not satisfy this.

#### Scenario: A link naming a rectangle

- **WHEN** the gesture is held over the pointer of a link whose `CROP` names `TOP 100`, `LEFT 250`, `HEIGHT 400`, `WIDTH 300`
- **THEN** the popover shows that 300×400 region of the image, and not the rest of it

#### Scenario: Two links, one photograph

- **WHEN** two multimedia links in the document point at one record and carry different rectangles, and the gesture is held over each in turn
- **THEN** each popover shows its own rectangle

#### Scenario: The record's own FILE beside a cropped link

- **WHEN** the gesture is held over the `FILE` payload of a record that some link crops
- **THEN** the popover shows the whole image, uncropped

#### Scenario: The picture inside the rectangle

- **WHEN** the gesture opens a preview of a link whose rectangle names a region of the image distinguishable from the rest of it
- **THEN** every part of the popover's picture comes from inside that region

#### Scenario: A rectangle past the edge of the image

- **WHEN** the rectangle names an area extending beyond the loaded image
- **THEN** the popover shows the part of the rectangle the image covers

#### Scenario: A rectangle outside the image entirely

- **WHEN** the rectangle names an area the loaded image does not overlap at all
- **THEN** the popover shows the whole image

### Requirement: The caption the author wrote is shown

Where the language service reports a title for the position, the preview SHALL
show it with the media. Where it reports none, the preview SHALL show the media
without a caption, and SHALL NOT substitute the file name for it.

#### Scenario: A link with its own caption

- **WHEN** the gesture is held over a link carrying `TITL Marie, second from the left`
- **THEN** the popover shows the image and that text as its caption

#### Scenario: Media with no title

- **WHEN** the position reports no title
- **THEN** the popover shows the media alone, with no caption line

### Requirement: Media that is not a raster image is named, not hidden

Where the language service reports the media is not an image — audio, video, a
document, or a kind it cannot name — the preview SHALL show a row identifying
it: an indication of the kind, the title where there is one, and the file name.
It SHALL NOT show an empty popover, and it SHALL NOT suppress the popover
silently.

#### Scenario: An audio file

- **WHEN** the gesture is held over a `FILE` the service reports as audio
- **THEN** a popover appears naming it as audio, with its title and file name

#### Scenario: A kind the format does not settle

- **WHEN** the service reports the kind as unknown
- **THEN** a popover appears with the file name and any title, and does not claim a kind

### Requirement: A remote target is never fetched, and says so

The plugin makes no network requests. Where the language service reports the
target is a URL, the preview SHALL NOT request it, embed it, or otherwise cause
the application to load it. The preview SHALL instead show a row stating that
the file is remote and is not loaded, together with the URL as the document
wrote it.

#### Scenario: An http FILE payload

- **WHEN** the gesture is held over `1 FILE https://example.org/marie.jpg`
- **THEN** a popover appears saying the file is remote and not loaded, showing the URL
- **AND** no network request is made

### Requirement: A file the vault does not hold says so

Where the target names a vault file that does not exist, or names a path that
cannot be resolved inside the vault, the preview SHALL show a row saying the
file was not found, together with the target as the document wrote it.

#### Scenario: A missing file

- **WHEN** the gesture is held over a `FILE` payload naming a path the vault does not hold
- **THEN** a popover appears saying the file was not found, showing the target text

#### Scenario: A path escaping the vault

- **WHEN** the target resolves outside the vault
- **THEN** the popover reports it as not found, and no file outside the vault is read

#### Scenario: A file the vault holds and cannot draw

- **WHEN** the target names a vault file whose bytes the renderer cannot draw as an image
- **THEN** the popover says the image could not be drawn, naming the file, rather than showing an empty box

### Requirement: The rendered preview is bounded

The preview SHALL bound the rendered box before the media is shown, in both
dimensions and with an absolute ceiling, so that a large image cannot exceed a
readable fraction of the pane it belongs to on any device the plugin supports.
The image SHALL keep its aspect ratio within that bound.

The bound SHALL be taken from the editor pane rather than the window, so that a
preview does not exceed the pane when the window is wider than it.

The popover SHALL be sized to what it holds. A hover popover has a width of its
own, narrower than the bound, and hides what overflows it: a picture inside the
bound that the popover cuts off at its edge does not satisfy this requirement,
however correctly the picture itself was scaled.

The bound applies to the rectangle as well: a cropped preview is bounded by the
same rule as an uncropped one, and a rectangle larger than the bound SHALL be
scaled down whole rather than shown in part. The reference asked for the
rectangle, and a corner of it is a different picture.

#### Scenario: A very large image

- **WHEN** the gesture is held over a `FILE` naming an image far larger than the pane
- **THEN** the popover is no larger than the bound, and the image is shown whole within it, undistorted

#### Scenario: A rectangle larger than the bound

- **WHEN** a link's rectangle is larger in both dimensions than the bound the pane allows
- **THEN** the popover shows the whole rectangle, scaled to fit and undistorted, and no part of it is cut off

#### Scenario: A pane narrower than the window

- **WHEN** the editor pane occupies part of the window, and the gesture opens a preview of a large image
- **THEN** the popover stays within the pane

#### Scenario: A picture wider than the popover's own width

- **WHEN** the gesture opens a preview of an image whose bounded width exceeds the width a hover popover takes by default
- **THEN** the whole picture is on screen, scaled to the bound, with nothing cut off at the popover's edge

#### Scenario: A rectangle wider than the popover's own width

- **WHEN** the same is true of a link's rectangle
- **THEN** the whole rectangle is on screen

#### Scenario: A narrow window

- **WHEN** the same preview is opened in a window the width of a phone
- **THEN** the popover stays within the window and remains readable

### Requirement: A preview never shows a picture the gesture has moved on from

Media loads after the popover opens. The preview SHALL NOT let a load that
finishes late alter a popover that is no longer the current one, and SHALL NOT
show one position's media under another position's popover.

#### Scenario: The pointer moves before the image loads

- **WHEN** the gesture opens a preview and the pointer moves to a second media position before the first image finishes loading
- **THEN** the popover shows the second position's media, and the first load changes nothing

#### Scenario: The preview closes before the image loads

- **WHEN** the popover is closed before the image finishes loading
- **THEN** nothing is drawn and no error surfaces

### Requirement: Media preview is governed by its own setting

The plugin SHALL offer a media preview setting, separate from the record preview
setting, taking the same three values: the gesture requires a held modifier, the
gesture is hover alone, or media preview is off.

Both preview settings SHALL default to hover alone. Holding a modifier is a
gesture a reader has to be told about, and the plugin should not require being
told about it to show a photograph.

Where a preview opens on hover alone, it SHALL wait for the pointer to rest
first, for the same interval the tag tooltip waits. Where it opens on a held
modifier, it SHALL answer the first movement: the modifier is already the
reader's declaration of intent.

Changing either setting SHALL NOT change the other, and SHALL take effect
without reopening the file. A trigger a reader has already chosen SHALL survive
the change of default.

#### Scenario: Media preview off, record preview on

- **WHEN** media preview is set to never and record preview to hold-and-hover
- **THEN** the gesture over an XREF still shows the record, and the gesture over a `FILE` payload shows nothing

#### Scenario: A multimedia link with media preview off

- **WHEN** media preview is set to never and the gesture is held over the pointer of `1 OBJE @O1@`
- **THEN** the record that pointer names is shown: a position where a picture is not coming is not a position that shows nothing

#### Scenario: Different triggers for each

- **WHEN** record preview is set to hover and media preview to hold-and-hover
- **THEN** hovering an XREF shows the record without a modifier, and a media position shows nothing until the modifier is held

#### Scenario: A multimedia link under the record's gesture alone

- **WHEN** record preview is set to hover, media preview to hold-and-hover, and the pointer rests on `1 OBJE @O1@` with no modifier
- **THEN** the record is shown, and holding the modifier there shows the picture instead

#### Scenario: A setting changed with a file open

- **WHEN** the media preview setting is changed while a GEDCOM file is open
- **THEN** the next gesture over a media position follows the new setting

#### Scenario: A pointer travelling across a media line

- **WHEN** either preview is set to hover alone and the pointer crosses a position without stopping
- **THEN** no preview opens

#### Scenario: A pointer resting on a media line

- **WHEN** the pointer then rests on that position for the tooltip's interval
- **THEN** the preview opens

#### Scenario: A trigger chosen before the default changed

- **WHEN** a stored setting names the held modifier
- **THEN** that is the trigger, and the new default does not replace it
