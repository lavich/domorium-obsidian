import { afterEach, describe, expect, it } from "vitest";

import { resetLanguage, setLanguage } from "../../i18n";
import { FAMILY_EVENT_TAGS, PERSON_EVENT_TAGS } from "../../genealogy/tags";
import { childMark, linkStatusLabel, nameTypeLabel, parentsHeading, roleLabel, sexLabel, tagLabel } from "./labels";

afterEach(resetLanguage);

/** The tags of a person, a family, an event and what hangs beneath them, in 5.5.1 and in 7.0, that a card names. */
const STANDARD = [
  "NAME", "GIVN", "SURN", "NPFX", "NSFX", "NICK", "SPFX", "TYPE", "SEX", "FAMC", "FAMS", "PEDI", "STAT", "NOTE",
  "SNOTE", "SOUR", "OBJE", "ASSO", "ALIA", "ROLE", "RELA", "PHRASE", "REFN", "UID", "EXID", "AFN", "RIN", "RESN",
  "CREA", "CHAN", "SUBM", "ANCI", "DESI", "DATE", "TIME", "PLAC", "FORM", "MAP", "LATI", "LONG", "TRAN", "LANG",
  "AGE", "CAUS", "AGNC", "SDATE", "TEMP", "ADDR", "ADR1", "ADR2", "ADR3", "CITY", "STAE", "POST", "CTRY", "PHON",
  "EMAIL", "FAX", "WWW", "HUSB", "WIFE", "CHIL", "PAGE", "QUAY", "DATA", "TEXT", "FILE", "MEDI", "CROP", "TOP",
  "LEFT", "HEIGHT", "WIDTH", "CALN", "ABBR", "AUTH", "PUBL", "REPO", "SLGS", "TITL", "EVEN",
];

describe("the names a card gives a tag", () => {
  it("has a word for every standard tag and every event tag, in English and in Russian", () => {
    for (const language of ["en", "ru"]) {
      setLanguage(language);
      for (const tag of [...STANDARD, ...PERSON_EVENT_TAGS, ...FAMILY_EVENT_TAGS]) {
        expect(tagLabel(tag), `${language} ${tag}`).not.toBe(tag);
      }
    }
  });

  it("names a tag in the reader's language", () => {
    expect(tagLabel("AGNC")).toBe("Agency");
    setLanguage("ru");
    expect(tagLabel("AGNC")).toBe("Организация");
  });

  it("shows a custom tag and one it does not know as written", () => {
    expect(tagLabel("_MILITARY")).toBe("_MILITARY");
    expect(tagLabel("ZZZZ")).toBe("ZZZZ");
  });
});

describe("the names of a type, a role, a status and a sex", () => {
  it("reads 7.0's capitals and 5.5.1's lower case alike", () => {
    expect(nameTypeLabel("BIRTH")).toBe("Birth");
    expect(nameTypeLabel("birth")).toBe("Birth");
    expect(roleLabel("GODP")).toBe("Godparent");
    expect(roleLabel("godp")).toBe("Godparent");
    expect(roleLabel("witness")).toBe("Witness");
    expect(linkStatusLabel("PROVEN")).toBe("Proven");
    expect(sexLabel("f")).toBe("Female");
  });

  it("shows a word the file made up as the file wrote it", () => {
    expect(nameTypeLabel("Stage name")).toBe("Stage name");
    expect(roleLabel("Landlord")).toBe("Landlord");
    expect(sexLabel("Q")).toBe("Q");
  });

  it("names the parents by how the person belongs to them, and marks a child who is not theirs by birth", () => {
    expect(parentsHeading(undefined)).toBe("Parents");
    expect(parentsHeading("birth")).toBe("Parents");
    expect(parentsHeading("adopted")).toBe("Adoptive parents");
    expect(childMark("adopted")).toBe("Adopted");
    expect(childMark("birth")).toBeUndefined();
    expect(childMark("unstated")).toBeUndefined();
    setLanguage("ru");
    expect(parentsHeading("foster")).toBe("Опекуны");
  });
});
