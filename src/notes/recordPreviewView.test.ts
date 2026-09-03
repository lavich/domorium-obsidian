// @vitest-environment happy-dom
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { installObsidianDom } from "../testing/obsidianDom";
import type { RecordPreview } from "./recordPreview";
import { renderRecordEmbed } from "./recordPreviewView";

let container: HTMLElement;

const RUNS = [
  { text: "0 ", className: null },
  { text: "@I1@", className: "gedcom-xref" },
  { text: " INDI", className: "gedcom-tag" },
];

const draw = (preview: RecordPreview, fileName = "curie.ged"): void => {
  renderRecordEmbed(container, preview, fileName);
};

const block = (): HTMLElement | null =>
  container.querySelector(".gedcom-note-block");

beforeAll(installObsidianDom);
beforeEach(() => {
  container = document.createElement("div");
});

describe("the embed a note shows for a record", () => {
  it("draws the runs it was given, keeping the ones that carry a class", () => {
    draw({ kind: "record", runs: RUNS, truncated: false });

    expect(block()?.textContent).toBe("0 @I1@ INDI");
    expect(
      [...(block()?.querySelectorAll("span") ?? [])].map((s) => s.className),
    ).toEqual(["gedcom-xref", "gedcom-tag"]);
  });

  it("marks the container so the stylesheet can reach it", () => {
    draw({ kind: "record", runs: RUNS, truncated: false });

    expect(container.classList.contains("gedcom-embed")).toBe(true);
  });

  it("names the file above a whole-file preview, and not above a record", () => {
    draw({ kind: "file", runs: RUNS, truncated: false });
    expect(container.querySelector(".gedcom-embed-title")?.textContent).toBe(
      "curie.ged",
    );

    container.replaceChildren();
    draw({ kind: "record", runs: RUNS, truncated: false });
    expect(
      container.querySelector(".gedcom-embed-title"),
      "a record says its own name on the line below",
    ).toBeNull();
  });

  it("says the file holds no such record, naming both", () => {
    draw({ kind: "missing", xref: "@I9@" });

    expect(
      container.querySelector(".gedcom-embed-missing")?.textContent,
    ).toBe("curie.ged has no record @I9@");
    expect(block(), "and shows no empty block beside it").toBeNull();
  });

  it("marks a preview that was cut short", () => {
    draw({ kind: "record", runs: RUNS, truncated: true });

    expect(block()?.textContent).toBe("0 @I1@ INDI\n…");
  });

  it("clears what was there before, an embed being drawn again on a change", () => {
    draw({ kind: "record", runs: RUNS, truncated: false });
    draw({ kind: "missing", xref: "@I9@" });

    expect(block()).toBeNull();
    expect(container.querySelectorAll(".gedcom-embed-missing")).toHaveLength(1);
  });
});
