import { GedcomLanguageService } from "@domorium/language-service";
import { describe, expect, it } from "vitest";

import { buildIndex, type GenealogyIndex } from "../genealogy";
import { curieIndex } from "../testing/curie";
import { BOX, layoutTree, type TreeBox, type TreeLayout } from "./treeLayout";

const curie = curieIndex();

function tree(focus: string, index: GenealogyIndex = curie, expanded: string[] = []): TreeLayout {
  const layout = layoutTree(index, focus, new Set(expanded));
  if (!layout) {
    throw new Error(`no tree for ${focus}`);
  }
  return layout;
}

const labelsIn = (layout: TreeLayout, gen: number): string[] =>
  layout.boxes.filter((box) => box.gen === gen).sort((a, b) => a.x - b.x).map((box) => box.label);

const byLabel = (layout: TreeLayout, label: string): TreeBox | undefined =>
  layout.boxes.find((box) => box.label === label);

function overlaps(layout: TreeLayout): [string, string][] {
  const found: [string, string][] = [];
  for (const one of layout.boxes) {
    for (const other of layout.boxes) {
      if (one.id < other.id && one.y === other.y && Math.abs(one.x - other.x) < BOX.width) {
        found.push([one.label, other.label]);
      }
    }
  }
  return found;
}

describe("Marie's tree", () => {
  const marie = tree("@I1@");

  it("puts her parents and her husband's parents above, her siblings collapsed beside her", () => {
    expect(labelsIn(marie, -1)).toEqual([
      "Władysław Skłodowski", "Bronisława Boguska", "Eugène Curie", "Sophie-Claire Depouilly",
    ]);
    expect(labelsIn(marie, 0)).toEqual([
      "4 siblings", "Marie Skłodowska-Curie", "Pierre Curie", "Jacques Curie",
    ]);
  });

  it("puts her children with their spouses, and her grandchildren, below", () => {
    expect(labelsIn(marie, 1)).toEqual([
      "Irène Joliot-Curie", "Frédéric Joliot", "Ève Curie", "Henry Richardson Labouisse",
    ]);
    expect(labelsIn(marie, 2)).toEqual(["Hélène Langevin-Joliot", "Pierre Joliot"]);
  });

  it("overlaps no two boxes", () => {
    expect(overlaps(marie)).toEqual([]);
  });

  it("links each child to both parents, and draws each couple", () => {
    const irene = byLabel(marie, "Irène Joliot-Curie");
    const link = marie.links.find((one) => one.to === irene?.id);

    expect(link?.from.map((id) => marie.boxes.find((box) => box.id === id)?.label)).toEqual([
      "Marie Skłodowska-Curie", "Pierre Curie",
    ]);
    expect(marie.couples.length).toBeGreaterThanOrEqual(4);
  });

  it("marks who rests on no source, and the focus", () => {
    expect(byLabel(marie, "Marie Skłodowska-Curie")?.focus).toBe(true);
    expect(byLabel(marie, "Marie Skłodowska-Curie")?.gap).toBe(false);
    expect(byLabel(marie, "Ève Curie")?.gap).toBe(true);
  });

  it("expands the siblings when asked", () => {
    expect(labelsIn(tree("@I1@", curie, ["@I1@"]), 0).slice(0, 4)).toEqual([
      "Zofia Skłodowska", "Józef Skłodowski", "Bronisława Dłuska", "Helena Szalay",
    ]);
  });
});

describe("relatives beyond the edge", () => {
  it("marks a grandparent's parents above, and a grandchild's children below", () => {
    const helene = tree("@I16@");

    expect(byLabel(helene, "Władysław Skłodowski")).toBeUndefined();
    expect(byLabel(helene, "Marie Skłodowska-Curie")?.up).toBe(true);
    expect(byLabel(tree("@I2@"), "Hélène Langevin-Joliot")?.down).toBe(false);
  });
});

describe("families the demo vault does not have", () => {
  function index(lines: string[]): GenealogyIndex {
    return buildIndex(new GedcomLanguageService(["0 HEAD", "1 GEDC", "2 VERS 7.0", ...lines, "0 TRLR", ""].join("\n")).getDocumentSymbols());
  }

  it("puts a second spouse on the other side, each with their own children", () => {
    const layout = tree("@I1@", index([
      "0 @I1@ INDI", "1 NAME Anna /A/", "1 FAMS @F1@", "1 FAMS @F2@",
      "0 @I2@ INDI", "1 NAME Bert /B/", "0 @I3@ INDI", "1 NAME Carl /C/",
      "0 @I4@ INDI", "1 NAME Dora /B/", "0 @I5@ INDI", "1 NAME Emil /C/",
      "0 @F1@ FAM", "1 HUSB @I2@", "1 WIFE @I1@", "1 CHIL @I4@",
      "0 @F2@ FAM", "1 HUSB @I3@", "1 WIFE @I1@", "1 CHIL @I5@",
    ]));

    expect(labelsIn(layout, 0)).toEqual(["Bert B", "Anna A", "Carl C"]);
    const dora = byLabel(layout, "Dora B");
    const emil = byLabel(layout, "Emil C");
    expect((dora?.x ?? 0) < (emil?.x ?? 0)).toBe(true);
    expect(overlaps(layout)).toEqual([]);
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
    const layout = tree("@I1@", index([...lines, ...families]));

    expect(layout.boxes.filter((box) => box.gen === 2)).toHaveLength(96);
    expect(overlaps(layout)).toEqual([]);
  });

  it("draws a cousin marriage without losing either line", () => {
    const layout = tree("@I5@", index([
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

    expect(layout.boxes.filter((box) => box.label === "Grand G")).toHaveLength(2);
    expect(overlaps(layout)).toEqual([]);
  });
});
