import type { Range } from "@domorium/language-service";

import type { ViewKind } from "../src/desk/deskState";
import { mapSelection } from "../src/desk/fileMap";
import type { TableState, TileSettings } from "../src/desk/fileMapView";
import { FileViews, memoryToShow, type ViewMemory } from "../src/desk/fileViews";
import { listSelection } from "../src/desk/listRows";
import { setLanguage } from "../src/i18n";
import { parsePlacesTable } from "../src/desk/placesTable";
import { CURIE, curieWithMap, indexOf } from "../src/testing/curie";
import { installObsidianDom } from "../src/testing/obsidianDom";
import { stubSetIcon } from "./icons";

type Mode = ViewKind | "source";

export interface TabOptions {
  doc?: string;
  hidden?: boolean;
  mode?: Mode;
  memory?: ViewMemory;
  around?: string;
  dark?: boolean;
  phone?: boolean;
  touch?: boolean;
  language?: string;
  fixture?: "map";
  /** The text of the places table; null for none, nothing for one with no rows. */
  placesText?: string | null;
  tiles?: TileSettings;
}

export interface TabCalls {
  selected: string[];
  shownInSource: Range[];
  changed: number;
  tableActions: number;
  addedPlaces: string[][];
}

declare global {
  interface Window {
    tab: {
      mount(options: TabOptions): void;
      calls: TabCalls;
      views: FileViews | null;
      mode(): Mode;
      showMode(mode: Mode): void;
      select(xref: string | null, reveal: boolean): void;
      openSearch(): void;
      resized(): void;
      setHidden(hidden: boolean): void;
    };
  }
}

installObsidianDom();

const calls: TabCalls = { selected: [], shownInSource: [], changed: 0, tableActions: 0, addedPlaces: [] };
const NO_TILES: TileSettings = { enabled: false, template: null, invalid: false, attribution: "" };
let places: TableState = { status: "read", table: { rows: new Map() } };
let tiles: TileSettings = NO_TILES;
let views: FileViews | null = null;
let memory: ViewMemory = {};
let index = indexOf(CURIE);
let mode: Mode = "source";
let around: string | undefined;
let selected: string | null = null;
let touch = false;

function hand(xref: string | null, reveal: boolean): void {
  const person = xref !== null && index.person(xref) ? xref : null;
    views?.select("graph", person, reveal);
  views?.select("timeline", person, reveal);
  views?.select("list", listSelection(index, xref), reveal);
  views?.select("map", mapSelection(index, xref), reveal);
}

const element = (id: string): HTMLElement => {
  const found = document.getElementById(id);
  if (!found) {
    throw new Error(`harness: #${id} is missing`);
  }
  return found;
};

function hasBox(target: HTMLElement): boolean {
  return target.offsetWidth > 0 || target.offsetHeight > 0 || target.getClientRects().length > 0;
}

function draw(): void {
  const open = mode !== "source";
  if (!open) {
    views?.hide();
  }
  element("views").toggle(open);
  element("source").toggle(!open);
  if (mode === "source" || views === null) {
    return;
  }
  if (hasBox(element("leaf")) && hasBox(element("views"))) {
    views.show(mode, index, memoryToShow(views.memory(), memory), around);
  }
}

function markActive(): void {
  for (const each of ["graph", "timeline", "list", "map", "source"]) {
    element(`show-${each}`).classList.toggle("gedcom-mode-active", each === mode);
    element(`show-${each}`).setAttribute("aria-pressed", String(each === mode));
  }
}

function showMode(next: Mode): void {
  mode = next;
  markActive();
  if (mode !== "source") {
    hand(selected, true);
  }
  draw();
}

function mount(options: TabOptions): void {
  setLanguage(options.language ?? "en");
  touch = options.touch ?? false;
  const body = document.body;
  body.classList.toggle("theme-dark", options.dark ?? false);
  body.classList.toggle("theme-light", !(options.dark ?? false));
  body.classList.toggle("is-mobile", options.phone ?? false);
  body.classList.toggle("is-phone", options.phone ?? false);
  calls.selected = [];
  calls.shownInSource = [];
  calls.changed = 0;
  calls.tableActions = 0;
  calls.addedPlaces = [];
  places =
    options.placesText === null
      ? { status: "absent" }
      : { status: "read", table: parsePlacesTable(options.placesText ?? "") };
  tiles = options.tiles ?? NO_TILES;
  index = indexOf(options.doc ?? (options.fixture === "map" ? curieWithMap() : CURIE));
  memory = options.memory ?? {};
  around = options.around;
  selected = null;
  mode = options.mode ?? "source";
  markActive();
  const parent = element("views");
  parent.empty();
  views?.dispose();
  element("leaf").toggle(!(options.hidden ?? false));
  views = new FileViews(parent, {
    select: (xref) => {
      calls.selected.push(xref);
      selected = xref;
      hand(xref, false);
    },
    showInSource: (range) => {
      calls.shownInSource.push(range);
    },
    portrait: () => null,
    changed: () => {
      calls.changed += 1;
    },
    setIcon: stubSetIcon,
    coarsePointer: () => touch,
    places: () => places,
    placesAction: () => {
      calls.tableActions += 1;
    },
    addMissingPlaces: (names) => {
      calls.addedPlaces.push(names);
    },
    tiles: () => tiles,
  });
  window.tab.views = views;
  draw();
}

const wire = (id: string, run: () => void): void => {
  element(id).addEventListener("click", run);
};

wire("show-graph", () => showMode("graph"));
wire("show-timeline", () => showMode("timeline"));
wire("show-list", () => showMode("list"));
wire("show-map", () => showMode("map"));
wire("show-source", () => showMode("source"));
wire("select-pierre", () => window.tab.select("@I2@", true));
wire("select-irene", () => window.tab.select("@I12@", true));
wire("open-search", () => window.tab.openSearch());

window.tab = {
  mount,
  calls,
  views: null,
  mode: () => mode,
  showMode,
  select: (xref, reveal) => {
    selected = xref;
    hand(xref, reveal);
  },
  openSearch: () => {
    if (mode !== "source") {
      draw();
      views?.openSearch(mode);
    }
  },
  resized: draw,
  setHidden: (hidden) => {
    element("leaf").toggle(!hidden);
  },
};
