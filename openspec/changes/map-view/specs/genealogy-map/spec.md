## Purpose

The map of a GEDCOM file: a mode of the file's tab, beside Graph, Timeline, List and Source, that draws the places of the file where their coordinates are, on an outline of the world the plugin carries. It says where the coordinates come from, what a point, a label, a cluster and a line are, how a reader narrows the map by years, selects from it and searches it, and what the plugin sends over the network, which is nothing unless the reader asks for map tiles.

## ADDED Requirements

### Requirement: A GEDCOM tab can show its file as a map

A GEDCOM tab SHALL offer a **Map** mode that shows the places of its file as points on a map, in the tab itself, with no tab of its own and no sidebar. The tab SHALL enter it from the mode control in its header, from a command and from the tab's menu, as the requirement on the mode control says, and a file opened anew MAY open in it by the rule for a new tab. Entering it SHALL NOT open another tab.

The map SHALL be drawn from the same reading of the tab's text that the record card, the graph, the timeline and the list use, and from the places table of the file where there is one, and SHALL NOT read the GEDCOM file from the vault itself. It SHALL show the file as the tab holds it, including text typed in the tab and not yet saved, and SHALL show every later change to it, or to the places table: at once while the tab is in view, and the next time it is brought into view otherwise. A tab SHALL NOT draw the map before it has read its file. The map SHALL keep its scope, its position and its zoom across leaving the mode and coming back and across closing and reopening the workspace; it SHALL keep the years range, the text typed in its search and whether its places panel is open across leaving the mode and coming back, and SHALL NOT save them with the workspace. Nothing in the map SHALL write to the GEDCOM file, save it or mark it as changed.

#### Scenario: Choosing it from the mode control
- **WHEN** `curie.ged` is open in Source mode and the reader chooses Map from the mode control in its header
- **THEN** the same tab shows the map, and no new tab is open

#### Scenario: An edit not yet saved
- **WHEN** the reader adds `2 PLAC Berlin` with a `MAP` of `N52.52` and `E13.405` to a birth in Source mode, the file is not yet saved, and the reader switches to Map mode
- **THEN** the map shows a point for Berlin

#### Scenario: The places table changes
- **WHEN** the tab is in Map mode and the reader adds a row for Warsaw to `curie.places.md` in another tab and saves it
- **THEN** the map shows Warsaw where the row puts it, without the tab being reopened

#### Scenario: Leaving the mode and coming back
- **WHEN** the tab is in Map mode on Marie's branch, zoomed on Paris, with the years range 1890–1900 and the search holding `paris`, and the reader switches to Graph mode and back
- **THEN** the map is on Marie's branch at the same position and zoom, with the range and the search as they were

#### Scenario: Restored with the workspace
- **WHEN** the tab is in Map mode on Marie's branch, zoomed on Paris, with the range 1890–1900, and Obsidian is restarted
- **THEN** the map is on Marie's branch at that position and zoom, and the chip reads **Years: all**

#### Scenario: A tab that is not in view
- **WHEN** a tab in Map mode is behind another tab and the file changes on disk
- **THEN** the map is not drawn again until the tab is brought to the front

#### Scenario: Browsing the map
- **WHEN** the reader pans, zooms, filters by years, searches, opens popups and selects ten records
- **THEN** the GEDCOM file on disk is byte for byte what it was

### Requirement: A place's coordinates come from the file, then from the places table

A place SHALL be the text of a `PLAC` line of an event of a person or a family, trimmed, with runs of white space made one space, and two places SHALL be the same place where those texts are equal without regard to case; the place SHALL be named as its first occurrence in the file writes it.

The coordinates of a place SHALL be, in this order of priority:
1. those of the first `MAP` structure under a `PLAC` line of that place, in the order of the file, that states a valid `LATI` and a valid `LONG`; a latitude is valid as one letter `N` or `S` followed by a decimal number from 0 to 90, and a longitude as one letter `E` or `W` followed by a decimal number from 0 to 180, in the form both GEDCOM 5.5.1 and 7.0 write (`N52.2297`, `E21.0122`); `S` and `W` are negative;
2. else those of the first row of the places table whose place is that place, where the row states both a valid latitude and a valid longitude;
3. else none.

A `MAP` with one coordinate missing or invalid SHALL be ignored, and SHALL NOT stop the table from giving the place its coordinates. A place with coordinates from the file and from the table SHALL be drawn where the file puts it. A place with no coordinates SHALL NOT be drawn; it SHALL be counted and listed as the requirement on scope and counts says. Coordinates SHALL be read for the places of events of both versions of GEDCOM and of a document with no declared version, and SHALL NOT be looked up by the name of the place, locally or remotely.

#### Scenario: A MAP in the file
- **WHEN** a birth names `PLAC Warsaw, Congress Poland` with `MAP`, `LATI N52.2297` and `LONG E21.0122`
- **THEN** the place is at latitude 52.2297 and longitude 21.0122

#### Scenario: Southern and western hemispheres
- **WHEN** a place has `LATI S18.150944` and `LONG W46.6`
- **THEN** the place is at latitude -18.150944 and longitude -46.6

#### Scenario: The file wins over the table
- **WHEN** `Paris, France` has a `MAP` of `N48.8566` and `E2.3522` in the file and a row of 48.0 and 2.0 in the places table
- **THEN** the point is at 48.8566, 2.3522

#### Scenario: The table fills in
- **WHEN** `Sceaux, France` has no `MAP` in the file and a row of 48.7766 and 2.2917 in the places table
- **THEN** the point is at 48.7766, 2.2917

#### Scenario: Another spelling of one place
- **WHEN** one event writes `Paris, France` and another `paris, france`, and only the second has a `MAP`
- **THEN** there is one place, named `Paris, France`, at the coordinates of the `MAP`

#### Scenario: A half-stated MAP
- **WHEN** a place has a `MAP` with a `LATI` and no `LONG`, and a row in the table
- **THEN** the `MAP` is ignored and the place is at the table's coordinates

#### Scenario: An impossible latitude
- **WHEN** a place has `LATI N95.0` and `LONG E10.0`, and no row in the table
- **THEN** the place has no coordinates

#### Scenario: A place with neither
- **WHEN** `Passy, Haute-Savoie, France` has no `MAP` and no row
- **THEN** it is not drawn and is counted among the places with no coordinates

#### Scenario: A document with no version
- **WHEN** a file declares no version and a place has a `MAP`
- **THEN** the place is at the coordinates of the `MAP`

### Requirement: The places table is a note next to the file

The places table of a GEDCOM file SHALL be the Markdown note named like the file with its extension, `.ged` or `.gedcom`, replaced by `.places.md`, in the same folder: `curie.places.md` for `curie.ged`. It SHALL be a plain note the reader edits as any note, and the plugin SHALL read it and SHALL NOT keep another copy of it.

Its table SHALL be a Markdown table of three columns, **Place**, **Latitude** and **Longitude**, one place to a row. The first table of the note SHALL be the places table; its header row and the delimiter row under it SHALL be skipped by position, whatever the header says, and the text of the note outside that table, including front matter, SHALL be ignored. Cells SHALL be separated by `|`, a `|` inside a place SHALL be written `\|`, and leading and trailing white space in a cell SHALL be ignored. A coordinate SHALL be a decimal number of degrees, positive north and east, negative south and west, written with a point or a comma (`52.2297`, `52,2297`), or with a letter `N`, `S`, `E` or `W` before or after the number and no sign (`N52.2297`, `21.0122 E`); a latitude outside -90 to 90, a longitude outside -180 to 180, an empty cell and any other text SHALL make that coordinate, and so that row, give no coordinates. A row whose place is the same place as an earlier row's, by the rule above, SHALL be ignored. A note with no table, an empty note and a note the plugin cannot read as a table SHALL give no rows, and SHALL NOT stop the map from drawing the places the file gives coordinates to.

The plugin SHALL read the note while a tab of the file is in Map mode, and again when it changes, is created, is renamed or is deleted. When a GEDCOM file is renamed or moved and its places table is not, and the table of the new name does not exist, the plugin SHALL rename the table to follow the file, by Obsidian's own rename so that links to it are updated, and SHALL say so in a notice; where the table of the new name exists the plugin SHALL leave both as they are.

#### Scenario: The expected format
- **WHEN** `curie.places.md` holds `| Place | Latitude | Longitude |`, `| --- | --- | --- |` and `| Warsaw, Congress Poland | 52.2297 | 21.0122 |`
- **THEN** `Warsaw, Congress Poland` is at 52.2297, 21.0122

#### Scenario: Written by a reader of another language
- **WHEN** the header reads `| Место | Широта | Долгота |` and a row reads `| Москва | 55,7558 | 37,6173 |`
- **THEN** Москва is at 55.7558, 37.6173

#### Scenario: Letters for the hemisphere
- **WHEN** a row reads `| Santiago, Chile | S33.4489 | W70.6693 |`
- **THEN** Santiago is at -33.4489, -70.6693

#### Scenario: A place with a bar in it
- **WHEN** a row reads `| A \| B | 10 | 20 |`
- **THEN** the place is `A | B`

#### Scenario: Text around the table
- **WHEN** the note has front matter, a paragraph before the table and a second table after it
- **THEN** only the first table is read

#### Scenario: A blank row to fill in
- **WHEN** a row reads `| Stockholm, Sweden |  |  |`
- **THEN** it gives no coordinates, and Stockholm is counted among the places with no coordinates

#### Scenario: A repeated place
- **WHEN** two rows name `Paris, France` with different coordinates
- **THEN** the first row's coordinates are used

#### Scenario: No table note
- **WHEN** no note `curie.places.md` exists
- **THEN** the map draws the places the file gives coordinates to, and nothing is created

#### Scenario: A table that cannot be read
- **WHEN** the note holds a paragraph and no table
- **THEN** it gives no rows and the map is as if there were no note

#### Scenario: The file is renamed
- **WHEN** `curie.ged` is renamed `family.ged` while `curie.places.md` exists and `family.places.md` does not
- **THEN** the note is renamed `family.places.md`, a notice says so, and the map of the tab still draws from it

#### Scenario: The new name is taken
- **WHEN** `curie.ged` is renamed `family.ged` while both `curie.places.md` and `family.places.md` exist
- **THEN** neither note is renamed, and the map reads `family.places.md`

### Requirement: The map is drawn on an outline of the world that the plugin carries

The map SHALL be drawn on an outline of the land of the world, simplified coastlines with no borders, no place names and no rivers, that the plugin carries inside itself and draws without any network request. The outline SHALL be a work in the public domain, its source and licence SHALL be named in the README, and its data SHALL add no more than 300 KB to the plugin's bundle; the plugin SHALL NOT bundle a map library. The projection SHALL be Web Mercator, so that the outline, the points and the tiles of the next requirement agree, and latitudes beyond 85.05113 degrees SHALL be clamped to it. The world SHALL be drawn once and SHALL NOT wrap horizontally. The reader SHALL NOT be able to zoom out beyond the whole world fitting the tab, and SHALL NOT be able to move the map until none of the world is in the tab.

#### Scenario: A first opening
- **WHEN** a tab opens in Map mode with no setting changed
- **THEN** the map draws the outline and the points, and no network request is made

#### Scenario: Offline
- **WHEN** the device has no network and the reader opens the map
- **THEN** the outline and every point are drawn as with a network

#### Scenario: The projection agrees with itself
- **WHEN** a place is at latitude 0 and longitude 0
- **THEN** its point is at the centre of the outline's equator and prime meridian, and a place at 85.05113 N is at the top edge of the world

#### Scenario: The world fits
- **WHEN** the reader zooms out as far as the map allows
- **THEN** the whole outline is in the tab and the map is not smaller than that

#### Scenario: The bundle
- **WHEN** the plugin is built
- **THEN** the outline's data is no larger than 300 KB and no map library is among the dependencies

### Requirement: Map tiles are loaded only when the reader allows them

The plugin SHALL have three settings: **Load map tiles from the web**, off by default and off for every reader whose settings were saved before it existed; **Tile server address**, a text field that is empty by default; and **Tile attribution**, a text field that is empty by default. The plugin SHALL NOT contain, offer or request any default tile server. Each setting row SHALL stay in the settings whatever the others hold, and the description of the address and the attribution SHALL say that they apply while tiles are loaded.

The address SHALL be a template that begins with `https://` and holds `{z}`, `{x}` and `{y}`, each at least once, and that is a web address once numbers are put in for them; an address that is not, including every `http://` address, SHALL be treated as none and the settings and the map SHALL say that it is not valid. While **Load map tiles from the web** is off, or the address is none, the plugin SHALL make no network request for a map, and the map SHALL be drawn on the outline alone. While it is on and the address is valid, the plugin SHALL request, as images, the tiles that cover the part of the map in view and the ring of tiles around it, at the zoom level that matches the map's scale, and SHALL draw them in the same transform as the outline and below it, the outline then drawn as a line with no fill over them, so that a tile, the outline and a point agree. A request SHALL carry nothing of the file: the host of the address SHALL learn, from it, the numbers of tiles, which say what part of the world is in view, and the reader's address and the application's identification, as any image request teaches them, and SHALL NOT learn any place name, person name, record or year. Turning the toggle off SHALL stop further requests and remove the tiles drawn.

While tiles are loaded, the map SHALL show attribution as text, in the corner of the map: the text of **Tile attribution** where it is not empty, and otherwise the host of the address, and the attribution SHALL be plain text and SHALL NOT be taken from the server.

A tile that fails to load SHALL be left blank, so that the outline shows through, SHALL NOT be requested again while it stays in view for a minute, and SHALL NOT raise an error to the reader; where tiles fail repeatedly the map SHALL say, in its status, that tiles could not be loaded. A slow or failing tile server SHALL NOT delay the drawing of the outline, the points, the labels, the lines or any control, and SHALL NOT make the map unresponsive. While the reader pans, zooms or glides, tiles for the moving view SHALL be requested only once it has settled.

The README's Privacy section SHALL name tiles as the second thing the reader can ask for, SHALL say that with tiles on the chosen server learns the tile numbers and the reader's address and that no place name leaves the vault, and its statement that the plugin makes no network request until the reader asks it to SHALL stay true.

#### Scenario: Off by default
- **WHEN** the reader installs the plugin and opens the map of `curie.ged`
- **THEN** the setting is off, the address is empty, and the browser's network log holds no request made by the map

#### Scenario: The toggle on and no address
- **WHEN** the reader turns **Load map tiles from the web** on and leaves the address empty
- **THEN** no request is made and the map is drawn on the outline alone

#### Scenario: An address that is not valid
- **WHEN** the address is `http://tiles.example/{z}/{x}/{y}.png`, or `https://tiles.example/{z}/{x}.png`
- **THEN** no request is made and the map says the address is not valid

#### Scenario: Tiles on
- **WHEN** the toggle is on and the address is `https://tiles.example/{z}/{x}/{y}.png`, and the map is at zoom level 5
- **THEN** images are requested from `tiles.example` for the tiles of zoom level 5 that cover the map, nothing else is requested, and no URL holds a place name

#### Scenario: Attribution
- **WHEN** tiles are on, **Tile attribution** reads `© Example Maps` and the address is valid
- **THEN** the map shows `© Example Maps` in its corner; with the attribution empty it shows `tiles.example`; with tiles off it shows neither

#### Scenario: The server is down
- **WHEN** tiles are on and every request fails
- **THEN** the outline and every point are drawn at once, the tiles stay blank, the status says tiles could not be loaded, no failed tile is requested again within a minute while it stays in view, and no error is shown

#### Scenario: A slow server
- **WHEN** tiles are on and the server answers each request after ten seconds
- **THEN** the points are drawn and respond to pan, zoom and selection without waiting

#### Scenario: The toggle off again
- **WHEN** tiles were drawn and the reader turns the toggle off
- **THEN** the tiles are gone, no further request is made, and the outline is drawn

#### Scenario: A reader who updates
- **WHEN** the plugin updates and the saved settings do not mention the tile settings
- **THEN** **Load map tiles from the web** is off and the address and the attribution are empty

#### Scenario: The privacy text
- **WHEN** the reader reads the README's Privacy section
- **THEN** it names **Load map tiles from the web** beside **Load images from the web**, says what the tile server learns and that no place name leaves the vault, and still says the plugin makes no network request until the reader asks it to

### Requirement: A point is a place, sized by its events and coloured by their kind

The map SHALL draw one point for each place that has coordinates and an event in the scope and the years range, and no point for an event. The events of a place SHALL be the events of a person and of a family, in the scope, that write that place, each counted once however many people share it: a marriage of two people is one event. The size of a point SHALL grow with the number of events at the place, from a smallest point for one event to a largest for a hundred or more, and SHALL NOT grow without bound. Where every event at the place is of one kind — a birth or christening, a marriage, a death or burial, or any other — the point SHALL take the colour that the timeline gives that kind of mark; otherwise it SHALL be neutral grey and SHALL show the number of its events. Colour SHALL NOT be the only thing that tells the events at a place apart: the label, the popup and the places panel name them.

#### Scenario: One event
- **WHEN** Marie's birth is the only event at `Warsaw, Congress Poland`
- **THEN** one point of the smallest size is drawn there, in the colour of a birth

#### Scenario: Events of one kind
- **WHEN** three people were born at `Paris, France` and nothing else is written there
- **THEN** one point is drawn there, larger than a point of one event, in the colour of a birth

#### Scenario: Events of several kinds
- **WHEN** `Paris, France` holds an education, a marriage and a death
- **THEN** one point is drawn there in neutral grey with the number 3

#### Scenario: A marriage counts once
- **WHEN** a family's marriage is at `Warsaw, Congress Poland`, and both spouses are in the scope
- **THEN** it counts as one event there

#### Scenario: Not an event
- **WHEN** Marie has six events and they are at three places
- **THEN** three points are drawn for her, not six

### Requirement: A label says the place and its years, where it fits

Each point SHALL carry a label of the place's name as far as its first comma and the years of its events in the scope and the range, separated by ` · `: `Paris · 1891–1934`, from the earliest to the latest year, the year alone where they are one, and the name alone where no event there is dated. A year before the common era SHALL be written as the rest of the plugin writes it. A label SHALL be drawn beside its point and SHALL be hidden where it would cover another label or a point; where labels compete, the label of the place with more events SHALL be kept, and a label of the selected record's place, of the place the search stands on and of a hovered or focused point SHALL always be kept over the others. A label SHALL grow back when there is room, as the reader zooms in. The popup, the places panel, the hover and the accessible name of a point SHALL give the whole place as written.

#### Scenario: Name and years
- **WHEN** `Paris, France` has events in 1891, 1894 and 1934 and the zoom is level 8
- **THEN** its label reads `Paris · 1891–1934`

#### Scenario: One year
- **WHEN** the only event at `Stockholm, Sweden` is dated 1903
- **THEN** the label reads `Stockholm · 1903`

#### Scenario: No dated event
- **WHEN** no event at `Sceaux, France` has a date
- **THEN** the label reads `Sceaux`

#### Scenario: Labels that collide
- **WHEN** two points 10 px apart both have labels, and one has four events and the other one
- **THEN** only the label of the one with four events is drawn

#### Scenario: The selected record's place
- **WHEN** a person is selected whose place has few events and its label would collide with a larger one's
- **THEN** the label of the selected person's place is drawn and the other is hidden

### Requirement: Places that overlap on the screen become one cluster

Points that would overlap on the screen at the map's scale SHALL be drawn as one cluster in place of the points: a marker unlike a point, a ring rather than a disc, that carries the number of places it holds. A cluster SHALL be made from the places with coordinates in the scope and the range, SHALL be the same for the same view, and SHALL be made again as the reader zooms, so that places part as the map is zoomed in. A click, a tap, Enter or Space on a cluster SHALL glide the map to the zoom at which its places part and put them in view; where its places are at the same coordinates and no zoom will part them, it SHALL open the popup of the events of all of them, grouped by place. A cluster SHALL carry, in its accessible name, the number of places and of events and the names of the largest three places. The selected record's points SHALL be drawn as points and not merged into a cluster while they are in view, and the point the search stands on SHALL be too.

#### Scenario: Two places in one town
- **WHEN** `Paris, France` and `Passy, Haute-Savoie, France` have points 6 px apart
- **THEN** one cluster of 2 is drawn in place of the two points

#### Scenario: Zooming in parts them
- **WHEN** the reader clicks the cluster
- **THEN** the map glides to a zoom at which both points are drawn apart, each with its own label where it fits

#### Scenario: At the same coordinates
- **WHEN** two places, written differently, have the same coordinates and the reader clicks their cluster at the largest zoom
- **THEN** a popup lists the events of both, grouped under the two names

#### Scenario: The selected person's places
- **WHEN** a person is selected whose three places are 5 px apart
- **THEN** the three are drawn as points, joined by the person's line, and not as a cluster

### Requirement: A selected person or family draws their moves

Where a person is selected, the map SHALL draw a line through the places of that person's events that have coordinates, in the scope and the years range and with a year: the events of the person's own record and of the families the person is a spouse in, in the order of their years, ties in the order of the file, and an event at the same place as the one before it SHALL add no stop. The line SHALL be drawn as straight segments of the projection with an arrowhead at the middle of each segment in the direction of the move, and each stop SHALL carry its order number, the numbers of a place stopped at twice both, `1, 4`. Where a family is selected, the line SHALL be drawn in the same way through the places of the events of the family's record. A selected record with one place, with no place with coordinates, a source or a media record SHALL have no line. Where nothing is selected, no line SHALL be drawn. The points of the selected record's events SHALL be highlighted, and every other point, line and label SHALL be dimmed, as the timeline dims what the selected person is not. Events with no year SHALL highlight their place and SHALL NOT take part in the line.

#### Scenario: Marie's moves
- **WHEN** Marie is selected, with a birth at Warsaw in 1867, an education at Paris from 1891, a Nobel Prize at Stockholm in 1903 and 1911, and a death at Passy in 1934
- **THEN** a line runs Warsaw, Paris, Stockholm, Passy, with an arrow on each segment and the numbers 1, 2, 3 and 4, and Stockholm is stopped at once because its two events are consecutive

#### Scenario: Returning to a place
- **WHEN** a selected person has events at A in 1900, B in 1910 and A in 1920
- **THEN** the line runs A, B, A, and the point at A carries `1, 3`

#### Scenario: Nothing selected
- **WHEN** no record is selected
- **THEN** no line is drawn and no point is dimmed

#### Scenario: A family
- **WHEN** the Curies' family is selected and its marriage and a residence are at two places
- **THEN** a line joins the two places in the order of their years

#### Scenario: Dimming
- **WHEN** Marie is selected
- **THEN** her points are drawn as highlighted, and every other point is dimmed

#### Scenario: A person with no place
- **WHEN** a person is selected, no place of whose events has coordinates
- **THEN** no point is highlighted, no line is drawn, the map does not move, and the status says that none of the selected record's places is on the map

### Requirement: The years range filters points and lines and never the selection

The map SHALL carry a floating chip at the bottom left that reads **Years: all** and is collapsed by default. Pressing it SHALL expand it into a range with two handles, a readout of the years chosen (`1880–1920`) and a clear control; the range SHALL run from the earliest to the latest year of an event with a year at a place with coordinates in the scope, in steps of one year. Moving a handle SHALL show, as it moves, only the events whose years fall within the range: an event with a period or a range of dates SHALL stay while its span overlaps the range, and an event with no year SHALL be hidden while a range is set. A place with no event left SHALL have no point, label or place in the counts; the size, colour, label and numbers of a place SHALL be those of the events left. The clear control SHALL restore **Years: all** and every event, and the chip MAY be collapsed while a range is set, in which case it SHALL read the range, **Years: 1880–1920**. A range SHALL NOT change, clear or move the selection, the scope, the card or the file; a selected person whose events are within the range SHALL stay selected and keep their line through them, and one with none SHALL stay selected with nothing highlighted. The handles SHALL be sliders for assistive technology with a name, a minimum, a maximum and a value read as a year, SHALL move by a year with the Left and Right keys, by ten with Page Up and Page Down, and to the ends with Home and End, SHALL be reachable on a phone with a target of at least 44 px, and SHALL NOT let the first pass the second. A file with no event that has a year and a place with coordinates SHALL show no chip.

#### Scenario: Collapsed by default
- **WHEN** a tab opens in Map mode
- **THEN** the chip reads **Years: all** at the bottom left and no range is shown

#### Scenario: Expanding
- **WHEN** the reader presses the chip
- **THEN** it expands into a range running from the earliest to the latest year, with a clear control

#### Scenario: Narrowing
- **WHEN** the reader sets the range to 1890–1895
- **THEN** only places with an event in those years are drawn, the Paris point's label reads `Paris · 1891–1894`, and the counts follow

#### Scenario: Marie stays selected
- **WHEN** Marie is selected and the reader sets the range to 1890–1895
- **THEN** Marie is still selected and the card still shows her, and her line runs through the places of her events within the range

#### Scenario: A period that overlaps
- **WHEN** an education runs `FROM 1891 TO 1894` and the range is 1893–1900
- **THEN** the education is shown

#### Scenario: Undated events
- **WHEN** a range is set and a place holds only undated events
- **THEN** it is not drawn, and clearing the range draws it

#### Scenario: Clearing
- **WHEN** the reader presses the clear control
- **THEN** the chip reads **Years: all** and is collapsed, and every event is shown again

#### Scenario: The keyboard
- **WHEN** the reader focuses the first handle and presses Right, Page Down and End
- **THEN** it moves a year later, ten years earlier, and to the end but not past the second handle

#### Scenario: A file with no years
- **WHEN** no event with a place has a year
- **THEN** no chip is shown

### Requirement: The scope row says what the map shows and what it cannot

The map SHALL reuse the scope bar of the graph and the timeline for its branch: with a person at its focus, a line that reads **Branch of** the person's name, with the steppers for ancestors and descendants and **Whole file**; with the whole file, no branch. Beside it, always, the map SHALL show how much it draws, as `7 places · 18 events`, counting what the scope and the years range leave, and SHALL show a counter, **3 places have no coordinates**, of the places of the events in the scope that have none, in the language's plural forms; the counter SHALL NOT be shown where there are no such places. The map SHALL open on the whole file whatever its size. The counter SHALL be a button that opens the places panel on the places with no coordinates.

The places panel SHALL list the places of the scope: those on the map, each with the number of its events and its years, and those with no coordinates, named; and, below the places with no coordinates, a button **Open the places table**, which SHALL create the table as the requirement on the empty state says where it does not exist and open it in a tab of the workspace. Choosing a place on the map in the panel SHALL glide the map to it as a search does. The panel SHALL be reachable with the keyboard and by assistive technology, and closes with Escape.

#### Scenario: The whole file
- **WHEN** a tab opens in Map mode on `curie.ged` with places at 4 of its 6 places and 9 events there
- **THEN** the row reads `4 places · 9 events` and `2 places have no coordinates`, and no branch line is shown

#### Scenario: A branch
- **WHEN** the reader chooses Irène's branch
- **THEN** the line reads `Branch of Irène Joliot-Curie`, the counts are those of the branch's events, and the steppers work as in the graph

#### Scenario: The counter opens the list
- **WHEN** the reader presses `2 places have no coordinates`
- **THEN** the places panel opens on the two places with no coordinates, named, with **Open the places table**

#### Scenario: One place
- **WHEN** one place has no coordinates
- **THEN** the counter reads `1 place has no coordinates`

#### Scenario: All places have coordinates
- **WHEN** every place in the scope has coordinates
- **THEN** no counter is shown

#### Scenario: Russian
- **WHEN** the language is Russian and 21 places have no coordinates
- **THEN** the counter reads `У 21 места нет координат`

### Requirement: A point selects a record, or lists the records at its place

Pressing a point with a click, a tap, Enter or Space SHALL do one of two things. Where the events at the place belong to one record, a person or a family, it SHALL select that record, by the same gesture, with the same origin and so with the same effect on the record card, the sidebar and the other views as a click on a card in the graph: the record card on the right SHALL show it, the tab SHALL stay in Map mode, and the selection SHALL be the tab's. Where they belong to several records it SHALL open a short popup beside the point, a list of the events there in the look of the file explorer, each row giving the name of the person or family, the year and the kind of the event, in the order of the years, the undated last; choosing a row SHALL select that row's record and close the popup. Where the number of rows is large the popup SHALL scroll and SHALL NOT grow beyond the map. The popup SHALL be a list for assistive technology whose rows are reachable with the arrow keys, Home and End, SHALL close with Escape, with a click elsewhere or by choosing a row, and SHALL return the focus to the point. Hovering a point with a pointer SHALL show the place as written and the number of its events, and SHALL NOT select or move anything.

#### Scenario: One record
- **WHEN** the only events at `Warsaw, Congress Poland` belong to Marie, and the reader clicks its point
- **THEN** Marie is selected, her card shows on the right, her line is drawn, and the map stays where it is

#### Scenario: Several records
- **WHEN** Marie's birth and her sister's birth are at `Warsaw, Congress Poland` and the reader clicks its point
- **THEN** a popup lists the two events with the person, the year and `Birth`, in the order of the years

#### Scenario: Choosing a row
- **WHEN** the reader chooses Marie's row in the popup
- **THEN** the popup closes, Marie is selected and her card is shown

#### Scenario: A family's event
- **WHEN** the only event at a place is the Curies' marriage and the reader clicks its point
- **THEN** the family is selected and the card shows it

#### Scenario: Hovering
- **WHEN** the reader moves the pointer over a point
- **THEN** a tip names the place and the number of its events, and nothing is selected

#### Scenario: The popup closes
- **WHEN** a popup is open and the reader presses Escape
- **THEN** it closes and the focus is on the point

#### Scenario: The card does not open by itself
- **WHEN** the setting **Open the record card when selecting** is off and the reader clicks a point
- **THEN** the record is selected and the right sidebar is left as it is

### Requirement: A record selected elsewhere is marked on the map

While a person or a family is selected in the tab, by any gesture and from any place — the card, a link, Back and Forward, another mode — the map SHALL mark it: its points highlighted and its line drawn, as the requirement on moves says. A source or a media record selected SHALL mark nothing. A selection that came from the card, a link, Back or Forward, or the cursor in Source, SHALL bring the selected record's points into view, gliding to the smallest view of the map, no closer than a city, that holds all of them, and a selection that came from a gesture on the map itself SHALL NOT move the map. A selection made while the map is not in view SHALL be applied, with the same movement, when the map is next in view. A glide SHALL jump instead where the reader asks the system for reduced motion, and SHALL jump where it would cross more than two and a half screens. Selecting nothing SHALL clear the marks and the line.

#### Scenario: Selected in the card
- **WHEN** the reader follows a link to Marie in the card while the tab is in Map mode
- **THEN** her points are highlighted, her line is drawn, and the map glides to hold them

#### Scenario: Selected on the map
- **WHEN** the reader clicks a point
- **THEN** the map does not move

#### Scenario: Selected in another mode
- **WHEN** Marie is selected in Graph mode and the reader switches to Map mode
- **THEN** the map is drawn with Marie marked and holding her points in view

#### Scenario: A source
- **WHEN** a source record is selected in the card
- **THEN** no point is marked and no line is drawn

#### Scenario: Reduced motion
- **WHEN** the system asks for reduced motion and a record is selected from the card
- **THEN** the map jumps to the view without a glide

### Requirement: The search finds places by name

The map SHALL have the expanding search of the graph and the timeline — a search icon that gives way to a field with a counter and arrows, and comes back while the field is empty — and the find key SHALL open it and focus it. The search SHALL match the names of the places that are drawn, the whole place as the file writes it, in every spelling that makes that one place, case-insensitively and without regard to accents; `varsovie`, `WARSAW` and `warsaw, congress` all match `Warsaw, Congress Poland`. It SHALL NOT match the names of people, years or event kinds. While the field is not empty the points whose places do not match SHALL be dimmed and the counter SHALL say how many places match, `2 / 5` once the reader has stepped; with no match it SHALL say there are no results. The next and previous buttons, and Enter and Shift+Enter in the field, SHALL step through the matching places in the order of the places panel, wrapping, and for each SHALL glide the map to the place, zooming in to a city where the map shows more than a country and never zooming out, show its label and a ring on its point, and say its name and events for assistive technology. Stepping SHALL NOT select a record. A place hidden in a cluster SHALL be brought out of it. Where the query matches no drawn place but does match a place with no coordinates, the search SHALL say that place has no coordinates. Escape and the clear control SHALL clear the field, and then close the search.

#### Scenario: Matching a place
- **WHEN** the reader types `paris` and the file has `Paris, France` and `Passy, Haute-Savoie, France` drawn
- **THEN** the counter says 1 match, and the other points are dimmed

#### Scenario: Stepping
- **WHEN** two places match and the reader presses the next button three times
- **THEN** the map glides to the first, the second, and the first again, the counter reads `1 / 2`, `2 / 2`, `1 / 2`, and no record is selected

#### Scenario: Accents and case
- **WHEN** the reader types `skłodowska` and a place is written `Warsaw, Skłodowska Street` and, in another event, `warsaw, skłodowska street`
- **THEN** it is one match

#### Scenario: Not a person
- **WHEN** the reader types `Marie`
- **THEN** there are no results

#### Scenario: A place with no coordinates
- **WHEN** the reader types `Stockholm` and Stockholm has no coordinates
- **THEN** the search says Stockholm has no coordinates

#### Scenario: Out of a cluster
- **WHEN** the match is one of five places in a cluster
- **THEN** the glide ends with the place drawn as its own point, with its label

#### Scenario: The find key
- **WHEN** the tab is in Map mode and the reader presses the find key
- **THEN** the search is open and its field has the focus, and the editor's search panel is not opened

### Requirement: A map with no place to draw says why and offers the places table

Where no place of the file has coordinates — every place lacks a `MAP` and a row in the places table, or the file names no place — the map SHALL show, in place of an empty world, the message **No place has coordinates yet**, and say which of the two it is: that no place in the file has a `MAP` and no row of the places table gives one, or that the file names no place. Where the file names places and no places table exists, it SHALL offer a button **Create the places table**. Pressing it SHALL create the note named by the requirement on the places table, next to the file, holding a short line saying what the table is for and a table whose header row is `Place | Latitude | Longitude`, with one row for each distinct place of the file that the file gives no coordinates, named as its first occurrence writes it, in alphabetical order by the language's collation, with the coordinates empty; it SHALL then open the note in a tab of the workspace. The plugin SHALL NOT overwrite or change a note that exists: where the note exists when the button is pressed, whether it was created in the meantime or the map has not noticed it, the plugin SHALL open it and create nothing. Where the note exists and no place has coordinates, the button SHALL read **Open the places table** and open it. The message and the button SHALL fit a phone and SHALL be reachable with the keyboard. The creation SHALL write only that note.

#### Scenario: Nothing to draw
- **WHEN** no place in `plain.ged` has a `MAP`, and there is no places table
- **THEN** the map shows **No place has coordinates yet**, says no place has a `MAP` and no row of a places table gives one, and offers **Create the places table**

#### Scenario: Creating the table
- **WHEN** the reader presses **Create the places table** for `plain.ged`, which names `Warsaw, Congress Poland`, `Paris, France` and `Warsaw, congress poland`
- **THEN** `plain.places.md` is created next to it with the header `Place | Latitude | Longitude` and the rows `Paris, France` and `Warsaw, Congress Poland`, both with empty coordinates, and it is opened in a tab

#### Scenario: The note exists
- **WHEN** `plain.places.md` exists with the reader's own rows and the reader presses **Create the places table** from a map that was drawn before it was created
- **THEN** the note is opened and its content is unchanged

#### Scenario: A table with no coordinates in it
- **WHEN** `plain.places.md` exists with every coordinate empty
- **THEN** the map shows the message and the button reads **Open the places table**

#### Scenario: A file with no places
- **WHEN** no event of the file names a place
- **THEN** the message says the file names no place, and no button is offered

#### Scenario: Filling it in
- **WHEN** the reader adds coordinates for `Paris, France` in the note and saves
- **THEN** the map draws a point at Paris in place of the message

#### Scenario: A file with some places mapped
- **WHEN** one place has a `MAP`
- **THEN** no message is shown and the map draws that place, with a counter for the rest

### Requirement: The map is reachable with the keyboard and by assistive technology

The map SHALL have a stop for the keyboard of its own, named **Map of places** with the number of places it draws. With the focus on it, the Right and Down arrows SHALL move to the next place and Left and Up to the previous, in the order of the places panel without wrapping, gliding the map to the place and bringing the place out of a cluster, Home and End to the first and the last, Enter and Space to do what pressing the point does, Escape to close a popup, `+` and `-` to zoom and `0` to fit, and the focused place SHALL be marked on the map, SHALL have its label drawn and SHALL be named to assistive technology with its place, its events and their years. Every control of the map — the zoom buttons, the search, the scope bar and its counter, the chip and its handles, the places panel, a popup and its rows, the empty state — SHALL be reachable with Tab in an order that follows the screen and SHALL show where the focus is. The places panel SHALL give every place of the scope, mapped or not, as a list that does not depend on the pointer, so that a reader who cannot use the map can reach every place and select every record at it: for a place on the map, choosing it SHALL do what pressing its point does. Colour SHALL NOT be the only signal of a state: the selected record's points, the point the search stands on and the focused point SHALL differ by shape or ring as well as by colour. Text over the map SHALL be legible in a light and a dark theme.

#### Scenario: The map is one stop
- **WHEN** the reader tabs into the map
- **THEN** the focus lands on the map's own stop, announced as **Map of places** with the number of places, and not on each of its points in turn

#### Scenario: Stepping by key
- **WHEN** the focus is on the map and the reader presses Right twice and Enter
- **THEN** the map glides to the first and the second place, the second place is focused with its label, and Enter does what pressing its point does

#### Scenario: A place named for assistive technology
- **WHEN** the focus is on the point of `Paris, France` with events in 1891 and 1934
- **THEN** it is named `Paris, France, 2 events, 1891 to 1934`

#### Scenario: Selecting without the pointer
- **WHEN** the reader opens the places panel, moves to `Warsaw, Congress Poland` and presses Enter
- **THEN** it does what clicking its point does

#### Scenario: A place with no coordinates, by key
- **WHEN** the reader opens the counter's list with the keyboard
- **THEN** every place with no coordinates is named in the list and the focus can leave it with Tab or Escape

### Requirement: The map on a phone and in a narrow tab

The map SHALL be drawn and be usable on a phone and in a tab of any width with no sideways scrolling of the tab. A finger SHALL pan it by dragging and zoom it by pinching about the point between the fingers; a mouse SHALL pan it by dragging and zoom it with the wheel, and a trackpad SHALL pan with two fingers and zoom with a pinch, as the graph does; the zoom buttons **−**, **+** and **Fit** SHALL zoom and fit the map. Every control a finger is meant to press — the zoom buttons, the search, the chip and its handles, the counter, the rows of the popup and the places panel, a cluster and a point — SHALL have a target at least 44 px square on a coarse pointer, a point drawn smaller SHALL keep a target of that size, and the controls SHALL clear the bottom navigation of the app and the system's inset. A tab narrower than 640 px SHALL show the scope row on lines of its own and the popup and the places panel as sheets that fit the tab. The map SHALL NOT disturb the position and zoom it had when the tab is resized, hidden or its size is momentarily nothing. The motion of a glide SHALL be dropped where the reader asks for reduced motion. No part of the map SHALL be drawn by assigning markup from a string.

#### Scenario: Pinching
- **WHEN** the reader pinches out over Paris on a phone
- **THEN** the map zooms in about the midpoint of the fingers and Paris stays under them

#### Scenario: Targets
- **WHEN** the reader looks at the controls on a phone
- **THEN** each is at least 44 px square, and a small point has a target of that size

#### Scenario: A narrow tab
- **WHEN** the tab is 320 px wide
- **THEN** nothing scrolls sideways and the scope row, the chip and the controls are all in the tab

#### Scenario: A hidden tab resized
- **WHEN** the map is zoomed and moved, its tab is behind another, the window is resized, and the tab is brought to the front
- **THEN** the map is at the same position and zoom

#### Scenario: The wheel
- **WHEN** the reader turns a mouse wheel over the map
- **THEN** the map zooms about the pointer

### Requirement: The map holds up at size

The map SHALL stay responsive in a file of twenty thousand people and some five thousand distinct places: it SHALL draw only the points, labels and tiles that fall within the view and a margin round it, SHALL make clusters of what it draws rather than of the file, SHALL NOT make a node for every place, and SHALL NOT make the file's model again for a pan, a zoom, a hover, a range or a search. Opening the map SHALL draw the first view before the places are all measured for labels. Changing the years range, typing in the search and panning SHALL redraw only what is in view.

#### Scenario: Five thousand places
- **WHEN** a file with five thousand places with coordinates is shown whole, at the zoom that fits the world
- **THEN** no more than a bounded number of marks, a few hundred, is in the document, and the map responds to a pan

#### Scenario: Panning
- **WHEN** the reader pans across the world at a zoom where thousands of places are drawn as clusters
- **THEN** only the clusters and points in view and a margin are in the document

#### Scenario: Narrowing a range at size
- **WHEN** the reader moves a range handle on that file
- **THEN** only what is in view is redrawn and the map does not lay the file out again
