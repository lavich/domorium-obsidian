import type { Range } from "@domorium/language-service";

import type { ViewKind } from "../src/desk/deskState";
import { FileViews, memoryToShow, type ViewMemory } from "../src/desk/fileViews";
import { setLanguage } from "../src/i18n";
import { CURIE, indexOf } from "../src/testing/curie";
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
      select(xref: string | null, reveal: boolean): void;
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

function showMode(next: Mode): void {
  mode = next;
  if (mode !== "source") {
    views?.select(mode, selected, false);
  }
  draw();
}

function mount(options: TabOptions): void {
  setLanguage("en");
  const body = document.body;
  body.classList.toggle("theme-dark", options.dark ?? false);
  body.classList.toggle("theme-light", !(options.dark ?? false));
  body.classList.toggle("is-mobile", options.phone ?? false);
  body.classList.toggle("is-phone", options.phone ?? false);
  calls.selected = [];
  calls.shownInSource = [];
  calls.changed = 0;
  index = indexOf(options.doc ?? CURIE);
  memory = options.memory ?? {};
  around = options.around;
  selected = null;
  mode = options.mode ?? "source";
  const parent = element("views");
  parent.empty();
  views?.dispose();
  element("leaf").toggle(!(options.hidden ?? false));
  views = new FileViews(parent, {
    select: (xref) => {
      calls.selected.push(xref);
    },
    showInSource: (range) => {
      calls.shownInSource.push(range);
    },
    portrait: () => null,
    changed: () => {
      calls.changed += 1;
    },
    setIcon: stubSetIcon,
  });
  window.tab.views = views;
  draw();
}

const wire = (id: string, run: () => void): void => {
  element(id).addEventListener("click", run);
};

wire("show-graph", () => showMode("graph"));
wire("show-timeline", () => showMode("timeline"));
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
    views?.select("graph", xref, reveal);
    views?.select("timeline", xref, reveal);
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
