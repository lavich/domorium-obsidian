import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import {
  EditorLanguageService,
  type RecordPreview,
} from "@domorium/codemirror";

import { createGedcomComposition } from "../src/editor/composition";

export interface HarnessOptions {
  doc: string;
  dark?: boolean;
  diagnostics?: boolean;
  indentationHints?: boolean;
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
