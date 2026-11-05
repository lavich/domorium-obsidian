import type { DateReading, GenealogyIndex, PersonEvent, PersonMedia, PersonRow } from "../genealogy";

export type MarkKind = "birth" | "marriage" | "death" | "other";

export type Sex = "M" | "F" | "U";

export interface TimelineMark {
  kind: MarkKind;
  event: PersonEvent;
  /** The earlier year, for a period stating both ends. */
  year: number;
  /** The later year of a period stating both ends. */
  until?: number;
  uncertain: boolean;
  period: boolean;
  sign?: string;
  /** Set for an event of a family the person is a spouse in. */
  family?: string;
}

export interface Lifeline {
  start: number;
  end: number;
  /** No death, burial or cremation is dated, so the line fades out at `end`. */
  open: boolean;
  startUncertain: boolean;
  endUncertain: boolean;
  /** Absent where the line begins at an event that is neither a birth nor a christening. */
  age?: { from: number; approximate: boolean };
}

export interface TimelinePerson {
  xref: string;
  row: PersonRow;
  sex: Sex;
  lifeline: Lifeline | null;
  marks: TimelineMark[];
  parents: string[];
  spouses: string[];
  children: string[];
  portrait?: PersonMedia;
}

export interface TimelineFamily {
  xref: string;
  spouses: string[];
  children: string[];
  marks: TimelineMark[];
  marriage?: TimelineMark;
}

export interface AliveAt {
  xref: string;
  age?: number;
  approximate: boolean;
}

export interface FileTimeline {
  people: ReadonlyMap<string, TimelinePerson>;
  families: ReadonlyMap<string, TimelineFamily>;
  generations: ReadonlyMap<string, number>;
  rows: readonly string[];
  branch(focus: string, up: number, down: number): Set<string>;
  alive(year: number, among?: ReadonlySet<string>): AliveAt[];
  related(xref: string): Set<string>;
}

/** Beyond this a lifeline with no end recorded stops fading and stops. */
export const OPEN_SPAN = 100;

export const BRANCH_STEPS = { min: 0, max: 9, initial: 2 } as const;

/** Past this many people the whole file stops being readable, and it opens on a branch. */
export const LARGE_FILE = 500;

const BIRTH_TAGS = new Set(["BIRT", "CHR", "BAPM"]);
const DEATH_TAGS = new Set(["DEAT", "BURI", "CREM"]);

const SIGNS: Record<string, string> = {
  EDUC: "✎",
  GRAD: "✎",
  RESI: "⌂",
  EMIG: "⇄",
  IMMI: "⇄",
  NATU: "⇄",
  OCCU: "⚒",
  RETI: "⚒",
  CENS: "≡",
  EVEN: "★",
  FACT: "★",
  PROB: "§",
  WILL: "§",
  ADOP: "+",
};

/** `Math.min` without spreading, which overflows the stack past some 100 000 values. */
export function least(values: Iterable<number>): number {
  let found = Infinity;
  for (const value of values) {
    if (value < found) {
      found = value;
    }
  }
  return found;
}

export function most(values: Iterable<number>): number {
  let found = -Infinity;
  for (const value of values) {
    if (value > found) {
      found = value;
    }
  }
  return found;
}

export function kindOf(tag: string): MarkKind {
  if (BIRTH_TAGS.has(tag)) {
    return "birth";
  }
  if (DEATH_TAGS.has(tag)) {
    return "death";
  }
  return tag === "MARR" ? "marriage" : "other";
}

/** `ABT`, `CAL`, `EST`, `BEF`, `AFT` and `BET`: a moment not known exactly. */
export function uncertain(date: DateReading | undefined): boolean {
  return date?.precision === "approximate" || (date?.precision === "range" && !date.period);
}

function markOf(event: PersonEvent, family?: string): TimelineMark | null {
  const date = event.date;
  if (date?.year === undefined) {
    return null;
  }
  const kind = kindOf(event.tag);
  const spans = date.period === true && date.end !== undefined;
  const first = spans ? Math.min(date.year, date.end ?? date.year) : date.year;
  return {
    kind,
    event,
    year: first,
    ...(spans ? { until: Math.max(date.year, date.end ?? date.year) } : {}),
    uncertain: uncertain(date),
    period: date.period === true,
    ...(kind === "other" ? { sign: SIGNS[event.tag] ?? "•" } : {}),
    ...(family === undefined ? {} : { family }),
  };
}

function sexOf(row: PersonRow): Sex {
  return row.sex === "M" || row.sex === "F" ? row.sex : "U";
}

function lifelineOf(own: TimelineMark[], all: TimelineMark[], now: number): Lifeline | null {
  const tagged = (...tags: string[]): TimelineMark | undefined =>
    own.find((mark) => tags.includes(mark.event.tag));
  const birth = tagged("BIRT") ?? tagged("CHR", "BAPM");
  const death = tagged("DEAT") ?? tagged("BURI", "CREM");
  const earliest = all.reduce<TimelineMark | undefined>(
    (found, mark) => (found === undefined || mark.year < found.year ? mark : found),
    undefined,
  );
  const begin = birth ?? earliest;
  if (!begin) {
    return null;
  }
  return {
    start: begin.year,
    end: death ? death.year : Math.min(now, begin.year + OPEN_SPAN),
    open: !death,
    startUncertain: begin.uncertain,
    endUncertain: death?.uncertain ?? false,
    ...(birth ? { age: { from: birth.year, approximate: birth.uncertain } } : {}),
  };
}

const xrefsOf = (rows: { xref?: string }[], known: ReadonlySet<string>): string[] => [
  ...new Set(rows.map((row) => row.xref).filter((xref): xref is string => xref !== undefined && known.has(xref))),
];

function generationsOf(
  order: string[],
  parents: Map<string, string[]>,
  couples: [string, string][],
): Map<string, number> {
  const generation = new Map<string, number>();
  const depth = (xref: string, seen: Set<string>): number => {
    const known = generation.get(xref);
    if (known !== undefined) {
      return known;
    }
    if (seen.has(xref)) {
      return 0;
    }
    seen.add(xref);
    const above = parents.get(xref) ?? [];
    const found = above.length > 0 ? most(above.map((parent) => depth(parent, seen))) + 1 : 0;
    generation.set(xref, found);
    return found;
  };
  for (const xref of order) {
    depth(xref, new Set());
  }
  const at = (xref: string): number => generation.get(xref) ?? 0;
  for (let pass = 0; pass < 3; pass += 1) {
    for (const [a, b] of couples) {
      const hasA = (parents.get(a) ?? []).length > 0;
      const hasB = (parents.get(b) ?? []).length > 0;
      if (!hasA && hasB) {
        generation.set(a, at(b));
      } else if (!hasB && hasA) {
        generation.set(b, at(a));
      } else {
        const lower = Math.max(at(a), at(b));
        generation.set(a, lower);
        generation.set(b, lower);
      }
    }
    // A spouse moved down takes their children with them, which the reading
    // above, made before any spouse moved, could not know.
    for (const xref of [...order].sort((one, other) => at(one) - at(other))) {
      const above = parents.get(xref) ?? [];
      if (above.length > 0) {
        generation.set(xref, Math.max(at(xref), most(above.map(at)) + 1));
      }
    }
  }
  return generation;
}

interface Ordering {
  order: string[];
  generation: Map<string, number>;
  parents: Map<string, string[]>;
  spouses: Map<string, string[]>;
  children: Map<string, string[]>;
  firstFamily: Map<string, string>;
  familyParents: Map<string, string[]>;
  yearOf: (xref: string) => number;
}

/**
 * Siblings stay together in the order their parents stand above, a spouse
 * who married in sits beside the one they married, and a sibling married into
 * the neighbouring family sits on the edge facing it.
 */
function rowsOf(o: Ordering): string[] {
  const groups: string[][] = [];
  for (const [xref, g] of o.generation) {
    (groups[g] ??= []).push(xref);
  }
  const spousesOf = (xref: string): string[] => o.spouses.get(xref) ?? [];
  const hasParents = (xref: string): boolean => (o.parents.get(xref) ?? []).length > 0;
  const marriedIn = (xref: string): boolean =>
    !hasParents(xref) && spousesOf(xref).some(hasParents);
  const childYears = (xref: string): number[] => (o.children.get(xref) ?? []).map(o.yearOf);

  const rows: string[] = [];
  const placed = new Map<string, number>();
  const place = (xref: string): void => {
    placed.set(xref, rows.length);
    rows.push(xref);
  };

  groups.forEach((list, g) => {
    const units = new Map<string, string[]>();
    for (const xref of list) {
      if (marriedIn(xref) && spousesOf(xref).some((spouse) => o.generation.get(spouse) === g)) {
        continue;
      }
      const family = o.firstFamily.get(xref);
      const key = family === undefined ? `self:${xref}` : `family:${family}`;
      const unit = units.get(key) ?? [];
      unit.push(xref);
      units.set(key, unit);
    }
    const rank = (key: string, members: string[]): number => {
      if (key.startsWith("self:")) {
        const [one = ""] = members;
        const spouses = spousesOf(one);
        const placedSpouse = spouses
          .map((spouse) => placed.get(spouse))
          .filter((at): at is number => at !== undefined);
        if (placedSpouse.length > 0) {
          return least(placedSpouse);
        }
        if (g !== 0) {
          return o.yearOf(one);
        }
        const years = [...childYears(one), ...spouses.flatMap(childYears)];
        return (years.length > 0 ? least(years) : o.yearOf(one)) - 10000;
      }
      const placedParents = (o.familyParents.get(key.slice("family:".length)) ?? [])
        .map((parent) => placed.get(parent))
        .filter((at): at is number => at !== undefined);
      return placedParents.length > 0 ? least(placedParents) : least(members.map(o.yearOf));
    };
    const ordered = [...units]
      .map(([key, members]) => ({ members, rank: rank(key, members) }))
      .sort((a, b) => a.rank - b.rank);
    const unitOf = new Map<string, number>();
    ordered.forEach((unit, at) => {
      for (const xref of unit.members) {
        unitOf.set(xref, at);
      }
    });
    ordered.forEach((unit, at) => {
      const inUnit = new Set(unit.members);
      const side = (xref: string): number => {
        const others = spousesOf(xref).map((spouse) => unitOf.get(spouse));
        if (others.some((other) => other !== undefined && other < at)) {
          return -1;
        }
        return others.some((other) => other !== undefined && other > at) ? 1 : 0;
      };
      const members = [...unit.members].sort(
        (a, b) => side(a) - side(b) || o.yearOf(a) - o.yearOf(b),
      );
      for (const xref of members) {
        place(xref);
        for (const spouse of spousesOf(xref)) {
          if (
            !inUnit.has(spouse) &&
            !placed.has(spouse) &&
            o.generation.get(spouse) === g &&
            marriedIn(spouse)
          ) {
            place(spouse);
          }
        }
      }
    });
    for (const xref of list) {
      if (!placed.has(xref)) {
        place(xref);
      }
    }
  });
  return rows;
}

function uniqueWalk(from: string[], step: (xref: string) => string[]): string[] {
  return [...new Set(from.flatMap(step))];
}

export function buildFileTimeline(index: GenealogyIndex, now: number): FileTimeline {
  const known = new Set(
    index.people.map((row) => row.xref).filter((xref): xref is string => xref !== undefined),
  );
  const families = new Map<string, TimelineFamily>();
  for (const row of index.families) {
    const family = row.xref ? index.family(row.xref) : undefined;
    if (!row.xref || !family) {
      continue;
    }
    const xref = row.xref;
    const marks = family.events
      .map((event) => markOf(event, xref))
      .filter((mark): mark is TimelineMark => mark !== null);
    const marriage = marks.find((mark) => mark.kind === "marriage");
    families.set(xref, {
      xref,
      spouses: xrefsOf(family.spouses, known),
      children: xrefsOf(family.children, known),
      marks,
      ...(marriage === undefined ? {} : { marriage }),
    });
  }

  const people = new Map<string, TimelinePerson>();
  const firstFamily = new Map<string, string>();
  for (const xref of known) {
    const person = index.person(xref);
    if (!person) {
      continue;
    }
    const own = person.events
      .map((event) => markOf(event))
      .filter((mark): mark is TimelineMark => mark !== null);
    const ofFamilies = person.spouseFamilies.flatMap((row) =>
      row.xref ? (families.get(row.xref)?.marks ?? []) : [],
    );
    const marks = [...own, ...ofFamilies];
    const childFamily = person.childFamilies.find((row) => row.xref && families.has(row.xref))?.xref;
    if (childFamily !== undefined) {
      firstFamily.set(xref, childFamily);
    }
    people.set(xref, {
      xref,
      row: person,
      sex: sexOf(person),
      lifeline: lifelineOf(own, marks, now),
      marks,
      parents: xrefsOf(person.parents, known),
      spouses: xrefsOf(person.partners, known),
      children: xrefsOf(person.children, known),
      ...(person.portrait === undefined ? {} : { portrait: person.portrait }),
    });
  }

  const order = [...people.keys()];
  const parents = new Map(order.map((xref) => [xref, people.get(xref)?.parents ?? []]));
  const spouses = new Map(order.map((xref) => [xref, people.get(xref)?.spouses ?? []]));
  const children = new Map(order.map((xref) => [xref, people.get(xref)?.children ?? []]));
  const couples: [string, string][] = [];
  for (const family of families.values()) {
    const [a, b] = family.spouses;
    if (a !== undefined && b !== undefined) {
      couples.push([a, b]);
    }
  }
  const generation = generationsOf(order, parents, couples);
  const yearOf = (xref: string): number => {
    const person = people.get(xref);
    const born = person?.lifeline?.age?.from;
    if (born !== undefined) {
      return born;
    }
    return person?.lifeline && !person.lifeline.open ? person.lifeline.end : 9999;
  };
  const rows = rowsOf({
    order,
    generation,
    parents,
    spouses,
    children,
    firstFamily,
    familyParents: new Map([...families].map(([xref, family]) => [xref, family.spouses])),
    yearOf,
  });

  return {
    people,
    families,
    generations: generation,
    rows,
    branch(focus, up, down) {
      const keep = new Set<string>();
      if (!people.has(focus)) {
        return keep;
      }
      keep.add(focus);
      let level = [focus];
      for (let step = 0; step < up; step += 1) {
        level = uniqueWalk(level, (xref) => parents.get(xref) ?? []);
        level.forEach((xref) => keep.add(xref));
      }
      level = [focus];
      for (let step = 0; step < down; step += 1) {
        level = uniqueWalk(level, (xref) => children.get(xref) ?? []);
        level.forEach((xref) => keep.add(xref));
      }
      for (const xref of [...keep]) {
        for (const spouse of spouses.get(xref) ?? []) {
          keep.add(spouse);
        }
      }
      return keep;
    },
    alive(year, among) {
      const found: AliveAt[] = [];
      for (const person of people.values()) {
        const line = person.lifeline;
        if (!line || (among && !among.has(person.xref)) || year < line.start || year > line.end) {
          continue;
        }
        found.push({
          xref: person.xref,
          ...(line.age ? { age: year - line.age.from } : {}),
          approximate: line.age?.approximate ?? false,
        });
      }
      return found;
    },
    related(xref) {
      const person = people.get(xref);
      return new Set([
        xref,
        ...(person?.parents ?? []),
        ...(person?.spouses ?? []),
        ...(person?.children ?? []),
      ]);
    },
  };
}

/**
 * The person a new timeline opens on: none for a file that can be read whole,
 * else `around` where it names a person, else the first person declared.
 */
export function initialFocus(index: GenealogyIndex, around: string | undefined): string | undefined {
  const people = index.people.filter((row) => row.xref !== undefined);
  if (people.length <= LARGE_FILE) {
    return undefined;
  }
  return around !== undefined && index.person(around) ? around : people[0]?.xref;
}

const held = new WeakMap<GenealogyIndex, FileTimeline>();

/** Built once per reading of the file: a hover or a scroll asks again, an edit makes a new index. */
export function fileTimelineOf(index: GenealogyIndex): FileTimeline {
  const found = held.get(index);
  if (found) {
    return found;
  }
  const built = buildFileTimeline(index, new Date().getFullYear());
  held.set(index, built);
  return built;
}
