import type { Range } from "@domorium/language-service";

import { fileTimelineOf, initialFocus } from "../src/desk/fileTimeline";
import { FileTimelineBoard, readTimelineState, type TimelineScope } from "../src/desk/fileTimelineView";
import { setLanguage } from "../src/i18n";
import { curieWithEvents, indexOf } from "../src/testing/curie";
import { installObsidianDom } from "../src/testing/obsidianDom";
import { stubSetIcon } from "./icons";

export interface TimelineOptions {
  /** A GEDCOM text; `curieWithEvents()` where none is given. */
  doc?: string;
  /** The person the tab the timeline is opened from shows. */
  around?: string;
  /** Shows a large file whole rather than on a branch, as Whole file does. */
  whole?: boolean;
  scope?: Partial<TimelineScope>;
  dark?: boolean;
  phone?: boolean;
  language?: string;
  /** The approximate Obsidian palette, for looking at rather than asserting on. */
  realistic?: boolean;
}

export interface TimelineCalls {
  opened: string[];
  shownInSource: Range[];
  scopes: TimelineScope[];
}

declare global {
  interface Window {
    timeline: {
      mount(options: TimelineOptions): number;
      calls: TimelineCalls;
    };
  }
}

installObsidianDom();

const calls: TimelineCalls = { opened: [], shownInSource: [], scopes: [] };

function mount(options: TimelineOptions): number {
  const started = performance.now();
  setLanguage(options.language ?? "en");
  const body = document.body;
  body.classList.toggle("theme-dark", options.dark ?? false);
  body.classList.toggle("theme-light", !(options.dark ?? false));
  body.classList.toggle("realistic", options.realistic ?? false);
  body.classList.toggle("is-mobile", options.phone ?? false);
  body.classList.toggle("is-phone", options.phone ?? false);
  calls.opened = [];
  calls.shownInSource = [];
  calls.scopes = [];
  const index = indexOf(options.doc ?? curieWithEvents());
  const focus = options.whole ? undefined : initialFocus(index, options.around);
  const scope = {
    ...readTimelineState(focus === undefined ? null : { focus }),
    ...options.scope,
  };
  const parent = document.getElementById("timeline");
  if (!parent) {
    throw new Error("harness: #timeline is missing");
  }
  parent.empty();
  const board = new FileTimelineBoard(parent, {
    select: (xref) => {
      calls.opened.push(xref);
    },
    showInSource: (range) => {
      calls.shownInSource.push(range);
    },
    scopeChanged: (changed) => {
      calls.scopes.push(changed);
    },
    setIcon: stubSetIcon,
  });
  board.show(fileTimelineOf(index), scope);
  return performance.now() - started;
}

window.timeline = { mount, calls };
