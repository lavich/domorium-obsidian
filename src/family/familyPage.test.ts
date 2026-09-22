// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Family, FamilyMember } from "../genealogy";
import { renderFamilyPage, type FamilyPageHost } from "./familyPage";

let container: HTMLElement;

function host(overrides: Partial<FamilyPageHost> = {}): FamilyPageHost {
  return {
    labels: {
      spouses: "Spouses",
      children: "Children",
      events: "Events",
      unnamed: "Unnamed family",
      unresolved: (xref) => `Not in this file: ${xref}`,
    },
    eventLabel: (tag) => ({ MARR: "Marriage", DIV: "Divorce" })[tag] ?? tag,
    source: { document: "curie.ged", xref: "@F1@" },
    onPerson: vi.fn(),
    onOpenSource: vi.fn(),
    ...overrides,
  };
}

const member = (name: string, role: string): FamilyMember => ({
  xref: `@I${name.length}@`,
  unaddressable: false,
  name,
  otherNames: [],
  search: "",
  role,
});

function family(overrides: Partial<Family> = {}): Family {
  return {
    xref: "@F1@",
    unaddressable: false,
    spouseNames: ["Pierre Curie", "Marie Skłodowska-Curie"],
    name: "Pierre Curie / Marie Skłodowska-Curie",
    childCount: 0,
    search: "",
    spouses: [],
    children: [],
    events: [],
    unresolved: [],
    ...overrides,
  };
}

const draw = (one: Family, using = host()): void => {
  renderFamilyPage(container, one, using);
};

const texts = (selector: string): string[] =>
  [...container.querySelectorAll(selector)].map((n) => n.textContent ?? "");

beforeEach(() => {
  container = document.createElement("div");
});

describe("who the family joins", () => {
  it("heads with the people it joins", () => {
    draw(family());

    expect(texts(".gedcom-person-title")).toEqual([
      "Pierre Curie / Marie Skłodowska-Curie",
    ]);
  });

  it("heads with the identifier where the record names nobody", () => {
    draw(family({ name: undefined, spouseNames: [] }));

    expect(texts(".gedcom-person-title")).toEqual(["@F1@"]);
  });

  it("shows the year of the marriage under the heading", () => {
    draw(
      family({
        marriage: { text: "26 JUL 1895", year: 1895, precision: "exact" },
      }),
    );

    expect(texts(".gedcom-person-lifespan")).toEqual(["1895"]);
  });

  it("shows no year where the record states none", () => {
    draw(family());

    expect(texts(".gedcom-person-lifespan")).toEqual([]);
  });
});

describe("the people in the family", () => {
  it("shows each group that has somebody in it", () => {
    draw(
      family({
        spouses: [member("Pierre Curie", "HUSB"), member("Marie Curie", "WIFE")],
        children: [member("Irene", "CHIL")],
      }),
    );

    expect(texts(".gedcom-person-group-title")).toEqual([
      "Spouses",
      "Children",
    ]);
    expect(texts(".gedcom-person-relative-name")).toEqual([
      "Pierre Curie",
      "Marie Curie",
      "Irene",
    ]);
  });

  it("leaves out a group the record yields nobody for", () => {
    draw(family({ spouses: [member("Pierre Curie", "HUSB")] }));

    expect(texts(".gedcom-person-group-title")).toEqual(["Spouses"]);
  });

  it("hands a chosen person back rather than opening anything", () => {
    const onPerson = vi.fn();
    const pierre = member("Pierre Curie", "HUSB");
    draw(family({ spouses: [pierre] }), host({ onPerson }));

    container.querySelector<HTMLElement>(".gedcom-person-relative")?.click();

    expect(onPerson).toHaveBeenCalledWith(pierre);
  });

  it("states a reference it could not resolve", () => {
    draw(
      family({
        children: [member("Irene", "CHIL")],
        unresolved: ["@I99@"],
      }),
    );

    expect(texts(".gedcom-person-relative-name")).toEqual(["Irene"]);
    expect(container.textContent).toContain("Not in this file: @I99@");
  });
});

describe("what the record says happened", () => {
  it("lists the events in record order, each named", () => {
    draw(
      family({
        events: [
          { tag: "MARR", date: { text: "26 JUL 1895", year: 1895 }, place: "Sceaux" },
          { tag: "DIV" },
        ],
      }),
    );

    expect(texts(".gedcom-person-event-label")).toEqual([
      "Marriage",
      "Divorce",
    ]);
    expect(container.textContent).toContain("26 JUL 1895");
    expect(container.textContent).toContain("Sceaux");
  });

  it("labels an event the catalogue has no name for by its tag", () => {
    draw(family({ events: [{ tag: "MARB" }] }));

    expect(texts(".gedcom-person-event-label")).toEqual(["MARB"]);
  });

  it("shows no events section where the record carries none", () => {
    draw(family());

    expect(texts(".gedcom-person-event-label")).toEqual([]);
  });
});

describe("returning to the record", () => {
  it("shows the identifier and reaches the record from it", () => {
    const onOpenSource = vi.fn();
    draw(family(), host({ onOpenSource }));

    expect(texts(".gedcom-person-source")[0]).toBe("@F1@");

    container.querySelector<HTMLElement>(".gedcom-person-source-link")?.click();
    expect(onOpenSource).toHaveBeenCalled();
  });

  it("draws with no application present", () => {
    draw(family());

    expect(container.querySelector(".gedcom-person-page")).not.toBeNull();
  });
});
