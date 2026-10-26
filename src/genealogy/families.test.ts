import { GedcomLanguageService } from "@domorium/language-service";
import { describe, expect, it } from "vitest";

import { FIXTURE } from "./fixture";
import { buildIndex, type GenealogyIndex } from "./index";

const index = (text = FIXTURE): GenealogyIndex =>
  buildIndex(new GedcomLanguageService(text));

const family = (xref: string, from = index()) => {
  const found = from.family(xref);
  if (!found) {
    throw new Error(`no family ${xref}`);
  }
  return found;
};

describe("the families a document declares", () => {
  it("reports them in the order the file writes them", () => {
    const rows = index().families;

    expect(rows.map((row) => row.xref)).toEqual([
      "@F1@", "@F2@", "@F3@", "@F4@", "@F5@", "@F6@", undefined,
    ]);
  });

  it("reports a record declaring no identifier, marked unaddressable", () => {
    const unaddressable = index().families.filter((row) => row.unaddressable);

    expect(unaddressable).toHaveLength(1);
    expect(unaddressable[0]?.xref).toBeUndefined();
  });

  it("carries what tells one family from another in a list", () => {
    const row = index().families.find((one) => one.xref === "@F2@");

    expect(row?.spouseNames).toEqual([
      "Pierre Curie",
      "Marie Skłodowska-Curie",
    ]);
    expect(row?.marriage?.year).toBe(1895);
    expect(row?.place).toBe("Sceaux, France");
    expect(row?.childCount).toBe(3);
  });

  it("carries no year, place or count where the record states none", () => {
    const row = index().families.find((one) => one.xref === "@F4@");

    expect(row?.marriage).toBeUndefined();
    expect(row?.place).toBeUndefined();
    expect(row?.childCount).toBe(0);
  });
});

describe("naming a family the format names nothing", () => {
  it("is named by the people it joins, in the order the record names them", () => {
    expect(family("@F2@").name).toBe("Pierre Curie / Marie Skłodowska-Curie");
  });

  it("is named by one spouse where it names one", () => {
    const text = [
      "0 HEAD", "1 GEDC", "2 VERS 7.0",
      "0 @I1@ INDI", "1 NAME Only /Spouse/",
      "0 @F1@ FAM", "1 HUSB @I1@",
      "0 TRLR", "",
    ].join("\n");

    expect(family("@F1@", index(text)).name).toBe("Only Spouse");
  });

  it("has no name where it names nobody", () => {
    expect(family("@F6@").name).toBeUndefined();
  });

  it("is named by the spouse it declares, where the other is missing", () => {
    const one = family("@F5@");

    expect(one.name).toBe("Pierre Curie");
    expect(one.unresolved).toContain("@I98@");
  });
});

describe("a family read in full", () => {
  it("reports its people with the role that named each", () => {
    const one = family("@F2@");

    expect(one.spouses.map((who) => who.name)).toEqual([
      "Pierre Curie",
      "Marie Skłodowska-Curie",
    ]);
    expect(one.children.map((who) => who.name)).toEqual([
      "Irène Joliot-Curie",
      "Ève Curie",
    ]);
  });

  it("reports a missing spouse and child with the lines that name them", () => {
    const read = index([
      "0 HEAD", "1 GEDC", "2 VERS 7.0",
      "0 @I1@ INDI", "1 NAME Anna /Nowak/",
      "0 @F1@ FAM", "1 HUSB @I98@", "1 WIFE @I1@", "1 CHIL @I99@",
      "0 TRLR", "",
    ].join("\n"));
    const found = family("@F1@", read);

    expect(found.missingSpouses.map((one) => [one.xref, one.range.start.line]))
      .toEqual([["@I98@", 6]]);
    expect(found.missingChildren.map((one) => [one.xref, one.range.start.line]))
      .toEqual([["@I99@", 8]]);
  });

  it("reports a child the document does not hold, keeping its siblings", () => {
    const one = family("@F2@");

    expect(one.children).toHaveLength(2);
    expect(one.unresolved).toContain("@I99@");
  });

  it("reports the events the record carries", () => {
    const events = family("@F2@").events;

    expect(events.map((event) => event.tag)).toEqual(["MARR"]);
    expect(events[0]?.date?.text).toBe("26 JUL 1895");
    expect(events[0]?.place).toBe("Sceaux, France");
  });

  it("reports an event the record states and says nothing more about", () => {
    const events = family("@F6@").events;

    expect(events.map((event) => event.tag)).toEqual(["MARR"]);
    expect(events[0]?.date).toBeUndefined();
  });

  it("reports nothing that is not an event", () => {
    const tags = family("@F1@").events.map((event) => event.tag);

    for (const notAnEvent of ["HUSB", "WIFE", "CHIL", "ASSO"]) {
      expect(tags, notAnEvent).not.toContain(notAnEvent);
    }
  });
});

describe("the families a person belongs to", () => {
  const person = (xref: string) => {
    const found = index().person(xref);
    if (!found) {
      throw new Error(`no person ${xref}`);
    }
    return found;
  };

  it("tells the one they were a child in from the ones they married into", () => {
    const marie = person("@I1@");

    expect(marie.childFamilies.map((one) => one.xref)).toEqual(["@F1@"]);
    expect(marie.spouseFamilies.map((one) => one.xref)).toEqual(["@F2@"]);
  });

  it("carries what a family row carries, without reading one in full", () => {
    const married = person("@I1@").spouseFamilies[0];

    expect(married?.marriage?.year).toBe(1895);
    expect(married?.childCount).toBe(3);
  });

  it("reports none for a person pointing at no family", () => {
    const alone = person("@I7@");

    expect(alone.childFamilies).toEqual([]);
    expect(alone.spouseFamilies).toEqual([]);
  });

  it("reports nothing for a family the document does not declare", () => {
    const lost = person("@I8@");

    expect(lost.childFamilies).toEqual([]);
    expect(lost.unresolved).toContain("@F99@");
  });
});

const RELATIVES = [
  "0 HEAD",
  "1 GEDC",
  "2 VERS 7.0",
  "0 @I1@ INDI",
  "1 NAME Anna /Nowak/",
  "1 FAMC @F1@",
  "1 FAMC @F4@",
  "1 FAMS @F2@",
  "1 FAMS @F3@",
  "0 @I2@ INDI",
  "1 NAME Beata /Nowak/",
  "0 @I3@ INDI",
  "1 NAME Cezary /Nowak/",
  "0 @I4@ INDI",
  "1 NAME Dawid /Kowal/",
  "0 @I5@ INDI",
  "1 NAME Ewa /Kowal/",
  "0 @I7@ INDI",
  "1 NAME Gosia /Nowak/",
  "0 @I8@ INDI",
  "1 NAME Henryk /Nowak/",
  "0 @F1@ FAM",
  "1 CHIL @I2@",
  "1 CHIL @I1@",
  "1 CHIL @I3@",
  "0 @F4@ FAM",
  "1 CHIL @I3@",
  "1 CHIL @I1@",
  "0 @F2@ FAM",
  "1 HUSB @I4@",
  "1 WIFE @I1@",
  "1 MARR",
  "2 DATE 1901",
  "1 CHIL @I5@",
  "0 @F3@ FAM",
  "1 WIFE @I1@",
  "1 CHIL @I7@",
  "1 CHIL @I8@",
  "0 TRLR",
  "",
].join("\n");

describe("a person's siblings and the families they made", () => {
  const anna = index(RELATIVES).person("@I1@");

  it("reports siblings once each, and not the person themself", () => {
    expect(anna?.siblings.map((one) => one.name)).toEqual([
      "Beata Nowak", "Cezary Nowak",
    ]);
  });

  it("reports each marriage with its own spouse, events and children", () => {
    const [first, second] = anna?.unions ?? [];

    expect(anna?.unions).toHaveLength(2);
    expect(first?.spouse?.name).toBe("Dawid Kowal");
    expect(first?.events.map((event) => event.tag)).toEqual(["MARR"]);
    expect(first?.children.map((one) => one.name)).toEqual(["Ewa Kowal"]);
    expect(second?.spouse).toBeUndefined();
    expect(second?.children.map((one) => one.name)).toEqual([
      "Gosia Nowak", "Henryk Nowak",
    ]);
  });
});

describe("relatives the file points at and does not declare", () => {
  const read = index([
    "0 HEAD",
    "1 GEDC",
    "2 VERS 7.0",
    "0 @I1@ INDI",
    "1 NAME Anna /Nowak/",
    "1 FAMC @F1@",
    "1 FAMC @F8@",
    "1 FAMS @F2@",
    "1 FAMS @F9@",
    "0 @I2@ INDI",
    "1 NAME Jan /Nowak/",
    "0 @F1@ FAM",
    "1 HUSB @I2@",
    "1 WIFE @I98@",
    "1 CHIL @I1@",
    "0 @F2@ FAM",
    "1 WIFE @I1@",
    "1 CHIL @I99@",
    "0 TRLR",
    "",
  ].join("\n"));
  const anna = read.person("@I1@");

  it("reports a missing parent and a missing child-family with the parents", () => {
    expect(anna?.parents.map((one) => one.name)).toEqual(["Jan Nowak"]);
    expect(anna?.missingParents.map((one) => one.xref)).toEqual(["@I98@", "@F8@"]);
  });

  it("reports a missing child with its family, and a missing spouse-family apart", () => {
    expect(anna?.unions[0]?.missingChildren.map((one) => one.xref)).toEqual(["@I99@"]);
    expect(anna?.unions[0]?.missingSpouses).toEqual([]);
    expect(anna?.missingUnions.map((one) => one.xref)).toEqual(["@F9@"]);
  });

  it("carries the line that makes each pointer", () => {
    expect(anna?.missingUnions[0]?.range.start.line).toBe(8);
    expect(anna?.missingParents[0]?.range.start.line).toBe(13);
  });
});

describe("an event that names its own kind", () => {
  it("carries the type an EVEN states, as written", () => {
    const event = index([
      "0 HEAD", "1 GEDC", "2 VERS 7.0",
      "0 @I1@ INDI", "1 EVEN", "2 TYPE Nobel Prize", "2 DATE 1903",
      "0 TRLR", "",
    ].join("\n")).person("@I1@")?.events[0];

    expect(event?.tag).toBe("EVEN");
    expect(event?.type).toBe("Nobel Prize");
  });
});
