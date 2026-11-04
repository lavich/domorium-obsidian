import type { BranchScope } from "../src/desk/branchScope";
import { fileTimelineOf, initialFocus } from "../src/desk/fileTimeline";
import { FileGraphBoard, type GraphView } from "../src/desk/fileGraphView";
import { setLanguage } from "../src/i18n";
import { CURIE, curieWithEvents, indexOf } from "../src/testing/curie";
import { installObsidianDom } from "../src/testing/obsidianDom";
import { stubSetIcon } from "./icons";

export interface GraphOptions {
  /** A GEDCOM text; `curie.ged` where none is given. */
  doc?: string;
  /** Curie with the events the timeline harness shows, for a screenshot. */
  events?: boolean;
  /** The person the tab the graph is opened from shows. */
  around?: string;
  /** Shows a large file whole rather than on a branch, as Whole file does. */
  whole?: boolean;
  scope?: Partial<BranchScope>;
  view?: GraphView;
  dark?: boolean;
  phone?: boolean;
  language?: string;
  /** The approximate Obsidian palette, for looking at rather than asserting on. */
  realistic?: boolean;
}

export interface GraphCalls {
  opened: string[];
  views: GraphView[];
  scopes: BranchScope[];
}

declare global {
  interface Window {
    graph: {
      /** Answers how long the model, the layout and the first drawing took, after the file was read. */
      mount(options: GraphOptions): number;
      calls: GraphCalls;
      board: FileGraphBoard | null;
    };
  }
}

installObsidianDom();

const calls: GraphCalls = { opened: [], views: [], scopes: [] };

function mount(options: GraphOptions): number {
  setLanguage(options.language ?? "en");
  const body = document.body;
  body.classList.toggle("theme-dark", options.dark ?? false);
  body.classList.toggle("theme-light", !(options.dark ?? false));
  body.classList.toggle("realistic", options.realistic ?? false);
  body.classList.toggle("is-mobile", options.phone ?? false);
  body.classList.toggle("is-phone", options.phone ?? false);
  calls.opened = [];
  calls.views = [];
  calls.scopes = [];
  const index = indexOf(options.doc ?? (options.events ? curieWithEvents() : CURIE));
  const started = performance.now();
  const focus = options.whole ? undefined : initialFocus(index, options.around);
  const parent = document.getElementById("graph");
  if (!parent) {
    throw new Error("harness: #graph is missing");
  }
  parent.empty();
  const board = new FileGraphBoard(parent, {
    openRecord: (xref) => {
      calls.opened.push(xref);
    },
    stateChanged: ({ scope, view }) => {
      calls.scopes.push(scope);
      if (view) {
        calls.views.push(view);
      }
    },
    setIcon: stubSetIcon,
    portrait: (xref) => {
      const file = index.person(xref)?.portrait?.file;
      return file && !file.startsWith("http")
        ? { kind: "image", url: `../demo-vault/${file}`, name: file, title: file }
        : null;
    },
  });
  board.show(fileTimelineOf(index), {
    scope: { up: 2, down: 2, ...(focus === undefined ? {} : { focus }), ...options.scope },
    ...(options.around === undefined ? {} : { around: options.around }),
    ...(options.view === undefined ? {} : { view: options.view }),
  });
  board.resized();
  window.graph.board = board;
  return performance.now() - started;
}

window.graph = { mount, calls, board: null };
