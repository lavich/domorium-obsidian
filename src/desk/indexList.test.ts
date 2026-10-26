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
  index: curieIndex(),
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

  it("finds a person and a family before the common era by the year's digits", () => {
    list.show({
      index: buildIndex(new GedcomLanguageService([
        "0 HEAD", "1 GEDC", "2 VERS 7.0",
        "0 @I1@ INDI", "1 NAME Anna /Nowak/", "1 BIRT", "2 DATE 1401 BCE",
        "0 @I2@ INDI", "1 NAME Jan /Nowak/", "1 BIRT", "2 DATE 1500 BCE",
        "0 @F1@ FAM", "1 HUSB @I2@", "1 WIFE @I1@", "1 MARR", "2 DATE 1401 BCE",
        "0 @F2@ FAM", "1 HUSB @I2@", "1 MARR", "2 DATE 1500 BCE",
        "0 TRLR", "",
      ].join("\n"))),
      current: null,
    });
    type("1401");
    expect(texts(".gedcom-desk-row-name")).toEqual(["Anna Nowak"]);

    click(".gedcom-desk-seg-button", "Families");
    type("1401");
    expect(texts(".gedcom-desk-row-name")).toEqual(["Jan Nowak and Anna Nowak"]);
  });

  it("says what it searched when nothing matches", () => {
    list.show(curie());
    type("Darwin");

    expect(texts(".gedcom-desk-none")).toEqual([
      "Nothing matches “Darwin”. Search covers names, years and places.",
    ]);
  });

  it("lists families by their spouses with the year and place of the marriage", () => {
    list.show(curie("@F3@"));
    click(".gedcom-desk-seg-button", "Families");

    expect(texts(".gedcom-desk-row-name")).toEqual([
      "Władysław Skłodowski and Bronisława Boguska",
      "Eugène Curie and Sophie-Claire Depouilly",
      "Pierre Curie and Marie Skłodowska-Curie",
      "Frédéric Joliot and Irène Joliot-Curie",
      "Henry Richardson Labouisse and Ève Curie",
    ]);
    expect(texts(".gedcom-desk-row.is-current .gedcom-desk-row-years")).toEqual(["1895"]);
    expect(texts(".gedcom-desk-row.is-current .gedcom-desk-row-place")).toEqual(["Sceaux, France"]);
  });

  it("finds a family by a spouse's name and opens it", () => {
    list.show(curie());
    click(".gedcom-desk-seg-button", "Families");
    type("labouisse");
    click(".gedcom-desk-row", "Henry");

    expect(texts(".gedcom-desk-row-name")).toEqual(["Henry Richardson Labouisse and Ève Curie"]);
    expect(open).toHaveBeenCalledWith("@F5@");
  });

  it("says when the reader switches what it lists, and can be set to a list", () => {
    const kindChanged = vi.fn();
    const told = new IndexList(container, { open, kindChanged });
    told.show(curie());
    click(".gedcom-desk-seg-button", "Families");
    expect(kindChanged).toHaveBeenCalledWith("families");

    told.showKind("sources");
    expect(told.shownKind).toBe("sources");
    expect(texts(".gedcom-desk-seg-button.is-active")).toEqual(["Sources"]);
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
  const big = buildIndex(new GedcomLanguageService(lines.join("\n")));

  it("draws a window of rows over a list as tall as all of them", () => {
    list.show({ index: big, current: null });

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
