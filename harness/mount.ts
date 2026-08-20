import { nextDiagnostic, openLintPanel } from "@codemirror/lint";
import { hoveredPointer } from "@domorium/codemirror";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import {
  EditorLanguageService,
  type RecordPreview,
} from "@domorium/codemirror";

import { createGedcomComposition } from "../src/editor/composition";
import {
  matchesBinding,
  type SearchKeyBinding,
} from "../src/editor/searchKeys";
import { openSearch } from "../src/editor/searchPanel";
import { previewGesture } from "../src/editor/previewGesture";
import type { RecordPreviewTrigger } from "../src/settingsData";
import { stubSetIcon } from "./icons";

export interface HarnessOptions {
  doc: string;
  dark?: boolean;
  diagnostics?: boolean;
  indentationHints?: boolean;
  recordPreview?: RecordPreviewTrigger;
  mobile?: boolean;
  /** Height iOS reports as the bottom inset while the keyboard is up. */
  keyboard?: number;
}

export interface HarnessCalls {
  previews: { from: number; to: number }[];
  hides: number;
  links: string[];
}

declare global {
  interface Window {
    gedcom: {
      mount(options: HarnessOptions): void;
      calls: HarnessCalls;
      view: EditorView | undefined;
      openProblems(): void;
      nextProblem(): void;
      hoveredSpan(): { from: number; to: number } | null;
      openSearch(replace?: boolean): void;
      classOf(selector: string): string | null;
      rectOf(selector: string): DOMRect | null;
      coordsAt(offset: number): { x: number; y: number } | null;
    };
  }
}

const calls: HarnessCalls = { previews: [], hides: 0, links: [] };
let view: EditorView | undefined;

/*
 * What app.keymap does for the plugin, standing in the same place in the
 * bubble: a scope answers on the document, so CodeMirror has already seen the
 * key on contentDOM by the time it arrives here. The matching itself is the
 * plugin's own, so a spec drives the shipped table.
 */
// Not the userAgent: Playwright's "Desktop Chrome" emulates a Windows one,
// while its ControlOrMeta follows the host, and platform is what still agrees.
const mac = navigator.platform.includes("Mac");

function pushScope(bindings: SearchKeyBinding[]): () => void {
  const handle = (event: KeyboardEvent): void => {
    const binding = bindings.find((candidate) =>
      matchesBinding(event, candidate, mac),
    );
    if (binding?.run()) {
      event.preventDefault();
      event.stopPropagation();
    }
  };
  document.addEventListener("keydown", handle);
  return () => {
    document.removeEventListener("keydown", handle);
  };
}

function mount(options: HarnessOptions): void {
  view?.destroy();
  calls.previews = [];
  calls.hides = 0;
  calls.links = [];

  const parent = document.getElementById("editor");
  if (!parent) {
    throw new Error("harness: #editor is missing");
  }
  parent.replaceChildren();
  document.body.className = [
    options.dark ? "theme-dark" : "theme-light",
    ...(options.mobile
      ? ["is-mobile", "is-phone", "auto-full-screen", "is-floating-nav"]
      : []),
  ].join(" ");
  document.body.style.setProperty(
    "--keyboard-height",
    `${options.keyboard ?? 0}px`,
  );

  const language = new EditorLanguageService();
  const settings = {
    diagnostics: options.diagnostics ?? true,
    indentationHints: options.indentationHints ?? true,
  };

  view = new EditorView({
    parent,
    state: EditorState.create({
      doc: options.doc,
      extensions: createGedcomComposition({
        language,
        settings,
        dark: options.dark ?? false,
        gesture: previewGesture(
          options.recordPreview ?? "modifier",
          (event) => event.metaKey || event.ctrlKey,
        ),
        panel: { setIcon: stubSetIcon, pushScope },
        actions: {
          applyWorkspaceEdit: () => true,
          openDocumentLink: (link) => {
            calls.links.push(link.targetText);
          },
        },
        showPreview: (preview: RecordPreview) => {
          calls.previews.push({
            from: preview.pointer.from,
            to: preview.pointer.to,
          });
        },
        hidePreview: () => {
          calls.hides += 1;
        },
      }),
    }),
  });
  window.gedcom.view = view;
}

window.gedcom = {
  mount,
  calls,
  view: undefined,
  openProblems: () => {
    if (view) {
      openLintPanel(view);
    }
  },
  nextProblem: () => {
    if (view) {
      nextDiagnostic(view);
    }
  },
  hoveredSpan: () => (view ? hoveredPointer(view.state) : null),
  openSearch: (replace = false) => {
    if (view) {
      openSearch(view, replace);
    }
  },
  classOf: (selector) =>
    document.querySelector(selector)?.getAttribute("class") ?? null,
  rectOf: (selector) => {
    const element = document.querySelector(selector);
    return element ? element.getBoundingClientRect() : null;
  },
  coordsAt: (offset) => {
    if (!view) {
      return null;
    }
    const coords = view.coordsAtPos(offset);
    return coords
      ? {
          x: (coords.left + coords.right) / 2,
          y: (coords.top + coords.bottom) / 2,
        }
      : null;
  },
};

const SAMPLES: Record<string, string> = {
  small: [
    "0 HEAD",
    "1 GEDC",
    "2 VERS 7.0",
    "0 @I1@ INDI",
    "1 NAME John /Smith/",
    "1 FAMS @F1@",
    "0 @F1@ FAM",
    "1 HUSB @I1@",
    "1 NCHI abc",
    "0 TRLR",
    "",
  ].join("\n"),
  problems: [
    "0 HEAD",
    "1 GEDC",
    "2 VERS 7.0",
    "0 @I1@ INDI",
    "1 NAME",
    "1 FOO bar",
    "1 FAMC @F9@",
    "1 NCHI abc",
    "0 @F1@ FAM",
    "1 HUSB @I1@",
    "1 CHIL @I7@",
    "0 TRLR",
    "",
  ].join("\n"),
  "no version": ["0 HEAD", "1 SOUR Domorium", "0 TRLR", ""].join("\n"),
};

function playground(): void {
  const controls = document.getElementById("controls");
  if (!controls) {
    return;
  }
  const sample = controls.querySelector<HTMLSelectElement>("#sample")!;
  const dark = controls.querySelector<HTMLInputElement>("#dark")!;
  const diagnostics = controls.querySelector<HTMLInputElement>("#diagnostics")!;
  const hints = controls.querySelector<HTMLInputElement>("#hints")!;
  const realistic = controls.querySelector<HTMLInputElement>("#realistic")!;

  for (const name of Object.keys(SAMPLES)) {
    sample.append(new Option(name, name));
  }

  const apply = (): void => {
    mount({
      doc: SAMPLES[sample.value],
      dark: dark.checked,
      diagnostics: diagnostics.checked,
      indentationHints: hints.checked,
    });
    document.body.classList.toggle("realistic", realistic.checked);
  };
  for (const input of [sample, dark, diagnostics, hints, realistic]) {
    input.addEventListener("change", apply);
  }
  controls
    .querySelector<HTMLButtonElement>("#problems")!
    .addEventListener("click", () => {
      window.gedcom.openProblems();
    });
  controls
    .querySelector<HTMLButtonElement>("#search")!
    .addEventListener("click", () => {
      window.gedcom.openSearch();
    });
  apply();
}

playground();
