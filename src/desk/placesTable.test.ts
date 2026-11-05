import { describe, expect, it } from "vitest";

import { appendMissingRows, parsePlacesTable, placeKey, placesTablePath, placesTableText } from "./placesTable";

const rowsOf = (text: string): Record<string, unknown> =>
  Object.fromEntries(parsePlacesTable(text).rows);

const TABLE = ["| Place | Latitude | Longitude |", "| --- | --- | --- |"];

describe("the identity of a place", () => {
  it("ignores case, outer white space and runs of it", () => {
    expect(placeKey("  Paris,   France ")).toBe(placeKey("paris, france"));
  });

  it("keeps accents and commas", () => {
    expect(placeKey("Orléans")).not.toBe(placeKey("Orleans"));
    expect(placeKey("Paris,France")).not.toBe(placeKey("Paris, France"));
  });
});

describe("reading the places table", () => {
  it("reads the expected format", () => {
    const text = [...TABLE, "| Warsaw, Congress Poland | 52.2297 | 21.0122 |"].join("\n");

    expect(rowsOf(text)).toEqual({
      "warsaw, congress poland": { latitude: 52.2297, longitude: 21.0122 },
    });
  });

  it("reads a header in another language and a decimal comma", () => {
    const text = ["| Место | Широта | Долгота |", "| --- | --- | --- |", "| Москва | 55,7558 | 37,6173 |"].join("\n");

    expect(rowsOf(text)).toEqual({ москва: { latitude: 55.7558, longitude: 37.6173 } });
  });

  it("reads letters for the hemisphere before or after the number", () => {
    const text = [...TABLE, "| Santiago, Chile | S33.4489 | W70.6693 |", "| Lima | 12.04 S | 77.04 W |"].join("\n");

    expect(rowsOf(text)).toEqual({
      "santiago, chile": { latitude: -33.4489, longitude: -70.6693 },
      lima: { latitude: -12.04, longitude: -77.04 },
    });
  });

  it("reads a bar escaped in a place", () => {
    expect(rowsOf([...TABLE, "| A \\| B | 10 | 20 |"].join("\n"))).toEqual({
      "a | b": { latitude: 10, longitude: 20 },
    });
  });

  it("reads only the first table, with text and front matter around it", () => {
    const text = [
      "---",
      "tags: x",
      "---",
      "A paragraph | with a bar.",
      "",
      ...TABLE,
      "| One | 1 | 2 |",
      "",
      ...TABLE,
      "| Two | 3 | 4 |",
    ].join("\n");

    expect(Object.keys(rowsOf(text))).toEqual(["one"]);
  });

  it("gives a blank row no coordinates and keeps the place", () => {
    expect(rowsOf([...TABLE, "| Stockholm, Sweden |  |  |"].join("\n"))).toEqual({ "stockholm, sweden": null });
  });

  it("uses the first of a repeated place", () => {
    const text = [...TABLE, "| Paris, France | 48 | 2 |", "| paris, france | 1 | 1 |"].join("\n");

    expect(rowsOf(text)).toEqual({ "paris, france": { latitude: 48, longitude: 2 } });
  });

  it("gives no coordinates for an impossible latitude", () => {
    expect(rowsOf([...TABLE, "| Nowhere | 95 | 10 |"].join("\n"))).toEqual({ nowhere: null });
  });

  it("skips a blank row between rows and a row with no place", () => {
    const text = [...TABLE, "| A | 1 | 2 |", "|  | 3 | 4 |", "| B | 5 | 6 |"].join("\n");

    expect(Object.keys(rowsOf(text))).toEqual(["a", "b"]);
  });

  it("reads Windows line endings and a table with no leading pipes", () => {
    const text = ["Place | Latitude | Longitude", "--- | --- | ---", "Rome | 41.9 | 12.5"].join("\r\n");

    expect(rowsOf(text)).toEqual({ rome: { latitude: 41.9, longitude: 12.5 } });
  });

  it.each([["", "an empty note"], ["Just a paragraph.\n\nAnother.", "a note with no table"]])(
    "gives no rows for %j (%s)",
    (text) => {
      expect(parsePlacesTable(text).rows.size).toBe(0);
    },
  );
});

describe("where the table lives", () => {
  it("replaces the extension in the same folder", () => {
    expect(placesTablePath("Family/curie.ged")).toBe("Family/curie.places.md");
    expect(placesTablePath("a.b/x.gedcom")).toBe("a.b/x.places.md");
    expect(placesTablePath("Family/curie.GED")).toBe("Family/curie.places.md");
  });

  it("gives one table to a.ged and a.gedcom", () => {
    expect(placesTablePath("a.ged")).toBe(placesTablePath("a.gedcom"));
  });

  it("has none for another kind of file", () => {
    expect(placesTablePath("notes.md")).toBeNull();
  });
});

describe("writing the places table", () => {
  const collator = new Intl.Collator("en");

  it("round-trips every name with no coordinates", () => {
    const text = placesTableText(["Warsaw", "Paris, France"], collator, "A note.");

    expect(text.startsWith("A note.\n\n| Place | Latitude | Longitude |")).toBe(true);
    expect(rowsOf(text)).toEqual({ warsaw: null, "paris, france": null });
  });

  it("escapes a bar and sorts by the collator", () => {
    const text = placesTableText(["Zagreb", "Éire", "A | B"], collator, "n");

    expect(Object.keys(rowsOf(text))).toEqual(["a | b", "éire", "zagreb"]);
  });
});

describe("appending the places that have no row", () => {
  it("appends after the last row and leaves the text around alone", () => {
    const before = ["Intro", "", ...TABLE, "| Paris | 48 | 2 |", "", "After the table."].join("\n");
    const after = appendMissingRows(before, ["Sceaux, France"]);

    expect(after).toBe(["Intro", "", ...TABLE, "| Paris | 48 | 2 |", "| Sceaux, France |  |  |", "", "After the table."].join("\n"));
  });

  it("creates the table in a note without one", () => {
    const after = appendMissingRows("Just text.", ["Sceaux"]);

    expect(after).toBe(`Just text.\n\n${TABLE.join("\n")}\n| Sceaux |  |  |\n`);
    expect(rowsOf(after)).toEqual({ sceaux: null });
  });

  it("keeps the line endings of the note", () => {
    const after = appendMissingRows([...TABLE, "| A | 1 | 2 |"].join("\r\n"), ["B"]);

    expect(after).toBe([...TABLE, "| A | 1 | 2 |", "| B |  |  |"].join("\r\n"));
  });

  it("appends nothing for an empty list", () => {
    expect(appendMissingRows("abc", [])).toBe("abc");
  });
});
