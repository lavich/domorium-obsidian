// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Person, PersonMedia, PersonRow } from "../genealogy";
import { renderPersonPage, type PersonPageHost } from "./personPage";

let container: HTMLElement;

/** Everything the page needs, already in the reader's language. */
function host(overrides: Partial<PersonPageHost> = {}): PersonPageHost {
  return {
    labels: {
      otherNames: "Also known as",
      parents: "Parents",
      partners: "Partners",
      children: "Children",
      events: "Events",
      openInGedcom: "Open in GEDCOM",
      born: "Born",
      died: "Died",
      sexLabel: "Sex",
      unnamed: "Unnamed",
      unresolved: (xref) => `Not in this file: ${xref}`,
      sex: (value) => ({ M: "Male", F: "Female" })[value] ?? value,
    },
    // The model reads more tags than the catalogue names, on purpose.
    eventLabel: (tag) => ({ BIRT: "Birth", DEAT: "Death", OCCU: "Occupation" })[tag] ?? tag,
    source: { document: "curie.ged", xref: "@I1@" },
    resolveMedia: (file) =>
      file.startsWith("https://") ? null : `app://vault/${file}`,
    onPerson: vi.fn(),
    onOpenSource: vi.fn(),
    ...overrides,
  };
}

function row(overrides: Partial<PersonRow> = {}): PersonRow {
  return {
    xref: "@I2@",
    unaddressable: false,
    name: "William Smith",
    otherNames: [],
    search: "",
    ...overrides,
  };
}

function person(overrides: Partial<Person> = {}): Person {
  return {
    ...row({ xref: "@I1@", name: "John Smith" }),
    media: [],
    parents: [],
    partners: [],
    children: [],
    events: [],
    unresolved: [],
    ...overrides,
  };
}

const draw = (one: Person, using = host()): void => {
  renderPersonPage(container, one, using);
};

const texts = (selector: string): string[] =>
  [...container.querySelectorAll(selector)].map(
    (node) => node.textContent ?? "",
  );

beforeEach(() => {
  container = document.createElement("div");
});

describe("who the person was", () => {
  const full = (): Person =>
    person({
      birth: { text: "12 MAR 1901", year: 1901, precision: "exact" },
      death: { text: "7 MAY 1975", year: 1975, precision: "exact" },
      place: "London, England",
      sex: "M",
      events: [
        { tag: "BIRT", date: { text: "12 MAR 1901", year: 1901 }, place: "London, England" },
        { tag: "DEAT", date: { text: "7 MAY 1975", year: 1975 }, place: "New York, USA" },
      ],
    });

  it("heads with the name and shows the dates and places as written", () => {
    draw(full());

    expect(texts(".gedcom-person-title")).toEqual(["John Smith"]);
    expect(container.textContent).toContain("12 MAR 1901");
    expect(container.textContent).toContain("7 MAY 1975");
    expect(container.textContent).toContain("London, England");
    expect(container.textContent).toContain("Male");
  });

  it("labels each fact, so the reader need not infer it from the order", () => {
    draw(full());

    expect(texts(".gedcom-person-fact-label")).toEqual(["Born", "Died", "Sex"]);
  });

  it("puts each place beneath the date it belongs to, not in one list", () => {
    draw(full());

    const facts = [...container.querySelectorAll(".gedcom-person-fact")].map(
      (node) => node.textContent ?? "",
    );

    expect(facts[0]).toContain("12 MAR 1901");
    expect(facts[0]).toContain("London, England");
    expect(facts[0]).not.toContain("New York");
    expect(facts[1]).toContain("7 MAY 1975");
    expect(facts[1]).toContain("New York, USA");
  });

  it("shows a date whose event states no place, with nothing beneath it", () => {
    draw(
      person({
        birth: { text: "1901", year: 1901 },
        events: [{ tag: "BIRT", date: { text: "1901", year: 1901 } }],
      }),
    );

    expect(texts(".gedcom-person-fact-label")).toEqual(["Born"]);
    expect(texts(".gedcom-person-fact-place")).toEqual([]);
  });

  it("shows no Born label for a person the record states only a death for", () => {
    draw(
      person({
        death: { text: "1975", year: 1975 },
        events: [{ tag: "DEAT", date: { text: "1975", year: 1975 } }],
      }),
    );

    expect(texts(".gedcom-person-fact-label")).toEqual(["Died"]);
  });

  it("shows the span of years beside the name", () => {
    draw(
      person({
        birth: { text: "1901", year: 1901, precision: "exact" },
        death: { text: "1975", year: 1975, precision: "exact" },
      }),
    );

    expect(texts(".gedcom-person-lifespan")).toEqual(["1901–1975"]);
  });

  it("shows a name-only person without a single empty row", () => {
    draw(person());

    expect(texts(".gedcom-person-title")).toEqual(["John Smith"]);
    expect(texts(".gedcom-person-lifespan")).toEqual([]);
    expect(texts(".gedcom-person-fact-label")).toEqual([]);
    expect(container.textContent).not.toContain("—");
    expect(container.textContent).not.toContain("unknown");
  });

  it("names a person the record left unnamed", () => {
    draw(person({ name: "@unnamed@" }));

    expect(texts(".gedcom-person-title")).toEqual(["Unnamed"]);
  });

  it("shows another name as another name, not as the heading", () => {
    draw(person({ otherNames: ["Jonathan Smith"] }));

    expect(texts(".gedcom-person-title")).toEqual(["John Smith"]);
    expect(container.textContent).toContain("Also known as");
    expect(container.textContent).toContain("Jonathan Smith");
  });
});

describe("the face beside the name", () => {
  const pictured = (extra: Partial<PersonMedia> = {}): Person => {
    const portrait: PersonMedia = { file: "Media/family.svg", ...extra };
    return person({ media: [portrait], portrait });
  };

  it("draws the picture the record names", () => {
    draw(pictured());

    const image = container.querySelector<HTMLImageElement>(
      ".gedcom-person-portrait-image",
    );
    expect(image?.getAttribute("src")).toBe("app://vault/Media/family.svg");
  });

  it("marks a picture the record cuts a rectangle from", () => {
    draw(pictured({ crop: { top: 10, left: 20, height: 30, width: 40 } }));

    expect(
      container.querySelector(".gedcom-person-portrait")?.classList.contains("is-cropped"),
    ).toBe(true);
  });

  it("cuts the rectangle before the picture loads, not after", () => {
    // Otherwise the whole photograph is painted at its own size for the
    // length of the load, which is a flash of somebody else's face.
    draw(pictured({ crop: { top: 10, left: 20, height: 30, width: 40 } }));

    const frame = container.querySelector<HTMLElement>(".gedcom-person-portrait");
    const image = container.querySelector<HTMLElement>(
      ".gedcom-person-portrait-image",
    );

    expect(frame?.style.width, "the frame is sized from the first paint").toBe(
      "40px",
    );
    expect(frame?.style.height).toBe("30px");
    expect(image?.style.transform).toContain("translate(-20px, -10px)");
  });

  const loadedAt = (width: number, height: number): void => {
    const image = container.querySelector<HTMLImageElement>(
      ".gedcom-person-portrait-image",
    );
    Object.defineProperty(image, "naturalWidth", { value: width, configurable: true });
    Object.defineProperty(image, "naturalHeight", { value: height, configurable: true });
    image?.dispatchEvent(new Event("load"));
  };

  it("clamps the rectangle to the picture once its size is known", () => {
    draw(pictured({ crop: { top: 10, left: 20, height: 30, width: 40 } }));

    // The picture is smaller than the rectangle reaches: it is cut short,
    // rather than framing space the picture does not have.
    loadedAt(25, 25);

    const frame = container.querySelector<HTMLElement>(".gedcom-person-portrait");
    expect(frame?.classList.contains("is-cropped")).toBe(true);
    expect(frame?.style.width).toBe("5px");
    expect(frame?.style.height).toBe("15px");
  });

  it("shows the whole picture where the rectangle misses it entirely", () => {
    draw(pictured({ crop: { top: 10, left: 20, height: 30, width: 40 } }));

    loadedAt(15, 5);

    const frame = container.querySelector<HTMLElement>(".gedcom-person-portrait");
    expect(frame?.classList.contains("is-cropped")).toBe(false);
    expect(frame?.style.width).toBe("");
    expect(
      container.querySelector<HTMLElement>(".gedcom-person-portrait-image")
        ?.style.transform,
    ).toBe("");
  });

  it("uses the caption the record gives, so the picture is described", () => {
    draw(pictured({ title: "Second from the left" }));

    expect(
      container
        .querySelector<HTMLImageElement>(".gedcom-person-portrait-image")
        ?.getAttribute("alt"),
    ).toBe("Second from the left");
  });

  it("leaves no frame where the record names no picture", () => {
    draw(person());

    expect(container.querySelector(".gedcom-person-portrait")).toBeNull();
  });

  it("leaves no frame where the host will not resolve the file", () => {
    draw(pictured(), host({ resolveMedia: () => null }));

    expect(container.querySelector(".gedcom-person-portrait")).toBeNull();
  });

  it("requests nothing for a picture at a web address", () => {
    draw(
      person({
        portrait: { file: "https://example.org/portrait.jpg" },
        media: [{ file: "https://example.org/portrait.jpg" }],
      }),
    );

    expect(container.querySelector(".gedcom-person-portrait")).toBeNull();
    expect(container.innerHTML).not.toContain("https://example.org");
  });

  it("asks the host to resolve, rather than reaching for a vault itself", () => {
    const resolveMedia = vi.fn(() => "app://vault/x");
    draw(pictured(), host({ resolveMedia }));

    expect(resolveMedia).toHaveBeenCalledWith("Media/family.svg");
  });
});

describe("which record the page is a reading of", () => {
  it("names the document and the identifier beneath the name", () => {
    draw(person({ xref: "@I1@" }), host({ source: { document: "curie.ged", xref: "@I1@" } }));

    const line = texts(".gedcom-person-source")[0] ?? "";

    expect(line).toContain("curie.ged");
    expect(line).toContain("@I1@");
  });

  it("names whichever document the person was read from", () => {
    draw(person({ xref: "@I1@" }), host({ source: { document: "joliot.ged", xref: "@I1@" } }));

    expect(texts(".gedcom-person-source")[0]).toContain("joliot.ged");
  });

  it("reaches the record from the identifier, with no second control", () => {
    const onOpenSource = vi.fn();
    draw(
      person(),
      host({ source: { document: "curie.ged", xref: "@I1@" }, onOpenSource }),
    );

    container.querySelector<HTMLElement>(".gedcom-person-source-link")?.click();

    expect(onOpenSource).toHaveBeenCalled();
    expect(
      container.querySelectorAll("button.gedcom-person-source-action"),
      "one way to the record, not two",
    ).toHaveLength(0);
  });
});

describe("the family around the person", () => {
  it("shows each group that has somebody in it", () => {
    draw(
      person({
        parents: [row({ xref: "@I2@", name: "William Smith" })],
        partners: [row({ xref: "@I3@", name: "Mary Brown" })],
        children: [row({ xref: "@I4@", name: "Alice Smith" })],
      }),
    );

    expect(texts(".gedcom-person-group-title")).toEqual([
      "Parents",
      "Partners",
      "Children",
    ]);
    expect(texts(".gedcom-person-relative-name")).toEqual([
      "William Smith",
      "Mary Brown",
      "Alice Smith",
    ]);
  });

  it("leaves out a group the record yields nobody for", () => {
    draw(person({ parents: [row({ name: "William Smith" })] }));

    expect(texts(".gedcom-person-group-title")).toEqual(["Parents"]);
  });

  it("shows no family groups at all where the record points at no family", () => {
    draw(person());

    expect(texts(".gedcom-person-group-title")).toEqual([]);
  });

  it("shows a relative's years the way a row in the list does", () => {
    draw(
      person({
        parents: [
          row({
            name: "William Smith",
            birth: { text: "1872", year: 1872, precision: "exact" },
            death: { text: "1941", year: 1941, precision: "exact" },
          }),
        ],
      }),
    );

    expect(texts(".gedcom-person-relative-years")).toEqual(["1872–1941"]);
  });

  it("states a reference it could not resolve, naming the identifier", () => {
    draw(
      person({
        children: [row({ xref: "@I4@", name: "Alice Smith" })],
        unresolved: ["@I99@"],
      }),
    );

    expect(texts(".gedcom-person-relative-name")).toEqual(["Alice Smith"]);
    expect(container.textContent).toContain("Not in this file: @I99@");
  });
});

describe("the events the record carries", () => {
  it("lists them in the order the record writes them, each named", () => {
    draw(
      person({
        events: [
          { tag: "BIRT", date: { text: "12 MAR 1901", year: 1901, precision: "exact" }, place: "London" },
          { tag: "OCCU", value: "Physicist" },
          { tag: "DEAT", date: { text: "7 MAY 1975", year: 1975, precision: "exact" } },
        ],
      }),
    );

    expect(texts(".gedcom-person-event-label")).toEqual([
      "Birth",
      "Occupation",
      "Death",
    ]);
  });

  it("labels an event the catalogue has no name for by its tag", () => {
    draw(person({ events: [{ tag: "CENS", date: { text: "1881", year: 1881 } }] }));

    expect(texts(".gedcom-person-event-label")).toEqual(["CENS"]);
  });

  it("shows a date it could not read a year from, exactly as written", () => {
    draw(person({ events: [{ tag: "BURI", date: { text: "@#DHEBREW@ 5628" } }] }));

    expect(container.textContent).toContain("@#DHEBREW@ 5628");
  });

  it("shows no events section where the record carries none", () => {
    draw(person());

    expect(texts(".gedcom-person-event-label")).toEqual([]);
    expect(texts(".gedcom-person-group-title")).not.toContain("Events");
  });
});

describe("what the page hands back to its caller", () => {
  it("calls back with the relative chosen, rather than opening anything", () => {
    const onPerson = vi.fn();
    const father = row({ xref: "@I2@", name: "William Smith" });
    draw(person({ parents: [father] }), host({ onPerson }));

    container.querySelector<HTMLElement>(".gedcom-person-relative")?.click();

    expect(onPerson).toHaveBeenCalledWith(father);
  });

  it("carries an action that asks its caller for the record", () => {
    const onOpenSource = vi.fn();
    draw(person(), host({ onOpenSource }));

    container.querySelector<HTMLElement>(".gedcom-person-source-link")?.click();

    expect(onOpenSource).toHaveBeenCalled();
  });

  it("draws with no application present, reaching for nothing global", () => {
    draw(person({ parents: [row({ name: "William Smith" })] }));

    expect(container.querySelector(".gedcom-person-page")).not.toBeNull();
  });
});
