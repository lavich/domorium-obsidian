import { GedcomLanguageService } from "@domorium/language-service";
import { describe, expect, it } from "vitest";

import { IndexCache } from "./cache";
import { documentRef, recordRef, sameRecord } from "./recordRef";

/** Two files, each declaring @I1@ as a different person. */
const CURIE = [
  "0 HEAD", "1 GEDC", "2 VERS 7.0",
  "0 @I1@ INDI", "1 NAME Marie /Skłodowska-Curie/", "1 SEX F",
  "1 BIRT", "2 DATE 7 NOV 1867",
  "0 TRLR", "",
].join("\n");

const JOLIOT = [
  "0 HEAD", "1 GEDC", "2 VERS 7.0",
  "0 @I1@ INDI", "1 NAME Frédéric /Joliot/", "1 SEX M",
  "1 BIRT", "2 DATE 19 MAR 1900",
  "0 TRLR", "",
].join("\n");

const symbols = (text: string) =>
  new GedcomLanguageService(text).getDocumentSymbols();

describe("two documents declaring the same identifier", () => {
  it("are different people, and an address tells them apart", () => {
    const one = recordRef(documentRef("curie.ged"), "@I1@");
    const other = recordRef(documentRef("joliot.ged"), "@I1@");

    expect(sameRecord(one, other)).toBe(false);
  });

  it("are read apart, whichever is asked for", () => {
    const cache = new IndexCache();

    const curie = cache.at(documentRef("curie.ged"), "r1", () => symbols(CURIE));
    const joliot = cache.at(documentRef("joliot.ged"), "r1", () => symbols(JOLIOT));

    expect(curie.person("@I1@")?.name).toBe("Marie Skłodowska-Curie");
    expect(joliot.person("@I1@")?.name).toBe("Frédéric Joliot");
  });

  it("do not overwrite each other in the cache", () => {
    const cache = new IndexCache();
    cache.at(documentRef("curie.ged"), "r1", () => symbols(CURIE));
    cache.at(documentRef("joliot.ged"), "r1", () => symbols(JOLIOT));

    // Asked again, each still answers with its own person.
    expect(
      cache.at(documentRef("curie.ged"), "r1", () => []).person("@I1@")?.name,
    ).toBe("Marie Skłodowska-Curie");
    expect(cache.size).toBe(2);
  });

  it("survive an address written down and read back, as a stored tab is", () => {
    const stored = JSON.parse(
      JSON.stringify(recordRef(documentRef("joliot.ged"), "@I1@")),
    ) as ReturnType<typeof recordRef>;
    const cache = new IndexCache();
    cache.at(documentRef("curie.ged"), "r1", () => symbols(CURIE));
    const index = cache.at(stored.document, "r1", () => symbols(JOLIOT));

    expect(index.person(stored.xref)?.name).toBe("Frédéric Joliot");
  });
});
