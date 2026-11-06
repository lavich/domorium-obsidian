import type { Range } from "@domorium/language-service";

import type { ViewKind } from "../src/desk/deskState";
import { FileViews, memoryToShow, type ViewMemory } from "../src/desk/fileViews";
import { listSelection } from "../src/desk/listRows";
import { setLanguage } from "../src/i18n";
import { CURIE, curieWithEvents, indexOf } from "../src/testing/curie";
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
  events?: boolean;
}

export interface TabCalls {
  selected: string[];
  shownInSource: Range[];
  changed: number;
}

declare global {
  interface Window {
    tab: {
      mount(options: TabOptions): void;
      calls: TabCalls;
      views: FileViews | null;
      mode(): Mode;
      showMode(mode: Mode): void;
      select(xref: string | null, reveal: boolean, fromCard?: boolean): void;
      openSearch(): void;
      resized(): void;
      setHidden(hidden: boolean): void;
    };
  }
}

installObsidianDom();

const calls: TabCalls = { selected: [], shownInSource: [], changed: 0 };
let views: FileViews | null = null;
let memory: ViewMemory = {};
let index = indexOf(CURIE);
let mode: Mode = "source";
let around: string | undefined;
let selected: string | null = null;
let touch = false;

function hand(xref: string | null, reveal: boolean, fromCard = false): void {
  const person = xref !== null && index.person(xref) ? xref : null;
    views?.select("graph", person, reveal);
  views?.select("timeline", person, reveal);
  views?.select("list", listSelection(index, xref), reveal, fromCard);
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
  for (const each of ["graph", "timeline", "list", "source"]) {
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
  index = indexOf(options.doc ?? (options.events ? curieWithEvents() : CURIE));
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
    changed: () => {
      calls.changed += 1;
      memory = { ...memory, ...views?.memory() };
    },
    setIcon: stubSetIcon,
    coarsePointer: () => touch,
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
  select: (xref, reveal, fromCard = false) => {
    selected = xref;
    hand(xref, reveal, fromCard);
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
