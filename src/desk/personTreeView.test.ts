// @vitest-environment happy-dom
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { curieIndex } from "../testing/curie";
import { installObsidianDom } from "../testing/obsidianDom";
import { CARD } from "./fileGraph";
import type { GraphCanvas } from "./graphCanvas";
import { treeOf } from "./personTree";
import { renderTree, type TreeHost } from "./personTreeView";

let container: HTMLElement;
let host: {
  openRecord: ReturnType<typeof vi.fn<TreeHost["openRecord"]>>;
  toggleSiblings: ReturnType<typeof vi.fn<(xref: string) => void>>;
};

beforeAll(installObsidianDom);
beforeEach(() => {
  container = document.createElement("div");
  document.body.replaceChildren(container);
  host = { openRecord: vi.fn<TreeHost["openRecord"]>(), toggleSiblings: vi.fn<(xref: string) => void>() };
});

function draw(focus = "@I1@", size = { width: 1200, height: 600 }): GraphCanvas {
  const tree = treeOf(curieIndex(), focus);
  if (!tree) {
    throw new Error(`no tree for ${focus}`);
  }
  const canvas = renderTree(container, tree, host);
  canvas.resized(size);
  return canvas;
}

const person = (name: string): SVGElement | undefined =>
  [...container.querySelectorAll<SVGElement>(".gedcom-fg-person")].find(
    (one) => one.querySelector("title")?.textContent === name,
  );
const card = (name: string) => person(name)?.querySelector<SVGElement>("[data-card]");
const click = (target: Element | null | undefined) =>
  target?.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 }));

describe("the tree of a person on the graph's canvas", () => {
  it("draws a card for each person, coloured by sex, the focus marked, with no Branch", () => {
    draw();

    expect(container.querySelectorAll(".gedcom-fg-person")).toHaveLength(14);
    expect(person("Marie Skłodowska-Curie")?.getAttribute("class")).toContain("is-f");
    expect(person("Marie Skłodowska-Curie")?.classList.contains("is-focus")).toBe(true);
    expect(person("Pierre Curie")?.getAttribute("class")).toContain("is-m");
    expect(person("4 siblings")?.getAttribute("class")).toContain("is-aside");
    expect(container.querySelector("[data-branch]")).toBeNull();
  });

  it("marks who rests on no source, and who has relatives beyond the edge", () => {
    draw("@I16@");

    expect(person("Ève Curie")).toBeUndefined();
    expect(person("Marie Skłodowska-Curie")?.querySelector(".gedcom-fg-card-more.is-up")).not.toBeNull();
    expect(person("Hélène Langevin-Joliot")?.querySelector(".gedcom-fg-card-gap")).not.toBeNull();
  });

  it("joins Pierre and Marie by a node with ’95 that opens their family", () => {
    draw();
    const node = [...container.querySelectorAll("[data-node]")].find((one) => one.textContent === "’95");
    click(node?.querySelector("circle"));

    expect(host.openRecord).toHaveBeenCalledWith("@F3@");
    expect(container.querySelectorAll(".gedcom-fg-line").length).toBeGreaterThanOrEqual(7);
  });

  it("moves the focus to a person, unfolds a run of siblings, and does nothing for the focus itself", () => {
    draw();
    click(card("Pierre Curie"));
    click(card("4 siblings"));
    click(card("Marie Skłodowska-Curie"));

    expect(host.openRecord.mock.calls).toEqual([["@I2@"]]);
    expect(host.toggleSiblings).toHaveBeenCalledWith("@I1@");
  });

  it("lights Marie's husband, parents and children when the pointer is on her", () => {
    draw();
    card("Marie Skłodowska-Curie")?.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, pointerType: "mouse" }));

    const lit = [...container.querySelectorAll(".gedcom-fg-person.is-on")].map((one) => one.querySelector("title")?.textContent);
    expect(lit.sort()).toEqual(
      [
        "Bronisława Boguska",
        "Marie Skłodowska-Curie",
        "Pierre Curie",
        "Irène Joliot-Curie",
        "Władysław Skłodowski",
        "Ève Curie",
      ].sort(),
    );
  });

  it("opens with the focus in view, on a narrow canvas too", () => {
    const canvas = draw("@I1@", { width: 360, height: 500 });
    const view = canvas.windowOf();
    const marie = person("Marie Skłodowska-Curie")?.getAttribute("transform")?.match(/-?[\d.]+/g)?.map(Number) ?? [];
    const [x = NaN, y = NaN] = marie;

    expect(x).toBeGreaterThanOrEqual(view?.left ?? Infinity);
    expect(x + CARD.width).toBeLessThanOrEqual(view?.right ?? -Infinity);
    expect(y).toBeGreaterThanOrEqual(view?.top ?? Infinity);
  });

  it("says what the colours, the dot and the triangles mean", () => {
    draw();
    const legend = container.querySelector(".gedcom-desk-legend")?.textContent ?? "";

    for (const text of ["Woman", "Man", "Family, with the year of the marriage", "No sources at all", "▲ ▼"]) {
      expect(legend).toContain(text);
    }
  });
});
