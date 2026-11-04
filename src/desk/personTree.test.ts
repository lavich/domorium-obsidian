import { GedcomLanguageService } from "@domorium/language-service";
import { describe, expect, it } from "vitest";

import { buildIndex, type GenealogyIndex } from "../genealogy";
import { curieIndex } from "../testing/curie";
import { CARD, layoutGraph, marriageDigits, type FileGraphLayout } from "./fileGraph";
import { treeOf, type PersonTree, type TreeCard } from "./personTree";

const curie = curieIndex();

interface Drawn {
  tree: PersonTree;
  layout: FileGraphLayout;
}

function tree(focus: string, index: GenealogyIndex = curie, expanded: string[] = []): Drawn {
  const made = treeOf(index, focus, new Set(expanded));
  if (!made) {
    throw new Error(`no tree for ${focus}`);
  }
  return { tree: made, layout: layoutGraph(made.input) };
}

const rowOf = ({ layout, tree: made }: Drawn, row: number): string[] =>
  layout.cards
    .filter((one) => made.cards.get(one.id)?.row === row)
    .sort((a, b) => a.x - b.x)
    .map((one) => made.cards.get(one.id)?.label ?? "");

const byLabel = ({ tree: made }: Drawn, label: string): TreeCard | undefined =>
  [...made.cards.values()].find((one) => one.label === label);

const xOf = (drawn: Drawn, label: string): number => drawn.layout.card.get(byLabel(drawn, label)?.id ?? "")?.x ?? NaN;

function overlaps({ layout }: Drawn): string[] {
  const found: string[] = [];
  for (const one of layout.cards) {
    for (const other of layout.cards) {
      if (one.id < other.id && one.y === other.y && Math.abs(one.x - other.x) < CARD.width) {
        found.push(`${one.id}/${other.id}`);
      }
    }
  }
  return found;
}

function cousins(): GenealogyIndex {
  return index([
    "0 @I1@ INDI", "1 NAME Grand /G/", "1 FAMS @F1@",
    "0 @I2@ INDI", "1 NAME Son /G/", "1 FAMC @F1@", "1 FAMS @F2@",
    "0 @I3@ INDI", "1 NAME Daughter /G/", "1 FAMC @F1@", "1 FAMS @F3@",
    "0 @I4@ INDI", "1 NAME Cousin /G/", "1 FAMC @F2@", "1 FAMS @F4@",
    "0 @I5@ INDI", "1 NAME Other /H/", "1 FAMC @F3@", "1 FAMS @F4@",
    "0 @F1@ FAM", "1 HUSB @I1@", "1 CHIL @I2@", "1 CHIL @I3@",
    "0 @F2@ FAM", "1 HUSB @I2@", "1 CHIL @I4@",
    "0 @F3@ FAM", "1 WIFE @I3@", "1 CHIL @I5@",
    "0 @F4@ FAM", "1 HUSB @I4@", "1 WIFE @I5@",
  ]);
}

function index(lines: string[]): GenealogyIndex {
  return buildIndex(new GedcomLanguageService(["0 HEAD", "1 GEDC", "2 VERS 7.0", ...lines, "0 TRLR", ""].join("\n")));
}

describe("Marie's tree", () => {
  const marie = tree("@I1@");

  it("puts Pierre's parents and hers above, Pierre and Jacques on her left and her siblings' box on her right", () => {
    expect(rowOf(marie, -1)).toEqual([
      "Eugène Curie", "Sophie-Claire Depouilly", "Władysław Skłodowski", "Bronisława Boguska",
    ]);
    expect(rowOf(marie, 0)).toEqual(["Jacques Curie", "Pierre Curie", "Marie Skłodowska-Curie", "4 siblings"]);
  });

  it("puts her children with their husbands, and her grandchildren, below", () => {
    expect(rowOf(marie, 1)).toEqual([
      "Frédéric Joliot", "Irène Joliot-Curie", "Henry Richardson Labouisse", "Ève Curie",
    ]);
    expect(rowOf(marie, 2)).toEqual(["Hélène Langevin-Joliot", "Pierre Joliot"]);
  });

  it("overlaps no two cards", () => {
    expect(overlaps(marie)).toEqual([]);
  });

  it("joins each couple by a node with the year of their marriage, which opens their family", () => {
    const curies = [...marie.tree.families.values()].find((one) => one.xref === "@F3@");
    const node = marie.layout.node.get(curies?.id ?? "");

    expect(node?.kind).toBe("pair");
    expect(marriageDigits(node?.year ?? 0)).toBe("’95");
    expect(curies?.couple).toBe("Pierre Curie and Marie Skłodowska-Curie");
    expect(curies?.date).toBe("26 JUL 1895");
    expect(curies?.childCount).toBe(2);
    const toIrene = marie.layout.lines.find((line) => line.child === byLabel(marie, "Irène Joliot-Curie")?.id);
    expect(toIrene?.points[0]).toEqual([node?.x, node?.y]);
    expect(marie.layout.node.get([...marie.tree.families.values()].find((one) => one.xref === "@F2@")?.id ?? "")?.year).toBeNull();
  });

  it("marks who rests on no source, the focus, and the siblings", () => {
    expect(byLabel(marie, "Marie Skłodowska-Curie")).toMatchObject({ focus: true, gap: false, sex: "F" });
    expect(byLabel(marie, "Ève Curie")?.gap).toBe(true);
    expect(byLabel(marie, "4 siblings")).toMatchObject({ dim: true, expands: "@I1@", sex: "U" });
    expect(byLabel(marie, "Pierre Curie")?.sex).toBe("M");
  });

  it("shows the siblings one by one when asked", () => {
    const open = tree("@I1@", curie, ["@I1@"]);

    expect(rowOf(open, 0).slice(-4).sort()).toEqual([
      "Bronisława Dłuska", "Helena Szalay", "Józef Skłodowski", "Zofia Skłodowska",
    ]);
    expect(overlaps(open)).toEqual([]);
  });
});

describe("relatives beyond the edge", () => {
  it("marks a grandchild whose own children the tree does not reach", () => {
    const drawn = tree("@I1@", index([
      "0 @I1@ INDI", "1 NAME Anna /A/", "1 FAMS @F1@",
      "0 @I2@ INDI", "1 NAME Bert /A/", "1 FAMC @F1@", "1 FAMS @F2@",
      "0 @I3@ INDI", "1 NAME Carl /A/", "1 FAMC @F2@", "1 FAMS @F3@",
      "0 @I4@ INDI", "1 NAME Dora /A/", "1 FAMC @F3@",
      "0 @F1@ FAM", "1 WIFE @I1@", "1 CHIL @I2@",
      "0 @F2@ FAM", "1 HUSB @I2@", "1 CHIL @I3@",
      "0 @F3@ FAM", "1 HUSB @I3@", "1 CHIL @I4@",
    ]));

    expect(byLabel(drawn, "Carl A")?.down).toBe(true);
    expect(byLabel(drawn, "Bert A")?.down).toBe(false);
  });

  it("keeps every card of a person who stands twice", () => {
    const drawn = tree("@I5@", cousins());

    expect(drawn.tree.copies.get("@I1@")).toHaveLength(2);
  });

  it("marks a grandparent's parents above, and a grandchild's children below", () => {
    const helene = tree("@I16@");

    expect(byLabel(helene, "Władysław Skłodowski")).toBeUndefined();
    expect(byLabel(helene, "Marie Skłodowska-Curie")?.up).toBe(true);
    expect(byLabel(tree("@I2@"), "Hélène Langevin-Joliot")?.down).toBe(false);
  });
});

describe("families the demo vault does not have", () => {
  it("spans a run of siblings across the start of the era", () => {
    const drawn = tree("@I1@", index([
      "0 @I1@ INDI", "1 NAME Anna /A/", "1 FAMC @F1@",
      "0 @I2@ INDI", "1 NAME Bert /A/", "1 BIRT", "2 DATE 10 BCE", "1 FAMC @F1@",
      "0 @I3@ INDI", "1 NAME Carl /A/", "1 BIRT", "2 DATE 5", "1 FAMC @F1@",
      "0 @F1@ FAM", "1 CHIL @I1@", "1 CHIL @I2@", "1 CHIL @I3@",
    ]));

    expect(byLabel(drawn, "2 siblings")?.years).toBe("10 BCE–5");
  });

  it("puts a first spouse on the left and a second on the right, each marriage's children beneath it", () => {
    const drawn = tree("@I1@", index([
      "0 @I1@ INDI", "1 NAME Anna /A/", "1 SEX F", "1 FAMS @F1@", "1 FAMS @F2@",
      "0 @I2@ INDI", "1 NAME Bert /B/", "1 SEX M", "0 @I3@ INDI", "1 NAME Carl /C/", "1 SEX M",
      "0 @I4@ INDI", "1 NAME Dora /B/", "0 @I5@ INDI", "1 NAME Emil /C/",
      "0 @F1@ FAM", "1 HUSB @I2@", "1 WIFE @I1@", "1 CHIL @I4@",
      "0 @F2@ FAM", "1 HUSB @I3@", "1 WIFE @I1@", "1 CHIL @I5@",
    ]));

    expect(rowOf(drawn, 0)).toEqual(["Bert B", "Anna A", "Carl C"]);
    expect(xOf(drawn, "Dora B")).toBeLessThan(xOf(drawn, "Emil C"));
    expect(overlaps(drawn)).toEqual([]);
  });

  it("keeps a family of twelve children with eight grandchildren each from overlapping", () => {
    const lines = ["0 @I1@ INDI", "1 NAME Root /R/", "1 FAMS @F1@", "0 @F1@ FAM", "1 WIFE @I1@"];
    const families: string[] = [];
    let next = 2;
    for (let child = 0; child < 12; child += 1) {
      const xref = next++;
      lines.push(`1 CHIL @I${xref}@`);
      families.push(`0 @I${xref}@ INDI`, `1 NAME Child${child} /R/`, `1 FAMS @F${xref}@`);
      const kids: string[] = [`0 @F${xref}@ FAM`, `1 HUSB @I${xref}@`];
      for (let grandchild = 0; grandchild < 8; grandchild += 1) {
        const gx = next++;
        families.push(`0 @I${gx}@ INDI`, `1 NAME G${child}x${grandchild} /R/`);
        kids.push(`1 CHIL @I${gx}@`);
      }
      families.push(...kids);
    }
    const drawn = tree("@I1@", index([...lines, ...families]));

    expect(rowOf(drawn, 2)).toHaveLength(96);
    expect(overlaps(drawn)).toEqual([]);
  });

  it("draws a cousin marriage without losing either line", () => {
    const drawn = tree("@I5@", index([
      "0 @I1@ INDI", "1 NAME Grand /G/", "1 FAMS @F1@",
      "0 @I2@ INDI", "1 NAME Son /G/", "1 FAMC @F1@", "1 FAMS @F2@",
      "0 @I3@ INDI", "1 NAME Daughter /G/", "1 FAMC @F1@", "1 FAMS @F3@",
      "0 @I4@ INDI", "1 NAME Cousin /G/", "1 FAMC @F2@", "1 FAMS @F4@",
      "0 @I5@ INDI", "1 NAME Other /H/", "1 FAMC @F3@", "1 FAMS @F4@",
      "0 @F1@ FAM", "1 HUSB @I1@", "1 CHIL @I2@", "1 CHIL @I3@",
      "0 @F2@ FAM", "1 HUSB @I2@", "1 CHIL @I4@",
      "0 @F3@ FAM", "1 WIFE @I3@", "1 CHIL @I5@",
      "0 @F4@ FAM", "1 HUSB @I4@", "1 WIFE @I5@",
    ]));

    expect([...drawn.tree.cards.values()].filter((one) => one.label === "Grand G")).toHaveLength(2);
    expect(drawn.layout.lines.filter((line) => drawn.tree.cards.get(line.child)?.label === "Daughter G")).toHaveLength(1);
    expect(drawn.layout.lines.filter((line) => drawn.tree.cards.get(line.child)?.label === "Son G")).toHaveLength(1);
    expect(overlaps(drawn)).toEqual([]);
  });
});
