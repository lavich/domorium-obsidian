import { GedcomLanguageService } from "@domorium/language-service";
import { describe, expect, it, vi } from "vitest";

import { FIXTURE } from "./fixture";
import { buildIndex, type GenealogyIndex } from "./index";

const index = (text = FIXTURE): GenealogyIndex =>
  buildIndex(new GedcomLanguageService(text).getDocumentSymbols());

const source = (xref: string, from = index()) => {
  const found = from.source(xref);
  if (!found) {
    throw new Error(`no source ${xref}`);
  }
  return found;
};

describe("the sources a document declares", () => {
  it("reports them in the order the file writes them", () => {
    expect(index().sources.map((row) => row.xref)).toEqual([
      "@S1@", "@S2@", "@S3@", "@S4@",
    ]);
  });

  it("carries the title, the author and where it is held", () => {
    const row = index().sources.find((one) => one.xref === "@S1@");

    expect(row?.title).toBe("Parish registers of Warsaw");
    expect(row?.author).toBe("Parish of the Holy Cross");
    expect(row?.repository).toBe("State Archive in Warsaw");
  });

  it("carries nothing it was not told", () => {
    const row = index().sources.find((one) => one.xref === "@S2@");

    expect(row?.title).toBe("A title and nothing else");
    expect(row?.author).toBeUndefined();
    expect(row?.repository).toBeUndefined();
  });

  it("titles a source the record leaves untitled", () => {
    const row = index().sources.find((one) => one.xref === "@S3@");

    expect(row?.title).toBe("@untitled@");
  });

  it("reports a repository the document does not declare", () => {
    const one = source("@S4@");

    expect(one.repository).toBeUndefined();
    expect(one.unresolved).toContain("@R9@");
  });
});

describe("a source read in full", () => {
  it("reports what the record states about it", () => {
    const one = source("@S1@");

    expect(one.fields).toEqual([
      { tag: "TITL", value: "Parish registers of Warsaw" },
      { tag: "AUTH", value: "Parish of the Holy Cross" },
      { tag: "PUBL", value: "Warsaw, 1867" },
    ]);
  });

  it("reports the repository as a record of its own", () => {
    const held = source("@S1@").heldAt;

    expect(held?.name).toBe("State Archive in Warsaw");
    expect(held?.address).toBe("Krzywe Koło 7, Warsaw, Poland");
    expect(held?.web).toBe("https://example.org/archive");
  });

  it("reports the pictures it points at, as a person's are", () => {
    expect(source("@S1@").portrait?.file).toBe("Media/portrait.png");
  });
});

describe("citations, read both ways", () => {
  it("reports what a record cites, with the page it states", () => {
    const cited = index().citesBy("@I17@");

    expect(cited.map((one) => one.source)).toEqual(["@S1@", "@S1@", "@S9@"]);
    expect(cited[0]?.page).toBe("volume 3, page 214");
  });

  it("names the structure a citation sat beneath, where it did", () => {
    const cited = index().citesBy("@I17@");

    expect(cited[0]?.within).toBeUndefined();
    expect(cited[1]?.within).toBe("BIRT");
    expect(cited[1]?.page).toBe("birth entry 88");
  });

  it("reports what cites a source, in document order", () => {
    const citing = index().citedBy("@S1@");

    expect(citing.map((one) => one.record)).toEqual([
      "@I1@", "@I17@", "@I17@", "@I18@", "@I19@",
    ]);
  });

  it("reports a source nothing cites, which is not an error", () => {
    expect(index().citedBy("@S2@")).toEqual([]);
  });

  it("reports a citation of a source that is not declared", () => {
    const cited = index().citesBy("@I17@");
    const lost = cited.find((one) => one.source === "@S9@");

    expect(lost).toBeDefined();
    expect(index().source("@S9@")).toBeUndefined();
  });
});

describe("reading both ways costs one pass", () => {
  it("reads the document once, however many sources are asked about", () => {
    const read = vi.fn(() =>
      new GedcomLanguageService(FIXTURE).getDocumentSymbols(),
    );
    const built = buildIndex(read());

    for (const xref of ["@S1@", "@S2@", "@S3@"]) {
      built.citedBy(xref);
      built.source(xref);
    }

    expect(read).toHaveBeenCalledTimes(1);
  });
});

const EVENT_CITATIONS = [
  "0 HEAD",
  "1 GEDC",
  "2 VERS 7.0",
  "0 @I1@ INDI",
  "1 SOUR @S1@",
  "1 RESI",
  "2 PLAC Paris",
  "1 RESI",
  "2 PLAC Sceaux",
  "2 SOUR @S1@",
  "1 BIRT",
  "2 SOUR @S2@",
  "3 QUAY 3",
  "1 FAMS @F1@",
  "0 @F1@ FAM",
  "1 HUSB @I1@",
  "1 MARR",
  "2 SOUR @S3@",
  "0 @S1@ SOUR",
  "1 TITL One",
  "0 @S2@ SOUR",
  "1 TITL Two",
  "0 @S3@ SOUR",
  "1 TITL Three",
  "0 TRLR",
  "",
].join("\n");

describe("a citation belongs to the event it sits under", () => {
  const read = index(EVENT_CITATIONS);
  const marie = read.person("@I1@");

  it("keeps two events of one kind apart", () => {
    const [first, second] = marie?.events ?? [];

    expect(first?.citations).toEqual([]);
    expect(second?.citations.map((one) => one.source)).toEqual(["@S1@"]);
  });

  it("keeps a citation of the record apart from one of its birth", () => {
    const ofRecord = read.citesBy("@I1@").filter((one) => one.event === undefined);
    const birth = marie?.events.find((event) => event.tag === "BIRT");

    expect(ofRecord.map((one) => one.source)).toEqual(["@S1@"]);
    expect(birth?.citations.map((one) => one.source)).toEqual(["@S2@"]);
  });

  it("reports the quality of evidence a citation states", () => {
    const birth = marie?.events.find((event) => event.tag === "BIRT");

    expect(birth?.citations[0]?.quality).toBe(3);
    expect(read.citesBy("@I1@")[0]?.quality).toBeUndefined();
  });

  it("reports a family event's citation as that event's own", () => {
    expect(read.family("@F1@")?.events[0]?.citations.map((one) => one.source))
      .toEqual(["@S3@"]);
    expect(marie?.unions[0]?.events[0]?.citations.map((one) => one.source))
      .toEqual(["@S3@"]);
  });
});

describe("a source described on the spot", () => {
  const read = index([
    "0 HEAD",
    "1 GEDC",
    "2 VERS 5.5.1",
    "2 FORM LINEAGE-LINKED",
    "1 CHAR UTF-8",
    "0 @I1@ INDI",
    "1 BIRT",
    "2 SOUR Family Bible of the Skłodowski family",
    "3 PAGE p. 4",
    "0 TRLR",
    "",
  ].join("\n"));

  it("is a citation of the event, reaching no source record", () => {
    const citation = read.person("@I1@")?.events[0]?.citations[0];

    expect(citation?.inline).toBe("Family Bible of the Skłodowski family");
    expect(citation?.source).toBeUndefined();
    expect(citation?.page).toBe("p. 4");
  });

  it("is not a structure other citations hang from", () => {
    expect(read.citesBy("@I1@").map((one) => one.within)).toEqual(["BIRT"]);
  });
});
