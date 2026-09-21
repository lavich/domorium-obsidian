## MODIFIED Requirements

### Requirement: A link's rectangle is what that link shows

Where the language service reports a rectangle for the position, the preview
SHALL open on that rectangle of the image. Where it reports none, the preview
SHALL show the whole image.

Because the rectangle belongs to the reference and not to the file, two links to
one photograph SHALL show two different pictures, and a `FILE` payload inside
the record SHALL show the whole photograph regardless of any link's rectangle.

The extent of an image is not knowable from the document, so the rectangle
SHALL be clamped against the image once it is loaded: a rectangle reaching past
an edge opens on the part that exists.

A rectangle the loaded image does not overlap at all SHALL be named. The
preview SHALL show the whole photograph and SHALL carry a note saying the
rectangle falls outside the image, so that the one case where the numbers are
certainly wrong is told apart from a reference carrying no rectangle. It SHALL
NOT show an empty box.

A rectangle merely reaching past an edge SHALL NOT be noted. The part that
exists is picture the reference asked for, and the preview lets the reader see
the edge of the photograph for themselves.

What the preview opens on SHALL be the named rectangle of the image: when the
popover appears the whole of that rectangle, clamped to the image, SHALL be
visible in the picture area and centred in it. A picture showing some other part
of the image does not satisfy this, and neither does one showing a part of the
rectangle.

The picture area does not take the rectangle's shape, so what is on screen at
that moment SHALL ordinarily include the photograph around the rectangle as
well — along whichever axis the rectangle does not fill, and wherever a small
rectangle has been magnified only as far as the limit allows. That surrounding
picture is the point of the viewport and not a failure of this requirement.
What identifies the rectangle is that it is centred, and that the control named
below moves between it and the whole photograph.

Where the reader has since moved the picture, what is on screen is what they
moved it to — see "A cropped preview is a viewport the reader can move".

#### Scenario: A link naming a rectangle

- **WHEN** the gesture is held over the pointer of a link whose `CROP` names `TOP 100`, `LEFT 250`, `HEIGHT 400`, `WIDTH 300`
- **THEN** the whole of that 300×400 region of the image is on screen and centred in the picture area

#### Scenario: Two links, one photograph

- **WHEN** two multimedia links in the document point at one record and carry different rectangles, and the gesture is held over each in turn
- **THEN** each popover opens on its own rectangle

#### Scenario: The record's own FILE beside a cropped link

- **WHEN** the gesture is held over the `FILE` payload of a record that some link crops
- **THEN** the popover shows the whole image, uncropped

#### Scenario: The picture inside the rectangle

- **WHEN** the gesture opens a preview of a link whose rectangle names a region of the image distinguishable from the rest of it, the rectangle being larger than the picture area
- **THEN** every part of the popover's picture, before the reader moves anything, comes from inside that region

#### Scenario: A rectangle the picture area is larger than

- **WHEN** the same, for a rectangle the picture area is larger than in one dimension or both
- **THEN** the whole rectangle is on screen and centred, with the photograph around it filling what is left, and no part of the picture area is the popover's own background except where the photograph ends

#### Scenario: A rectangle past the edge of the image

- **WHEN** the rectangle names an area extending beyond the loaded image
- **THEN** the part of the rectangle the image covers is on screen and centred, with no note

#### Scenario: A rectangle outside the image entirely

- **WHEN** the rectangle names an area the loaded image does not overlap at all
- **THEN** the popover shows the whole image and says the rectangle falls outside it

#### Scenario: A rectangle outside the image, beside one with none

- **WHEN** a preview of that rectangle is compared with a preview of a reference carrying no rectangle at all
- **THEN** the two are told apart: the first carries the note and the second does not

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

Where the preview draws an image for a reference carrying a rectangle, the
bound is the viewport's own size rather than a ceiling the rectangle is fitted
under: the picture area SHALL be that size whatever the rectangle measures, and
the rectangle SHALL be scaled to fit inside it. A rectangle larger than the
bound is therefore scaled down whole rather than shown in part — the reference
asked for the rectangle, and a corner of it is a different picture — and a
rectangle smaller than the bound is magnified into it rather than left as a
stamp in a box its own size, as far as the magnification limit allows.

#### Scenario: A very large image

- **WHEN** the gesture is held over a `FILE` naming an image far larger than the pane
- **THEN** the popover is no larger than the bound, and the image is shown whole within it, undistorted

#### Scenario: A rectangle larger than the bound

- **WHEN** a link's rectangle is larger in both dimensions than the bound the pane allows
- **THEN** the popover opens on the whole rectangle, scaled to fit and undistorted, and no part of it is cut off

#### Scenario: A pane narrower than the window

- **WHEN** the editor pane occupies part of the window, and the gesture opens a preview of a large image
- **THEN** the popover stays within the pane

#### Scenario: A narrow pane and a rectangle

- **WHEN** the editor pane is narrow enough that the bound is smaller than it would otherwise be, and the gesture opens a cropped preview
- **THEN** the picture area is that smaller bound, and the rectangle is fitted into it

#### Scenario: A picture wider than the popover's own width

- **WHEN** the gesture opens a preview of an image whose bounded width exceeds the width a hover popover takes by default
- **THEN** the whole picture is on screen, scaled to the bound, with nothing cut off at the popover's edge

#### Scenario: A rectangle wider than the popover's own width

- **WHEN** the same is true of a link's rectangle
- **THEN** the whole picture area is on screen

#### Scenario: A narrow window

- **WHEN** the same preview is opened in a window the width of a phone
- **THEN** the popover stays within the window and remains readable

## ADDED Requirements

### Requirement: A cropped preview's picture area is one size

Where the preview draws an image for a reference carrying a rectangle, the
popover's picture area SHALL be a box of the bound the pane allows, and its size
SHALL NOT depend on the rectangle's own size. Two references to one photograph
with rectangles of different sizes SHALL give popovers whose picture areas
measure the same.

The picture area SHALL take that size before the image arrives, so that the
popover does not change shape when it loads.

The one exception is a rectangle the loaded image does not overlap at all: there
being no region to look around, that preview gives the viewport up on `load` and
is sized to the image like an uncropped one, with its note. A preview whose
image cannot be drawn at all keeps neither, the picture area going with the
picture.

#### Scenario: Two rectangles of different sizes

- **WHEN** the gesture is held in turn over a link whose rectangle is small and a link whose rectangle is large
- **THEN** the two popovers' picture areas are the same size

#### Scenario: A rectangle smaller than the picture area

- **WHEN** a link's rectangle is far smaller than the bound the pane allows
- **THEN** the picture area is still the bound, and the rectangle is magnified toward it as far as the magnification limit allows rather than drawn at its own size in a box that size

#### Scenario: The image arriving

- **WHEN** a cropped preview opens and the image finishes loading
- **THEN** the picture area is the same size before and after, and the popover does not change shape

#### Scenario: The image the rectangle misses arriving

- **WHEN** the rectangle names an area the loaded image does not overlap at all
- **THEN** the picture area is given up for one the size of the image, that preview being the uncropped one with a note

### Requirement: A cropped preview is a viewport the reader can move

A rectangle in the wrong place shows a wrong but plausible piece of the
photograph, and the reader has no other way to find out. Where a media reference
carries a rectangle, the preview SHALL let the reader move the photograph inside
the picture area and change the scale it is drawn at, without leaving the
popover and without the popover closing under the gesture.

Dragging SHALL move the photograph under the picture area. A drag that leaves the
popover SHALL keep moving it, and SHALL NOT close the popover, until the reader
lets go. A drag SHALL NOT drag the photograph out of the picture area: where the
photograph is larger than the picture area in a direction it SHALL continue to
cover it, and where it is smaller it SHALL stay centred in it.

Changing the scale SHALL be bounded in both directions. Out, the limit SHALL be
the whole photograph inside the picture area — fitted to it where the photograph
is the larger, and at its own pixels where the picture area is, a photograph
smaller than the box being magnified by no gesture the reader can make. That is
far enough to answer what is around the rectangle and no further. In, the limit
SHALL be a fixed magnification of the photograph's own pixels, the same factor
whatever the pane measures, so that a rectangle of a few dozen pixels cannot be
stretched without end.

The two limits SHALL NOT cross or meet, whatever the image measures against the
picture area: a reader who has a viewport has something to move in it.

Until the image has loaded there is nothing to move and no scale to change, and
the preview SHALL do nothing rather than something arbitrary — the gesture is
answered from the loaded image's own size or not at all.

A gesture that changes the scale SHALL NOT scroll the document under the
popover.

The picture area SHALL NOT let the photograph spill outside it at any scale or
position.

#### Scenario: Dragging the photograph

- **WHEN** a cropped preview is open and the reader drags across the picture area
- **THEN** the photograph moves with the pointer, and a part of the photograph outside the rectangle comes into view

#### Scenario: A drag that leaves the popover

- **WHEN** the reader drags from inside the picture area to a point outside the popover and holds there for several seconds before letting go
- **THEN** the popover is still open, the photograph is still following the pointer, and letting go leaves it where the reader left it

#### Scenario: Dragging past the edge of the photograph

- **WHEN** the reader drags a photograph larger than the picture area far past the end of it
- **THEN** the photograph stops when its edge meets the edge of the picture area, and no empty space appears along the direction it was dragged

#### Scenario: Zooming out to the whole photograph

- **WHEN** the reader zooms a cropped preview out as far as it will go
- **THEN** the whole photograph is inside the picture area, fitted to it, and no further zooming out changes what is on screen

#### Scenario: Zooming out a photograph smaller than the picture area

- **WHEN** the reader does the same where the photograph is smaller than the picture area
- **THEN** it stops at its own pixels, centred, rather than being magnified to fill the box

#### Scenario: A photograph the picture area holds several times over

- **WHEN** a cropped preview opens on a photograph small enough that the whole of it would fit the picture area several times magnified
- **THEN** the rectangle is still what the preview opens on, and the reader can still zoom out to the whole photograph and in to the magnification limit

#### Scenario: Zooming in as far as it will go

- **WHEN** the reader zooms a cropped preview in as far as it will go
- **THEN** the photograph is drawn at the fixed magnification limit, and no further zooming in changes what is on screen

#### Scenario: The wheel over the popover

- **WHEN** the reader uses a wheel gesture over the picture area
- **THEN** the scale changes and the document behind the popover does not scroll

#### Scenario: A photograph smaller than the picture area

- **WHEN** the scale is such that the whole photograph is smaller than the picture area
- **THEN** it is centred in the picture area and dragging does not move it off centre

#### Scenario: The next preview

- **WHEN** the reader has moved one cropped preview and then opens a preview of another reference, or the same one again
- **THEN** that preview opens on its own rectangle, the movement not being remembered

#### Scenario: A gesture before the image has arrived

- **WHEN** the reader drags or uses a wheel gesture over the picture area before the image has finished loading
- **THEN** nothing moves and nothing is drawn wrongly, and the preview opens on its rectangle once the image arrives

### Requirement: One button offers the whole photograph and the way back

A gesture has to be guessed at. Where a media reference carries a rectangle the
preview SHALL show a single control beside the picture that moves between the
region the reference names and the whole photograph, in both directions, and it
SHALL say which of the two it will show.

Taking it toward the whole photograph SHALL show the whole photograph fitted
into the picture area. Taking it back SHALL show the rectangle as the popover
first opened on it, whatever the reader has dragged or scaled in between.

The control SHALL NOT appear where the reference carries no rectangle, nor where
the rectangle falls outside the image, there being no region in either case to
move between; nor SHALL it remain where the image could not be drawn at all,
there being no picture. Where the image has not yet arrived the control SHALL
NOT act, for the same reason the gestures do not.

#### Scenario: Asking for the whole photograph

- **WHEN** a cropped preview is open and the reader takes the control
- **THEN** the whole photograph is shown, fitted into the picture area

#### Scenario: Asking for the region again

- **WHEN** the reader takes the control a second time
- **THEN** the rectangle is shown as the popover opened on it

#### Scenario: The way back after moving the picture

- **WHEN** the reader drags and zooms, then takes the control twice
- **THEN** the rectangle is shown as the popover opened on it, the movement in between having been discarded

#### Scenario: What the control says

- **WHEN** the preview opens, and again after each press of the control
- **THEN** it names the view the next press will show — the whole photograph while the region was last asked for, the region while the whole photograph was — so that the reader is told what taking it will do

#### Scenario: An image that could not be drawn

- **WHEN** a cropped preview's image fails to load
- **THEN** the preview says so and no such control is left beside the message

#### Scenario: A reference with no rectangle

- **WHEN** the gesture opens a preview of a `FILE` payload, or of a link carrying no `CROP`
- **THEN** no such control appears

#### Scenario: A rectangle outside the image

- **WHEN** the gesture opens a preview whose rectangle the image does not overlap
- **THEN** the whole photograph is shown with its note, and no such control appears

### Requirement: An image with no rectangle is not made interactive

Where a media reference carries no rectangle, the preview SHALL show the whole
image fitted into the bound with the popover sized to it, and SHALL offer no
dragging, no change of scale, and no control. This is deliberate and not an
oversight: an uncropped preview poses no question about what surrounds it,
because the whole photograph is already on screen, and a click on the position
already opens the file in a tab of its own.

#### Scenario: Dragging an uncropped preview

- **WHEN** the gesture opens a preview of a `FILE` payload and the reader drags across the picture
- **THEN** nothing moves, and the popover behaves as it does today

#### Scenario: The wheel over an uncropped preview

- **WHEN** the reader uses a wheel gesture over an uncropped preview
- **THEN** the scale does not change

#### Scenario: The popover's size

- **WHEN** an uncropped preview is opened of an image smaller than the bound
- **THEN** the popover is sized to the image and not to the bound
