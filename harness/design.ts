import { GedcomLanguageService, type DateModifier } from "@domorium/language-service";

import { buildIndex, type DatePrecision, type DateReading, type PersonEvent } from "../src/genealogy";

export interface DesignDate {
  text: string;
  year?: number;
  end?: number;
  precision?: DatePrecision;
  modifier?: DateModifier;
  /** Day and month both known, so an age read from it is not off by one. */
  full: boolean;
}

export interface DesignEvent {
  tag: string;
  type?: string;
  value?: string;
  place?: string;
  date?: DesignDate;
  line: number;
}

export interface DesignPerson {
  id: string;
  name: string;
  sex?: string;
  events: DesignEvent[];
  famc: string[];
  fams: string[];
}

export interface DesignFamily {
  id: string;
  husb?: string;
  wife?: string;
  chil: string[];
  events: DesignEvent[];
}

export interface DesignRead {
  people: DesignPerson[];
  families: DesignFamily[];
  millis: number;
}

function read(text: string): DesignRead {
  const started = performance.now();
  const language = new GedcomLanguageService(text);
  const index = buildIndex(language);
  const dateOf = (reading: DateReading | undefined): DesignDate | undefined => {
    if (!reading) {
      return undefined;
    }
    const value = language.readDate(reading.text);
    const [first, second] = value?.dates ?? [];
    return {
      text: reading.text,
      year: reading.year,
      end: second?.year,
      precision: reading.precision,
      modifier: value?.modifier,
      full: first?.day !== undefined && first.month !== undefined,
    };
  };
  const eventOf = (event: PersonEvent): DesignEvent => ({
    tag: event.tag,
    type: event.type,
    value: event.value,
    place: event.place,
    date: dateOf(event.date),
    line: event.range.start.line + 1,
  });
  const people: DesignPerson[] = [];
  for (const row of index.people) {
    const person = row.xref ? index.person(row.xref) : undefined;
    if (!person?.xref) {
      continue;
    }
    people.push({
      id: person.xref,
      name: person.name,
      sex: person.sex,
      events: person.events.map(eventOf),
      famc: person.childFamilies.flatMap((family) => (family.xref ? [family.xref] : [])),
      fams: person.spouseFamilies.flatMap((family) => (family.xref ? [family.xref] : [])),
    });
  }
  const families: DesignFamily[] = [];
  for (const row of index.families) {
    const family = row.xref ? index.family(row.xref) : undefined;
    if (!family?.xref) {
      continue;
    }
    families.push({
      id: family.xref,
      husb: family.spouses.find((spouse) => spouse.role === "HUSB")?.xref,
      wife: family.spouses.find((spouse) => spouse.role === "WIFE")?.xref,
      chil: family.children.flatMap((child) => (child.xref ? [child.xref] : [])),
      events: family.events.map(eventOf),
    });
  }
  return {
    people,
    families,
    millis: performance.now() - started,
  };
}

(window as unknown as { DomoriumDesign: { read: typeof read } }).DomoriumDesign = { read };
