import { describe, expect, it } from "vitest";

import {
  documentRef,
  personRef,
  parsePersonPath,
  personPath,
  sameDocument,
  samePerson,
  type DocumentRef,
} from "./personRef";

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

describe("addressing a person", () => {
  it("names a document and an identifier, not an identifier alone", () => {
    const person = personRef(documentRef("tree.ged"), "@I1@");

    expect(person.document.path).toBe("tree.ged");
    expect(person.xref).toBe("@I1@");
  });

  it("normalises the identifier the way a link already does", () => {
    expect(personRef(documentRef("tree.ged"), "I1").xref).toBe("@I1@");
    expect(personRef(documentRef("tree.ged"), "@I1@").xref).toBe("@I1@");
  });

  it("tells two people apart when only the document differs", () => {
    const first = personRef(documentRef("one.ged"), "@I123@");
    const second = personRef(documentRef("two.ged"), "@I123@");

    expect(samePerson(first, second)).toBe(false);
    expect(samePerson(first, personRef(documentRef("one.ged"), "@I123@"))).toBe(
      true,
    );
  });
});

describe("writing an address down and reading it back", () => {
  it("round-trips through the subpath spelling links already use", () => {
    const person = personRef(documentRef("family/tree.ged"), "@I47@");

    const written = personPath(person);

    expect(written).toBe("family/tree.ged#@I47@");
    expect(parsePersonPath(written)).toEqual(person);
  });

  it("round-trips a path that itself contains a hash", () => {
    const person = personRef(documentRef("notes/C# study/tree.ged"), "@I1@");

    expect(parsePersonPath(personPath(person))).toEqual(person);
  });

  it("declines text that names no identifier", () => {
    expect(parsePersonPath("tree.ged")).toBeNull();
    expect(parsePersonPath("tree.ged#")).toBeNull();
    expect(parsePersonPath("")).toBeNull();
  });

  it("survives being carried as plain data, as a stored view state is", () => {
    const person = personRef(documentRef("tree.ged"), "@I1@");

    const revived = JSON.parse(JSON.stringify(person)) as typeof person;

    expect(samePerson(revived, person)).toBe(true);
  });
});
