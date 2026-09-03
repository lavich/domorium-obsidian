import { HOVER_TIME_MS } from "@domorium/codemirror";
import { describe, expect, it } from "vitest";

import { hoverDelay, previewGesture } from "./previewGesture";

const mouse = {} as MouseEvent;
const key = {} as KeyboardEvent;
const held = (): boolean => true;
const released = (): boolean => false;

describe("what opens a record preview", () => {
  it("waits for the modifier when the user asks for the modifier", () => {
    expect(previewGesture("modifier", held).opens(mouse)).toBe(true);
    expect(previewGesture("modifier", released).opens(mouse)).toBe(false);
  });

  it("opens on the pointer alone when the user asks for a plain hover", () => {
    expect(previewGesture("hover", released).opens(mouse)).toBe(true);
  });

  it("opens for nothing when the user has turned previews off", () => {
    expect(previewGesture("off", held).opens(mouse)).toBe(false);
  });
});

describe("what closes an open record preview", () => {
  it("closes when the modifier that opened it is let go", () => {
    expect(previewGesture("modifier", released).closes(key)).toBe(true);
    expect(previewGesture("modifier", held).closes(key)).toBe(false);
  });

  it("ignores the keyboard for a gesture the keyboard has no part in", () => {
    expect(previewGesture("hover", released).closes(key)).toBe(false);
    expect(previewGesture("off", released).closes(key)).toBe(false);
  });
});

describe("how long the pointer must rest before either preview opens", () => {
  it("answers the first move for a gesture the modifier already declared", () => {
    expect(hoverDelay("modifier")).toBe(0);
    expect(hoverDelay("off")).toBe(0);
  });

  it("waits for a bare hover, as a tag tooltip does", () => {
    expect(hoverDelay("hover")).toBe(HOVER_TIME_MS);
  });
});
