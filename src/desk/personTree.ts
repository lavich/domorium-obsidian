import type { GenealogyIndex, Person, PersonRow } from "../genealogy";
import { plural } from "../i18n";
import type { GraphInput, GraphInputFamily } from "./fileGraph";
import type { Sex } from "./fileTimeline";
import { familyTitle, personName, yearsOf, yearText } from "./labels";

export interface TreeCard {
  id: string;
  /** The person it stands for; absent for a run of siblings. */
  xref?: string;
  label: string;
  years: string;
  sex: Sex;
  /** −2 for grandparents to 2 for grandchildren. */
  row: number;
  focus: boolean;
  /** A sibling, or a run of them, beside the line the tree follows. */
  dim: boolean;
  /** Cites no source anywhere in the record. */
  gap: boolean;
  /** Has parents, or children, the tree does not reach. */
  up: boolean;
  down: boolean;
  /** For a run of siblings: whose siblings, to show them one by one. */
  expands?: string;
  portrait: boolean;
  /** What a search reads: the names of the person, or of every one of a run of siblings. */
  search: string;
  given?: string;
  surname?: string;
}

export interface TreeFamily extends GraphInputFamily {
  /** The family record a node opens. */
  xref?: string;
  couple: string;
  date?: string;
  place?: string;
  childCount: number;
}

export interface PersonTree {
  input: GraphInput;
  cards: ReadonlyMap<string, TreeCard>;
  /** Every card a person stands on, where one person stands more than once. */
  copies: ReadonlyMap<string, string[]>;
  families: ReadonlyMap<string, TreeFamily>;
  focus: string;
}

const sexOf = (row: PersonRow): Sex => (row.sex === "M" || row.sex === "F" ? row.sex : "U");

/**
 * Two generations up from the person in focus and two down: their parents and
 * grandparents, the first spouse's parents, spouses and siblings, the first
 * spouse's siblings, children with their spouses, and grandchildren. A run of
 * more than one sibling is one card unless `expanded` names whose they are.
 */
export function treeOf(
  index: GenealogyIndex,
  focusXref: string,
  expanded: ReadonlySet<string> = new Set(),
): PersonTree | null {
  const focus = index.person(focusXref);
  if (!focus?.xref) {
    return null;
  }
  const cards = new Map<string, TreeCard>();
  const families = new Map<string, TreeFamily>();
  const order = new Map<number, string[]>();
  const shown = new Set<string>();
  let serial = 0;

  const card = (row: PersonRow, gen: number, extra: Partial<TreeCard> = {}): TreeCard => {
    const made: TreeCard = {
      id: `t${serial++}`,
      ...(row.xref ? { xref: row.xref } : {}),
      label: personName(row),
      years: yearsOf(row),
      sex: sexOf(row),
      row: gen,
      focus: false,
      dim: false,
      gap: row.xref ? index.citesBy(row.xref).length === 0 : false,
      up: false,
      down: false,
      portrait: row.xref ? index.person(row.xref)?.portrait !== undefined : false,
      search: [personName(row), ...row.otherNames].join(" ").toLowerCase(),
      ...(row.given && row.surname ? { given: row.given, surname: row.surname } : {}),
      ...extra,
    };
    cards.set(made.id, made);
    order.set(gen, [...(order.get(gen) ?? []), made.id]);
    if (row.xref) {
      shown.add(row.xref);
    }
    return made;
  };
  const read = (row: PersonRow | undefined): Person | undefined => (row?.xref ? index.person(row.xref) : undefined);

  /** Husband first, as the record names them, so that a tie in sex is settled by role. */
  const byRole = (xref: string | undefined, members: TreeCard[]): TreeCard[] => {
    const record = xref ? index.family(xref) : undefined;
    const rank = (one: TreeCard): number => {
      const role = record?.spouses.find((spouse) => spouse.xref === one.xref)?.role;
      return role === "HUSB" ? 0 : role === "WIFE" ? 2 : 1;
    };
    return [...members].sort((a, b) => rank(a) - rank(b));
  };
  const family = (xref: string | undefined, spouses: TreeCard[], children: TreeCard[]): void => {
    const record = xref ? index.family(xref) : undefined;
    const marriage = record?.marriage;
    const id = `f${families.size}`;
    families.set(id, {
      id,
      ...(xref ? { xref } : {}),
      spouses: byRole(xref, spouses).map((one) => one.id),
      children: children.map((one) => one.id),
      year: marriage?.year ?? null,
      couple: familyTitle(record?.spouses.map((spouse) => spouse.name) ?? spouses.map((one) => one.label)),
      ...(marriage?.text ? { date: marriage.text } : {}),
      ...(record?.place ? { place: record.place } : {}),
      childCount: record?.childCount ?? children.length,
    });
  };

  const siblingsOf = (person: Person | undefined): TreeCard[] => {
    if (!person?.xref || person.siblings.length === 0) {
      return [];
    }
    if (person.siblings.length === 1 || expanded.has(person.xref)) {
      return person.siblings.map((row) => card(row, 0, { dim: true }));
    }
    const years = person.siblings
      .map((row) => row.birth?.year)
      .filter((year): year is number => year !== undefined);
    let from = Infinity;
    let to = -Infinity;
    for (const year of years) {
      from = Math.min(from, year);
      to = Math.max(to, year);
    }
    return [
      card({ name: "", otherNames: [], unaddressable: true, search: "" }, 0, {
        label: plural("tree.siblings", person.siblings.length),
        years: years.length > 0 ? `${yearText(from)}–${yearText(to)}` : "",
        dim: true,
        gap: person.siblings.some((row) => !row.xref || index.citesBy(row.xref).length === 0),
        expands: person.xref,
        search: person.siblings
          .map((row) => [personName(row), ...row.otherNames].join(" "))
          .join(" ")
          .toLowerCase(),
      }),
    ];
  };

  const spouses = focus.unions.map((union) => union.spouse);
  const firstAt = spouses.findIndex((row) => row !== undefined);
  const firstSpouse = read(spouses[firstAt]);
  const ownSiblings = siblingsOf(focus);
  const focusCard = card(focus, 0, { focus: true });
  const spouseCards = spouses.map((row) => (row ? card(row, 0) : undefined));
  const realSpouses = spouseCards.filter((one): one is TreeCard => one !== undefined);
  const spouseSiblings = siblingsOf(firstSpouse);
  const firstSpouseCard = realSpouses[0];

  const parentsOf = (person: Person | undefined, children: TreeCard[], gen: number): TreeCard[] => {
    if (!person || person.parents.length === 0) {
      return [];
    }
    const parents = person.parents.map((row) => card(row, gen));
    family(person.childFamilies[0]?.xref, parents, children);
    return parents;
  };
  const ownParents = parentsOf(focus, [focusCard, ...ownSiblings], -1);
  const spouseParents =
    firstSpouse && firstSpouseCard ? parentsOf(firstSpouse, [firstSpouseCard, ...spouseSiblings], -1) : [];
  const husbandOfFocus = (): boolean => {
    const spouse = firstSpouseCard;
    if (!spouse) {
      return false;
    }
    if (spouse.sex !== focusCard.sex && (spouse.sex === "M" || focusCard.sex === "F")) {
      return true;
    }
    if (spouse.sex !== focusCard.sex && (spouse.sex === "F" || focusCard.sex === "M")) {
      return false;
    }
    const union = focus.unions[firstAt];
    const record = union?.family.xref ? index.family(union.family.xref) : undefined;
    return record?.spouses.find((one) => one.xref === spouse.xref)?.role === "HUSB";
  };
  const spouseLeft = realSpouses.length >= 2 || husbandOfFocus();
  const above = spouseLeft ? [...spouseParents, ...ownParents] : [...ownParents, ...spouseParents];
  for (const parent of above) {
    parentsOf(parent.xref ? index.person(parent.xref) : undefined, [parent], -2);
  }

  focus.unions.forEach((union, at) => {
    const spouse = spouseCards[at];
    const children = union.children.map((row) => {
      const person = read(row);
      const child = card(row, 1);
      const married = person?.unions[0];
      const partner = married?.spouse ? card(married.spouse, 1) : undefined;
      const grandchildren = (married?.children ?? []).map((one) => card(one, 2));
      if (married && (partner || grandchildren.length > 0)) {
        family(married.family.xref, [child, ...(partner ? [partner] : [])], grandchildren);
      }
      return child;
    });
    family(union.family.xref, [focusCard, ...(spouse ? [spouse] : [])], children);
  });

  for (const one of cards.values()) {
    const person = one.xref ? index.person(one.xref) : undefined;
    if (!person) {
      continue;
    }
    one.up = person.parents.length > 0 && !person.parents.some((row) => row.xref && shown.has(row.xref));
    one.down = person.children.length > 0 && !person.children.some((row) => row.xref && shown.has(row.xref));
  }

  const rowOrder = (gen: number): string[] => order.get(gen) ?? [];
  const ids = (list: (TreeCard | undefined)[]): string[] =>
    list.filter((one): one is TreeCard => one !== undefined).map((one) => one.id);
  const [first, ...later] = realSpouses;
  const row0 = spouseLeft
    ? [...ids(spouseSiblings), ...ids([first]), focusCard.id, ...ids(later), ...ids(ownSiblings)]
    : [...ids(ownSiblings), focusCard.id, ...ids(realSpouses), ...ids(spouseSiblings)];
  const all = [...rowOrder(-2), ...ids(above), ...row0, ...rowOrder(1), ...rowOrder(2)];
  return {
    input: {
      cards: all.map((id) => {
        const one = cards.get(id);
        return { id, row: one?.row ?? 0, sex: one?.sex ?? "U", portrait: one?.portrait ?? false };
      }),
      families: [...families.values()],
      focus: focusCard.id,
    },
    cards,
    copies: copiesOf(cards),
    families,
    focus: focusCard.id,
  };
}

function copiesOf(cards: ReadonlyMap<string, TreeCard>): Map<string, string[]> {
  const found = new Map<string, string[]>();
  for (const one of cards.values()) {
    if (one.xref) {
      found.set(one.xref, [...(found.get(one.xref) ?? []), one.id]);
    }
  }
  return found;
}
