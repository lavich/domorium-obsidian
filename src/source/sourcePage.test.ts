// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Citation, Source } from "../genealogy";
import { renderSourcePage, type SourcePageHost } from "./sourcePage";

let container: HTMLElement;

function host(overrides: Partial<SourcePageHost> = {}): SourcePageHost {
  return {
    labels: {
      heldAt: "Held at",
      citedBy: "What rests on this",
      citedByNobody: "Nothing in this file cites this source.",
      untitled: "Untitled source",
      address: "Address",
      web: "Web",
    },
    fieldLabel: (tag) =>
      ({ TITL: "Title", AUTH: "Author", PUBL: "Publisher" })[tag] ?? tag,
    within: (tag) => `of ${({ BIRT: "Birth" })[tag] ?? tag}`,
    nameOf: (xref) => ({ "@I1@": "Marie Curie", "@I2@": "Pierre Curie" })[xref] ?? xref,
    source: { document: "curie.ged", xref: "@S1@" },
    citations: [],
    onCiter: vi.fn(),
    onOpenRecord: vi.fn(),
    ...overrides,
  };
}

function src(overrides: Partial<Source> = {}): Source {
  return {
    xref: "@S1@",
    unaddressable: false,
    title: "Parish registers of Warsaw",
    search: "",
    fields: [{ tag: "TITL", value: "Parish registers of Warsaw" }],
    media: [],
    unresolved: [],
    ...overrides,
  };
}

const cite = (over: Partial<Citation> = {}): Citation => ({
  record: "@I1@",
  source: "@S1@",
  ...over,
});

const draw = (one: Source, using = host()): void => {
  renderSourcePage(container, one, using);
};

const texts = (selector: string): string[] =>
  [...container.querySelectorAll(selector)].map((n) => n.textContent ?? "");

beforeEach(() => {
  container = document.createElement("div");
});

describe("what the source is", () => {
  it("heads with the title and labels what the record states", () => {
    draw(
      src({
        fields: [
          { tag: "TITL", value: "Parish registers of Warsaw" },
          { tag: "AUTH", value: "Parish of the Holy Cross" },
          { tag: "PUBL", value: "Warsaw, 1867" },
        ],
      }),
    );

    expect(texts(".gedcom-person-title")).toEqual([
      "Parish registers of Warsaw",
    ]);
    expect(texts(".gedcom-person-fact-label")).toEqual([
      "Author",
      "Publisher",
    ]);
  });

  it("shows no empty rows for what the record does not state", () => {
    draw(src());

    expect(texts(".gedcom-person-fact-label")).toEqual([]);
  });

  it("heads with the identifier where the record states no title", () => {
    draw(src({ title: "@untitled@" }));

    expect(texts(".gedcom-person-title")).toEqual(["@S1@"]);
  });

  it("shows where the source is held", () => {
    draw(
      src({
        heldAt: {
          name: "State Archive in Warsaw",
          address: "Krzywe Koło 7",
        },
      }),
    );

    expect(container.textContent).toContain("Held at");
    expect(container.textContent).toContain("State Archive in Warsaw");
    expect(container.textContent).toContain("Krzywe Koło 7");
  });
});

describe("what rests on the source", () => {
  it("lists every record that cites it, each openable", () => {
    draw(
      src(),
      host({
        citations: [cite(), cite({ record: "@I2@" })],
      }),
    );

    expect(texts(".gedcom-citation-title")).toEqual([
      "Marie Curie",
      "Pierre Curie",
    ]);
  });

  it("says what within a record a citation was attached to", () => {
    draw(src(), host({ citations: [cite({ within: "BIRT" })] }));

    expect(texts(".gedcom-citation-within")).toEqual(["of Birth"]);
  });

  it("shows the page a citation states", () => {
    draw(src(), host({ citations: [cite({ page: "volume 3, page 214" })] }));

    expect(texts(".gedcom-citation-page")).toEqual(["volume 3, page 214"]);
  });

  it("hands a chosen record back rather than opening anything", () => {
    const onCiter = vi.fn();
    const one = cite();
    draw(src(), host({ citations: [one], onCiter }));

    container.querySelector<HTMLElement>(".gedcom-citation")?.click();

    expect(onCiter).toHaveBeenCalledWith(one);
  });

  it("says plainly when nothing rests on it", () => {
    draw(src(), host({ citations: [] }));

    expect(container.textContent).toContain(
      "Nothing in this file cites this source.",
    );
  });
});

describe("returning to the record", () => {
  it("shows the identifier and reaches the record from it", () => {
    const onOpenRecord = vi.fn();
    draw(src(), host({ onOpenRecord }));

    expect(texts(".gedcom-person-source")[0]).toBe("@S1@");

    container.querySelector<HTMLElement>(".gedcom-person-source-link")?.click();
    expect(onOpenRecord).toHaveBeenCalled();
  });
});
