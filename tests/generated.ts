interface Person {
  id: string;
  sex: "M" | "F";
  born: number;
  famc?: string;
  fams: string[];
}

interface Family {
  id: string;
  husb: string;
  wife: string;
  year: number;
  children: string[];
}

class Generator {
  readonly people: Person[] = [];
  readonly families: Family[] = [];

  person(sex: "M" | "F", born: number, famc?: string): Person {
    const one = { id: `@I${this.people.length + 1}@`, sex, born, ...(famc ? { famc } : {}), fams: [] };
    this.people.push(one);
    return one;
  }

  couple(husb: Person, wife: Person, year: number): Family {
    const family = { id: `@F${this.families.length + 1}@`, husb: husb.id, wife: wife.id, year, children: [] };
    this.families.push(family);
    husb.fams.push(family.id);
    wife.fams.push(family.id);
    return family;
  }

  text(events: boolean): string {
    const lines = ["0 HEAD", "1 GEDC", "2 VERS 7.0"];
    for (const one of this.people) {
      lines.push(`0 ${one.id} INDI`, `1 NAME Person ${one.id.slice(2, -1)} /Generated/`, `1 SEX ${one.sex}`);
      lines.push("1 BIRT", `2 DATE ${one.born}`);
      if (events) {
        lines.push("1 CHR", `2 DATE ${one.born}`);
        lines.push("1 RESI", `2 DATE FROM ${one.born + 20} TO ${one.born + 40}`);
        lines.push("1 CENS", `2 DATE ${one.born + 10}`, "1 CENS", `2 DATE ${one.born + 30}`);
        lines.push("1 OCCU Miller", `2 DATE ${one.born + 25}`);
        lines.push("1 DEAT", `2 DATE ${one.born + 70}`, "1 BURI", `2 DATE ${one.born + 70}`);
      } else {
        lines.push("1 DEAT", `2 DATE ${one.born + 70}`);
      }
      if (one.famc) {
        lines.push(`1 FAMC ${one.famc}`);
      }
      for (const family of one.fams) {
        lines.push(`1 FAMS ${family}`);
      }
    }
    for (const family of this.families) {
      lines.push(`0 ${family.id} FAM`, `1 HUSB ${family.husb}`, `1 WIFE ${family.wife}`);
      for (const child of family.children) {
        lines.push(`1 CHIL ${child}`);
      }
      lines.push("1 MARR", `2 DATE ${family.year}`);
    }
    lines.push("0 TRLR", "");
    return lines.join("\n");
  }
}

/** Forty couples and their descendants, three children to a family, each child married to someone from outside. */
export function generated(count: number): string {
  const made = new Generator();
  const queue: Family[] = [];
  for (let at = 0; at < 40; at += 1) {
    queue.push(made.couple(made.person("M", 1700 + at), made.person("F", 1702 + at), 1725 + at));
  }
  for (let next = queue.shift(); next && made.people.length < count; next = queue.shift()) {
    for (let child = 0; child < 3 && made.people.length < count; child += 1) {
      const sex = child % 2 === 0 ? "M" : "F";
      const kid = made.person(sex, next.year + 2 + child * 3, next.id);
      next.children.push(kid.id);
      if (made.people.length < count) {
        const outsider = made.person(sex === "M" ? "F" : "M", kid.born + 1);
        queue.push(
          sex === "M" ? made.couple(kid, outsider, kid.born + 25) : made.couple(outsider, kid, kid.born + 25),
        );
      }
    }
  }
  return made.text(true);
}

function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = state;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Families married into each other at random: a child often marries the
 * child of another family, sometimes of an older generation, so that lines
 * need lanes, and some are married a second time.
 */
export function tangled(count: number, { seed = 7, founders = 40 }: { seed?: number; founders?: number } = {}): string {
  const random = seeded(seed);
  const made = new Generator();
  const waiting: Record<"M" | "F", Person[]> = { M: [], F: [] };
  const queue: Family[] = [];
  const marry = (one: Person, other: Person): Family => {
    const [husb, wife] = one.sex === "M" ? [one, other] : [other, one];
    const family = made.couple(husb, wife, Math.max(husb.born, wife.born) + 25);
    queue.push(family);
    return family;
  };
  for (let at = 0; at < founders; at += 1) {
    marry(made.person("M", 1700 + at), made.person("F", 1702 + at));
  }
  for (let next = queue.shift(); next && made.people.length < count; next = queue.shift()) {
    const children = 2 + Math.floor(random() * 3);
    for (let child = 0; child < children && made.people.length < count; child += 1) {
      const kid = made.person(random() < 0.5 ? "M" : "F", next.year + 2 + child * 3, next.id);
      next.children.push(kid.id);
      const roll = random();
      if (roll < 0.35) {
        waiting[kid.sex].push(kid);
        continue;
      }
      const pool = waiting[kid.sex === "M" ? "F" : "M"];
      const pick = Math.floor(random() * pool.length);
      const partner = pool[pick];
      if (roll < 0.8 && partner && partner.famc !== kid.famc) {
        pool.splice(pick, 1);
        marry(kid, partner);
      } else if (made.people.length < count) {
        marry(kid, made.person(kid.sex === "M" ? "F" : "M", kid.born + 1));
      }
      if (random() < 0.15 && made.people.length < count) {
        marry(kid, made.person(kid.sex === "M" ? "F" : "M", kid.born + 3));
      }
    }
  }
  return made.text(false);
}
