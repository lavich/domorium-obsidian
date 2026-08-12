import { openLintPanel } from "@codemirror/lint";
import { openSearchPanel } from "@codemirror/search";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import {
  EditorLanguageService,
  type RecordPreview,
} from "@domorium/codemirror";

import { createGedcomComposition } from "../src/editor/composition";
import { previewGesture } from "../src/editor/previewGesture";
import type { RecordPreviewTrigger } from "../src/settingsData";
import { stubSetIcon } from "./icons";

export interface HarnessOptions {
  doc: string;
  dark?: boolean;
  diagnostics?: boolean;
  indentationHints?: boolean;
  recordPreview?: RecordPreviewTrigger;
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
      openSearch(): void;
      classOf(selector: string): string | null;
      rectOf(selector: string): DOMRect | null;
      coordsAt(offset: number): { x: number; y: number } | null;
    };
  }
}

const calls: HarnessCalls = { previews: [], hides: 0, links: [] };
let view: EditorView | undefined;

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
  document.body.className = options.dark ? "theme-dark" : "theme-light";

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
        setIcon: stubSetIcon,
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
  openSearch: () => {
    if (view) {
      openSearchPanel(view);
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
      ? { x: (coords.left + coords.right) / 2, y: (coords.top + coords.bottom) / 2 }
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
