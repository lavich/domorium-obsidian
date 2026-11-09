// @vitest-environment happy-dom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { GenealogyIndex, RecordLine } from "../../genealogy";
import { resetLanguage } from "../../i18n";
import { installObsidianDom } from "../../testing/obsidianDom";
import { richIndex, richIndex551 } from "../../testing/rich";
import { eventIdOf } from "../eventRows";
import { TreeSession } from "./treeSession";
import { renderRecordCard, type CardTab, type CardView } from "../recordCard";

beforeAll(installObsidianDom);
afterEach(resetLanguage);

let container: HTMLElement;
beforeEach(() => {
  container = document.createElement("div");
  document.body.replaceChildren(container);
});

const everyLine = (line: RecordLine): number[] => [line.range.start.line, ...line.children.flatMap(everyLine)];

/** The numbers of the lines a card draws, from the rows that carry them; `text` gets what the card says. */
function drawn(index: GenealogyIndex, record: string, text?: { said: string }): Set<number> {
  const tab: CardTab = {
    filePath: () => "rich.ged",
    index: () => index,
    selection: () => ({ record, fact: null }),
    mediaItems: (media) => media.map(({ at }) => ({ content: { kind: "missing", target: "" }, at })),
    mediaItem: () => null,
    portrait: () => null,
    select: vi.fn(),
    selectFact: vi.fn(),
    showInSource: vi.fn(),
    openFile: vi.fn(),
    history: () => ({ canBack: false, canForward: false }),
    back: vi.fn(),
    forward: vi.fn(),
    arrivedBy: () => "other",
  };
  const view: CardView = { setIcon: vi.fn(), session: new TreeSession() };
  container.replaceChildren();
  renderRecordCard(container, tab, view);
  container.querySelector(".gedcom-card")?.setAttribute("data-open", "timeline other");
  renderRecordCard(container, tab, view);
  for (const control of container.querySelectorAll<HTMLElement>(".gedcom-tree-control")) {
    if (control.getAttribute("aria-label") === "Open every node") {
      control.click();
    }
  }
  if (text) {
    text.said = container.textContent ?? "";
  }
  const found = new Set<number>();
  for (const element of container.querySelectorAll("[data-line]")) {
    for (const token of (element.getAttribute("data-line") ?? "").split(" ")) {
      found.add(Number(token));
    }
  }
  return found;
}

/** What a person's or a family's own card must draw: every line of its record, to any depth. */
function ownLines(index: GenealogyIndex, xref: string): number[] {
  return (index.record(xref)?.children ?? []).flatMap(everyLine);
}

function check(index: GenealogyIndex, xref: string): void {
  const have = drawn(index, xref);
  const missing = ownLines(index, xref).filter((line) => !have.has(line));
  expect(missing, `lines of ${xref} not on its card`).toEqual([]);

  const record = index.person(xref) ?? index.family(xref);
  for (const event of record?.events ?? []) {
    const id = eventIdOf(xref, record?.events ?? [], event);
    const there = drawn(index, id);
    const line = index.record(xref)?.children.find((one) => one.tag === event.tag && one.range.start.line === event.range.start.line);
    const absent = (line ? everyLine(line) : []).filter((one) => !there.has(one));
    expect(absent, `lines of ${id} not on its card`).toEqual([]);
  }
}

describe("every line of a record is on a card", () => {
  it("shows every line of a person in 7.0, and of each of their events, on their cards", () => {
    check(richIndex(), "@I1@");
  });

  it("shows every line of a family in 7.0, and of each of its events, on its cards", () => {
    check(richIndex(), "@F3@");
  });

  it("shows every line of a person in 5.5.1, and of each of their events, on their cards", () => {
    check(richIndex551(), "@I1@");
  });

  it("shows every line of a family in 5.5.1, and of each of its events, on its cards", () => {
    check(richIndex551(), "@F1@");
  });
});

/** What a card says, with its folds and long notes open. */
function said(index: GenealogyIndex, record: string): string {
  const text = { said: "" };
  drawn(index, record, text);
  return text.said;
}

describe("what the lines of a record say is on the card, not only where they stand", () => {
  const seven = richIndex();
  const old = richIndex551();

  it("shows an inline source with its continuation in full", () => {
    const card = said(old, "@I1@");

    expect(card).toContain("An inline source text that is continued");
    expect(card).toContain("and goes on a new line");
  });

  it("shows every file and every note of an inline media link the gallery cannot show whole", () => {
    expect(said(old, "@I1@")).toContain("The second file is also stated.");
  });

  it("shows what lies beneath how a child belongs to a family, and the family links to records that are not in the file", () => {
    const card = said(seven, "@I1@");

    expect(card).toContain("by a court");
    expect(card).toContain("A link to a family that is not in the file.");
    expect(card).toContain("A marriage that is not in the file.");
    expect(card).toContain("Names no record");
  });

  it("shows every number of children the record states, and what is beneath them", () => {
    const card = said(seven, "@F3@");

    expect(card.match(/Number of children/gu)).toHaveLength(2);
  });

  it("shows the phrase of a spouse's age, and a second date and place, on the card of the marriage", () => {
    const card = said(seven, "event:@F3@:MARR:0");

    expect(card).toContain("about that");
    expect(card).toContain("ABT 1895");
    expect(card).toContain("Paris, France");
  });

  it("shows a shared note whose first line is empty", () => {
    expect(said(seven, "@I1@")).toContain("Text that starts on the second line.");
  });
});
