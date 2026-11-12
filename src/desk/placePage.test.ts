// @vitest-environment happy-dom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { resetLanguage, setLanguage } from "../i18n";
import { curieIndex, indexOf } from "../testing/curie";
import { installObsidianDom } from "../testing/obsidianDom";
import type { WriteOutcome } from "./edits";
import { TreeSession, type TreeState } from "./detail/treeSession";
import type { Rename } from "./placeEdits";
import { placeAt } from "./placeRows";
import { NAME_FOCUS, renderPlacePage, type PlaceHost } from "./placePage";

let container: HTMLElement;
let state: TreeState;
let revealed: ReturnType<typeof vi.fn<PlaceHost["revealLine"]>>;
let asked: { rename: Rename; done: (outcome: WriteOutcome | null) => void }[];

beforeAll(installObsidianDom);
afterEach(resetLanguage);
beforeEach(() => {
  container = document.createElement("div");
  document.body.replaceChildren(container);
  state = new TreeSession().stateFor("place");
  revealed = vi.fn();
  asked = [];
});

const writing = (): PlaceHost => ({
  revealLine: revealed,
  renamePlace: (rename, done) => {
    asked.push({ rename, done });
  },
});

function draw(host: PlaceHost = writing(), index = curieIndex(), id = "place:warsaw, congress poland"): void {
  const place = placeAt(index, id);
  if (!place) {
    throw new Error(`no ${id}`);
  }
  container.replaceChildren();
  renderPlacePage(container, place, index, host, state);
}

const rows = (): HTMLElement[] => [...container.querySelectorAll<HTMLElement>(".gedcom-place-line")];
const textOf = (row: HTMLElement | undefined, selector: string): string | undefined => row?.querySelector(selector)?.textContent ?? undefined;
const nameArea = (): HTMLTextAreaElement => {
  const area = container.querySelector<HTMLTextAreaElement>(`[data-focus-key="${NAME_FOCUS}"]`) ?? container.querySelector("textarea");
  if (!area) {
    throw new Error("no field");
  }
  return area;
};
const type = (area: HTMLTextAreaElement, text: string): void => {
  area.focus();
  area.value = text;
  area.dispatchEvent(new Event("input", { bubbles: true }));
};
const press = (area: HTMLElement, key: string): void => {
  area.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
};
const messageOf = (control: Element): string | undefined => {
  const id = control.getAttribute("aria-describedby");
  return id === null ? undefined : (document.getElementById(id)?.textContent ?? undefined);
};
const settled = (): Promise<void> => new Promise((resolve) => window.setTimeout(resolve, 0));

describe("the card of a place", () => {
  it("has no heading, and opens with the field of its name, labelled Place", () => {
    draw();
    const area = nameArea();

    expect(container.querySelector("h1, h2, .gedcom-desk-title")).toBeNull();
    expect(area.value).toBe("Warsaw, Congress Poland");
    expect(document.getElementById(area.getAttribute("aria-labelledby") ?? "")?.textContent).toBe("Place");
    expect(container.querySelector("textarea, button")).toBe(area);
  });

  it("names the place and its label in Russian", () => {
    setLanguage("ru");
    draw();

    expect(textOf(container.querySelector<HTMLElement>(".gedcom-place-name") ?? undefined, ".gedcom-place-label")).toBe("Место");
    expect(container.querySelector(".gedcom-place-lines")?.getAttribute("aria-label")).toBe("Где файл называет это место");
  });

  it("draws a row for every line naming the place, in the order of the file, Marie's birth first", () => {
    draw();
    const [first] = rows();

    expect(rows()).toHaveLength(11);
    expect(textOf(first, ".gedcom-desk-fact-date")).toBe("7 NOV 1867");
    expect(textOf(first, ".gedcom-desk-fact-name")).toBe("Birth");
    expect(textOf(first, ".gedcom-desk-fact-value .gedcom-desk-link")).toBe("Marie Skłodowska-Curie");
    expect(first?.querySelector(".gedcom-desk-source")).toBeNull();
    const lines = rows().map((row) => Number(row.getAttribute("data-line")));
    expect(lines).toEqual([...lines].sort((a, b) => a - b));
    expect(rows().map((row) => textOf(row, ".gedcom-desk-link"))).toContain("Władysław Skłodowski ⚭ Bronisława Boguska");
  });

  it("puts a dot after an event that cites a source, and a dash where it has no date", () => {
    const index = indexOf(["0 HEAD", "1 GEDC", "2 VERS 7.0", "0 @I1@ INDI", "1 NAME A /B/", "1 BIRT", "2 PLAC Kyiv", "2 SOUR @S2@", "0 @S2@ SOUR", "0 TRLR"].join("\n"));
    draw(writing(), index, "place:kyiv");
    const dot = rows()[0]?.querySelector(".gedcom-desk-source");

    expect(dot?.getAttribute("aria-label")).toBe("1 source");
    expect(rows()[0]?.querySelector(".gedcom-desk-fact-date.is-empty")?.textContent).toBe("—");
  });

  it("reveals the event from its link and from its row, and its name is no control of its own", () => {
    draw();
    const [first] = rows();
    first?.querySelector<HTMLElement>(".gedcom-desk-link")?.click();
    first?.querySelector<HTMLElement>(".gedcom-desk-fact-name")?.click();

    expect(revealed.mock.calls).toEqual([
      ["@I1@", 21],
      ["@I1@", 21],
    ]);
    expect(first?.querySelector("button.gedcom-desk-fact-name")).toBeNull();
  });

  it("asks once on Enter, and puts the name back where the reader declines", async () => {
    draw();
    const area = nameArea();
    type(area, "Warszawa, Poland");
    press(area, "Enter");
    area.blur();
    await settled();

    expect(asked).toHaveLength(1);
    expect(asked[0]?.rename.value).toBe("Warszawa, Poland");
    expect(asked[0]?.rename.lines).toHaveLength(11);
    asked[0]?.done(null);
    expect(area.value).toBe("Warsaw, Congress Poland");
    expect(state.draft("place")).toBeUndefined();
  });

  it("asks on leaving the field", async () => {
    draw();
    const area = nameArea();
    type(area, "Warszawa");
    area.blur();
    await settled();

    expect(asked.map(({ rename }) => rename.value)).toEqual(["Warszawa"]);
  });

  it("refuses an empty name without asking", () => {
    draw();
    const area = nameArea();
    type(area, "  ");
    press(area, "Enter");

    expect(asked).toHaveLength(0);
    expect(messageOf(area)).toBe("A place needs a name.");
  });

  it("asks nothing where the name already reads so in every line", () => {
    draw();
    const area = nameArea();
    type(area, "Warsaw, Congress Poland ");
    press(area, "Enter");

    expect(asked).toHaveLength(0);
    expect(area.value).toBe("Warsaw, Congress Poland");
  });

  it("says why the service refused, keeping what the reader typed", () => {
    draw();
    const area = nameArea();
    type(area, "Warszawa\nPoland");
    press(area, "Enter");
    asked[0]?.done({ ok: false, code: "value-spans-lines", message: "Value for PLAC cannot span lines" });

    expect(messageOf(area)).toBe("A line break is not allowed in this value: it keeps to one line.");
    expect(state.draft("place")?.text).toBe("Warszawa\nPoland");
  });

  it("is read-only where the card does not write, and says why once", () => {
    draw({ revealLine: revealed, uneditable: true });
    const area = nameArea();

    expect(area.hasAttribute("readonly")).toBe(true);
    expect([...container.querySelectorAll(".gedcom-tree-note")].map((note) => note.textContent)).toEqual([
      "This file names no GEDCOM version the plugin can check, so its records cannot be edited here.",
    ]);
    rows()[0]?.click();
    expect(revealed).toHaveBeenCalledWith("@I1@", 21);
  });

  it("puts the focus on its name where the card wished it after a rename", () => {
    state.wishFocus({ key: "place", parts: [NAME_FOCUS] });
    draw();

    expect(document.activeElement).toBe(nameArea());
    expect(state.takeFocus()).toBeUndefined();
  });
});
