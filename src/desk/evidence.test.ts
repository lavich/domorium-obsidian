// @vitest-environment happy-dom
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { GedcomLanguageService } from "@domorium/language-service";
import { buildIndex, type GenealogyIndex } from "../genealogy";
import { curieIndex } from "../testing/curie";
import { installObsidianDom } from "../testing/obsidianDom";
import { renderEvidenceSection, type EvidenceHost, type EvidenceSelection } from "./evidence";

let container: HTMLElement;
let host: ReturnType<typeof evidenceHost>;

function evidenceHost() {
  return {
    openRecord: vi.fn<EvidenceHost["openRecord"]>(),
    showInSource: vi.fn<EvidenceHost["showInSource"]>(),
    wholeRecord: vi.fn<EvidenceHost["wholeRecord"]>(),
    openNote: vi.fn<EvidenceHost["openNote"]>(),
  } satisfies EvidenceHost;
}

beforeAll(installObsidianDom);
beforeEach(() => {
  container = document.createElement("div");
  host = evidenceHost();
});

function drawSelection(selection: EvidenceSelection): void {
  container.empty();
  renderEvidenceSection(container, selection, host);
}

function draw(record: string, fact: string | null, index: GenealogyIndex = curieIndex()): void {
  drawSelection({ index, record, fact });
}

const texts = (selector: string): string[] =>
  [...container.querySelectorAll(selector)].map((node) => node.textContent ?? "");

const OWN_SOURCE = buildIndex(new GedcomLanguageService([
  "0 HEAD", "1 GEDC", "2 VERS 7.0",
  "0 @I1@ INDI", "1 NAME Anna /Nowak/",
  "1 BIRT", "2 DATE 1867", "2 SOUR @S2@", "3 PAGE entry 88", "3 QUAY 3",
  "1 SOUR @S1@",
  "1 DEAT", "2 SOUR @S9@",
  "0 @S1@ SOUR", "1 TITL Census of 1891",
  "0 @S2@ SOUR", "1 TITL Parish register", "1 AUTH Holy Cross", "1 PUBL Warsaw",
  "0 TRLR", "",
].join("\n")));

describe("the evidence of a whole record", () => {
  it("names the record and lists the sources it cites itself", () => {
    draw("@I1@", null);

    expect(texts(".gedcom-desk-evidence-context div")).toEqual([
      "Whole record", "Marie Skłodowska-Curie · 1867–1934",
    ]);
    expect(texts(".gedcom-desk-subsection")).toEqual(["Sources of the record · 2"]);
    expect(texts(".gedcom-desk-cite-title")).toEqual([
      "The Nobel Prize in Physics 1903",
      "The Nobel Prize in Chemistry 1911 and 1935",
    ]);
    expect(texts(".gedcom-desk-cite-page")[0]).toBe(
      "Nobel Prize in Physics 1903, shared with Pierre Curie and Henri Becquerel",
    );
    expect(texts(".gedcom-desk-cite-meta")[0]).toBe("Nobel Prize Outreach · nobelprize.org");
  });

  it("opens the page of a source it lists", () => {
    draw("@I1@", null);
    container.querySelector<HTMLElement>(".gedcom-desk-cite")?.click();

    expect(host.openRecord).toHaveBeenCalledWith("@S1@");
  });
});

describe("the evidence of a fact", () => {
  it("says a fact with no source of its own rests on nothing of its own", () => {
    draw("@I1@", "p:0");

    expect(texts(".gedcom-desk-evidence-context div")).toEqual([
      "Birth", "7 NOV 1867 · Warsaw, Congress Poland",
    ]);
    expect(texts(".gedcom-desk-notice div")).toEqual([
      "No source of its own",
      "The sources below belong to the whole record and may not support this fact.",
    ]);
    expect(texts(".gedcom-desk-subsection")).toEqual([
      "Sources of this fact", "Whole record", "Sources of the record · 2",
    ]);
  });

  it("says when the record cites nothing either", () => {
    draw("@I5@", "p:0");

    expect(texts(".gedcom-desk-notice div")[1]).toBe("The record cites nothing either.");
  });

  it("lists the fact's own source above the record's, with page and quality", () => {
    draw("@I1@", "p:0", OWN_SOURCE);

    expect(texts(".gedcom-desk-cite-title")).toEqual(["Parish register", "Census of 1891"]);
    expect(texts(".gedcom-desk-cite-page")[0]).toBe("entry 88");
    expect(texts(".gedcom-desk-cite-meta")[0]).toBe("Primary evidence · Holy Cross · Warsaw");
  });

  it("says a cited source is not in the file, with the way to its line", () => {
    draw("@I1@", "p:1", OWN_SOURCE);
    container.querySelector<HTMLElement>(".gedcom-desk-missing .gedcom-desk-link")?.click();

    expect(texts(".gedcom-desk-missing span")).toEqual(["Points to a source that is not in the file"]);
    expect(host.showInSource.mock.calls[0]?.[0].start.line).toBe(12);
  });

  it("goes back to the whole record, and shows the fact in the source", () => {
    const index = curieIndex();
    draw("@I1@", "p:0", index);
    const [whole, source] = container.querySelectorAll<HTMLElement>(".gedcom-desk-actions .gedcom-desk-link");
    whole?.click();
    source?.click();

    expect(host.wholeRecord).toHaveBeenCalled();
    expect(host.showInSource).toHaveBeenCalledWith(index.person("@I1@")?.events[0]?.range);
  });

  it("shows a family event's own citations, keeping the person as the whole record", () => {
    draw("@I1@", "u:0:0");

    expect(texts(".gedcom-desk-evidence-context div")[0]).toBe("Marriage · family event");
    expect(texts(".gedcom-desk-subsection")).toContain("Sources of the record · 2");
  });

  it("shows a source described in the record", () => {
    const index = buildIndex(new GedcomLanguageService([
      "0 HEAD", "1 GEDC", "2 VERS 5.5.1", "2 FORM LINEAGE-LINKED", "1 CHAR UTF-8",
      "0 @I1@ INDI", "1 BIRT", "2 SOUR Family Bible", "0 TRLR", "",
    ].join("\n")));
    draw("@I1@", "p:0", index);

    expect(texts(".gedcom-desk-cite-inline")).toEqual(["Family Bible"]);
    expect(texts(".gedcom-desk-cite-meta")).toContain(
      "Described in the record, not as a source record",
    );
  });
});

describe("the evidence of a family", () => {
  it("names the family as the whole record", () => {
    draw("@F3@", null);

    expect(texts(".gedcom-desk-evidence-context div")).toEqual([
      "Whole record", "Pierre Curie and Marie Skłodowska-Curie",
    ]);
    expect(texts(".gedcom-desk-subsection")).toEqual(["Sources of the record · 0"]);
  });

  it("says the Curies' marriage rests on nothing, nor does the family record", () => {
    draw("@F3@", "f:0");

    expect(texts(".gedcom-desk-evidence-context div")[0]).toBe("Marriage");
    expect(texts(".gedcom-desk-notice div")).toEqual([
      "No source of its own", "The record cites nothing either.",
    ]);
  });
});

describe("the section of a person and of a family", () => {
  it("is headed Evidence, with the whole record as its context", () => {
    draw("@I1@", null);

    expect(texts(".gedcom-card-evidence > h2")).toEqual(["Evidence"]);
  });

  it("appends to what is there instead of emptying it", () => {
    container.createDiv({ cls: "earlier" });
    renderEvidenceSection(container, { index: curieIndex(), record: "@I1@", fact: null }, host);

    expect(container.querySelector(".earlier")).not.toBeNull();
    expect(container.querySelector(".gedcom-card-evidence")).not.toBeNull();
  });
});

describe("the evidence of a source and of a multimedia record", () => {
  it("is the notes alone, with no citations and no Evidence heading", () => {
    drawSelection({ index: curieIndex(), record: "@S2@", fact: null, notes: [] });

    expect(texts(".gedcom-desk-section")).toEqual(["Notes in the vault · 0"]);
    expect(container.querySelector(".gedcom-card-evidence")).toBeNull();
    expect(container.querySelector(".gedcom-desk-cite")).toBeNull();
    expect(container.querySelector(".gedcom-desk-link")).toBeNull();
  });
});

describe("notes in the vault", () => {
  const RADIUM = {
    path: "Notes/Radium.md",
    name: "Radium",
    lines: [{ line: 1, before: "announced in December 1898 by ", link: "Marie Skłodowska-Curie", after: " and" }],
  };

  it("lists the notes linking the record below its sources, the link marked", () => {
    drawSelection({ index: curieIndex(), record: "@I1@", fact: null, notes: [RADIUM] });

    expect(texts(".gedcom-desk-subsection")).toEqual([
      "Sources of the record · 2", "Notes in the vault · 1",
    ]);
    expect(texts(".gedcom-desk-note-name")).toEqual(["Radium"]);
    expect(texts(".gedcom-desk-note-line mark")).toEqual(["Marie Skłodowska-Curie"]);
    expect(texts(".gedcom-desk-note-line")).toEqual([
      "announced in December 1898 by Marie Skłodowska-Curie and",
    ]);
  });

  it("lists six notes when the host hands six", () => {
    const six = Array.from({ length: 6 }, (_, at) => ({ ...RADIUM, path: `Notes/${at}.md`, name: `Note ${at}` }));
    drawSelection({ index: curieIndex(), record: "@I1@", fact: null, notes: six });

    expect(texts(".gedcom-desk-note-name")).toHaveLength(6);
    expect(texts(".gedcom-desk-subsection")).toContain("Notes in the vault · 6");
  });

  it("opens a note at the line", () => {
    drawSelection({ index: curieIndex(), record: "@I1@", fact: null, notes: [RADIUM] });
    container.querySelector<HTMLElement>(".gedcom-desk-note-line")?.click();

    expect(host.openNote).toHaveBeenCalledWith("Notes/Radium.md", 1);
  });

  it("says when no note links the record, and waits while the vault is asked", () => {
    drawSelection({ index: curieIndex(), record: "@I10@", fact: null, notes: [] });
    expect(texts(".gedcom-desk-none")).toContain("No note links to this record.");

    drawSelection({ index: curieIndex(), record: "@I10@", fact: null, notes: null });
    expect(texts(".gedcom-desk-subsection")).toContain("Notes in the vault");
    expect(texts(".gedcom-desk-none")).not.toContain("No note links to this record.");
  });

  it("lists them beside a source and a multimedia record too", () => {
    drawSelection({ index: curieIndex(), record: "@S1@", fact: null, notes: [] });
    expect(texts(".gedcom-desk-section")).toEqual(["Notes in the vault · 0"]);

    drawSelection({ index: curieIndex(), record: "@O5@", fact: null, notes: [] });
    expect(texts(".gedcom-desk-section")).toEqual(["Notes in the vault · 0"]);
  });
});
