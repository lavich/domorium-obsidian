// @vitest-environment happy-dom
import { GedcomLanguageService } from "@domorium/language-service";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { buildIndex, type RecordLine } from "../../genealogy";
import { installObsidianDom } from "../../testing/obsidianDom";
import { labelId, renderField, setFieldText } from "./fields";
import { renderLines, type DetailContext } from "./lineView";

beforeAll(installObsidianDom);

let box: HTMLElement;
beforeEach(() => {
  box = document.createElement("div");
  document.body.replaceChildren(box);
});

function person(lines: string[]): { record: RecordLine; ctx: DetailContext } {
  const text = ["0 HEAD", "1 GEDC", "2 VERS 7.0", "0 @I1@ INDI", ...lines, "0 TRLR"].join("\n");
  const index = buildIndex(new GedcomLanguageService(text));
  return {
    record: index.record("@I1@") as RecordLine,
    ctx: { index, host: { openRecord: () => undefined, showInSource: () => undefined } },
  };
}

describe("a value drawn as a field", () => {
  it("is a text area that cannot be changed, holds the value, is not in the tab order, and names what it is the value of", () => {
    const id = labelId();
    const { area, box: wrapper } = renderField(box, "Natural causes", "text", { labelledBy: id });

    expect(area.tagName).toBe("TEXTAREA");
    expect(area.hasAttribute("readonly")).toBe(true);
    expect(area.getAttribute("tabindex")).toBe("-1");
    expect(area.getAttribute("aria-labelledby")).toBe(id);
    expect(area.textContent).toBe("Natural causes");
    expect(wrapper.getAttribute("data-value")).toBe("Natural causes");
    expect(wrapper.getAttribute("data-kind")).toBe("text");
  });

  it("keeps what it shows for its size in step with its text", () => {
    const field = renderField(box, "short");
    setFieldText(field, "a longer text\nover two lines");

    expect(field.box.getAttribute("data-value")).toBe("a longer text\nover two lines");
    expect(field.area.textContent).toBe("a longer text\nover two lines");
  });

  it("gives every label an id of its own", () => {
    expect(labelId()).not.toBe(labelId());
  });
});

describe("the rows of a card", () => {
  it("draw each value as a field named by its label, a choice where the standard limits the values", () => {
    const { record, ctx } = person(["1 SEX F", "1 REFN 123", "1 _CUSTOM yes"]);
    renderLines(box.createDiv({ cls: "gedcom-detail" }), record.children, ctx);
    const fields = [...box.querySelectorAll<HTMLElement>(".gedcom-field")];
    const label = (field: HTMLElement) =>
      document.getElementById(field.querySelector("textarea")?.getAttribute("aria-labelledby") ?? "")?.textContent;

    expect(fields.map((field) => [label(field), field.textContent, field.getAttribute("data-kind")])).toEqual([
      ["Sex", "Female", "choice"],
      ["Reference number", "123", "text"],
      ["_CUSTOM", "yes", "text"],
    ]);
  });

  it("draw a name as a name, the type as a choice, the parts as fields", () => {
    const { record, ctx } = person(["1 NAME Maria /Curie/", "2 TYPE BIRTH", "2 GIVN Maria"]);
    renderLines(box.createDiv({ cls: "gedcom-detail" }), record.children.slice(0, 1), ctx);
    const fields = [...box.querySelectorAll(".gedcom-field")];

    expect(fields.map((field) => field.getAttribute("data-kind"))).toEqual(["text", "choice", "text"]);
    expect(fields.map((field) => field.textContent)).toEqual(["Maria Curie", "Birth", "Maria"]);
  });
});
