import type { Range } from "@domorium/language-service";

import type { ViewKind } from "../src/desk/deskState";
import { FileViews, type ViewMemory } from "../src/desk/fileViews";
import { setLanguage } from "../src/i18n";
import { CURIE, indexOf } from "../src/testing/curie";
import { installObsidianDom } from "../src/testing/obsidianDom";
import { stubSetIcon } from "./icons";

type Mode = ViewKind | "source";

export interface TabOptions {
  doc?: string;
  /** The tab starts out behind another one, as a tab restored with the workspace does. */
  hidden?: boolean;
  mode?: Mode;
  memory?: ViewMemory;
  around?: string;
  dark?: boolean;
  phone?: boolean;
}

export interface TabCalls {
  opened: string[];
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
      select(xref: string | null): void;
      openSearch(): void;
      /** What the tab does when Obsidian tells it that it was resized or brought forward. */
      resized(): void;
      setHidden(hidden: boolean): void;
    };
  }
}

installObsidianDom();

const calls: TabCalls = { opened: [], shownInSource: [], changed: 0 };
let views: FileViews | null = null;
let memory: ViewMemory = {};
let index = indexOf(CURIE);
let mode: Mode = "source";
let around: string | undefined;

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
  element("views").toggle(open);
  element("source").toggle(!open);
  if (mode === "source" || views === null) {
    views?.hide();
    return;
  }
  if (hasBox(element("leaf")) && hasBox(element("views"))) {
    views.show(mode, index, { ...memory, ...views.memory() }, around);
  }
}

function showMode(next: Mode): void {
  if (next !== mode) {
    views?.select("graph", null);
    views?.select("timeline", null);
  }
  mode = next;
  draw();
}

function mount(options: TabOptions): void {
  setLanguage("en");
  const body = document.body;
  body.classList.toggle("theme-dark", options.dark ?? false);
  body.classList.toggle("theme-light", !(options.dark ?? false));
  body.classList.toggle("is-mobile", options.phone ?? false);
  body.classList.toggle("is-phone", options.phone ?? false);
  calls.opened = [];
  calls.shownInSource = [];
  calls.changed = 0;
  index = indexOf(options.doc ?? CURIE);
  memory = options.memory ?? {};
  around = options.around;
  mode = options.mode ?? "source";
  const parent = element("views");
  parent.empty();
  views?.dispose();
  element("leaf").toggle(!(options.hidden ?? false));
  views = new FileViews(parent, {
    openRecord: (xref) => {
      calls.opened.push(xref);
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
wire("select-pierre", () => window.tab.select("@I2@"));
wire("select-irene", () => window.tab.select("@I12@"));
wire("open-search", () => window.tab.openSearch());

window.tab = {
  mount,
  calls,
  views: null,
  mode: () => mode,
  showMode,
  select: (xref) => {
    if (mode !== "source" && views) {
      views.select(mode, xref);
    }
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
