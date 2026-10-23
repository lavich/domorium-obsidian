// @vitest-environment happy-dom
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { curieIndex } from "../testing/curie";
import { installObsidianDom } from "../testing/obsidianDom";
import { layoutTree } from "./treeLayout";
import { renderTree, type TreeHost } from "./treeView";

let container: HTMLElement;
let host: { openRecord: ReturnType<typeof vi.fn<TreeHost["openRecord"]>>; toggleSiblings: ReturnType<typeof vi.fn<(xref: string) => void>> };

beforeAll(installObsidianDom);
beforeEach(() => {
  container = document.createElement("div");
  host = { openRecord: vi.fn<TreeHost["openRecord"]>(), toggleSiblings: vi.fn<(xref: string) => void>() };
});

function draw(focus = "@I1@"): void {
  const layout = layoutTree(curieIndex(), focus);
  if (layout) {
    renderTree(container, layout, host);
  }
}

const node = (name: string): HTMLElement | undefined =>
  [...container.querySelectorAll<HTMLElement>(".gedcom-desk-node")]
    .find((one) => one.querySelector(".gedcom-desk-node-name")?.textContent === name);

describe("the tree view", () => {
  it("draws a box for each person at its place, the focus marked", () => {
    draw();

    expect(container.querySelectorAll(".gedcom-desk-node")).toHaveLength(14);
    expect(node("Marie Skłodowska-Curie")?.classList.contains("is-focus")).toBe(true);
    expect(node("Pierre Curie")?.style.getPropertyValue("left")).toMatch(/px$/u);
  });

  it("draws the lines between them", () => {
    draw();

    expect(container.querySelector("path")?.getAttribute("d")).toMatch(/^M[\d.]+ [\d.]+H/u);
  });

  it("moves the focus to a person, and opens a run of siblings", () => {
    draw();
    node("Pierre Curie")?.click();
    node("4 siblings")?.click();

    expect(host.openRecord).toHaveBeenCalledWith("@I2@");
    expect(host.toggleSiblings).toHaveBeenCalledWith("@I1@");
  });

  it("marks who has relatives beyond the edge", () => {
    draw("@I16@");

    expect(node("Marie Skłodowska-Curie")?.querySelector(".gedcom-desk-node-more.is-up")).not.toBeNull();
  });
});
