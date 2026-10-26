import type { GenealogyIndex, Person, PersonRow } from "../genealogy";
import { plural } from "../i18n";
import { personName, yearsOf, yearText } from "./labels";

export const BOX = { width: 172, height: 48, gap: 18, couple: 12, rowGap: 56 } as const;

export interface TreeBox {
  id: string;
  /** The person it stands for; absent for a collapsed run of siblings. */
  xref?: string;
  label: string;
  years: string;
  gen: number;
  x: number;
  y: number;
  focus: boolean;
  /** A sibling, or a run of them, beside the line the tree follows. */
  dim: boolean;
  /** Cites no source anywhere in the record. */
  gap: boolean;
  /** Has parents, or children, the tree does not reach. */
  up: boolean;
  down: boolean;
  /** For a collapsed run of siblings: whose siblings, to expand them. */
  expands?: string;
}

/** From a couple, or a single parent, down to one child. */
export interface TreeLink {
  from: string[];
  to: string;
}

export interface TreeLayout {
  boxes: TreeBox[];
  links: TreeLink[];
  couples: [string, string][];
  width: number;
  height: number;
  focus: string;
}

interface Group {
  boxes: TreeBox[];
  center: number;
}

const widthOf = (count: number): number => count * BOX.width + Math.max(0, count - 1) * BOX.couple;

/** Each group at its preferred centre, pushed right only as far as the one before needs. */
function place(groups: Group[]): void {
  let end = Number.NEGATIVE_INFINITY;
  for (const group of groups) {
    const left = Math.max(group.center - widthOf(group.boxes.length) / 2, end + BOX.gap);
    group.boxes.forEach((box, at) => {
      box.x = left + at * (BOX.width + BOX.couple);
    });
    end = left + widthOf(group.boxes.length);
  }
}

const centreOf = (boxes: TreeBox[]): number => {
  const first = boxes[0];
  const last = boxes[boxes.length - 1];
  return first && last ? (first.x + last.x + BOX.width) / 2 : 0;
};

/**
 * Two generations up from the person in focus and two down, their siblings
 * collapsed unless `expanded` names them, laid out in rows.
 */
export function layoutTree(
  index: GenealogyIndex,
  focusXref: string,
  expanded: ReadonlySet<string> = new Set(),
): TreeLayout | null {
  const focus = index.person(focusXref);
  if (!focus) {
    return null;
  }
  const boxes: TreeBox[] = [];
  const links: TreeLink[] = [];
  const couples: [string, string][] = [];
  const shown = new Set<string>();
  let serial = 0;

  const box = (row: PersonRow, gen: number, extra: Partial<TreeBox> = {}): TreeBox => {
    const made: TreeBox = {
      id: `b${serial++}`,
      ...(row.xref ? { xref: row.xref } : {}),
      label: personName(row),
      years: yearsOf(row),
      gen,
      x: 0,
      y: 0,
      focus: false,
      dim: false,
      gap: row.xref ? index.citesBy(row.xref).length === 0 : false,
      up: false,
      down: false,
      ...extra,
    };
    boxes.push(made);
    if (row.xref) {
      shown.add(row.xref);
    }
    return made;
  };
  const read = (row: PersonRow | undefined): Person | undefined =>
    row?.xref ? index.person(row.xref) : undefined;
  const pair = (one: TreeBox, other: TreeBox | undefined): void => {
    if (other) {
      couples.push([one.id, other.id]);
    }
  };

  const siblingsOf = (person: Person | undefined): TreeBox[] => {
    if (!person?.xref || person.siblings.length === 0) {
      return [];
    }
    if (person.siblings.length === 1 || expanded.has(person.xref)) {
      return person.siblings.map((row) => box(row, 0, { dim: true }));
    }
    const years = person.siblings
      .map((row) => row.birth?.year)
      .filter((year): year is number => year !== undefined);
    const run = box({ name: "", otherNames: [], unaddressable: true, search: "" }, 0, {
      label: plural("tree.siblings", person.siblings.length),
      years: years.length > 0 ? `${yearText(Math.min(...years))}–${yearText(Math.max(...years))}` : "",
      dim: true,
      gap: person.siblings.some((row) => !row.xref || index.citesBy(row.xref).length === 0),
      expands: person.xref,
    });
    return [run];
  };

  const spouses = focus.unions.map((union) => union.spouse);
  const firstSpouse = read(spouses[0]);
  const ownSiblings = siblingsOf(focus);
  const focusBox = box(focus, 0, { focus: true });
  const spouseBoxes = spouses.map((row) => (row ? box(row, 0) : undefined));
  const couple: TreeBox[] =
    spouseBoxes.length >= 2 && spouseBoxes[0]
      ? [spouseBoxes[0], focusBox, ...spouseBoxes.slice(1).filter((one): one is TreeBox => Boolean(one))]
      : [focusBox, ...spouseBoxes.filter((one): one is TreeBox => Boolean(one))];
  const spouseSiblings = siblingsOf(firstSpouse);
  place([
    ...(ownSiblings.length > 0 ? [{ boxes: ownSiblings, center: 0 }] : []),
    { boxes: couple, center: 0 },
    ...(spouseSiblings.length > 0 ? [{ boxes: spouseSiblings, center: 0 }] : []),
  ]);
  spouseBoxes.forEach((one) => {
    if (one) {
      pair(focusBox, one);
    }
  });

  const parentGroup = (person: Person | undefined, child: TreeBox, gen: number, under: TreeBox[]): Group | null => {
    if (!person || person.parents.length === 0) {
      return null;
    }
    const parents = person.parents.map((row) => box(row, gen));
    const [one, other] = parents;
    if (one) {
      pair(one, other);
    }
    for (const target of under) {
      links.push({ from: parents.map((parent) => parent.id), to: target.id });
    }
    return { boxes: parents, center: centreOf([child]) };
  };
  const firstSpouseBox = spouseBoxes[0];
  const up1 = [
    parentGroup(focus, focusBox, -1, [focusBox, ...ownSiblings]),
    firstSpouse && firstSpouseBox ? parentGroup(firstSpouse, firstSpouseBox, -1, [firstSpouseBox, ...spouseSiblings]) : null,
  ].filter((group): group is Group => group !== null);
  place(up1);
  const up2 = up1
    .flatMap((group) => group.boxes)
    .map((parent) => parentGroup(parent.xref ? index.person(parent.xref) : undefined, parent, -2, [parent]))
    .filter((group): group is Group => group !== null);
  place(up2);

  const down1: Group[] = [];
  const childUnits: { child: TreeBox; spouse?: TreeBox; person?: Person }[] = [];
  focus.unions.forEach((union, at) => {
    const parentsBoxes = [focusBox, spouseBoxes[at]].filter((one): one is TreeBox => Boolean(one));
    const units = union.children.map((row) => {
      const person = read(row);
      const child = box(row, 1);
      const spouseRow = person?.unions[0]?.spouse;
      const spouse = spouseRow ? box(spouseRow, 1) : undefined;
      pair(child, spouse);
      links.push({ from: parentsBoxes.map((one) => one.id), to: child.id });
      childUnits.push({ child, ...(spouse ? { spouse } : {}), ...(person ? { person } : {}) });
      return [child, ...(spouse ? [spouse] : [])];
    });
    const total = units.reduce((sum, unit) => sum + widthOf(unit.length) + BOX.gap, -BOX.gap);
    let left = centreOf(parentsBoxes) - total / 2;
    for (const unit of units) {
      down1.push({ boxes: unit, center: left + widthOf(unit.length) / 2 });
      left += widthOf(unit.length) + BOX.gap;
    }
  });
  place(down1);
  const down2: Group[] = [];
  for (const unit of childUnits) {
    const grandchildren = (unit.person?.unions[0]?.children ?? []).map((row) => box(row, 2));
    if (grandchildren.length === 0) {
      continue;
    }
    const parentsBoxes = [unit.child, unit.spouse].filter((one): one is TreeBox => Boolean(one));
    for (const grandchild of grandchildren) {
      links.push({ from: parentsBoxes.map((one) => one.id), to: grandchild.id });
    }
    down2.push({ boxes: grandchildren, center: centreOf(parentsBoxes) });
  }
  place(down2);

  for (const one of boxes) {
    const person = one.xref ? index.person(one.xref) : undefined;
    if (!person) {
      continue;
    }
    one.up = person.parents.length > 0 && !person.parents.some((row) => row.xref && shown.has(row.xref));
    one.down = person.children.length > 0 && !person.children.some((row) => row.xref && shown.has(row.xref));
  }

  const minX = Math.min(...boxes.map((one) => one.x));
  const minGen = Math.min(...boxes.map((one) => one.gen));
  for (const one of boxes) {
    one.x -= minX;
    one.y = (one.gen - minGen) * (BOX.height + BOX.rowGap);
  }
  const maxGen = Math.max(...boxes.map((one) => one.gen));
  return {
    boxes,
    links,
    couples,
    width: Math.max(...boxes.map((one) => one.x)) + BOX.width,
    height: (maxGen - minGen) * (BOX.height + BOX.rowGap) + BOX.height,
    focus: focusBox.id,
  };
}
