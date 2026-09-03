import type { Extension } from "@codemirror/state";
import { EditorView, ViewPlugin } from "@codemirror/view";
import type { EditorLanguageService } from "@domorium/codemirror";
import type { MediaReference } from "@domorium/language-service";

import { mediaLineAt } from "./mediaLine";

export interface MediaPreviewHoverOptions {
  language: EditorLanguageService;
  /** Whether an event asks for a preview. Defaults to the platform modifier. */
  trigger?: (event: MouseEvent) => boolean;
  /** How long the pointer must rest before a preview opens. */
  delay?: number;
  show(media: MediaReference, view: EditorView, event: MouseEvent): void;
  hide(view: EditorView): void;
}

export interface MediaTransition {
  action: "show" | "hide" | "keep";
  shown: number | null;
}

/**
 * Keyed by the line, not by the file: two links to one photograph name the same
 * file and different rectangles, so moving between them must reopen.
 */
export function mediaTransition(
  shown: number | null,
  line: number | null,
): MediaTransition {
  if (line === null) {
    return shown === null
      ? { action: "keep", shown: null }
      : { action: "hide", shown: null };
  }
  return shown === line
    ? { action: "keep", shown }
    : { action: "show", shown: line };
}

/** What one editor is showing. Beside the view, so anything holding it can close it. */
export class MediaHoverSession {
  private shown: number | null = null;

  constructor(private readonly options: MediaPreviewHoverOptions) {}

  moveTo(
    media: MediaReference | null,
    line: number | null,
    view: EditorView,
    event: MouseEvent,
  ): void {
    const next = mediaTransition(this.shown, media === null ? null : line);
    this.shown = next.shown;
    if (next.action === "show" && media !== null) {
      this.options.show(media, view, event);
    } else if (next.action === "hide") {
      this.options.hide(view);
    }
  }

  clear(view: EditorView): void {
    if (this.shown === null) {
      return;
    }
    this.shown = null;
    this.options.hide(view);
  }

  isShowing(): boolean {
    return this.shown !== null;
  }
}

const sessions = new WeakMap<EditorView, MediaHoverSession>();

/** Close an open media preview. */
export function clearMediaPreview(view: EditorView): void {
  sessions.get(view)?.clear(view);
}

export function hoveredMedia(view: EditorView): boolean {
  return sessions.get(view)?.isShowing() ?? false;
}

/**
 * The rest a view is waiting out. Per view, one document being openable in two
 * panes, and the window is the view's own: a popout has its own.
 */
interface Rest {
  window: Window;
  id: number | undefined;
}

export function mediaPreviewHover(
  options: MediaPreviewHoverOptions,
): Extension {
  const trigger =
    options.trigger ?? ((event: MouseEvent) => event.metaKey || event.ctrlKey);
  const delay = options.delay ?? 0;
  const rests = new WeakMap<EditorView, Rest>();

  const restFor = (view: EditorView): Rest => {
    let rest = rests.get(view);
    if (!rest) {
      rest = {
        window: view.dom.ownerDocument.defaultView ?? window,
        id: undefined,
      };
      rests.set(view, rest);
    }
    return rest;
  };

  const cancel = (view: EditorView): void => {
    const rest = restFor(view);
    rest.window.clearTimeout(rest.id);
    rest.id = undefined;
  };

  const sessionFor = (view: EditorView): MediaHoverSession => {
    let session = sessions.get(view);
    if (!session) {
      session = new MediaHoverSession(options);
      sessions.set(view, session);
    }
    return session;
  };

  const resolve = (view: EditorView, event: MouseEvent): void => {
    const offset = view.posAtCoords({ x: event.clientX, y: event.clientY });
    const found =
      offset === null ? null : mediaLineAt(view.state, options.language, offset);
    sessionFor(view).moveTo(
      found?.media ?? null,
      found?.number ?? null,
      view,
      event,
    );
  };

  return [
    ViewPlugin.define((view) => ({ destroy: () => cancel(view) })),
    // A moved document is no longer the one the popover was opened from, and
    // the pointer need not move for that to happen. The session goes with it:
    // keyed by the line, it would answer the next movement with "keep". A
    // `setState` reports no update, which is why the host closes them too.
    EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        cancel(update.view);
        sessionFor(update.view).clear(update.view);
      }
    }),
    EditorView.domEventHandlers({
      mousemove: (event, view) => {
        cancel(view);
        if (!trigger(event)) {
          sessionFor(view).moveTo(null, null, view, event);
          return;
        }
        if (delay === 0 || sessionFor(view).isShowing()) {
          resolve(view, event);
          return;
        }
        const rest = restFor(view);
        rest.id = rest.window.setTimeout(() => {
          rest.id = undefined;
          resolve(view, event);
        }, delay);
      },
      mouseleave: (_event, view) => {
        cancel(view);
        sessionFor(view).clear(view);
      },
    }),
  ];
}
