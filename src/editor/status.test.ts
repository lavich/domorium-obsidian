import { describe, expect, it } from "vitest";

import { formatStatus } from "./status";

describe("GEDCOM status line", () => {
  it("names the version a supported file is checked against", () => {
    expect(
      formatStatus({
        version: { kind: "supported", version: "7.0", dialect: "7.0" },
        problems: 0,
      }),
    ).toBe("GEDCOM 7.0 · no problems");
  });

  it("says which rules a substituted version is checked by", () => {
    expect(
      formatStatus({
        version: { kind: "substituted", version: "5.5", dialect: "5.5.1" },
        problems: 2,
      }),
    ).toBe("GEDCOM 5.5, checked as 5.5.1 · 2 problems");
  });

  it("says a version with no rules is not checked", () => {
    expect(
      formatStatus({ version: { kind: "unsupported", version: "4.0" }, problems: 1 }),
    ).toBe("GEDCOM 4.0, not checked · 1 problem");
  });

  it("names the system a file that is not GEDCOM was written by", () => {
    expect(
      formatStatus({
        version: { kind: "paf", system: "PAF" },
        problems: undefined,
      }),
    ).toBe("PAF, not checked");
  });

  it("says a missing version is not checked", () => {
    expect(
      formatStatus({ version: { kind: "undetermined", dialect: "7.0" }, problems: 1 }),
    ).toBe("GEDCOM version missing, not checked · 1 problem");
  });

  it("omits the count when diagnostics are off, which is not zero problems", () => {
    expect(
      formatStatus({
        version: { kind: "supported", version: "7.0", dialect: "7.0" },
        problems: undefined,
      }),
    ).toBe("GEDCOM 7.0");
  });

  it("reports the format alone while the document is ahead of the last parse", () => {
    expect(formatStatus({ version: undefined, problems: 3 })).toBe(
      "GEDCOM · 3 problems",
    );
  });

  it("does not invent a description for a version kind it does not know", () => {
    expect(
      formatStatus({ version: { kind: "future", version: "9.9" }, problems: 0 }),
    ).toBe("GEDCOM · no problems");
  });
});
