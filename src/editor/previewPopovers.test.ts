// @vitest-environment happy-dom
import type { PreviewRun } from "@domorium/codemirror";
import type { MediaReference } from "@domorium/language-service";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { installObsidianDom } from "../testing/obsidianDom";
import {
  PreviewPopovers,
  renderRecordPreview,
  type Popover,
  type PreviewPopoversHost,
} from "./previewPopovers";

class FakePopover implements Popover {
  readonly hoverEl = document.createElement("div");
  unloaded = false;
  private readonly callbacks: (() => void)[] = [];

  unload(): void {
    this.unloaded = true;
    this.callbacks.forEach((callback) => callback());
  }

  register(callback: () => void): void {
    this.callbacks.push(callback);
  }
}

const reference: MediaReference = {
  range: { start: { line: 1, character: 7 }, end: { line: 1, character: 24 } },
  targetText: "media/marie.jpg",
  kind: "file-relative",
  mediaKind: "image",
};

let opened: FakePopover[];
let cleared: number;
let allowed: string[];
let remote: boolean;

function popovers(): PreviewPopovers {
  const host: PreviewPopoversHost = {
    open: () => {
      const popover = new FakePopover();
      opened.push(popover);
      return popover;
    },
    clearMediaSession: () => {
      cleared += 1;
    },
    mediaVault: () => ({
      documentPath: "tree.ged",
      dialect: "7.0",
      resolve: () => "app://marie",
    }),
    remoteImages: () => remote,
    allowRemoteImages: (scope) => allowed.push(scope),
    setIcon: () => undefined,
    contentSize: () => ({ width: 800, height: 600 }),
  };
  return new PreviewPopovers(host);
}

beforeAll(installObsidianDom);

beforeEach(() => {
  opened = [];
  cleared = 0;
  allowed = [];
  remote = false;
});

describe("a record preview block", () => {
  const runs: PreviewRun[] = [
    { text: "0 @I1@ ", tokenType: 1, className: "tag" },
    { text: "INDI", tokenType: null, className: null },
  ];

  it("styles the runs that have a class and leaves the rest as text", () => {
    const container = document.createElement("div");
    renderRecordPreview(container, runs, false);
    const block = container.querySelector("pre.gedcom-record-preview");
    expect(block?.querySelector("span.tag")?.textContent).toBe("0 @I1@ ");
    expect(block?.textContent).toBe("0 @I1@ INDI");
  });

  it("ends with an ellipsis when it is cut short", () => {
    const container = document.createElement("div");
    renderRecordPreview(container, runs, true);
    expect(container.textContent).toBe("0 @I1@ INDI\n…");
  });
});

describe("the popovers of a view", () => {
  it("replaces the record popover rather than stacking a second", () => {
    const set = popovers();
    set.showRecord([], false, document.createElement("div"));
    set.showRecord([], false, document.createElement("div"));
    expect(opened.map((popover) => popover.unloaded)).toEqual([true, false]);
  });

  it("hides both previews and clears the media session on hideAll", () => {
    const set = popovers();
    set.showRecord([], false, document.createElement("div"));
    set.hideAll();
    expect(opened[0]?.unloaded).toBe(true);
    expect(cleared).toBe(1);
  });

  it("clears the media session when the media popover goes on its own", () => {
    const set = popovers();
    set.showMedia(reference, document.createElement("div"));
    opened[0]?.unload();
    expect(cleared).toBe(1);
  });

  it("does not clear the session when the media popover it replaced unloads", () => {
    const set = popovers();
    set.showMedia(reference, document.createElement("div"));
    set.showMedia(reference, document.createElement("div"));
    expect(cleared).toBe(0);
  });

  it("holds the nodes inside the media popover", () => {
    const set = popovers();
    set.showMedia(reference, document.createElement("div"));
    const inside = opened[0]?.hoverEl.firstElementChild ?? document.createElement("i");
    expect(set.mediaHolds(inside)).toBe(true);
    expect(set.mediaHolds(document.createElement("div"))).toBe(false);
  });

  it("marks the media popover so its width is not fixed", () => {
    popovers().showMedia(reference, document.createElement("div"));
    expect(opened[0]?.hoverEl.classList.contains("gedcom-media-popover")).toBe(true);
  });
});
