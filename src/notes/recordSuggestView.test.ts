// @vitest-environment happy-dom
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import type { GedcomRecord } from "../editor/records";
import { installObsidianDom } from "../testing/obsidianDom";
import { renderRecordSuggestion } from "./recordSuggestView";

let row: HTMLElement;

const record = (overrides: Partial<GedcomRecord> = {}): GedcomRecord => ({
  tag: "INDI",
  identifier: "@I1@",
  label: "Marie /Skłodowska-Curie/",
  start: { line: 3, character: 0 },
  ...overrides,
});

const draw = (subject: GedcomRecord): void => {
  renderRecordSuggestion(subject, row);
};

const name = (): string => row.querySelector("div")?.textContent ?? "";
const detail = (): string =>
  row.querySelector(".gedcom-suggestion-detail")?.textContent ?? "";

beforeAll(installObsidianDom);
beforeEach(() => {
  row = document.createElement("div");
});

describe("one row of the record suggester", () => {
  it("leads with the name, and says the identifier and tag under it", () => {
    draw(record());

    expect(name()).toBe("Marie /Skłodowska-Curie/");
    expect(detail()).toBe("@I1@ · INDI");
  });

  it("leads with the identifier where the record has no name", () => {
    draw(record({ label: undefined }));

    expect(name()).toBe("@I1@");
    expect(detail(), "the identifier is above; repeating it says nothing").toBe(
      "INDI",
    );
  });

  it("says the tag alone for a record with neither", () => {
    draw(record({ label: undefined, identifier: undefined }));

    expect(name()).toBe("");
    expect(detail()).toBe("INDI");
  });

  it("puts the detail in a smaller element than the name", () => {
    draw(record());

    expect(row.querySelector(".gedcom-suggestion-detail")?.tagName).toBe(
      "SMALL",
    );
  });
});
