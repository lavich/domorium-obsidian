import { describe, expect, it } from "vitest";

import { recordPreview } from "./recordPreview";

const FILE = `0 HEAD
1 GEDC
2 VERS 7.0
0 @I1@ INDI
1 NAME Marie /Curie/
1 SEX F
0 @I2@ INDI
1 NAME Pierre /Curie/
0 TRLR
`;

const text = (preview: ReturnType<typeof recordPreview>) =>
  preview.kind === "missing" ? "" : preview.runs.map((run) => run.text).join("");

describe("what a link to a record shows before it is followed", () => {
  it("shows the record the link names, and nothing of the next one", () => {
    const preview = recordPreview(FILE, "#@I1@");

    expect(preview.kind).toBe("record");
    expect(text(preview)).toBe("0 @I1@ INDI\n1 NAME Marie /Curie/\n1 SEX F");
  });

  it("names the record by what a reader calls it", () => {
    const preview = recordPreview(FILE, "#@I1@");

    expect(preview.kind === "record" && preview.title).toBe("Marie /Curie/");
  });

  it("falls back to the identifier where the format names none", () => {
    const preview = recordPreview("0 @F1@ FAM\n1 HUSB @I1@\n0 TRLR\n", "#@F1@");

    expect(preview.kind === "record" && preview.title).toBe("@F1@");
  });

  it("paints the record, rather than handing back one run of text", () => {
    const preview = recordPreview(FILE, "#@I1@");

    expect(
      preview.kind === "record" &&
        preview.runs.some((run) => run.className !== null),
    ).toBe(true);
  });

  it("says so when the file has no such record", () => {
    expect(recordPreview(FILE, "#@I9@")).toEqual({
      kind: "missing",
      xref: "@I9@",
    });
  });

  it("shows the head of the file for a link naming no record", () => {
    const preview = recordPreview(FILE, "");

    expect(preview.kind).toBe("file");
    expect(text(preview)).toBe(FILE.trimEnd());
  });

  it("stops at the line it is given, and says it stopped", () => {
    const preview = recordPreview(FILE, "#@I1@", { limit: 2 });

    expect(text(preview)).toBe("0 @I1@ INDI\n1 NAME Marie /Curie/");
    expect(preview.kind === "record" && preview.truncated).toBe(true);
  });

  it("indents a nested line, as the editor does, where that is asked for", () => {
    const preview = recordPreview(FILE, "#@I1@", { indent: true });

    expect(text(preview)).toBe(
      "0 @I1@ INDI\n  1 NAME Marie /Curie/\n  1 SEX F",
    );
  });

  it("leaves the file as written where it is not", () => {
    expect(text(recordPreview(FILE, "#@I1@"))).toBe(
      "0 @I1@ INDI\n1 NAME Marie /Curie/\n1 SEX F",
    );
  });

  it("says nothing was left out where nothing was", () => {
    const preview = recordPreview(FILE, "#@I1@", { limit: 3 });

    expect(preview.kind === "record" && preview.truncated).toBe(false);
  });
});
