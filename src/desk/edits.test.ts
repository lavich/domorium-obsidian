import { afterEach, describe, expect, it } from "vitest";

import { resetLanguage, setLanguage } from "../i18n";
import { TextTab } from "../testing/textTab";
import { addableAt } from "./addableFields";
import { addAt, addPlan, checkValue, commit, refusalText, removeAt, requiredBeneath, setValueAt, type Refusal } from "./edits";

afterEach(resetLanguage);

const HEAD = {
  "7.0": ["0 HEAD", "1 GEDC", "2 VERS 7.0"],
  "5.5.1": ["0 HEAD", "1 GEDC", "2 VERS 5.5.1", "2 FORM LINEAGE-LINKED", "1 CHAR UTF-8"],
};

const tabOf = (lines: string[], version: "7.0" | "5.5.1" = "7.0"): TextTab =>
  new TextTab([...HEAD[version], ...lines, "0 TRLR"].join("\n"));

const linesOf = (tab: TextTab): string[] => tab.text.split("\n");
const at = (line: number) => ({ line, character: 0 });

describe("a value set", () => {
  it("writes a given name in 7.0", () => {
    const tab = tabOf(["0 @I1@ INDI", "1 NAME Maria /Curie/", "2 GIVN Maria"]);

    const outcome = commit(tab, setValueAt(tab.service(), at(5), tab.version, { value: "Marie" }));

    expect(outcome).toMatchObject({ ok: true, line: 4 });
    expect(linesOf(tab)).toContain("2 GIVN Marie");
  });

  it("writes a 5.5.1 sex as the letter the file holds", () => {
    const tab = tabOf(["0 @I1@ INDI", "1 SEX F"], "5.5.1");

    commit(tab, setValueAt(tab.service(), at(6), tab.version, { value: "M" }));

    expect(linesOf(tab)).toContain("1 SEX M");
  });

  it("returns the warnings the service gives with a written value", () => {
    const tab = tabOf(["0 @I1@ INDI", "1 _MILITARY Cavalry"]);

    const outcome = commit(tab, setValueAt(tab.service(), at(4), tab.version, { value: "Hussar" }));

    expect(outcome).toMatchObject({ ok: true, warnings: [expect.stringContaining("_MILITARY")] });
    expect(linesOf(tab)).toContain("1 _MILITARY Hussar");
  });

  it("writes a note of two lines with a continuation", () => {
    const tab = tabOf(["0 @I1@ INDI", "1 NOTE first"]);

    commit(tab, setValueAt(tab.service(), at(4), tab.version, { value: "one\ntwo" }));

    expect(linesOf(tab)).toEqual(expect.arrayContaining(["1 NOTE one", "2 CONT two"]));
  });
});

describe("the value of a record's opening line", () => {
  it("replaces a 7.0 shared note of one line, and of two lines with a continuation", () => {
    const tab = tabOf(["0 @N1@ SNOTE First"]);

    commit(tab, setValueAt(tab.service(), at(3), tab.version, { value: "Replaced" }));
    expect(linesOf(tab)).toContain("0 @N1@ SNOTE Replaced");

    commit(tab, setValueAt(tab.service(), at(3), tab.version, { value: "One\nTwo" }));
    expect(linesOf(tab).slice(3, 5)).toEqual(["0 @N1@ SNOTE One", "1 CONT Two"]);
  });

  it("replaces a 5.5.1 note record continued with CONC and CONT, and keeps the source beneath it", () => {
    const tab = tabOf(["0 @N1@ NOTE Te", "1 CONC xt", "1 CONT more", "1 SOUR @S1@", "0 @S1@ SOUR"], "5.5.1");

    const outcome = commit(tab, setValueAt(tab.service(), at(5), tab.version, { value: "New one\nline" }));

    expect(outcome).toMatchObject({ ok: true, line: 5 });
    expect(linesOf(tab).slice(5, 8)).toEqual(["0 @N1@ NOTE New one", "1 CONT line", "1 SOUR @S1@"]);
  });

  it("replaces the value of a record of the file's own", () => {
    const tab = tabOf(["0 @P1@ _PLAN Custom value", "1 NAME Research plan"]);

    commit(tab, setValueAt(tab.service(), at(3), tab.version, { value: "Another" }));

    expect(linesOf(tab).slice(3, 5)).toEqual(["0 @P1@ _PLAN Another", "1 NAME Research plan"]);
  });

  it("is refused on a person and on the header, which hold no value, in the reader's words", () => {
    const tab = tabOf(["0 @I1@ INDI"]);

    const person = commit(tab, setValueAt(tab.service(), at(3), tab.version, { value: "x" }));
    const header = commit(tab, setValueAt(tab.service(), at(0), tab.version, { value: "x" }));

    expect([person, header]).toMatchObject([{ ok: false, code: "value-not-allowed" }, { ok: false, code: "value-not-allowed" }]);
    expect(refusalText(person as Refusal)).toBe("The standard allows no value on this line.");
    setLanguage("ru");
    expect(refusalText(header as Refusal)).toBe("Стандарт не допускает значения в этой строке.");
    expect(tab.writes).toBe(0);
  });

  it("is refused for a version the text has moved on from", () => {
    const tab = tabOf(["0 @N1@ SNOTE First"]);
    const stale = tab.version;
    tab.replace(tab.text.replace("First", "Changed"));

    const outcome = commit(tab, setValueAt(tab.service(), at(3), stale, { value: "Late" }));

    expect(outcome).toMatchObject({ ok: false, code: "stale-document" });
    expect(linesOf(tab)).toContain("0 @N1@ SNOTE Changed");
  });
});

describe("a pointer set", () => {
  it("points an associated person at another record", () => {
    const tab = tabOf(["0 @I1@ INDI", "1 ASSO @I2@", "2 ROLE FRIEND", "0 @I2@ INDI", "0 @I3@ INDI"]);

    commit(tab, setValueAt(tab.service(), at(4), tab.version, { pointer: "@I3@" }));

    expect(linesOf(tab)).toContain("1 ASSO @I3@");
  });
});

describe("a line added", () => {
  it("writes an associated person with the role it requires, together", () => {
    const tab = tabOf(["0 @I1@ INDI", "1 NAME Marie /Curie/", "0 @I2@ INDI"]);
    const asso = addableAt(tab.service(), at(3)).find((field) => field.tag === "ASSO");
    if (!asso) {
      throw new Error("no ASSO");
    }

    expect(addPlan(asso)).toEqual({ kind: "pointer" });
    expect(requiredBeneath(tab.service(), asso).map((field) => field.tag)).toEqual(["ROLE"]);
    commit(tab, addAt(tab.service(), at(3), tab.version, "ASSO", { pointer: "@I2@", children: [{ tag: "ROLE", value: "FRIEND" }] }));
    expect(linesOf(tab)).toEqual(expect.arrayContaining(["1 ASSO @I2@", "2 ROLE FRIEND"]));
  });

  it("adds a death as Y at once, and a field with no value as an empty line", () => {
    const tab = tabOf(["0 @I1@ INDI", "1 NAME Marie /Curie/"]);
    const fields = addableAt(tab.service(), at(3));
    const plan = (tag: string) => {
      const field = fields.find((one) => one.tag === tag);
      if (!field) {
        throw new Error(`no ${tag}`);
      }
      return addPlan(field);
    };

    expect(plan("DEAT")).toEqual({ kind: "now", input: { value: "Y" } });
    expect(plan("CHAN")).toEqual({ kind: "now", input: {} });
    expect(plan("OCCU")).toEqual({ kind: "row" });
    const outcome = commit(tab, addAt(tab.service(), at(3), tab.version, "DEAT", { value: "Y" }));
    expect(outcome).toEqual({ ok: true, line: 5, warnings: [] });
    expect(linesOf(tab)[5]).toBe("1 DEAT Y");
  });

  it("offers a 5.5.1 note as a text and as a record", () => {
    const tab = tabOf(["0 @I1@ INDI", "1 NAME Marie /Curie/"], "5.5.1");
    const note = addableAt(tab.service(), at(5)).find((field) => field.tag === "NOTE");
    if (!note) {
      throw new Error("no NOTE");
    }

    expect(addPlan(note, "text")).toEqual({ kind: "row" });
    expect(addPlan(note, "pointer")).toEqual({ kind: "pointer" });
  });
});

describe("a refusal", () => {
  it("writes nothing for a date that does not exist and says why in the reader's language", () => {
    const tab = tabOf(["0 @I1@ INDI", "1 BIRT", "2 DATE 7 NOV 1867"]);
    const before = tab.text;

    const outcome = commit(tab, setValueAt(tab.service(), at(5), tab.version, { value: "31 NOV 1867" }));

    expect(outcome).toMatchObject({ ok: false, code: "payload-datatype" });
    expect(tab.text).toBe(before);
    expect(outcome).toMatchObject({ data: { day: 31, month: "NOV", monthLength: 30 } });
    expect(refusalText(outcome as Refusal)).toBe("There is no November 31: November has 30 days.");
    setLanguage("ru");
    expect(refusalText(outcome as Refusal)).toBe("Даты «31 ноября» не бывает: ноябрь длится 30 дней.");
  });

  it("names the missing day from the facts of the refusal, whatever the service's message says", () => {
    expect(refusalText({ code: "payload-datatype", message: "anything", data: { day: 30, month: "FEB", monthLength: 28 } })).toBe(
      "There is no February 30: February has 28 days.",
    );
  });

  it("falls back to the plugin's words for a malformed value that names no day", () => {
    expect(refusalText({ code: "payload-datatype", message: "Value for DATE names 31 NOV, and NOV has 30 days" })).toBe(
      "The standard cannot read this value here.",
    );
  });

  it("is checked before a value is written, by the service", () => {
    const tab = tabOf(["0 @I1@ INDI", "1 BIRT", "2 DATE 7 NOV 1867"]);

    expect(checkValue(tab.service(), at(5), "DATE", { value: "31 NOV 1867" }, true)).toMatchObject({ code: "payload-datatype" });
    expect(checkValue(tab.service(), at(5), "DATE", { value: "30 NOV 1867" }, true)).toBeNull();
  });

  it("falls back to the service's message for a code the plugin has no words for", () => {
    expect(refusalText({ code: "ambiguous-fix", message: "Several fixes apply" })).toBe("Several fixes apply");
  });

  it("refuses a removal against a version the text has moved on from, which would otherwise remove another line", () => {
    const tab = tabOf(["0 @I1@ INDI", "1 SEX F", "1 NAME Marie /Curie/"]);
    const drawn = tab.version;

    commit(tab, removeAt(tab.service(), at(4), drawn));
    const second = commit(tab, removeAt(tab.service(), at(4), drawn));

    expect(second).toMatchObject({ ok: false, code: "stale-document" });
    expect(linesOf(tab)).toContain("1 NAME Marie /Curie/");
    expect(linesOf(tab)).not.toContain("1 SEX F");
  });

  it("refuses changing the header's GEDCOM version, and removing GEDC or a 5.5.1 CHAR", () => {
    const seven = tabOf([]);
    const five = tabOf([], "5.5.1");

    expect(commit(seven, setValueAt(seven.service(), at(2), seven.version, { value: "7.1" }))).toMatchObject({ code: "rule-violation" });
    expect(commit(seven, removeAt(seven.service(), at(1), seven.version))).toMatchObject({ code: "rule-violation" });
    expect(commit(five, removeAt(five.service(), at(4), five.version))).toMatchObject({ code: "required-field-missing" });
    expect(seven.writes + five.writes).toBe(0);
  });

  it("refuses a value set against a version the text has moved on from", () => {
    const tab = tabOf(["0 @I1@ INDI", "1 SEX F"]);
    const drawn = tab.version;
    tab.replace(tab.text.replace("1 SEX F", "1 SEX F\n1 SEX M"));

    expect(commit(tab, setValueAt(tab.service(), at(4), drawn, { value: "X" }))).toMatchObject({ code: "stale-document" });
    expect(refusalText({ code: "stale-document", message: "" })).toContain("The file changed");
  });
});

describe("a line break in a value", () => {
  it("is refused where the standard does not let the value span lines", () => {
    const tab = tabOf(["0 @I1@ INDI", "1 BIRT", "2 DATE 1900"]);

    const outcome = commit(tab, setValueAt(tab.service(), at(5), tab.version, { value: "1 JAN\n1900" }));

    expect(outcome).toMatchObject({ ok: false, code: "value-spans-lines" });
    expect(tab.writes).toBe(0);
    expect(refusalText(outcome as Refusal)).toBe("A line break is not allowed in this value: it keeps to one line.");
    setLanguage("ru");
    expect(refusalText(outcome as Refusal)).toBe("В этом значении нельзя переносить строку: оно занимает одну строку.");
  });
});
