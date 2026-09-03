import type { Extension, Text } from "@codemirror/state";
import { EditorView, ViewPlugin } from "@codemirror/view";
import { HOVER_TIME_MS, offsetToPosition } from "@domorium/codemirror";
import type { EditorLanguageService } from "@domorium/codemirror";
import type { MediaReference } from "@domorium/language-service";

import { mediaSpans, spanAt } from "./mediaSpans";
import type { RecordPreviewTrigger } from "../settingsData";

/**
 * A media hover, which `@domorium/codemirror` does not carry — it has
 * `recordPreviewHover` and nothing for media. The options read like that one so
 * the two sit together in the composition.
 */
export interface MediaPreviewHoverOptions {
  language: EditorLanguageService;
  /** Whether an event asks for a preview. Defaults to the platform modifier. */
  trigger?: (event: MouseEvent) => boolean;
  /** How long the pointer must rest before a preview opens. */
  delay?: number;
  show(media: MediaReference, view: EditorView, event: MouseEvent): void;
  hide(view: EditorView): void;
}

/** The media one offset refers to, or nothing. */
export function mediaAt(
  language: EditorLanguageService,
  doc: Text,
  offset: number,
): MediaReference | null {
  return language.update(doc).getMediaAt(offsetToPosition(doc, offset));
}

export interface MediaTransition {
  action: "show" | "hide" | "keep";
  shown: number | null;
}

/**
 * A preview is keyed by the line it was opened from, not by the file it names:
 * two links to one photograph name the same file and different rectangles, so
 * moving between them must reopen rather than keep.
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

/**
 * What one editor is showing. Held beside the view rather than in a state
 * field: nothing in the document depends on it, and anything holding the view
 * can close it.
 */
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

/** Close an open media preview. Anything holding the view may say so. */
export function clearMediaPreview(view: EditorView): void {
  sessions.get(view)?.clear(view);
}

export function hoveredMedia(view: EditorView): boolean {
  return sessions.get(view)?.isShowing() ?? false;
}

/**
 * The modifier is already the intent, so it answers the first move. A bare
 * hover waits, as the tag tooltip does — a photograph appearing at every pixel
 * of an idle pointer's travel is worse than a record doing it.
 */
export function hoverDelay(trigger: RecordPreviewTrigger): number {
  return trigger === "hover" ? HOVER_TIME_MS : 0;
}

export function mediaPreviewHover(
  options: MediaPreviewHoverOptions,
): Extension {
  const trigger =
    options.trigger ?? ((event: MouseEvent) => event.metaKey || event.ctrlKey);
  const delay = options.delay ?? 0;
  // The view's own window, not this file's: a popout has its own.
  let timers: Window = window;
  let timer: number | undefined;
  const cancel = (): void => {
    timers.clearTimeout(timer);
    timer = undefined;
  };

  const sessionFor = (view: EditorView): MediaHoverSession => {
    let session = sessions.get(view);
    if (!session) {
      session = new MediaHoverSession(options);
      sessions.set(view, session);
    }
    return session;
  };

  // Through the spans rather than by offset: the extent that answers is the
  // extent that is dressed as a link, and the two must not drift apart.
  const resolve = (view: EditorView, event: MouseEvent): void => {
    const offset = view.posAtCoords({ x: event.clientX, y: event.clientY });
    if (offset === null) {
      sessionFor(view).moveTo(null, null, view, event);
      return;
    }
    const span = spanAt(
      mediaSpans(view.state, options.language, view.visibleRanges),
      offset,
    );
    sessionFor(view).moveTo(
      span?.media ?? null,
      span === null ? null : view.state.doc.lineAt(span.from).number,
      view,
      event,
    );
  };

  return [
    ViewPlugin.define((view) => {
      timers = view.dom.ownerDocument.defaultView ?? window;
      return { destroy: cancel };
    }),
    EditorView.domEventHandlers({
      mousemove: (event, view) => {
        cancel();
        if (!trigger(event)) {
          sessionFor(view).moveTo(null, null, view, event);
          return;
        }
        if (delay === 0 || sessionFor(view).isShowing()) {
          resolve(view, event);
          return;
        }
        timer = timers.setTimeout(() => {
          timer = undefined;
          resolve(view, event);
        }, delay);
      },
      mouseleave: (_event, view) => {
        cancel();
        sessionFor(view).clear(view);
      },
    }),
  ];
}
