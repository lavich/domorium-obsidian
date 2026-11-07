// @vitest-environment happy-dom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { GenealogyIndex, RecordLine } from "../../genealogy";
import { FAMILY_EVENT_TAGS, PERSON_EVENT_TAGS } from "../../genealogy/tags";
import { resetLanguage } from "../../i18n";
import { installObsidianDom } from "../../testing/obsidianDom";
import { richIndex, richIndex551 } from "../../testing/rich";
import { eventIdOf } from "../eventRows";
import { drawnByGallery } from "../personPage";
import { renderRecordCard, type CardTab, type CardView } from "../recordCard";

beforeAll(installObsidianDom);
afterEach(resetLanguage);

let container: HTMLElement;
beforeEach(() => {
  container = document.createElement("div");
  document.body.replaceChildren(container);
});

const EVENT_TAGS: ReadonlySet<string> = new Set([...PERSON_EVENT_TAGS, ...FAMILY_EVENT_TAGS]);

const everyLine = (line: RecordLine): number[] => [line.range.start.line, ...line.children.flatMap(everyLine)];

/** The numbers of the lines a card draws, from the rows that carry them. */
function drawn(index: GenealogyIndex, record: string): Set<number> {
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
  };
  const view: CardView = { setIcon: vi.fn(), openNote: vi.fn() };
  container.replaceChildren();
  renderRecordCard(container, tab, [], view);
  container.querySelector(".gedcom-card")?.setAttribute("data-open", "timeline info other");
  renderRecordCard(container, tab, [], view);
  const found = new Set<number>();
  for (const element of container.querySelectorAll("[data-line]")) {
    for (const token of (element.getAttribute("data-line") ?? "").split(" ")) {
      found.add(Number(token));
    }
  }
  return found;
}

/** What a person's or a family's own card must draw: every line but those beneath an event, which its card draws. */
function ownLines(index: GenealogyIndex, xref: string): number[] {
  const record = index.record(xref);
  const media = (index.person(xref) ?? index.family(xref))?.media ?? [];
  const items = media.map(({ at }) => ({ content: { kind: "missing" as const, target: "" }, at }));
  return (record?.children ?? [])
    .filter((line) => !(line.tag === "OBJE" && drawnByGallery(line, items)))
    .flatMap((line) => (EVENT_TAGS.has(line.tag) ? [line.range.start.line] : everyLine(line)));
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
