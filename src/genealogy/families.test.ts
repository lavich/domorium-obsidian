import { GedcomLanguageService } from "@domorium/language-service";
import { describe, expect, it } from "vitest";

import { FIXTURE } from "./fixture";
import { buildIndex, type GenealogyIndex } from "./index";

const index = (text = FIXTURE): GenealogyIndex =>
  buildIndex(new GedcomLanguageService(text).getDocumentSymbols());

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
