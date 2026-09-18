import { afterEach, describe, expect, it } from "vitest";

import { resetLanguage, setLanguage } from "../i18n";
import { formatStatus } from "./status";

afterEach(resetLanguage);

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

describe("the same line in Russian", () => {
  const supported = { kind: "supported", version: "7.0", dialect: "7.0" };

  it("spells the count by Russian plural rules", () => {
    setLanguage("ru");
    const line = (problems: number): string =>
      formatStatus({ version: supported, problems });

    expect(line(0)).toBe("GEDCOM 7.0 · нет проблем");
    expect(line(1)).toBe("GEDCOM 7.0 · 1 проблема");
    expect(line(2)).toBe("GEDCOM 7.0 · 2 проблемы");
    expect(line(5)).toBe("GEDCOM 7.0 · 5 проблем");
    expect(line(21)).toBe("GEDCOM 7.0 · 21 проблема");
  });

  it("says a version with no rules is not checked, keeping the version as written", () => {
    setLanguage("ru");
    expect(
      formatStatus({ version: { kind: "unsupported", version: "4.0" }, problems: 1 }),
    ).toBe("GEDCOM 4.0, не проверяется · 1 проблема");
    expect(
      formatStatus({
        version: { kind: "substituted", version: "5.5", dialect: "5.5.1" },
        problems: undefined,
      }),
    ).toBe("GEDCOM 5.5, проверяется как 5.5.1");
  });
});
