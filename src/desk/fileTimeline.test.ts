import { describe, expect, it } from "vitest";

import { curieIndex, curieWithEvents, indexOf } from "../testing/curie";
import { buildFileTimeline, fileTimelineOf, OPEN_SPAN, type FileTimeline } from "./fileTimeline";

const NOW = 2026;

const curie = (): FileTimeline => buildFileTimeline(curieIndex(), NOW);
const withEvents = (): FileTimeline => buildFileTimeline(indexOf(curieWithEvents()), NOW);

const named = (model: FileTimeline, name: string): string => {
  const found = [...model.people.values()].find((person) => person.row.name === name);
  if (!found) {
    throw new Error(`no ${name}`);
  }
  return found.xref;
};

const rowNames = (model: FileTimeline): string[] =>
  model.rows.map((xref) => model.people.get(xref)?.row.name ?? "");

describe("a person on the timeline of a file", () => {
  it("has a lifeline from birth to death, coloured by sex", () => {
    const marie = curie().people.get("@I1@");

    expect(marie?.sex).toBe("F");
    expect(marie?.lifeline).toMatchObject({ start: 1867, end: 1934, open: false });
    expect(curie().people.get("@I2@")?.sex).toBe("M");
  });

  it("has the marriage of a family they are a spouse in, on both spouses", () => {
    const model = curie();
    for (const xref of ["@I1@", "@I2@"]) {
      const marriage = model.people.get(xref)?.marks.find((mark) => mark.kind === "marriage");
      expect(marriage, xref).toMatchObject({ year: 1895, family: "@F3@" });
    }
    expect(model.families.get("@F3@")).toMatchObject({
      spouses: ["@I2@", "@I1@"],
      children: ["@I12@", "@I13@"],
      marriage: { year: 1895 },
    });
  });

  it("fades out where no death is recorded, a hundred years on and never past the present", () => {
    const helene = curie().people.get("@I16@")?.lifeline;

    expect(helene).toMatchObject({ start: 1927, open: true, end: Math.min(NOW, 1927 + OPEN_SPAN) });
    expect(buildFileTimeline(curieIndex(), 1990).people.get("@I16@")?.lifeline?.end).toBe(1990);
  });

  it("marks each event by its kind, and another kind with a sign", () => {
    const marks = withEvents().people.get("@I1@")?.marks ?? [];

    expect(marks.map((mark) => mark.kind)).toEqual([
      "birth", "death", "other", "other", "other", "other", "marriage",
    ]);
    expect(marks.find((mark) => mark.event.tag === "EMIG")).toMatchObject({ year: 1891, sign: "⇄" });
  });

  it("draws a period from its first year to its second", () => {
    const residence = withEvents().people.get("@I2@")?.marks.find((mark) => mark.event.tag === "RESI");

    expect(residence).toMatchObject({ year: 1895, until: 1906, period: true, uncertain: false });
  });

  it("takes an approximate birth as uncertain, and a birth known by its year as exact", () => {
    const wladyslaw = (model: FileTimeline) => model.people.get("@I3@");

    expect(wladyslaw(curie())?.marks[0]).toMatchObject({ kind: "birth", uncertain: false });
    expect(wladyslaw(withEvents())?.marks[0]).toMatchObject({ kind: "birth", uncertain: true });
    expect(wladyslaw(withEvents())?.lifeline?.startUncertain).toBe(true);
  });

  it("gives a person with no dated event a row, no lifeline, and counts them", () => {
    const model = withEvents();
    const kazimierz = named(model, "Kazimierz Żorawski");

    expect(model.rows).toContain(kazimierz);
    expect(model.people.get(kazimierz)?.lifeline).toBeNull();
    expect(model.undated).toEqual([kazimierz]);
    expect(curie().undated).toEqual([]);
  });

  it("keeps a fact with no date apart from the dated ones", () => {
    const marie = curie().people.get("@I1@");

    expect(marie?.undated.map((event) => event.value)).toEqual(["Physicist and chemist"]);
  });

  it("begins a lifeline at a christening where no birth is dated, else at the earliest event", () => {
    const model = buildFileTimeline(
      indexOf(
        [
          "0 HEAD", "1 GEDC", "2 VERS 7.0",
          "0 @I1@ INDI", "1 CHR", "2 DATE 1801", "1 BURI", "2 DATE 1870",
          "0 @I2@ INDI", "1 RESI", "2 DATE 1850", "1 OCCU Miller", "2 DATE 1840",
          "0 @I3@ INDI", "1 NAME No /Record/",
          "0 TRLR", "",
        ].join("\n"),
      ),
      NOW,
    );

    expect(model.people.get("@I1@")?.lifeline).toMatchObject({
      start: 1801, end: 1870, open: false, age: { from: 1801 },
    });
    expect(model.people.get("@I2@")?.lifeline).toMatchObject({ start: 1840, open: true });
    expect(model.people.get("@I2@")?.lifeline?.age).toBeUndefined();
    expect(model.people.get("@I1@")?.sex).toBe("U");
  });

  it("gives no row to a person without an identifier", () => {
    const model = buildFileTimeline(
      indexOf(["0 HEAD", "1 GEDC", "2 VERS 7.0", "0 INDI", "1 NAME Lost /One/", "0 TRLR", ""].join("\n")),
      NOW,
    );

    expect(model.rows).toEqual([]);
  });
});

describe("the order of the rows", () => {
  it("keeps the Curie children together with Pierre last, and the Skłodowski with Marie first", () => {
    const names = rowNames(curie());
    const at = (name: string) => names.indexOf(name);

    expect(at("Pierre Curie")).toBe(at("Jacques Curie") + 1);
    expect(at("Marie Skłodowska-Curie")).toBe(at("Pierre Curie") + 1);
    expect(names.slice(at("Marie Skłodowska-Curie"), at("Marie Skłodowska-Curie") + 5)).toEqual([
      "Marie Skłodowska-Curie",
      "Zofia Skłodowska",
      "Józef Skłodowski",
      "Bronisława Dłuska",
      "Helena Szalay",
    ]);
  });

  it("puts a spouse from outside the file beside the one they married", () => {
    const names = rowNames(curie());

    expect(names.indexOf("Frédéric Joliot")).toBe(names.indexOf("Irène Joliot-Curie") + 1);
  });

  it("orders by generation, the oldest first", () => {
    const model = curie();
    const generations = model.rows.map((xref) => model.generations.get(xref));

    expect(generations).toEqual([...generations].sort());
    expect(model.generations.get("@I14@")).toBe(model.generations.get("@I12@"));
  });
});

describe("the branch of one person", () => {
  it("holds Irène's parents and grandparents, Frédéric and their two children", () => {
    const model = curie();
    const branch = model.branch("@I12@", 2, 2);

    expect(branch.size).toBe(10);
    expect([...branch].sort()).toEqual(
      ["@I1@", "@I2@", "@I3@", "@I4@", "@I9@", "@I10@", "@I12@", "@I14@", "@I16@", "@I17@"].sort(),
    );
    expect(model.rows).toHaveLength(17);
  });

  it("narrows and widens by generations, from none", () => {
    const model = curie();

    expect([...model.branch("@I12@", 0, 0)].sort()).toEqual(["@I12@", "@I14@"]);
    expect(model.branch("@I12@", 1, 0).has("@I3@")).toBe(false);
    expect(model.branch("@I3@", 0, 9).has("@I17@")).toBe(true);
  });

  it("is empty for a person not in the file", () => {
    expect(curie().branch("@I99@", 2, 2).size).toBe(0);
  });
});

describe("who was alive in a year", () => {
  const ageOf = (model: FileTimeline, year: number, xref: string) =>
    model.alive(year).find((one) => one.xref === xref);

  it("gives the age reached during that year", () => {
    const model = curie();

    expect(ageOf(model, 1906, "@I1@")).toMatchObject({ age: 39, approximate: false });
    expect(ageOf(model, 1906, "@I12@")).toMatchObject({ age: 9 });
  });

  it("reads a birth known by its year as exact, and one about a year as approximate", () => {
    expect(ageOf(curie(), 1900, "@I3@")).toEqual({ xref: "@I3@", age: 68, approximate: false });
    expect(ageOf(withEvents(), 1900, "@I3@")).toEqual({ xref: "@I3@", age: 68, approximate: true });
  });

  it("counts a person whose lifeline begins at another event, with no age", () => {
    const model = buildFileTimeline(
      indexOf(["0 HEAD", "1 GEDC", "2 VERS 7.0", "0 @I1@ INDI", "1 RESI", "2 DATE 1850", "0 TRLR", ""].join("\n")),
      NOW,
    );

    expect(model.alive(1860)).toEqual([{ xref: "@I1@", approximate: false }]);
  });

  it("does not count an open lifeline past its end", () => {
    const model = buildFileTimeline(curieIndex(), 1990);

    expect(ageOf(model, 1990, "@I16@")).toBeDefined();
    expect(ageOf(model, 1991, "@I16@")).toBeUndefined();
    expect(ageOf(curie(), 1935, "@I1@")).toBeUndefined();
  });

  it("counts only among the people shown, where they are named", () => {
    const model = curie();

    expect(model.alive(1907, new Set(["@I1@", "@I2@", "@I9@"])).map((one) => one.xref)).toEqual([
      "@I1@",
      "@I9@",
    ]);
  });
});

describe("the model held for a reading of the file", () => {
  it("answers the same model for the same index, and a new one for a new index", () => {
    const index = curieIndex();

    expect(fileTimelineOf(index)).toBe(fileTimelineOf(index));
    expect(fileTimelineOf(curieIndex())).not.toBe(fileTimelineOf(index));
  });
});
