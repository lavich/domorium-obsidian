import { GedcomLanguageService } from "@domorium/language-service";
import { describe, expect, it, vi } from "vitest";

import { FIXTURE } from "./fixture";
import { buildIndex, type GenealogyIndex } from "./index";
import { UNNAMED } from "./names";

const index = (text = FIXTURE): GenealogyIndex =>
  buildIndex(new GedcomLanguageService(text).getDocumentSymbols());

const person = (xref: string, from = index()) => {
  const found = from.person(xref);
  if (!found) {
    throw new Error(`no person ${xref}`);
  }
  return found;
};

const names = (people: { name: string }[]): string[] =>
  people.map((one) => one.name);

describe("the people a document declares", () => {
  it("reports them in the order the file writes them", () => {
    const rows = index().people;

    expect(rows[0]?.xref).toBe("@I1@");
    expect(rows[0]?.name).toBe("Marie Skłodowska-Curie");
    expect(rows.map((row) => row.xref).filter(Boolean)).toEqual([
      "@I1@", "@I2@", "@I3@", "@I4@", "@I5@", "@I6@",
      "@I12@", "@I13@", "@I15@", "@I16@", "@I14@",
      "@I7@", "@I8@", "@I9@", "@I10@", "@I11@",
      "@I17@", "@I18@", "@I19@",
    ]);
  });

  it("reports a record declaring no identifier, marked unaddressable", () => {
    const unaddressable = index().people.filter((row) => row.xref === undefined);

    expect(unaddressable).toHaveLength(1);
    expect(unaddressable[0]?.name).toBe("Nameless Record");
  });

  it("carries the years and a place that tell one person from another", () => {
    const marie = index().people.find((row) => row.xref === "@I1@");

    expect(marie?.birth?.year).toBe(1867);
    expect(marie?.birth?.precision).toBe("exact");
    expect(marie?.death?.year).toBe(1934);
    expect(marie?.place).toBe("Warsaw, Congress Poland");
  });

  it("takes the place from death where birth states none", () => {
    // @I9@ has a bare DEAT and a BURI whose date is in another calendar.
    const bare = index().people.find((row) => row.xref === "@I9@");

    expect(bare?.birth).toBeUndefined();
    expect(bare?.place).toBeUndefined();
  });

  it("names a person the record leaves unnamed", () => {
    const rows = buildIndex(
      new GedcomLanguageService(
        "0 HEAD\n1 GEDC\n2 VERS 7.0\n0 @I1@ INDI\n0 TRLR\n",
      ).getDocumentSymbols(),
    ).people;

    expect(rows[0]?.name).toBe(UNNAMED);
  });

  it("reports the other names a record carries", () => {
    expect(person("@I1@").otherNames).toEqual(["Maria Salomea Skłodowska"]);
  });

  it("reports the sex the record states, and nothing where it states none", () => {
    expect(person("@I1@").sex).toBe("F");
    expect(person("@I5@").sex).toBeUndefined();
  });
});

describe("relatives, resolved through families", () => {
  it("reads parents from the spouses of a child-family", () => {
    expect(names(person("@I1@").parents)).toEqual([
      "Władysław Skłodowski",
      "Bronisława Boguska",
    ]);
  });

  it("reads partners and children from a spouse-family", () => {
    const marie = person("@I1@");

    expect(names(marie.partners)).toEqual(["Pierre Curie"]);
    expect(names(marie.children)).toEqual(["Irène Joliot-Curie", "Ève Curie"]);
  });

  it("does not report a person as their own partner", () => {
    expect(person("@I1@").partners.map((one) => one.xref)).not.toContain("@I1@");
  });

  it("reports two people named in the same spouse role", () => {
    expect(names(person("@I10@").partners)).toEqual(["Second Spouse"]);
    expect(names(person("@I11@").partners)).toEqual(["First Spouse"]);
  });

  it("does not check a spouse's sex against the role that names them", () => {
    // @I10@ is recorded female and sits in the role GEDCOM names for a husband.
    expect(person("@I10@").sex).toBe("F");
    expect(names(person("@I11@").partners)).toEqual(["First Spouse"]);
  });

  it("reads no relative from a role that is neither spouse nor child", () => {
    // @F2@ names @I7@ as an associate. That is not a child of the family.
    const marie = person("@I1@");

    expect(marie.children.map((one) => one.xref)).not.toContain("@I7@");
    expect(marie.partners.map((one) => one.xref)).not.toContain("@I7@");
  });

  it("reports a shared parent once, however many families connect them", () => {
    const text = [
      "0 HEAD", "1 GEDC", "2 VERS 7.0",
      "0 @I1@ INDI", "1 NAME Child /One/", "1 FAMC @F1@", "1 FAMC @F2@",
      "0 @I2@ INDI", "1 NAME Shared /Parent/",
      "0 @I3@ INDI", "1 NAME Other /Parent/",
      "0 @F1@ FAM", "1 HUSB @I2@", "1 WIFE @I3@", "1 CHIL @I1@",
      "0 @F2@ FAM", "1 HUSB @I2@", "1 CHIL @I1@",
      "0 TRLR", "",
    ].join("\n");

    expect(names(person("@I1@", index(text)).parents)).toEqual([
      "Shared Parent",
      "Other Parent",
    ]);
  });

  it("reports a person with no family as having none", () => {
    const alone = person("@I7@");

    expect(alone.parents).toEqual([]);
    expect(alone.partners).toEqual([]);
    expect(alone.children).toEqual([]);
  });
});

describe("a pointer that leads nowhere", () => {
  it("reports an unresolved child, and resolves its siblings", () => {
    const marie = person("@I1@");

    expect(names(marie.children)).toEqual(["Irène Joliot-Curie", "Ève Curie"]);
    expect(marie.unresolved).toContain("@I99@");
  });

  it("reads a person whose family is not declared, without parents", () => {
    const lost = person("@I8@");

    expect(lost.parents).toEqual([]);
    expect(lost.unresolved).toContain("@F99@");
  });
});

describe("the events a record carries", () => {
  it("reports them in the order the record writes them", () => {
    expect(person("@I1@").events.map((event) => event.tag)).toEqual([
      "BIRT",
      "OCCU",
      "CENS",
      "DEAT",
    ]);
  });

  it("carries a date and a place where the event has them", () => {
    const birth = person("@I1@").events[0];

    expect(birth?.date?.text).toBe("7 NOV 1867");
    expect(birth?.date?.year).toBe(1867);
    expect(birth?.place).toBe("Warsaw, Congress Poland");
  });

  it("carries the event's own payload where it has one", () => {
    const occupation = person("@I1@").events[1];

    expect(occupation?.tag).toBe("OCCU");
    expect(occupation?.value).toBe("Physicist and chemist");
  });

  it("reports an event the record states and says nothing more about", () => {
    const bare = person("@I9@").events.find((event) => event.tag === "DEAT");

    expect(bare).toBeDefined();
    expect(bare?.date).toBeUndefined();
    expect(bare?.place).toBeUndefined();
  });

  it("reports a census, which a list of seven common tags would have dropped", () => {
    expect(person("@I1@").events.map((event) => event.tag)).toContain("CENS");
  });

  it("reports a date it could not read a year from, as written", () => {
    const burial = person("@I9@").events.find((event) => event.tag === "BURI");

    expect(burial?.date?.text).toBe("@#DHEBREW@ 5628");
    expect(burial?.date?.year).toBeUndefined();
  });

  it("reports nothing that is not an event", () => {
    const tags = person("@I1@").events.map((event) => event.tag);

    for (const notAnEvent of ["NAME", "SEX", "FAMC", "FAMS", "SOUR"]) {
      expect(tags, notAnEvent).not.toContain(notAnEvent);
    }
  });
});

describe("what the sidebar filters on", () => {
  it("holds one lowercase string per person, covering every searchable field", () => {
    const marie = index().people.find((row) => row.xref === "@I1@");

    for (const term of [
      "marie", "skłodowska-curie", "maria salomea", "@i1@", "1867", "1934",
      "warsaw",
    ]) {
      expect(marie?.search, term).toContain(term);
    }
    expect(marie?.search).toBe(marie?.search.toLowerCase());
  });
});

describe("the model's independence from its host", () => {
  it("is built from document text alone", () => {
    expect(index().people.length).toBeGreaterThan(0);
  });

  it("names nothing in a reader's language", () => {
    for (const event of person("@I1@").events) {
      expect(event).not.toHaveProperty("label");
      expect(event.tag).toBe(event.tag.toUpperCase());
    }
  });
});

describe("reading paid for once per revision", () => {
  it("builds once while the revision holds, and again when it changes", () => {
    const read = vi.fn((text: string) =>
      new GedcomLanguageService(text).getDocumentSymbols(),
    );
    const cache = new (class {
      private held?: { revision: string; index: GenealogyIndex };
      at(revision: string, text: string): GenealogyIndex {
        if (this.held?.revision !== revision) {
          this.held = { revision, index: buildIndex(read(text)) };
        }
        return this.held.index;
      }
    })();

    cache.at("r1", FIXTURE);
    cache.at("r1", FIXTURE);
    expect(read).toHaveBeenCalledTimes(1);

    cache.at("r2", FIXTURE);
    expect(read).toHaveBeenCalledTimes(2);
  });
});

describe("the pictures a record points at", () => {
  it("reads a picture through the multimedia record it points at", () => {
    const pictured = person("@I12@");

    expect(pictured.media[0]?.file).toBe("Media/family.svg");
    expect(pictured.portrait?.file).toBe("Media/family.svg");
  });

  it("carries the rectangle the record names within that picture", () => {
    expect(person("@I12@").portrait?.crop).toEqual({
      top: 10,
      left: 20,
      height: 30,
      width: 40,
    });
  });

  it("carries the caption the record gives it", () => {
    expect(person("@I12@").portrait?.title).toBe("Second from the left");
  });

  it("reads a picture the record names on the spot", () => {
    expect(person("@I13@").portrait?.file).toBe("Media/inline.jpg");
  });

  it("reports what is not an image, and does not make it the portrait", () => {
    const files = person("@I12@").media.map((one) => one.file);

    expect(files).toContain("Media/interview.mp3");
    expect(person("@I12@").portrait?.file).not.toBe("Media/interview.mp3");
  });

  it("takes the first image, not the first picture of any kind", () => {
    // @I15@ points at the sound recording first and the image second.
    const sounded = person("@I15@");

    expect(sounded.media[0]?.file).toBe("Media/interview.mp3");
    expect(sounded.portrait?.file).toBe("Media/portrait.png");
  });

  it("refuses a rectangle the record states only part of", () => {
    // A rectangle missing a side is not a rectangle, and the whole picture is
    // a better answer than a guessed one.
    expect(person("@I16@").portrait?.crop).toBeUndefined();
    expect(person("@I16@").portrait?.file).toBe("Media/portrait.png");
  });

  it("reports an unresolved multimedia pointer without losing the rest", () => {
    const pictured = person("@I12@");

    expect(pictured.unresolved).toContain("@O9@");
    expect(pictured.media).toHaveLength(2);
  });

  it("has no portrait for a person whose record names no picture", () => {
    expect(person("@I1@").portrait).toBeUndefined();
    expect(person("@I1@").media).toEqual([]);
  });

  it("reports a remote picture as the document wrote it, fetching nothing", () => {
    expect(person("@I14@").portrait?.file).toBe(
      "https://example.org/portrait.jpg",
    );
  });

  it("reads nothing about what is on disk", () => {
    // The model names a file. Whether it exists, its size and its pixels are
    // all the host's business.
    expect(person("@I12@").portrait).not.toHaveProperty("width");
    expect(person("@I12@").portrait).not.toHaveProperty("exists");
  });
});
