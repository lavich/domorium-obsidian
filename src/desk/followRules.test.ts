// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";

import { CursorFollow, adoptsFollow, fallbackFollowed, noteChangeMatters, shouldFollowCursor } from "./followRules";

const rest = { interfaceOn: true, mode: "source" as const, selected: "@I1@", atCursor: "@I2@", hasCard: true };

describe("when the cursor's record is selected", () => {
  it("is when it rests in a record with a card that is not the selected one, in Source with the interface on", () => {
    expect(shouldFollowCursor(rest)).toBe(true);
  });

  it("is not for the selected record, a record with no card, or no record", () => {
    expect(shouldFollowCursor({ ...rest, atCursor: "@I1@" })).toBe(false);
    expect(shouldFollowCursor({ ...rest, hasCard: false })).toBe(false);
    expect(shouldFollowCursor({ ...rest, atCursor: undefined })).toBe(false);
  });

  it("is not in another mode, nor with the interface off", () => {
    expect(shouldFollowCursor({ ...rest, mode: "graph" })).toBe(false);
    expect(shouldFollowCursor({ ...rest, interfaceOn: false })).toBe(false);
  });
});

describe("which tab the sidebars follow", () => {
  it("adopts a view that is already followed, or the active one when nothing is", () => {
    expect(adoptsFollow("a", "a", "b")).toBe(true);
    expect(adoptsFollow(null, "a", "a")).toBe(true);
    expect(adoptsFollow(null, "a", null)).toBe(true);
  });

  it("does not let a background tab take the follow from another", () => {
    expect(adoptsFollow("b", "a", "a")).toBe(false);
    expect(adoptsFollow(null, "a", "b")).toBe(false);
  });

  it("falls back to the most recently active tab still open", () => {
    expect(fallbackFollowed(["c", "b", "a"], (view) => view !== "c")).toBe("b");
    expect(fallbackFollowed(["c"], () => false)).toBeNull();
  });
});

describe("which changed note matters to the card", () => {
  it("is the file itself or a note that links it", () => {
    const linking = new Set(["Notes/Radium.md"]);

    expect(noteChangeMatters("curie.ged", ["curie.ged"], linking)).toBe(true);
    expect(noteChangeMatters("Notes/Radium.md", ["curie.ged"], linking)).toBe(true);
    expect(noteChangeMatters("Notes/Other.md", ["curie.ged"], linking)).toBe(false);
  });
});

describe("a cursor that rested and a selection made meanwhile", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("settles when nothing else selects", () => {
    vi.useFakeTimers();
    const settle = vi.fn();
    new CursorFollow(window, settle).rested();
    vi.advanceTimersByTime(300);

    expect(settle).toHaveBeenCalledTimes(1);
  });

  it("does not settle after Back, the card or a link selected another record", () => {
    for (const origin of ["history", "card", "link", "view"] as const) {
      vi.useFakeTimers();
      const settle = vi.fn();
      const follow = new CursorFollow(window, settle);
      follow.rested();
      follow.selected(origin);
      vi.advanceTimersByTime(300);

      expect(settle, origin).not.toHaveBeenCalled();
    }
  });

  it("does not settle after a mode switch, and settles after its own selection", () => {
    vi.useFakeTimers();
    const settle = vi.fn();
    const follow = new CursorFollow(window, settle);
    follow.rested();
    follow.cancel();
    vi.advanceTimersByTime(300);
    expect(settle).not.toHaveBeenCalled();

    follow.rested();
    follow.selected("cursor");
    vi.advanceTimersByTime(300);
    expect(settle).toHaveBeenCalledTimes(1);
  });
});
