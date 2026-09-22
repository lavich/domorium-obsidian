// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { FamilyRow, PersonRow } from "../genealogy";
import { drawFamilyRow } from "./familyRowView";
import { drawPersonRow } from "./personRowView";
import { RecordList, ROW_HEIGHT, type RecordListLabels } from "./recordList";

let container: HTMLElement;

/** Resolved strings, so the renderer never reaches for the plugin's language. */
const LABELS: RecordListLabels = {
  count: (total) => `${total} people`,
  subjects: [{ id: "people", name: "People" }, { id: "families", name: "Families" }],
  noResults: "No people found",
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

/** The subject's drawing is handed in; the list itself knows nothing of it. */
const drawPerson = (row: HTMLElement, record: unknown): void => {
  drawPersonRow(row, record as PersonRow, "Unnamed");
};

const listOf = (
  people: PersonRow[],
  onChoose = vi.fn(),
  metrics?: { viewport: number; rowHeight?: number },
): RecordList => {
  const made = new RecordList(container, LABELS, onChoose, drawPerson, metrics);
  made.setRecords(people);
  return made;
};

const list = listOf;

const options = (): string[] =>
  [...container.querySelectorAll(".gedcom-people-document option")].map(
    (node) => node.textContent ?? "",
  );

const chosen = (): string =>
  container.querySelector<HTMLSelectElement>(".gedcom-people-document")?.value ??
  "";

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

    made.setRecords([row({ xref: "@I9@", name: "Second" })]);

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

  const typed = (text: string): RecordList => {
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

    made.setRecords([row({ xref: "@I1@", name: "Other Curie", search: "other curie" })]);

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
  const sized = (people: PersonRow[]): RecordList =>
    listOf(people, vi.fn(), { viewport: 600 });

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

describe("the bar above the list", () => {
  const withDocuments = (current?: string): RecordList => {
    const made = new RecordList(container, LABELS, vi.fn(), drawPerson);
    made.setDocuments(["curie.ged", "joliot.ged"], current);
    made.setRecords([row({ xref: "@I1@" })]);
    return made;
  };

  it("names the document being listed and offers the others", () => {
    withDocuments("curie.ged");

    expect(options()).toEqual(["curie.ged", "joliot.ged"]);
    expect(chosen()).toBe("curie.ged");
  });

  it("offers both subjects and shows which is being listed", () => {
    const made = withDocuments("curie.ged");
    made.setSubject("families");

    expect(texts(".gedcom-people-subject option")).toEqual([
      "People",
      "Families",
    ]);
    expect(
      container.querySelector<HTMLSelectElement>(".gedcom-people-subject")?.value,
    ).toBe("families");
  });

  it("hands a subject back rather than acting on it", () => {
    const onSubject = vi.fn();
    const made = new RecordList(container, LABELS, vi.fn(), drawPerson);
    made.onSubjectChosen(onSubject);

    const select = container.querySelector<HTMLSelectElement>(
      ".gedcom-people-subject",
    );
    select!.value = "families";
    select?.dispatchEvent(new Event("change"));

    expect(onSubject).toHaveBeenCalledWith("families");
  });

  it("keeps the subject when the document changes", () => {
    const made = withDocuments("curie.ged");
    made.setSubject("families");
    made.setDocuments(["curie.ged", "joliot.ged"], "joliot.ged");

    expect(
      container.querySelector<HTMLSelectElement>(".gedcom-people-subject")?.value,
    ).toBe("families");
  });

  it("hands a choice back rather than acting on it", () => {
    const onDocument = vi.fn();
    const made = new RecordList(container, LABELS, vi.fn(), drawPerson);
    made.onDocumentChosen(onDocument);
    made.setDocuments(["curie.ged", "joliot.ged"], "curie.ged");

    const select = container.querySelector<HTMLSelectElement>(
      ".gedcom-people-document",
    );
    select!.value = "joliot.ged";
    select?.dispatchEvent(new Event("change"));

    expect(onDocument).toHaveBeenCalledWith("joliot.ged");
  });

  it("moves when the document is changed from elsewhere", () => {
    const made = withDocuments("curie.ged");

    made.setDocuments(["curie.ged", "joliot.ged"], "joliot.ged");

    expect(chosen()).toBe("joliot.ged");
  });

  it("offers one where the vault holds one", () => {
    const made = new RecordList(container, LABELS, vi.fn(), drawPerson);
    made.setDocuments(["curie.ged"], "curie.ged");

    expect(options()).toEqual(["curie.ged"]);
  });

  it("chooses none where no document is being listed", () => {
    withDocuments(undefined);

    expect(chosen()).toBe("");
    expect(options()).toContain("curie.ged");
  });

  it("leaves the document out of the count, the bar having it", () => {
    withDocuments("curie.ged");

    expect(texts(".gedcom-people-count")).toEqual(["1 people"]);
  });
});

describe("the height the window counts by", () => {
  it("is published to the stylesheet, so the two cannot disagree", () => {
    const made = new RecordList(container, LABELS, vi.fn(), drawPerson, { viewport: 600 });
    made.setRecords([row({ xref: "@I1@" })]);

    const root = container.querySelector<HTMLElement>(".gedcom-people");

    expect(root?.style.getPropertyValue("--gedcom-person-row-height")).toBe(
      `${ROW_HEIGHT}px`,
    );
  });

  it("follows a height the host asked for", () => {
    const made = new RecordList(container, LABELS, vi.fn(), drawPerson, {
      viewport: 600,
      rowHeight: 60,
    });
    made.setRecords([row({ xref: "@I1@" })]);

    expect(
      container
        .querySelector<HTMLElement>(".gedcom-people")
        ?.style.getPropertyValue("--gedcom-person-row-height"),
    ).toBe("60px");
  });
});

describe("marking the person the reader is looking at", () => {
  const three = [
    row({ xref: "@I1@", name: "Marie", search: "marie @i1@" }),
    row({ xref: "@I2@", name: "Pierre", search: "pierre @i2@" }),
    row({ xref: "@I3@", name: "Irène", search: "irène @i3@" }),
  ];

  const marks = (): string[] =>
    [...container.querySelectorAll(".gedcom-person-row.is-marked")].map(
      (node) => node.querySelector(".gedcom-person-name")?.textContent ?? "",
    );

  it("marks one row, and only one", () => {
    const made = list(three);
    made.setMarked("@I2@");

    expect(marks()).toEqual(["Pierre"]);
  });

  it("moves the mark rather than adding a second", () => {
    const made = list(three);
    made.setMarked("@I2@");
    made.setMarked("@I3@");

    expect(marks()).toEqual(["Irène"]);
  });

  it("marks nothing when told nobody is shown", () => {
    const made = list(three);
    made.setMarked("@I2@");
    made.setMarked(null);

    expect(marks()).toEqual([]);
  });

  it("marks nothing for a person this list does not hold", () => {
    const made = list(three);
    made.setMarked("@I99@");

    expect(marks()).toEqual([]);
  });

  it("does not show a marked person the filter has excluded", () => {
    const made = list(three);
    made.setMarked("@I2@");
    made.setFilter("marie");

    expect(texts(".gedcom-person-name")).toEqual(["Marie"]);
    expect(marks()).toEqual([]);
  });

  it("keeps the mark when the filter lets the person back in", () => {
    const made = list(three);
    made.setMarked("@I2@");
    made.setFilter("marie");
    made.setFilter("");

    expect(marks()).toEqual(["Pierre"]);
  });
});

describe("the order the view is built in", () => {
  it("puts the bar first, the search under it, then the count, then the rows", () => {
    const made = new RecordList(container, LABELS, vi.fn(), drawPerson);
    made.setDocuments(["curie.ged"], "curie.ged");
    made.setRecords([row({ xref: "@I1@" })]);

    const root = container.querySelector(".gedcom-people");
    const order = [...(root?.children ?? [])].map((node) => node.className);

    expect(order).toEqual([
      "gedcom-people-bar",
      "search-input-container",
      "gedcom-people-count",
      "gedcom-people-scroller",
    ]);
  });

  it("keeps the bar, the search and the count out of the scrolling part", () => {
    const made = new RecordList(container, LABELS, vi.fn(), drawPerson);
    made.setRecords([row({ xref: "@I1@" })]);

    const scroller = container.querySelector(".gedcom-people-scroller");

    expect(scroller?.querySelector(".gedcom-people-bar")).toBeNull();
    expect(scroller?.querySelector(".search-input-container")).toBeNull();
    expect(scroller?.querySelector(".gedcom-person-row")).not.toBeNull();
  });

  it("filters from its own search field", () => {
    const made = new RecordList(container, LABELS, vi.fn(), drawPerson);
    made.setRecords([
      row({ xref: "@I1@", name: "Marie", search: "marie" }),
      row({ xref: "@I2@", name: "Pierre", search: "pierre" }),
    ]);

    const search = container.querySelector<HTMLInputElement>(
      ".search-input-container input",
    );
    search!.value = "marie";
    search?.dispatchEvent(new Event("input"));

    expect(texts(".gedcom-person-name")).toEqual(["Marie"]);
  });
});

describe("what a family's row says", () => {
  const family = (overrides: Partial<FamilyRow> = {}): FamilyRow => ({
    xref: "@F1@",
    unaddressable: false,
    spouseNames: ["Pierre Curie", "Marie Skłodowska-Curie"],
    name: "Pierre Curie / Marie Skłodowska-Curie",
    childCount: 0,
    search: "pierre curie marie skłodowska-curie @f1@",
    ...overrides,
  });

  const families = (rows: FamilyRow[]): RecordList => {
    const made = new RecordList(container, LABELS, vi.fn(), (row, record) =>
      drawFamilyRow(row, record as FamilyRow, (n) => `${n} children`),
    );
    made.setRecords(rows);
    return made;
  };

  it("names the people it joins, with the year, the place and the children", () => {
    families([
      family({
        marriage: { text: "26 JUL 1895", year: 1895, precision: "exact" },
        place: "Sceaux, France",
        childCount: 2,
      }),
    ]);

    expect(texts(".gedcom-person-name")).toEqual([
      "Pierre Curie / Marie Skłodowska-Curie",
    ]);
    expect(texts(".gedcom-person-years")).toEqual(["1895"]);
    expect(texts(".gedcom-person-place")).toEqual(["Sceaux, France"]);
    expect(texts(".gedcom-family-children")).toEqual(["2 children"]);
  });

  it("shows only the people where the record says nothing else", () => {
    families([family()]);

    expect(texts(".gedcom-person-name")).toEqual([
      "Pierre Curie / Marie Skłodowska-Curie",
    ]);
    expect(texts(".gedcom-person-years")).toEqual([]);
    expect(texts(".gedcom-person-place")).toEqual([]);
    expect(texts(".gedcom-family-children")).toEqual([]);
  });

  it("shows the identifier where the record names nobody", () => {
    families([family({ name: undefined, spouseNames: [] })]);

    expect(texts(".gedcom-person-name")).toEqual(["@F1@"]);
  });

  it("filters on a spouse's name and on the place of the marriage", () => {
    const made = families([
      family({ search: "pierre curie marie skłodowska-curie @f1@ 1895 sceaux, france" }),
      family({ xref: "@F2@", name: "Other / Family", search: "other family @f2@" }),
    ]);

    made.setFilter("curie");
    expect(texts(".gedcom-person-name")).toHaveLength(1);

    made.setFilter("sceaux");
    expect(texts(".gedcom-person-name")).toHaveLength(1);
  });
});

describe("marking while families are listed", () => {
  it("marks the family whose page is open", () => {
    const made = new RecordList(container, LABELS, vi.fn(), (row, record) =>
      drawFamilyRow(row, record as FamilyRow, (n) => `${n}`),
    );
    made.setRecords([
      { xref: "@F1@", unaddressable: false, spouseNames: [], name: "One", childCount: 0, search: "one" },
      { xref: "@F2@", unaddressable: false, spouseNames: [], name: "Two", childCount: 0, search: "two" },
    ] as FamilyRow[]);
    made.setMarked("@F2@");

    const marked = [...container.querySelectorAll(".gedcom-person-row.is-marked")];
    expect(marked).toHaveLength(1);
    expect(marked[0]?.textContent).toContain("Two");
  });
});
