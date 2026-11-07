import type { Range } from "@domorium/language-service";

import type {
  GenealogyIndex,
  Missing,
  Person,
  PersonEvent,
  PersonRow,
} from "../genealogy";
import { t } from "../i18n";
import { PERSON_CLAIMED, unclaimed } from "./detail/claims";
import { lazyFold } from "./detail/lazyFold";
import { childMark, linkStatusLabel, parentsHeading, sexLabel } from "./detail/labels";
import { renderRest, scoped, type DetailContext } from "./detail/lineView";
import { nameLines, needsNames, renderNames } from "./detail/names";
import { noteLines, renderNotes } from "./detail/notes";
import { otherCount, renderOther } from "./detail/otherData";
import { infoLines, renderInfo } from "./detail/recordInfo";
import { relatedLines, renderRelated } from "./detail/related";
import { sectionHeading } from "./detail/section";
import type { RecordLine } from "../genealogy";
import { eventName, personName, shortPlace, yearsOf } from "./labels";
import { linkButton } from "./dom";
import { renderEventRow } from "./factRow";
import { eventIdOf } from "./eventRows";
import { renderGallery, renderPortrait, type MediaItem } from "./media";
import { timelineOf } from "./timeline";
import { renderTimeline } from "./timelineView";
import type { PortraitContent } from "./media";

/**
 * `p:<event>` for a person's own event, `u:<union>:<event>` for one of a family
 * they married into, `f:<event>` for a family's on its own page.
 */
export type FactKey = string;

export interface Fact {
  key: FactKey;
  /** The id the event is selected by; none where its record has no identifier. */
  eventId?: string;
  event: PersonEvent;
  /** The other spouse, for an event of a family the person married into. */
  spouse?: PersonRow;
}

export interface PageHost {
  openRecord(xref: string): void;
  select(key: FactKey | null): void;
  showInSource(range: Range): void;
  openFile(path: string): void;
  setIcon?(element: HTMLElement, icon: string): void;
  portrait?(xref: string): PortraitContent | null;
}

export interface PersonPageOptions {
  selected: FactKey | null;
  /** The files the record links, resolved by the host; none where omitted. */
  media?: MediaItem[];
  /** The folded sections the reader has opened, and where a change of one is told. */
  open?: ReadonlySet<string>;
  folded?(id: string, open: boolean): void;
}

export function factsOf(person: Person): Fact[] {
  const owner = person.xref;
  const own = person.events.map((event, at) => ({
    key: `p:${at}`,
    ...(owner === undefined ? {} : { eventId: eventIdOf(owner, person.events, event) }),
    event,
  }));
  const married = person.unions.flatMap((union, u) =>
    union.events.map((event, at) => ({
      key: `u:${u}:${at}`,
      ...(union.family.xref === undefined ? {} : { eventId: eventIdOf(union.family.xref, union.events, event) }),
      event,
      ...(union.spouse === undefined ? {} : { spouse: union.spouse }),
    })),
  );
  return [...own, ...married];
}

export function factByKey(person: Person, key: FactKey | null): Fact | undefined {
  return key === null ? undefined : factsOf(person).find((fact) => fact.key === key);
}

export function renderPersonPage(
  container: HTMLElement,
  person: Person,
  index: GenealogyIndex,
  options: PersonPageOptions,
  host: PageHost,
): void {
  const lines = person.xref === undefined ? undefined : index.record(person.xref);
  const ctx: DetailContext = {
    index,
    host: { openRecord: (xref) => host.openRecord(xref), showInSource: (range) => host.showInSource(range) },
    notes: { drawn: 0 },
    ...(options.open === undefined ? {} : { open: options.open }),
    ...(options.folded === undefined ? {} : { folded: (id: string, open: boolean) => options.folded?.(id, open) }),
  };
  renderHeading(container, person, lines, options, host);
  const names = lines ? nameLines(lines) : [];
  if (needsNames(names)) {
    renderNames(container, names, ctx);
  }
  renderFactList(container, factsOf(person), index, options, host);
  renderFamily(container, person, index, lines, host, ctx);
  const notes = lines ? noteLines(lines) : [];
  if (notes.length > 0) {
    renderNotes(container, notes, ctx);
  }
  const related = lines ? relatedLines(lines) : [];
  if (related.length > 0) {
    renderRelated(container, related, ctx);
  }
  renderGallery(container, options.media ?? [], host);
  const timeline = timelineOf(person, index);
  const folded = (id: string) => (open: boolean) => options.folded?.(id, open);
  const fold = (id: string, title: string, count: number, fill: (body: HTMLElement) => void): void =>
    lazyFold(container, { id, title, count, open: options.open?.has(id) ?? false, toggled: folded(id) }, fill);
  fold("timeline", t("desk.timeline"), timeline.entries.length + timeline.undated.length, (body) =>
    renderTimeline(body, timeline, host),
  );
  const info = lines ? infoLines(lines) : [];
  if (info.length > 0) {
    fold("info", t("record.info"), otherCount(info), (body) => renderInfo(body, info, scoped(ctx, "info")));
  }
  const gallery = options.media;
  const other = lines
    ? unclaimed(lines, PERSON_CLAIMED, (line) => line.tag === "OBJE" && !drawnByGallery(line, gallery))
    : [];
  if (other.length > 0) {
    fold("other", t("record.other"), otherCount(other), (body) => renderOther(body, other, scoped(ctx, "other")));
  }
}

/** An `OBJE` line is the gallery's where a picture it draws was found on that line. */
export function drawnByGallery(line: RecordLine, gallery: readonly MediaItem[] | undefined): boolean {
  if (gallery === undefined) {
    return true;
  }
  const own = new Set(["TITL", "CROP"]);
  const plain =
    line.pointer !== undefined
      ? line.children.every((child) => own.has(child.tag))
      : line.children.filter((child) => child.tag === "FILE").length === 1 &&
        line.children.every((child) => child.tag === "FILE" || own.has(child.tag));
  if (!plain) {
    return false;
  }
  const { start, end } = line.range;
  return gallery.some(({ at }) => {
    const after = at.line > start.line || (at.line === start.line && at.character >= start.character);
    const before = at.line < end.line || (at.line === end.line && at.character <= end.character);
    return after && before;
  });
}

function renderHeading(
  page: HTMLElement,
  person: Person,
  lines: RecordLine | undefined,
  options: PersonPageOptions,
  host: PageHost,
): void {
  const who = page.createDiv({ cls: "gedcom-desk-who" });
  renderPortrait(who, options.media ?? []);
  const heading = who.createDiv({ cls: "gedcom-desk-heading" });
  const title = heading.createEl("h1", { cls: "gedcom-desk-title", text: personName(person) });
  const first = lines?.children.find((line) => line.tag === "NAME");
  if (first) {
    title.setAttribute("data-line", String(first.range.start.line));
  }
  const birth = shortPlace(person.events.find((event) => event.tag === "BIRT")?.place);
  const death = shortPlace(person.events.find((event) => event.tag === "DEAT")?.place);
  const places = birth && death && birth !== death ? `${birth} → ${death}` : (birth ?? death);
  const sex = lines?.children.find((line) => line.tag === "SEX");
  const line = [sex?.text ? sexLabel(sex.text) : undefined, yearsOf(person), places].filter(Boolean).join(" · ");
  if (line) {
    const subtitle = heading.createDiv({ cls: "gedcom-desk-subtitle", text: line });
    if (sex) {
      subtitle.setAttribute("data-line", String(sex.range.start.line));
    }
  }
  const selected = factByKey(person, options.selected);
  linkButton(heading, t("desk.showInSource"), () => {
    host.showInSource(selected?.event.range ?? person.range);
  });
}

export function renderFactList(
  page: HTMLElement,
  facts: Fact[],
  index: GenealogyIndex,
  options: PersonPageOptions,
  host: PageHost,
  own = true,
): void {
  if (facts.length === 0) {
    return;
  }
  sectionHeading(page, t("desk.facts"), facts.length);
  const unsourced = facts.filter((fact) => fact.event.citations.length === 0).length;
  if (unsourced > 0) {
    page.createDiv({
      cls: "gedcom-desk-unsourced",
      text: t("desk.unsourced", { count: unsourced, total: facts.length }),
    });
  }
  const list = page.createDiv({ cls: "gedcom-desk-facts" });
  for (const fact of facts) {
    const { date, place, value } = fact.event;
    renderEventRow(
      list,
      {
        name: eventName(fact.event),
        focusKey: fact.key,
        ...(fact.eventId === undefined ? {} : { open: fact.eventId }),
        ...(own && fact.spouse === undefined ? { line: fact.event.range.start.line } : {}),
        detail: {
          ...(date?.text ? { date: date.text } : {}),
          ...(place ? { place } : {}),
          ...(value ? { text: value } : {}),
          ...(fact.spouse ? { spouse: t("desk.with", { name: personName(fact.spouse) }) } : {}),
        },
        citations: fact.event.citations.length,
      },
      host,
    );
  }
}

const KINDS: ReadonlySet<string> = new Set(["birth", "adopted", "foster", "sealing", "other"]);

/** How a child belongs to a family, as its `FAMC` line states it: the kind and the status, with the lines that state them. */
export function belonging(line: RecordLine | undefined): { kind?: string; status?: string; lines: number[] } {
  const pedi = line?.children.find((child) => child.tag === "PEDI");
  const stat = line?.children.find((child) => child.tag === "STAT");
  const kind = pedi?.text?.trim().toLowerCase();
  return {
    ...(kind === undefined ? {} : { kind: KINDS.has(kind) ? kind : "other" }),
    ...(stat?.text === undefined ? {} : { status: stat.text }),
    lines: [line, pedi, stat].flatMap((one) => (one ? [one.range.start.line] : [])),
  };
}

function renderFamily(
  page: HTMLElement,
  person: Person,
  index: GenealogyIndex,
  lines: RecordLine | undefined,
  host: PageHost,
  ctx: DetailContext,
): void {
  sectionHeading(page, t("desk.family"));
  const family = page.createDiv({ cls: "gedcom-desk-family" });
  const owner = person.xref;
  const links = lines?.children.filter((line) => line.tag === "FAMC") ?? [];

  for (const link of links) {
    const here = link.pointer === undefined ? undefined : index.family(link.pointer);
    const how = belonging(link);
    const label = [parentsHeading(how.kind), how.status ? linkStatusLabel(how.status) : undefined].filter(Boolean).join(" · ");
    const parents = kinGroup(family, label, how.lines);
    for (const stated of link.children.filter((child) => child.tag === "PEDI" || child.tag === "STAT")) {
      drawRest(parents, stated, new Set(), ctx);
    }
    if (link.void) {
      parents.createDiv({ cls: "gedcom-desk-none", text: t("record.void") });
      continue;
    }
    if (!here) {
      missingRelative(parents, { xref: link.pointer ?? "", range: link.range }, host);
      drawRest(parents, link, new Set(["PEDI", "STAT"]), ctx);
      continue;
    }
    for (const spouse of here.spouses.filter((one) => one.xref !== owner)) {
      relative(parents, spouse, host);
    }
    for (const missing of here.missingSpouses) {
      missingRelative(parents, missing, host);
    }
    if (here.spouses.every((one) => one.xref === owner) && here.missingSpouses.length === 0) {
      parents.createDiv({ cls: "gedcom-desk-none", text: t("desk.notRecorded") });
    }
    drawRest(parents, link, new Set(["PEDI", "STAT"]), ctx);
    const siblings = here.children.filter((one) => one.xref !== owner);
    if (siblings.length > 0) {
      const group = kinGroup(family, t("desk.siblings"));
      for (const sibling of siblings) {
        relative(group, sibling, host);
      }
    }
  }
  if (links.length === 0) {
    kinGroup(family, t("desk.parents")).createDiv({ cls: "gedcom-desk-none", text: t("desk.notRecorded") });
  }

  const spouseLinks = lines?.children.filter((line) => line.tag === "FAMS") ?? [];
  for (const union of person.unions) {
    const spouse = union.spouse;
    const marriage = union.events.find((event) => event.tag === "MARR");
    const when = [marriage?.date?.text, shortPlace(marriage?.place)].filter(Boolean).join(", ");
    const role =
      spouse?.sex === "M" ? t("desk.husband")
      : spouse?.sex === "F" ? t("desk.wife")
      : t("desk.spouse");
    const familyXref = union.family.xref;
    const link = spouseLinks.find((one) => one.pointer === familyXref);
    const partner = kinGroup(family, role, link ? [link.range.start.line] : []);
    if (spouse) {
      relative(partner, spouse, host, when ? t("desk.married", { when }) : undefined);
    }
    for (const missing of union.missingSpouses) {
      missingRelative(partner, missing, host);
    }
    if (!spouse && union.missingSpouses.length === 0) {
      partner.createDiv({ cls: "gedcom-desk-none", text: t("desk.notRecorded") });
    }
    if (familyXref) {
      linkButton(partner, t("desk.familyPage"), () => host.openRecord(familyXref));
    }
    if (link) {
      drawRest(partner, link, new Set(), ctx);
    }
    if (union.children.length > 0 || union.missingChildren.length > 0) {
      const children = kinGroup(family, t("desk.children"));
      for (const child of union.children) {
        relative(children, child, host, markOf(index, child.xref, familyXref));
      }
      for (const missing of union.missingChildren) {
        missingRelative(children, missing, host);
      }
    }
  }
  for (const missing of person.missingUnions) {
    const group = kinGroup(family, t("desk.spouse"));
    missingRelative(group, missing, host);
    drawRest(group, spouseLinks.find((one) => one.range.start.line === missing.range.start.line), new Set(), ctx);
  }
  for (const link of spouseLinks.filter((one) => one.void)) {
    const group = kinGroup(family, t("desk.spouse"), [link.range.start.line]);
    group.createDiv({ cls: "gedcom-desk-none", text: t("record.void") });
    drawRest(group, link, new Set(), ctx);
  }
}

function drawRest(parent: HTMLElement, line: RecordLine | undefined, handled: ReadonlySet<string>, ctx: DetailContext): void {
  if (line?.children.some((child) => !handled.has(child.tag))) {
    renderRest(parent.createDiv({ cls: "gedcom-detail" }), line, handled, ctx);
  }
}

/** The mark on a child who does not belong to a family by birth, from the child's own `FAMC` line for it. */
export function markOf(index: GenealogyIndex, child: string | undefined, family: string | undefined): string | undefined {
  if (child === undefined || family === undefined) {
    return undefined;
  }
  const link = index.record(child)?.children.find((line) => line.tag === "FAMC" && line.pointer === family);
  const how = belonging(link);
  const mark = childMark(how.kind);
  return [mark, how.status ? linkStatusLabel(how.status) : undefined].filter(Boolean).join(" · ") || undefined;
}

export function kinGroup(family: HTMLElement, label: string, lines: number[] = []): HTMLElement {
  const text = family.createDiv({ cls: "gedcom-desk-kin-label", text: label });
  if (lines.length > 0) {
    text.setAttribute("data-line", lines.join(" "));
  }
  return family.createDiv({ cls: "gedcom-desk-kin" });
}

export function relative(
  group: HTMLElement,
  row: PersonRow,
  host: PageHost,
  note?: string,
): void {
  const button = group.createEl("button", { cls: "gedcom-desk-person" });
  button.setAttribute("type", "button");
  button.createSpan({ cls: "gedcom-desk-person-name", text: personName(row) });
  const years = yearsOf(row);
  if (years) {
    button.createSpan({ cls: "gedcom-desk-person-years", text: years });
  }
  if (note) {
    button.createSpan({ cls: "gedcom-desk-person-note", text: note });
  }
  const xref = row.xref;
  if (xref) {
    button.setAttribute("data-focus-key", xref);
    button.addEventListener("click", () => host.openRecord(xref));
  }
}

export function missingRelative(group: HTMLElement, missing: Missing, host: PageHost): void {
  const line = group.createDiv({ cls: "gedcom-desk-missing" });
  line.setAttribute("data-line", String(missing.range.start.line));
  line.createSpan({ text: t("desk.missingRecord") });
  linkButton(line, t("desk.showInSource"), () => host.showInSource(missing.range));
}
