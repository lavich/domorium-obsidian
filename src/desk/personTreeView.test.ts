// @vitest-environment happy-dom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { curieIndex, indexOf } from "../testing/curie";
import { installObsidianDom } from "../testing/obsidianDom";
import { CARD } from "./fileGraph";
import type { GraphCanvas } from "./graphCanvas";
import { HOVER_DELAY } from "./dom";
import { treeOf } from "./personTree";
import { renderTree, type TreeHost, type TreeMemory } from "./personTreeView";

let container: HTMLElement;
let host: {
  openRecord: ReturnType<typeof vi.fn<TreeHost["openRecord"]>>;
  toggleSiblings: ReturnType<typeof vi.fn<(xref: string) => void>>;
};

beforeAll(installObsidianDom);
afterEach(() => {
  vi.useRealTimers();
});
beforeEach(() => {
  vi.useFakeTimers();
  container = document.createElement("div");
  document.body.replaceChildren(container);
  host = { openRecord: vi.fn<TreeHost["openRecord"]>(), toggleSiblings: vi.fn<(xref: string) => void>() };
});

function draw(
  focus = "@I1@",
  size = { width: 1200, height: 600 },
  index = curieIndex(),
  memory: TreeMemory = {},
): GraphCanvas {
  const tree = treeOf(index, focus);
  if (!tree) {
    throw new Error(`no tree for ${focus}`);
  }
  container.replaceChildren();
  const canvas = renderTree(container, tree, host, memory);
  canvas.resized(size);
  return canvas;
}

const boxOf = (name: string): { x: number; y: number; height: number } => {
  const group = person(name);
  const [x = NaN, y = NaN] = group?.getAttribute("transform")?.match(/-?[\d.]+/g)?.map(Number) ?? [];
  return { x, y, height: Number(group?.querySelector(".gedcom-fg-card-bg")?.getAttribute("height")) };
};

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

  it("joins Pierre and Marie by a node with ’95 from which the lines to Irène and Ève leave, and which opens their family", () => {
    draw();
    const node = [...container.querySelectorAll("[data-node]")].find((one) => one.textContent === "’95");
    const family = node?.getAttribute("data-node") ?? "";
    const circle = node?.querySelector("circle");
    const start = `M${circle?.getAttribute("cx")} ${circle?.getAttribute("cy")}`;
    const lines = [...container.querySelectorAll(`.gedcom-fg-line[data-f="${family}"]`)];
    const children = lines.map((line) =>
      container.querySelector(`.gedcom-fg-person[data-p="${line.getAttribute("data-child")}"] title`)?.textContent,
    );

    expect(children.sort()).toEqual(["Irène Joliot-Curie", "Ève Curie"]);
    expect(lines.every((line) => line.getAttribute("d")?.startsWith(start))).toBe(true);
    click(circle);
    expect(host.openRecord).toHaveBeenCalledWith("@F3@");
  });

  it("lights every card of a person who stands twice", () => {
    const text = [
      "0 HEAD", "1 GEDC", "2 VERS 7.0",
      "0 @I1@ INDI", "1 NAME Grand /G/", "1 FAMS @F1@",
      "0 @I2@ INDI", "1 NAME Son /G/", "1 FAMC @F1@", "1 FAMS @F2@",
      "0 @I3@ INDI", "1 NAME Daughter /G/", "1 FAMC @F1@", "1 FAMS @F3@",
      "0 @I4@ INDI", "1 NAME Cousin /G/", "1 FAMC @F2@", "1 FAMS @F4@",
      "0 @I5@ INDI", "1 NAME Other /H/", "1 FAMC @F3@", "1 FAMS @F4@",
      "0 @F1@ FAM", "1 HUSB @I1@", "1 CHIL @I2@", "1 CHIL @I3@",
      "0 @F2@ FAM", "1 HUSB @I2@", "1 CHIL @I4@",
      "0 @F3@ FAM", "1 WIFE @I3@", "1 CHIL @I5@",
      "0 @F4@ FAM", "1 HUSB @I4@", "1 WIFE @I5@",
      "0 TRLR", "",
    ].join("\n");
    draw("@I5@", { width: 1600, height: 900 }, indexOf(text));
    const grands = [...container.querySelectorAll<SVGElement>(".gedcom-fg-person")].filter(
      (one) => one.querySelector("title")?.textContent === "Grand G",
    );
    grands[0]?.querySelector("[data-card]")?.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, pointerType: "mouse" }));
    vi.advanceTimersByTime(HOVER_DELAY);

    expect(grands).toHaveLength(2);
    expect(grands.map((one) => one.classList.contains("is-hl"))).toEqual([true, true]);
    expect(person("Son G")?.classList.contains("is-on")).toBe(true);
    expect(person("Daughter G")?.classList.contains("is-on")).toBe(true);
  });

  it("keeps the zoom, and the keyboard's focus on the new focus, as the focus moves", () => {
    const memory: TreeMemory = {};
    const canvas = draw("@I1@", { width: 1200, height: 600 }, curieIndex(), memory);
    canvas.zoomBy(1.3);
    const k = canvas.view()?.k;
    card("Pierre Curie")?.focus();
    card("Pierre Curie")?.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "Enter" }));
    expect(host.openRecord).toHaveBeenCalledWith("@I2@");

    const again = draw("@I2@", { width: 1200, height: 600 }, curieIndex(), memory);
    expect(again.view()?.k).toBeCloseTo(k ?? NaN, 6);
    expect(document.activeElement?.closest(".gedcom-fg-person")?.querySelector("title")?.textContent).toBe("Pierre Curie");
  });

  it("opens a wide family where a child of the focus is in view", () => {
    const lines = ["0 HEAD", "1 GEDC", "2 VERS 7.0", "0 @I1@ INDI", "1 NAME Root /R/", "1 FAMS @F1@"];
    const families = ["0 @F1@ FAM", "1 WIFE @I1@"];
    let next = 2;
    for (let child = 0; child < 12; child += 1) {
      const xref = next++;
      families.push(`1 CHIL @I${xref}@`);
      lines.push(`0 @I${xref}@ INDI`, `1 NAME Child${child} /R/`, "1 FAMC @F1@", `1 FAMS @F${xref}@`);
      const kids = [`0 @F${xref}@ FAM`, `1 HUSB @I${xref}@`];
      for (let grandchild = 0; grandchild < 8; grandchild += 1) {
        const gx = next++;
        lines.push(`0 @I${gx}@ INDI`, `1 NAME G${child}x${grandchild} /R/`, `1 FAMC @F${xref}@`);
        kids.push(`1 CHIL @I${gx}@`);
      }
      lines.push(...kids);
    }
    const canvas = draw("@I1@", { width: 1200, height: 600 }, indexOf([...lines, ...families, "0 TRLR", ""].join("\n")));
    const view = canvas.windowOf();
    const visible = [...container.querySelectorAll<SVGElement>(".gedcom-fg-person")].filter((one) => {
      const name = one.querySelector("title")?.textContent ?? "";
      const box = boxOf(name);
      return name.startsWith("Child") && box.x >= (view?.left ?? Infinity) && box.x + CARD.width <= (view?.right ?? -Infinity);
    });

    expect(visible.length).toBeGreaterThan(0);
    expect(canvas.view()?.k).toBeGreaterThanOrEqual(0.5);
  });

  it("lets a two-finger scroll past the tree's edge scroll the page", () => {
    const canvas = draw("@I1@", { width: 1200, height: 600 });
    const wheel = (deltaY: number) => {
      const event = Object.assign(new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaY }), { clientX: 100, clientY: 100 });
      container.querySelector(".gedcom-fg-canvas")?.dispatchEvent(event);
      return event;
    };

    expect(wheel(-10).defaultPrevented).toBe(false);
    expect(canvas.view()).toBeDefined();
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
    vi.advanceTimersByTime(HOVER_DELAY);

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
    expect(y + boxOf("Marie Skłodowska-Curie").height).toBeLessThanOrEqual(view?.bottom ?? -Infinity);
  });

  it("says what the colours, the dot and the triangles mean", () => {
    draw();
    const legend = container.querySelector(".gedcom-desk-legend")?.textContent ?? "";

    for (const text of ["Woman", "Man", "Family, with the year of the marriage", "No sources at all", "▲ ▼"]) {
      expect(legend).toContain(text);
    }
  });
});
