## Why

Issue #215 asks for "a map view of a GEDCOM file". A family file is full of places — a birth in Warsaw, an education in Paris, a Nobel Prize in Stockholm — and the plugin lists them as text only: the places section of a person card (`src/desk/timeline.ts:139`, `src/desk/personPage.ts:84`) and the place column of the list. `openspec/specs/genealogy-record-card/spec.md:339-342` says in so many words that no map is drawn and nothing is fetched. A reader cannot see where a family lived, where a branch moved, or which places a file never gives a position for. The graph, the timeline and the list are three modes of one tab that share one reading of the file and one selection; a map is the fourth way to read the same file, and the first that is spatial.

The constraint that shapes everything is that the plugin "makes no network request until you ask it to" (`README.md:233`) and "does not send vault data anywhere" (`openspec/config.yaml`): a map that looks places up by name would send a family's places to a stranger's server. So the map draws from coordinates the reader's own files carry, on an outline bundled with the plugin, and reaches the network only for tiles the reader switches on.

## The user's decisions (2026-11-05)

Recorded as given; they are not open.

1. Coordinates come from, in priority order: (a) `PLAC` > `MAP` > `LATI`/`LONG` in the file — the read model reads the syntax tree itself, so MAP is read locally without waiting for upstream `parsePlace` (check what @domorium/language-service 2.3.1 / validator 2.2.1 expose by probing the published packages in a scratch dir OUTSIDE the repo; if upstream is needed for something, say so and draft it for docs/design/upstream-issue-drafts.md, do not file); (b) a places table in the vault — a plain editable file next to the .ged (`<name>.places.md`, a Markdown table: Place | Latitude | Longitude; decide the exact format in the design, keep it hand-editable, parsed by pure code); (c) otherwise the place has no coordinates and is listed under "N places have no coordinates" (the counter opens that list so rows can be added to the table).
2. NO geocoder in the first version: no place name ever leaves the vault. Nothing is fetched unless the reader allows tiles.
3. Base map: an outline of the world bundled with the plugin (simplified coastlines, ~100-300 KB budget; bundle size must not grow by megabytes; decide the source (e.g. Natural Earth 110m, public domain) and how it is packed, with licence note) drawn in our own SVG/canvas with Web Mercator, no Leaflet/MapLibre. Map tiles from the internet only by a setting, OFF by default: a setting "Load map tiles from the web" plus a tile server URL template set by the reader (`{z}/{x}/{y}`), no default server baked in as a hidden fetch; the privacy text must say that enabled tiles send tile numbers and the IP to that server and place names go nowhere; tiles are drawn as an image layer in the same transform; attribution shown when tiles are on; the privacy README section and the "It makes no network request until you ask it to" claims stay true. Specify failure behaviour (server down, offline) and that tiles never block drawing points.
4. What is drawn: a point = a PLACE (not an event); size = number of events there; colour = the event kind's colour (as the timeline) when all events there are of one kind, otherwise neutral grey with the count; label = place name and the years there ("Paris · 1891–1934"), labels hidden when they would collide. Lines of moves only for a selected person or family, in order of years, with an arrow and small order numbers; no lines when nothing is selected. Selecting a person highlights their points and line and dims the rest (as the timeline). Click on a point: one record there → select it (the record card on the right shows it, same selection origin rules as the other views); several → a short explorer-style list (name, year + kind) in a popup, choosing a row selects that record. Places with no coordinates are not drawn, counted in the scope row.
5. Time: a collapsed floating chip "Years: all" at the bottom-left that expands into a two-handle RANGE slider (e.g. 1880–1920) with a clear (×) control, like the expanding search of the graph and timeline; it only filters points and lines, never changes the selection (the selected person stays while their events are within the range). Collapsed by default.
6. Reuse: the model of a file, the Branch scope bar ("Branch of <name>", 7 places · 18 events), floating search over places with counter and arrows, zoom buttons, selection marks, glide. Search over places: specify what it matches (place names) and how the view glides to a place.
7. Mobile: desktop and mobile; pan and pinch, 44 px touch targets, no Node built-ins in src/, no innerHTML; reduced motion respected.
8. Empty state when no place has coordinates: "No place has coordinates yet" explaining that none has MAP in the file or a row in the places table, with a button "Create the places table" (creates the file next to the .ged pre-filled with the file's distinct place names and empty coordinates; decide the exact behaviour and what happens if the file exists).
9. Out of scope: editing places/coordinates in the UI, routing/distances, any online service by default (geocoder included), historical borders and names.

## What Changes

- **A fifth mode, Map.** A GEDCOM tab is in Graph, Timeline, List, **Map** or Source mode. The header buttons read Graph, Timeline, List, Map, Source from the left, Source rightmost; a command **Show as map** and the tab's menu reach it; Map is not remembered as the last mode for other files (they open in the last non-Map mode), and a tab keeps its own mode; Map keeps its own scope, position and zoom per tab across switching modes and restarting.
- **Places drawn from coordinates the file or the vault carries.** The read model reads `PLAC > MAP > LATI/LONG` of every event of a person and a family (both published packages already hand these lines over as symbols, so nothing waits for upstream). A places table `<name>.places.md` beside the `.ged` gives coordinates to the places the file does not. A place with neither is not drawn and is counted, and the counter opens the list of such places.
- **A bundled outline of the world** in Web Mercator, drawn in the plugin's own SVG, from Natural Earth 110 m land (public domain), packed into a few tens of kilobytes. No map library.
- **Tiles only when asked for.** Two new settings, **Load map tiles from the web** (off) and **Tile server address** (a template with `{z}/{x}/{y}`, empty by default), and a third, **Tile attribution**. Nothing is fetched while the toggle is off or the template is empty or invalid; with it on, only the tiles in view are requested, they never delay the points, and a failing server leaves the outline showing.
- **What a point is.** One per place, sized by its events, coloured by the kind of its events (the timeline's colours) or grey with a count where kinds differ; labelled `Paris · 1891–1934` where the label fits; places that overlap on screen merge into a cluster that a click opens up. A click selects the record there or lists the records in a popup.
- **Moves.** A selected person or family gets a numbered, arrowed line through their places in order of years; nothing selected, no line; the rest dims.
- **Time.** A collapsed chip, **Years: all**, expands into a two-handle range that filters points and lines and never touches the selection.
- **Reused parts.** The branch scope bar, the floating search (over place names, with a counter and arrows, gliding to the place), zoom buttons, the glide and reduced-motion rule, the pinch and wheel input, the selection hand-over and the record card.
- **Empty state.** *No place has coordinates yet*, with **Create the places table**.
- **A list alternative.** A places panel on the map lists every place, mapped or not, as keyboard-reachable rows; the map itself steps through places with the arrow keys.
- **Privacy and README.** The README Privacy section names tiles as the second thing a reader can ask for; the record-card sentence "No map SHALL be drawn and nothing SHALL be fetched" is reworded to point to the map.

Repository or upstream: **this repository only.** Parsing and the language service are not touched; what 2.3.1 and 2.2.1 answer is enough (see `design.md`, *Upstream*). The existing draft `docs/design/upstream-issue-drafts.md:150` (`readPlace`) would later replace the local coordinate reader and is not a precondition.

## Capabilities

### New Capabilities

- `genealogy-map`: the Map mode of a GEDCOM tab — where coordinates come from, the places table, the bundled outline and optional tiles, what a point, a label, a cluster and a line are, the years range, selection, search, the empty state, keyboard and screen-reader access, behaviour on a phone and at size, the settings and the privacy promise.

### Modified Capabilities

- `genealogy-view`: five modes instead of four; the mode control, the **Show as map** command, the last-mode rule, the commands that follow the mode, the shared reading of the file, the genealogy interface being off, links into a record, and the selection opening the record card all name Map.
- `genealogy-record-card`: the card opens on a selection made in Map as in the other views, the empty card names the map, and the places section no longer says that no map is drawn.
- `genealogy-read-model`: an event's place carries the coordinates its `MAP` states.

## What a reader of the product should know

The places table `<name>.places.md` is a note the reader owns that holds coordinates outside the GEDCOM file. It does not convert records, never shadows the file (a `MAP` in the file wins) and is created or extended only by a button. This is accepted as consistent with the file being the source of truth and with `CLAUDE.md`'s "no second genealogy database"; `PRODUCT.md` is updated to say so.

## Non-goals

- Editing a place or its coordinates from the UI; the places table is edited as any note is.
- A geocoder, reverse geocoder or any lookup of a place name, local or remote.
- Routing, distances, travel times, areas.
- Historical borders and historical place names; the outline is today's land, with no borders and no labels.
- A map library (Leaflet, MapLibre, OpenLayers) and any new runtime dependency.
- A world that wraps horizontally, a globe, 3D, rotation, vector or raster tiles other than the `{z}/{x}/{y}` image kind.
- Reading the file's `HEAD.PLAC.FORM` or splitting a place into jurisdictions; a place is the text the file writes, as everywhere else in the plugin.
- A place index across several files, or a table shared by several files.
- Raising `minAppVersion`.

## Impact

Consumers, with the code they sit in:

- **Read model**: `src/genealogy/events.ts:20-30` (`eventsOf` reads `PLAC` as one string), `src/genealogy/types.ts:14-25` (`PersonEvent`), and its tests beside `src/genealogy/index.test.ts`, `src/genealogy/fixture.ts`.
- **Desk state and modes**: `src/settingsData.ts:5` (`DESK_MODES`, `DeskMode`, `readDeskMode`), `src/desk/deskState.ts:18-33,94-115,117-145` (`ViewKind`, `DeskState`, `MODE_LOOKS`, `isViewMode`, `openingMemory`), `src/desk/tabModes.ts`, `src/desk/sidePanels.ts`, `src/desk/followRules.ts`.
- **Views**: `src/desk/fileViews.ts:13-272` (the `kind` registry, `ViewMemory`, `parkOthers`, `memory()`, `reset()`), `src/desk/fileGraphView.ts` and `src/desk/graphInput.ts:2` (zoom limits are `graphCanvas`'s `ZOOM`), `src/desk/floatingSearch.ts`, `src/desk/branchScope.ts`, `src/desk/dom.ts` (`zoomControls`, `placeInside`, `prefersReducedMotion`), `src/desk/fileTimeline.ts:117` (`kindOf`, to be exported).
- **The tab and the plugin**: `src/GedcomView.ts` (`memory`/`getState`/`setState`, `markInViews` at 572-579, `clearViewSelections` at 765-769, mode actions at 181, `renderMode`, the places table read), `src/main.ts` (a `vault.on("rename" | "modify" | "create" | "delete")` for the table, `commandHost`, the settings), `src/commands.ts:119` (`DESK_MODES.map(showAs)`), `src/api.ts` only if the model's event shape is exposed (it is not today).
- **Settings**: `src/settingsData.ts`, `src/settingDefinitions.ts`, `src/settings.ts` (a text control and the legacy `render`), `src/settings.test.ts`.
- **Strings**: `src/i18n/en.json`, `src/i18n/ru.json`, `src/i18n/i18n.test.ts`.
- **Styles**: `styles.css` (`gedcom-map-*`, `.gedcom-views-root.is-map`).
- **Harness and specs**: `harness/fileViews.ts` (a `map` mode of the stand-in tab), a new `harness/fileMap.ts` and `harness/fileMap.html`, `harness/build.mjs:3` (the entry list), `tests/fileMap.spec.ts` (new), `tests/fileViews.spec.ts`, `tests/header.spec.ts` (the order of the mode buttons), `tests/theme.spec.ts`, `tests/desk.spec.ts` (the empty-card text), `tests/generated.ts` (no `PLAC` at all: a new generator with places and coordinates for the large file), `src/desk/floatingSearch.ts` (label, placeholder and counter-text options), `src/desk/recordCard.test.ts` (the empty-card text), `eslint.config.mjs` (`scripts/**` ignored).
- **Documents**: `README.md` (the modes, the places table, the tile settings, the Privacy section at 227), `CLAUDE.md` (a row in the *minimum app version* table, see `design.md`), `demo-vault/` (a `curie.places.md` and `MAP` on a few places, so the demo draws), `PRODUCT.md` (the network rule and Principle 1), `docs/design/research-desk.md:58` and `docs/design/next-steps.md:15` (the old open decision on the map), `docs/design/upstream-issue-drafts.md` only if a later need arises (none now).
- **Dependencies**: none added; `@domorium/*` stay at 2.3.0 / 2.3.1 / 2.2.1. The outline is data in the bundle: a generated module of 11–14 KB of base64 (110 m land; 40 KB is a ceiling).
- **`minAppVersion`**: stays 1.8.7. No API above it is used; the tile rows of the settings are always shown, which declines `visible`/`update()` once more (1.13.0).
