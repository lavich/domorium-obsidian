import { nextDiagnostic, openLintPanel } from "@codemirror/lint";
import { hoveredPointer } from "@domorium/codemirror";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import {
  EditorLanguageService,
  type RecordPreview,
} from "@domorium/codemirror";

import { createGedcomComposition } from "../src/editor/composition";
import { mediaPreviewContent, previewBounds } from "../src/editor/media";
import { renderMediaPreview } from "../src/editor/mediaPreviewView";
import {
  matchesBinding,
  type SearchKeyBinding,
} from "../src/editor/searchKeys";
import { openSearch } from "../src/editor/searchPanel";
import { hoverDelay, previewGesture } from "../src/editor/previewGesture";
import {
  DEFAULT_SETTINGS,
  type RecordPreviewTrigger,
} from "../src/settingsData";
import { stubSetIcon } from "./icons";

export interface HarnessOptions {
  doc: string;
  dark?: boolean;
  diagnostics?: boolean;
  indentationHints?: boolean;
  recordPreview?: RecordPreviewTrigger;
  mediaPreview?: RecordPreviewTrigger;
  /** Vault path to the image bytes a resolver should answer with. */
  media?: Record<string, string>;
  /** Narrow the pane, so a spec can tell the pane from the window. */
  pane?: number;
  /** Hold every image load until the spec releases it. */
  holdImages?: boolean;
  mobile?: boolean;
  /** Height iOS reports as the bottom inset while the keyboard is up. */
  keyboard?: number;
}

export interface HarnessCalls {
  previews: { from: number; to: number }[];
  hides: number;
  links: string[];
  media: string[];
  mediaHides: number;
  /** Every url an image element was pointed at, so a spec can prove no fetch. */
  requested: string[];
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
      releaseImages(): void;
      openSearch(replace?: boolean): void;
      classOf(selector: string): string | null;
      rectOf(selector: string): DOMRect | null;
      coordsAt(offset: number): { x: number; y: number } | null;
    };
  }
}

const calls: HarnessCalls = {
  previews: [],
  hides: 0,
  links: [],
  media: [],
  mediaHides: 0,
  requested: [],
};
let view: EditorView | undefined;
let popover: HTMLElement | null = null;
let held: (() => void)[] = [];

/** Images a spec names instead of carrying bytes of its own. */
const IMAGES: Record<string, string> = {
  pixel:
    "data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==",
  photo:
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="80">' +
        '<rect width="120" height="80" fill="#8899aa"/></svg>',
    ),
  // One red rectangle on a plain ground: which part of the picture is shown is
  // then a question with an answer.
  target: painted(600, 400, 200, 100, 200, 150),
  // The same, far larger than any bound, for a rectangle that has to shrink.
  scan: painted(3000, 2000, 600, 400, 1200, 900),
  // Wide enough that the bound's width binds, which is where a popover of its
  // own width cuts a picture off.
  wide: painted(1600, 400, 400, 100, 800, 200),
  /** Bytes no decoder accepts, for the file that exists and cannot be drawn. */
  broken: "data:image/png;base64,AAAAAAAA",
};

function painted(
  width: number,
  height: number,
  left: number,
  top: number,
  region: number,
  tall: number,
): string {
  return (
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">` +
        `<rect width="${width}" height="${height}" fill="#224466"/>` +
        `<rect x="${left}" y="${top}" width="${region}" height="${tall}" fill="#ff0000"/>` +
        "</svg>",
    )
  );
}

function imageSource(bytes: string): string {
  return IMAGES[bytes] ?? bytes;
}

/** What `Keymap.isModifier(event, "Mod")` answers in the plugin. */
function modifier(event: MouseEvent | KeyboardEvent): boolean {
  return event.metaKey || event.ctrlKey;
}

function closeMedia(): void {
  popover?.remove();
  popover = null;
}

/*
 * What app.keymap does for the plugin, standing in the same place in the
 * bubble: Obsidian's Keymap listens on `window` in the capture phase, so a
 * scope sees a key *before* CodeMirror's handlers on contentDOM, and claiming
 * one keeps the editor from acting on it. The matching itself is the plugin's
 * own, so a spec drives the shipped table.
 */
// Not the userAgent: Playwright's "Desktop Chrome" emulates a Windows one,
// while its ControlOrMeta follows the host, and platform is what still agrees.
const mac = navigator.platform.includes("Mac");

function pushScope(bindings: SearchKeyBinding[]): () => void {
  const handle = (event: KeyboardEvent): void => {
    const binding = bindings.find((candidate) =>
      matchesBinding(event, candidate, mac),
    );
    if (binding?.run(event)) {
      event.preventDefault();
      event.stopPropagation();
    }
  };
  window.addEventListener("keydown", handle, true);
  return () => {
    window.removeEventListener("keydown", handle, true);
  };
}

function mount(options: HarnessOptions): void {
  view?.destroy();
  calls.previews = [];
  calls.hides = 0;
  calls.links = [];
  calls.media = [];
  calls.mediaHides = 0;
  calls.requested = [];
  closeMedia();
  held = [];

  // The shipped defaults, so a spec that names no trigger gets what a reader does.
  const record = options.recordPreview ?? DEFAULT_SETTINGS.recordPreview;
  const media = options.mediaPreview ?? DEFAULT_SETTINGS.mediaPreview;

  const parent = document.getElementById("editor");
  if (!parent) {
    throw new Error("harness: #editor is missing");
  }
  parent.replaceChildren();
  parent.style.width = options.pane ? `${options.pane}px` : "";
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
        gesture: previewGesture(record, modifier),
        mediaGesture: previewGesture(media, modifier),
        delay: hoverDelay(record),
        mediaDelay: hoverDelay(media),
        modifierHeld: modifier,
        panel: { setIcon: stubSetIcon, pushScope, mac },
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
        showMedia: (media, _view, event) => {
          calls.media.push(media.targetText);
          closeMedia();
          const host = document.createElement("div");
          host.className = "popover hover-popover gedcom-media-popover";
          const target = (event.target as HTMLElement | null) ?? parent;
          const rect = target.getBoundingClientRect();
          host.style.position = "fixed";
          host.style.left = `${rect.left}px`;
          host.style.top = `${rect.bottom}px`;
          document.body.append(host);
          popover = host;
          const content = mediaPreviewContent(media, {
            documentPath: "tree.ged",
            resolve: (path) => {
              const bytes = (options.media ?? {})[path];
              return bytes === undefined ? null : imageSource(bytes);
            },
          });
          renderMediaPreview(content, {
            container: host,
            bounds: previewBounds(parent.clientWidth, parent.clientHeight),
            setIcon: stubSetIcon,
            isCurrent: () => popover === host,
          });
          for (const image of host.querySelectorAll("img")) {
            calls.requested.push(image.getAttribute("src") ?? "");
            if (options.holdImages) {
              const source = image.getAttribute("src") ?? "";
              image.removeAttribute("src");
              held.push(() => {
                image.setAttribute("src", source);
              });
            }
          }
        },
        hideMedia: () => {
          calls.mediaHides += 1;
          closeMedia();
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
  releaseImages: () => {
    const pending = held;
    held = [];
    for (const release of pending) {
      release();
    }
  },
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
