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

    // @I1@ is declared first and cites it too: the collection is over the
    // whole document, not over the records this test added.
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
