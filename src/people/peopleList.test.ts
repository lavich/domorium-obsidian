// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PersonRow } from "../genealogy";
import { PeopleList, type PeopleListLabels } from "./peopleList";

let container: HTMLElement;

/** Resolved strings, so the renderer never reaches for the plugin's language. */
const LABELS: PeopleListLabels = {
  count: (total) => `${total} people`,
  noResults: "No people found",
  unnamed: "Unnamed",
  searchPlaceholder: "Search people...",
};

function row(overrides: Partial<PersonRow> = {}): PersonRow {
  const base: PersonRow = {
    xref: "@I1@",
    unaddressable: false,
    name: "John Smith",
    otherNames: [],
    search: "john smith @i1@",
    ...overrides,
  };
  return base;
}

const list = (people: PersonRow[], onChoose = vi.fn()): PeopleList => {
  const made = new PeopleList(container, LABELS, onChoose);
  made.setPeople(people);
  return made;
};

const texts = (selector: string): string[] =>
  [...container.querySelectorAll(selector)].map(
    (node) => node.textContent ?? "",
  );

const rowCount = (): number =>
  container.querySelectorAll(".gedcom-person-row").length;

beforeEach(() => {
  container = document.createElement("div");
});

describe("what a row tells the reader", () => {
  it("shows the name, the years and a place", () => {
    list([
      row({
        name: "John Smith",
        birth: { text: "12 MAR 1901", year: 1901, precision: "exact" },
        death: { text: "7 MAY 1975", year: 1975, precision: "exact" },
        place: "London, England",
      }),
    ]);

    expect(texts(".gedcom-person-name")).toEqual(["John Smith"]);
    expect(texts(".gedcom-person-years")).toEqual(["1901–1975"]);
    expect(texts(".gedcom-person-place")).toEqual(["London, England"]);
  });

  it("leaves the span open where no death is recorded", () => {
    list([
      row({ birth: { text: "1931", year: 1931, precision: "exact" } }),
    ]);

    expect(texts(".gedcom-person-years")).toEqual(["1931–"]);
  });

  it("opens the span where only a death is recorded", () => {
    list([row({ death: { text: "1975", year: 1975, precision: "exact" } })]);

    expect(texts(".gedcom-person-years")).toEqual(["–1975"]);
  });

  it("shows no years at all where neither could be read", () => {
    list([row({ birth: { text: "@#DHEBREW@ 5628" } })]);

    expect(texts(".gedcom-person-years")).toEqual([]);
  });

  it("shows a name-only person with nothing else beside it", () => {
    list([row()]);

    expect(texts(".gedcom-person-name")).toEqual(["John Smith"]);
    expect(texts(".gedcom-person-years")).toEqual([]);
    expect(texts(".gedcom-person-place")).toEqual([]);
  });

  it("does not lead a row with the identifier", () => {
    list([row({ xref: "@I42@" })]);

    const first = container.querySelector(".gedcom-person-row");
    expect(first?.firstElementChild?.className).toContain("gedcom-person-name");
    expect(first?.textContent).not.toContain("@I42@");
  });

  it("names a person the record left unnamed, in the reader's language", () => {
    list([row({ name: "@unnamed@" })]);

    expect(texts(".gedcom-person-name")).toEqual(["Unnamed"]);
  });
});

describe("which people the list shows", () => {
  it("leaves out a record that cannot be addressed, and does not count it", () => {
    list([
      row({ xref: "@I1@", name: "Addressable" }),
      row({ xref: undefined, unaddressable: true, name: "Nameless Record" }),
    ]);

    expect(texts(".gedcom-person-name")).toEqual(["Addressable"]);
    expect(texts(".gedcom-people-count")).toEqual(["1 people"]);
  });

  it("says how many it is showing", () => {
    list([row({ xref: "@I1@" }), row({ xref: "@I2@" }), row({ xref: "@I3@" })]);

    expect(texts(".gedcom-people-count")).toEqual(["3 people"]);
  });

  it("replaces what it showed when given another document's people", () => {
    const made = list([row({ xref: "@I1@", name: "First" })]);

    made.setPeople([row({ xref: "@I9@", name: "Second" })]);

    expect(texts(".gedcom-person-name")).toEqual(["Second"]);
    expect(rowCount()).toBe(1);
  });
});

describe("choosing a person", () => {
  it("hands the chosen row to its caller rather than acting itself", () => {
    const onChoose = vi.fn();
    const chosen = row({ xref: "@I7@", name: "Chosen" });
    list([chosen], onChoose);

    container.querySelector<HTMLElement>(".gedcom-person-row")?.click();

    expect(onChoose).toHaveBeenCalledWith(chosen);
  });
});

describe("typing into the search field", () => {
  const people = [
    row({
      xref: "@I1@",
      name: "Marie Skłodowska-Curie",
      otherNames: ["Maria Salomea Skłodowska"],
      place: "Warsaw, Congress Poland",
      search: "marie skłodowska-curie maria salomea skłodowska @i1@ 1867 1934 warsaw, congress poland",
    }),
    row({
      xref: "@I10@",
      name: "Pierre Curie",
      place: "Paris, France",
      search: "pierre curie @i10@ 1859 1906 paris, france",
    }),
    row({
      xref: "@I100@",
      name: "John Smith",
      search: "john smith @i100@",
    }),
  ];

  const shown = (): string[] => texts(".gedcom-person-name");

  const typed = (text: string): PeopleList => {
    const made = list(people);
    made.setFilter(text);
    return made;
  };

  it("matches a name whatever its case", () => {
    expect(typed("curie")).toBeDefined();
    expect(shown()).toEqual(["Marie Skłodowska-Curie", "Pierre Curie"]);

    typed("CURIE");
    expect(shown()).toEqual(["Marie Skłodowska-Curie", "Pierre Curie"]);
  });

  it("matches another name the record carries", () => {
    typed("salomea");

    expect(shown()).toEqual(["Marie Skłodowska-Curie"]);
  });

  it("matches an identifier with or without its at signs", () => {
    typed("@I1@");
    expect(shown()).toEqual(["Marie Skłodowska-Curie"]);

    typed("i10");
    expect(shown()).toEqual(["Pierre Curie", "John Smith"]);
  });

  it("matches every identifier a typed one is the start of, in document order", () => {
    typed("i1");

    expect(
      shown(),
      "ordering an exact identifier first is not part of this change",
    ).toEqual(["Marie Skłodowska-Curie", "Pierre Curie", "John Smith"]);
  });

  it("matches a year and a place", () => {
    typed("1867");
    expect(shown()).toEqual(["Marie Skłodowska-Curie"]);

    typed("paris");
    expect(shown()).toEqual(["Pierre Curie"]);
  });

  it("says so when nothing matches, and shows no rows", () => {
    typed("Ipswich");

    expect(shown()).toEqual([]);
    expect(texts(".gedcom-people-empty")).toEqual(["No people found"]);
  });

  it("counts what it is showing, not what the document holds", () => {
    typed("curie");

    expect(texts(".gedcom-people-count")).toEqual(["2 people"]);
  });

  it("restores the whole list when the field is cleared", () => {
    const made = typed("curie");
    made.setFilter("");

    expect(shown()).toHaveLength(3);
    expect(texts(".gedcom-people-empty")).toEqual([]);
  });

  it("keeps the filter when the document's people are replaced", () => {
    const made = typed("curie");

    made.setPeople([row({ xref: "@I1@", name: "Other Curie", search: "other curie" })]);

    expect(shown()).toEqual(["Other Curie"]);
  });
});

describe("a list too long to draw whole", () => {
  const many = (total: number): PersonRow[] =>
    Array.from({ length: total }, (_, i) =>
      row({
        xref: `@I${i}@`,
        name: `Given${i} Surname${i % 500}`,
        search: `given${i} surname${i % 500} @i${i}@`,
      }),
    );

  /** happy-dom lays nothing out, so the viewport is stated rather than measured. */
  const sized = (people: PersonRow[]): PeopleList => {
    const made = new PeopleList(container, LABELS, vi.fn(), { viewport: 600 });
    made.setPeople(people);
    return made;
  };

  it("draws a bounded number of rows for twenty thousand people", () => {
    sized(many(20000));

    expect(rowCount()).toBeGreaterThan(0);
    expect(rowCount()).toBeLessThan(200);
  });

  it("still says how many there are, not how many it drew", () => {
    sized(many(20000));

    expect(texts(".gedcom-people-count")).toEqual(["20000 people"]);
  });

  it("reserves the height the whole list would take, so the bar is honest", () => {
    sized(many(20000));

    const rows = container.querySelector<HTMLElement>(".gedcom-people-rows");
    const height = rows?.style.getPropertyValue("--gedcom-people-height") ?? "";

    expect(rows?.classList.contains("is-windowed")).toBe(true);
    expect(height).toMatch(/^\d+px$/);
    expect(Number.parseInt(height, 10)).toBeGreaterThan(20000);
  });

  it("places each drawn row where it belongs in that height", () => {
    sized(many(20000));

    const tops = [...container.querySelectorAll<HTMLElement>(".gedcom-person-row")]
      .map((node) => node.style.getPropertyValue("--gedcom-person-top"));

    expect(tops[0]).toBe("0px");
    expect(new Set(tops).size).toBe(tops.length);
  });

  it("draws the rows the reader has scrolled to", () => {
    const made = sized(many(20000));

    const firstNames = texts(".gedcom-person-name");
    made.onScrolled(10000);
    const laterNames = texts(".gedcom-person-name");

    expect(laterNames[0]).not.toBe(firstNames[0]);
    expect(laterNames.length).toBeLessThan(200);
  });

  it("draws a short list whole, with no window to speak of", () => {
    sized(many(12));

    expect(rowCount()).toBe(12);
  });

  it("goes back to the top when the filter changes", () => {
    const made = sized(many(20000));
    made.onScrolled(10000);

    made.setFilter("surname7");

    expect(texts(".gedcom-person-name")[0]).toBe("Given7 Surname7");
  });
});
