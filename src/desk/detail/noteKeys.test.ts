// @vitest-environment happy-dom
import { GedcomLanguageService } from "@domorium/language-service";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { buildIndex } from "../../genealogy";
import { installObsidianDom } from "../../testing/obsidianDom";
import type { DetailContext } from "./lineView";
import { noteLines, renderNotes } from "./notes";

beforeAll(installObsidianDom);

const long = (name: string): string[] => [`1 NOTE ${name}`, ...Array.from({ length: 8 }, (_, at) => `2 CONT line ${at}`)];

function draw(lines: string[], open: ReadonlySet<string>): { keys: (string | null)[]; shown: string[] } {
  const text = ["0 HEAD", "1 GEDC", "2 VERS 7.0", "0 @I1@ INDI", ...lines, "0 TRLR"].join("\n");
  const index = buildIndex(new GedcomLanguageService(text));
  const ctx: DetailContext = {
    index,
    host: { openRecord: vi.fn(), showInSource: vi.fn() },
    open,
    notes: { drawn: 0 },
  };
  const box = document.createElement("div");
  renderNotes(box, noteLines(index.record("@I1@") as never), ctx);
  return {
    keys: [...box.querySelectorAll("button")].map((one) => one.getAttribute("data-focus-key")),
    shown: [...box.querySelectorAll(".gedcom-detail-text-body")].map((one) => one.textContent?.split("\n")[0] ?? ""),
  };
}

describe("which long note the reader opened", () => {
  it("is told by its place among the notes of the card, not by its line, so a line added above does not move it", () => {
    const before = draw([...long("first"), ...long("second")], new Set(["note:1"]));
    expect(before.keys).toEqual(["note:0", "note:1"]);

    const after = draw(["1 _NEW a line added above", ...long("first"), ...long("second")], new Set(["note:1"]));
    expect(after.keys).toEqual(["note:0", "note:1"]);
    const opened = (draws: ReturnType<typeof draw>) =>
      draws.shown.map((first, at) => (first === "second" && draws.keys[at] === "note:1"));
    expect(opened(after)).toEqual(opened(before));
  });
});
