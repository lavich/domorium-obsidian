// @vitest-environment happy-dom
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { GedcomLanguageService } from "@domorium/language-service";
import { buildIndex } from "../genealogy";
import { curieIndex } from "../testing/curie";
import { installObsidianDom } from "../testing/obsidianDom";
import { IndexList, peopleShown, ROW_HEIGHT, type IndexFile } from "./indexList";

let container: HTMLElement;
let open: ReturnType<typeof vi.fn<(xref: string) => void>>;
let list: IndexList;

const curie = (current: string | null = "@I1@"): IndexFile => ({
  name: "curie.ged",
  index: curieIndex(),
  version: "7.0",
  current,
});

beforeAll(installObsidianDom);
beforeEach(() => {
  container = document.createElement("div");
  open = vi.fn<(xref: string) => void>();
  list = new IndexList(container, { open });
});

const texts = (selector: string): string[] =>
  [...container.querySelectorAll(selector)].map((node) => node.textContent ?? "");

const click = (selector: string, text: string): void => {
  [...container.querySelectorAll<HTMLElement>(selector)]
    .find((node) => node.textContent?.startsWith(text))
    ?.click();
};

const type = (query: string): void => {
  const field = container.querySelector<HTMLInputElement>(".gedcom-desk-search");
  if (field) {
    field.value = query;
    field.dispatchEvent(new Event("input"));
  }
};

describe("the index of a file", () => {
  it("names the file, its version and how many people it holds", () => {
    list.show(curie());

    expect(texts(".gedcom-desk-index-file")).toEqual(["curie.ged"]);
    expect(texts(".gedcom-desk-index-meta")).toEqual(["GEDCOM 7.0 · 17 people"]);
  });

  it("lists people in file order with their years and place", () => {
    list.show(curie());

    expect(texts(".gedcom-desk-row-name")[0]).toBe("Marie Skłodowska-Curie");
    expect(texts(".gedcom-desk-row-years")[0]).toBe("1867–1934");
    expect(texts(".gedcom-desk-row-place")[0]).toBe("Warsaw, Congress Poland");
  });

  it("marks the record the tab shows as the current one", () => {
    list.show(curie("@I2@"));

    expect(texts(".gedcom-desk-row.is-current .gedcom-desk-row-name")).toEqual(["Pierre Curie"]);
  });

  it("marks and filters the people whose records cite nothing", () => {
    list.show(curie());

    expect(texts(".gedcom-desk-chip-filter")).toEqual(["All 17", "No sources 11"]);
    expect(container.querySelectorAll(".gedcom-desk-gap")).toHaveLength(11);
    click(".gedcom-desk-chip-filter", "No sources");
    expect(container.querySelectorAll(".gedcom-desk-row")).toHaveLength(11);
    expect(texts(".gedcom-desk-row-name")).not.toContain("Marie Skłodowska-Curie");
  });

  it("finds a person by year and by another name", () => {
    list.show(curie());
    type("1867");
    expect(texts(".gedcom-desk-row-name")).toEqual(["Marie Skłodowska-Curie"]);

    type("SALOMEA");
    expect(texts(".gedcom-desk-row-name")).toEqual(["Marie Skłodowska-Curie"]);
  });

  it("says what it searched when nothing matches", () => {
    list.show(curie());
    type("Darwin");

    expect(texts(".gedcom-desk-none")).toEqual([
      "Nothing matches “Darwin”. Search covers names, years and places.",
    ]);
  });

  it("lists sources with how many records cite them", () => {
    list.show(curie());
    click(".gedcom-desk-seg-button", "Sources");

    expect(texts(".gedcom-desk-row-name")).toEqual([
      "The Nobel Prize in Physics 1903",
      "Parish registers of Warsaw",
      "The Nobel Prize in Chemistry 1911 and 1935",
    ]);
    expect(texts(".gedcom-desk-row-years")).toEqual(["2", "2", "3"]);
  });

  it("opens the record of a row", () => {
    list.show(curie());
    click(".gedcom-desk-row", "Pierre Curie");

    expect(open).toHaveBeenCalledWith("@I2@");
  });

  it("keeps the search across a new text of the file", () => {
    list.show(curie());
    type("joliot");
    list.show(curie());

    expect(texts(".gedcom-desk-row-name")).toEqual([
      "Irène Joliot-Curie", "Frédéric Joliot", "Hélène Langevin-Joliot", "Pierre Joliot",
    ]);
  });

  it("says no GEDCOM file is open when it follows none", () => {
    list.show(null);

    expect(texts(".gedcom-desk-none")).toEqual(["No GEDCOM file is open."]);
  });
});

describe("an index of twenty thousand people", () => {
  const lines = ["0 HEAD", "1 GEDC", "2 VERS 7.0"];
  for (let at = 1; at <= 20_000; at += 1) {
    lines.push(`0 @I${at}@ INDI`, `1 NAME Person${at} /Family${at % 97}/`, "1 BIRT", `2 DATE ${1700 + (at % 300)}`);
  }
  lines.push("0 TRLR", "");
  const big = buildIndex(new GedcomLanguageService(lines.join("\n")).getDocumentSymbols());

  it("draws a window of rows over a list as tall as all of them", () => {
    list.show({ name: "big.ged", index: big, version: "7.0", current: null });

    expect(container.querySelectorAll(".gedcom-desk-row").length).toBeLessThan(100);
    expect(container.querySelector<HTMLElement>(".gedcom-desk-index-spacer")?.style.getPropertyValue("height"))
      .toBe(`${20_000 * ROW_HEIGHT}px`);
  });

  it("filters them as a lookup over text it already holds", () => {
    const started = performance.now();
    const found = peopleShown(big, "family13 ", false);

    expect(found.length).toBeGreaterThan(0);
    expect(performance.now() - started).toBeLessThan(100);
  });
});
