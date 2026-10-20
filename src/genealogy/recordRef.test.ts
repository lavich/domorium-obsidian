import { describe, expect, it } from "vitest";

import {
  documentRef,
  recordRef,
  parseRecordPath,
  recordPath,
  sameDocument,
  sameRecord,
  type DocumentRef,
} from "./recordRef";

describe("addressing a document", () => {
  it("holds the path as a value of its own, not as a bare string", () => {
    const document: DocumentRef = documentRef("family/tree.ged");

    expect(document.path).toBe("family/tree.ged");
    expect(typeof document).toBe("object");
  });

  it("compares two documents by what identifies them", () => {
    expect(sameDocument(documentRef("a.ged"), documentRef("a.ged"))).toBe(true);
    expect(sameDocument(documentRef("a.ged"), documentRef("b.ged"))).toBe(false);
  });
});

describe("addressing a record", () => {
  it("names a document and an identifier, not an identifier alone", () => {
    const person = recordRef(documentRef("tree.ged"), "@I1@");

    expect(person.document.path).toBe("tree.ged");
    expect(person.xref).toBe("@I1@");
  });

  it("normalises the identifier the way a link already does", () => {
    expect(recordRef(documentRef("tree.ged"), "I1").xref).toBe("@I1@");
    expect(recordRef(documentRef("tree.ged"), "@I1@").xref).toBe("@I1@");
  });

  it("tells two people apart when only the document differs", () => {
    const first = recordRef(documentRef("one.ged"), "@I123@");
    const second = recordRef(documentRef("two.ged"), "@I123@");

    expect(sameRecord(first, second)).toBe(false);
    expect(sameRecord(first, recordRef(documentRef("one.ged"), "@I123@"))).toBe(
      true,
    );
  });
});

describe("writing an address down and reading it back", () => {
  it("round-trips through the subpath spelling links already use", () => {
    const person = recordRef(documentRef("family/tree.ged"), "@I47@");

    const written = recordPath(person);

    expect(written).toBe("family/tree.ged#@I47@");
    expect(parseRecordPath(written)).toEqual(person);
  });

  it("round-trips a path that itself contains a hash", () => {
    const person = recordRef(documentRef("notes/C# study/tree.ged"), "@I1@");

    expect(parseRecordPath(recordPath(person))).toEqual(person);
  });

  it("declines text that names no identifier", () => {
    expect(parseRecordPath("tree.ged")).toBeNull();
    expect(parseRecordPath("tree.ged#")).toBeNull();
    expect(parseRecordPath("")).toBeNull();
  });

  it("survives being carried as plain data, as a stored view state is", () => {
    const person = recordRef(documentRef("tree.ged"), "@I1@");

    const revived = JSON.parse(JSON.stringify(person)) as typeof person;

    expect(sameRecord(revived, person)).toBe(true);
  });
});
