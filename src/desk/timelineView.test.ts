// @vitest-environment happy-dom
import { GedcomLanguageService } from "@domorium/language-service";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { buildIndex } from "../genealogy";
import { curieIndex } from "../testing/curie";
import { installObsidianDom } from "../testing/obsidianDom";
import { renderPersonPage, type PageHost, type PersonView } from "./personPage";

let container: HTMLElement;
let host: ReturnType<typeof pageHost>;

function pageHost() {
  return {
    openRecord: vi.fn<PageHost["openRecord"]>(),
    select: vi.fn<PageHost["select"]>(),
    showInSource: vi.fn<PageHost["showInSource"]>(),
    openEvidence: vi.fn<PageHost["openEvidence"]>(),
    openFile: vi.fn<PageHost["openFile"]>(),
    chooseView: vi.fn<(view: PersonView) => void>(),
  } satisfies PageHost;
}

beforeAll(installObsidianDom);
beforeEach(() => {
  container = document.createElement("div");
  host = pageHost();
});

const index = curieIndex();
function draw(view: PersonView): void {
  const marie = index.person("@I1@");
  if (marie) {
    renderPersonPage(container, marie, index, { selected: null, phone: false, view }, host);
  }
}

const texts = (selector: string): string[] =>
  [...container.querySelectorAll(selector)].map((node) => node.textContent ?? "");

describe("the views of a person page", () => {
  it("offers Card, Tree, Timeline and Places, marking the one shown", () => {
    draw("timeline");

    expect(texts(".gedcom-desk-tab")).toEqual(["Card", "Tree", "Timeline", "Places"]);
    expect(texts(".gedcom-desk-tab.is-active")).toEqual(["Timeline"]);
    expect(container.querySelector(".gedcom-desk-facts")).toBeNull();
  });

  it("asks for the view chosen", () => {
    draw("card");
    [...container.querySelectorAll<HTMLElement>(".gedcom-desk-tab")][3]?.click();

    expect(host.chooseView).toHaveBeenCalledWith("places");
  });
});

describe("the timeline", () => {
  it("shows a year before the common era as one", () => {
    const across = buildIndex(new GedcomLanguageService([
      "0 HEAD", "1 GEDC", "2 VERS 7.0",
      "0 @I1@ INDI", "1 NAME Anna /Nowak/",
      "1 DEAT", "2 DATE 20", "1 BIRT", "2 DATE 10 BCE", "1 RESI", "2 DATE 5 BCE",
      "0 TRLR", "",
    ].join("\n")));
    const anna = across.person("@I1@");
    if (!anna) {
      throw new Error("no person @I1@");
    }
    renderPersonPage(container, anna, across, { selected: null, phone: false, view: "timeline" }, host);

    expect(texts(".gedcom-desk-moment-year")).toEqual(["10 BCE", "5 BCE", "20"]);
  });

  it("lists years and what happened, the person's own entries marked", () => {
    draw("timeline");

    expect(texts(".gedcom-desk-moment-year").slice(0, 3)).toEqual(["1860", "1862", "1863"]);
    expect(texts(".gedcom-desk-moment.is-own .gedcom-desk-moment-what")).toEqual([
      "Birth", "Marriage with Pierre Curie", "Death", "Occupation",
    ]);
    expect(texts(".gedcom-desk-section")).toEqual(["Undated"]);
  });

  it("shows the date as written and the place", () => {
    draw("timeline");
    const birth = [...container.querySelectorAll(".gedcom-desk-moment.is-own")][0];

    expect(birth?.querySelector(".gedcom-desk-moment-detail")?.textContent)
      .toBe("7 NOV 1867 · Warsaw, Congress Poland");
  });

  it("shows what an undated attribute states", () => {
    draw("timeline");
    const occupation = [...container.querySelectorAll(".gedcom-desk-moment.is-own")].at(-1);

    expect(occupation?.querySelector(".gedcom-desk-moment-detail")?.textContent)
      .toBe("Physicist and chemist");
  });

  it("opens a relative, and selects one of the person's facts", () => {
    draw("timeline");
    const whats = [...container.querySelectorAll<HTMLElement>(".gedcom-desk-moment-what")];
    whats.find((node) => node.textContent?.startsWith("Death of husband"))?.click();
    whats.find((node) => node.textContent === "Birth")?.click();

    expect(host.openRecord).toHaveBeenCalledWith("@I2@");
    expect(host.select).toHaveBeenCalledWith("p:0");
  });
});

describe("the places", () => {
  it("lists each place with its events and their count", () => {
    draw("places");

    expect(texts(".gedcom-desk-place-name")).toEqual([
      "Warsaw, Congress Poland", "Sceaux, France", "Paris, France", "Passy, Haute-Savoie, France",
    ]);
    expect(texts(".gedcom-desk-place-count")[1]).toBe("1 event");
  });
});
