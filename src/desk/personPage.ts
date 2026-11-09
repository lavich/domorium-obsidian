import type { Range } from "@domorium/language-service";

import type {
  GenealogyIndex,
  Missing,
  Person,
  PersonEvent,
  PersonRow,
} from "../genealogy";
import { t } from "../i18n";
import { lazyFold } from "./detail/lazyFold";
import { childMark, linkStatusLabel, parentsHeading, sexLabel } from "./detail/labels";
import { renderRest, type DetailContext } from "./detail/lineView";
import { sectionHeading } from "./detail/section";
import { factsByLine, renderTree } from "./detail/tree";
import { ephemeralTreeState, type TreeState } from "./detail/treeSession";
import type { RecordLine } from "../genealogy";
import { eventName, personName, shortPlace, yearsOf } from "./labels";
import { linkButton } from "./dom";
import { renderEventRow, type EventRowContent } from "./factRow";
import { renderGallery, renderPortrait, type MediaItem } from "./media";
import { timelineOf } from "./timeline";
import { renderTimeline } from "./timelineView";
import type { PortraitContent } from "./media";

export interface Fact {
  /** `p:<event>` for a person's own event, `u:<union>:<event>` for one of a family they married into, `f:<event>` for a family's own. */
  key: string;
  event: PersonEvent;
  /** The other spouse, for an event of a family the person married into. */
  spouse?: PersonRow;
}

export interface PageHost {
  openRecord(xref: string): void;
  showInSource(range: Range): void;
  openFile(path: string): void;
  setIcon?(element: HTMLElement, icon: string): void;
  portrait?(xref: string): PortraitContent | null;
}

export interface PersonPageOptions {
  /** The files the record links, resolved by the host; none where omitted. */
  media?: MediaItem[];
  /** The folded sections the reader has opened, and where a change of one is told. */
  open?: ReadonlySet<string>;
  folded?(id: string, open: boolean): void;
  /** The reader's choices in the tree of the record; the tree keeps its own where omitted. */
  tree?: TreeState;
}

export function factsOf(person: Person): Fact[] {
  const own = person.events.map((event, at) => ({
    key: `p:${at}`,
    event,
  }));
  const married = person.unions.flatMap((union, u) =>
    union.events.map((event, at) => ({
      key: `u:${u}:${at}`,
      event,
      ...(union.spouse === undefined ? {} : { spouse: union.spouse }),
    })),
  );
  return [...own, ...married];
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
  drawTree(container, lines, index, host, options, factsOf(person).filter((fact) => fact.key.startsWith("p:")));
  renderFamily(container, person, index, lines, host, ctx);
  renderGallery(container, options.media ?? [], host);
  const timeline = timelineOf(person, index);
  lazyFold(
    container,
    {
      id: "timeline",
      title: t("desk.timeline"),
      count: timeline.entries.length + timeline.undated.length,
      open: options.open?.has("timeline") ?? false,
      toggled: (open) => options.folded?.("timeline", open),
    },
    (body) => renderTimeline(body, timeline, host),
  );
}

export function drawTree(
  container: HTMLElement,
  lines: RecordLine | undefined,
  index: GenealogyIndex,
  host: PageHost,
  options: PersonPageOptions,
  facts: Fact[],
): void {
  if (lines === undefined) {
    return;
  }
  renderTree(container, lines, {
    index,
    host: {
      openRecord: (xref) => host.openRecord(xref),
      showInSource: (range) => host.showInSource(range),
      ...(host.setIcon === undefined ? {} : { setIcon: (element, icon) => host.setIcon?.(element, icon) }),
    },
    facts: factsByLine(facts),
    state: options.tree ?? ephemeralTreeState(),
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
  linkButton(heading, t("desk.showInSource"), () => {
    host.showInSource(person.range);
  });
}

function rowOf(fact: Fact, own: boolean, withSpouse = true): EventRowContent {
  const { date, place, value } = fact.event;
  return {
    name: eventName(fact.event),
    ...(own && fact.spouse === undefined ? { line: fact.event.range.start.line } : {}),
    detail: {
      ...(date?.text ? { date: date.text } : {}),
      ...(place ? { place } : {}),
      ...(value ? { text: value } : {}),
      ...(fact.spouse && withSpouse ? { spouse: t("desk.with", { name: personName(fact.spouse) }) } : {}),
    },
    citations: fact.event.citations.length,
  };
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
  for (const [at, union] of person.unions.entries()) {
    const spouse = union.spouse;
    const role =
      spouse?.sex === "M" ? t("desk.husband")
      : spouse?.sex === "F" ? t("desk.wife")
      : t("desk.spouse");
    const familyXref = union.family.xref;
    const link = spouseLinks.find((one) => one.pointer === familyXref);
    const partner = kinGroup(family, role, link ? [link.range.start.line] : []);
    if (spouse) {
      relative(partner, spouse, host);
    }
    for (const missing of union.missingSpouses) {
      missingRelative(partner, missing, host);
    }
    if (!spouse && union.missingSpouses.length === 0) {
      partner.createDiv({ cls: "gedcom-desk-none", text: t("desk.notRecorded") });
    }
    const marriages = partner.createDiv({ cls: "gedcom-desk-facts gedcom-desk-union-events" });
    for (const fact of factsOf(person).filter((one) => one.key.startsWith(`u:${at}:`))) {
      renderEventRow(marriages, rowOf(fact, false, false), host);
    }
    if (!marriages.hasChildNodes()) {
      marriages.remove();
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
