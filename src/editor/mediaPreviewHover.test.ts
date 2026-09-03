import type { EditorView } from "@codemirror/view";
import { HOVER_TIME_MS } from "@domorium/codemirror";
import type { MediaReference } from "@domorium/language-service";
import { describe, expect, it } from "vitest";

import {
  hoverDelay,
  MediaHoverSession,
  mediaTransition,
} from "./mediaPreviewHover";
import { previewGesture } from "./previewGesture";

const view = {} as EditorView;
const mouse = {} as MouseEvent;
const key = {} as KeyboardEvent;

function media(targetText = "media/marie.jpg"): MediaReference {
  return {
    range: {
      start: { line: 1, character: 7 },
      end: { line: 1, character: 7 + targetText.length },
    },
    targetText,
    kind: "file-relative",
    mediaKind: "image",
  };
}

function session(): {
  session: MediaHoverSession;
  shows: MediaReference[];
  hides: number;
} {
  const record = { shows: [] as MediaReference[], hides: 0 };
  const hover = new MediaHoverSession({
    language: null as never,
    show: (reference) => record.shows.push(reference),
    hide: () => {
      record.hides += 1;
    },
  });
  return {
    session: hover,
    get shows() {
      return record.shows;
    },
    get hides() {
      return record.hides;
    },
  };
}

describe("what one position does to an open media preview", () => {
  it("shows a position that names media", () => {
    expect(mediaTransition(null, 4)).toEqual({ action: "show", shown: 4 });
  });

  it("keeps the preview while the pointer stays on the line that opened it", () => {
    expect(mediaTransition(4, 4)).toEqual({ action: "keep", shown: 4 });
  });

  it("reopens on another line, because two links name two rectangles", () => {
    expect(mediaTransition(4, 9)).toEqual({ action: "show", shown: 9 });
  });

  it("hides where the pointer names no media", () => {
    expect(mediaTransition(4, null)).toEqual({ action: "hide", shown: null });
  });

  it("does nothing where nothing is open and nothing is named", () => {
    expect(mediaTransition(null, null)).toEqual({
      action: "keep",
      shown: null,
    });
  });
});

describe("a media preview over the life of one gesture", () => {
  it("shows once and stays put while the pointer rests on the line", () => {
    const hover = session();
    hover.session.moveTo(media(), 4, view, mouse);
    hover.session.moveTo(media(), 4, view, mouse);
    expect(hover.shows).toHaveLength(1);
    expect(hover.hides).toBe(0);
  });

  it("draws again for the next line's own media", () => {
    const hover = session();
    hover.session.moveTo(media(), 4, view, mouse);
    hover.session.moveTo(media("media/family.jpg"), 9, view, mouse);
    expect(hover.shows.map((m) => m.targetText)).toEqual([
      "media/marie.jpg",
      "media/family.jpg",
    ]);
  });

  it("hides when the pointer leaves the media", () => {
    const hover = session();
    hover.session.moveTo(media(), 4, view, mouse);
    hover.session.moveTo(null, 5, view, mouse);
    expect(hover.hides).toBe(1);
    expect(hover.session.isShowing()).toBe(false);
  });

  it("never shows for a position that names nothing", () => {
    const hover = session();
    hover.session.moveTo(null, 5, view, mouse);
    expect(hover.shows).toHaveLength(0);
    expect(hover.hides).toBe(0);
  });
});

describe("closing a media preview from outside the gesture", () => {
  it("closes when the modifier that opened it is let go", () => {
    const hover = session();
    const gesture = previewGesture("modifier", () => false);
    hover.session.moveTo(media(), 4, view, mouse);
    if (gesture.closes(key)) {
      hover.session.clear(view);
    }
    expect(hover.hides).toBe(1);
  });

  it("does nothing when no preview is open", () => {
    const hover = session();
    hover.session.clear(view);
    expect(hover.hides).toBe(0);
  });

  it("leaves a hover-triggered preview alone, the keyboard having no part in it", () => {
    const hover = session();
    const gesture = previewGesture("hover", () => false);
    hover.session.moveTo(media(), 4, view, mouse);
    if (gesture.closes(key)) {
      hover.session.clear(view);
    }
    expect(hover.hides).toBe(0);
  });
});

describe("how long the pointer must rest", () => {
  it("answers the first move for a gesture the modifier already declared", () => {
    expect(hoverDelay("modifier")).toBe(0);
    expect(hoverDelay("off")).toBe(0);
  });

  it("waits for a bare hover, as a tag tooltip does", () => {
    expect(hoverDelay("hover")).toBe(HOVER_TIME_MS);
  });
});
