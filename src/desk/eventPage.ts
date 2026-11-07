import type { GenealogyIndex } from "../genealogy";
import { t } from "../i18n";
import { linkButton } from "./dom";
import { renderEventDetail } from "./eventDetail";
import { eventTitle, type EventTarget } from "./eventRows";
import { familyTitle, personName } from "./labels";
import { lazyFold } from "./detail/lazyFold";
import { scoped, type DetailContext } from "./detail/lineView";
import { eventLine, renderEventMedia, renderEventRows, splitEvent } from "./detail/eventDetails";
import { renderNotes } from "./detail/notes";
import { otherCount, renderOther } from "./detail/otherData";
import { renderRelated } from "./detail/related";
import type { PageHost, PersonPageOptions } from "./personPage";

function ownerName(index: GenealogyIndex, owner: string): string {
  const person = index.person(owner);
  if (person) {
    return personName(person);
  }
  return familyTitle(index.family(owner)?.spouseNames ?? []);
}

export function renderEventPage(
  container: HTMLElement,
  target: EventTarget,
  index: GenealogyIndex,
  host: PageHost,
  options: Pick<PersonPageOptions, "open" | "folded"> = {},
): void {
  const { event, owner } = target;
  const line = eventLine(index, owner, event);
  const titled = (event.tag === "EVEN" || event.tag === "FACT") && Boolean(event.type);
  const parts = line ? splitEvent(line, titled) : undefined;
  const ctx: DetailContext = {
    index,
    host: { openRecord: (xref) => host.openRecord(xref), showInSource: (range) => host.showInSource(range) },
    notes: { drawn: 0 },
    ...(options.open === undefined ? {} : { open: options.open }),
    ...(options.folded === undefined ? {} : { folded: (id: string, open: boolean) => options.folded?.(id, open) }),
  };
  const lead = container.createDiv({ cls: "gedcom-desk-event-owner" });
  lead.createSpan({ cls: "gedcom-desk-event-kind", text: t(index.person(owner) ? "desk.person" : "desk.family") });
  linkButton(lead, ownerName(index, owner), () => host.openRecord(owner));

  const heading = container.createDiv({ cls: "gedcom-desk-heading" });
  const title = heading.createEl("h1", { cls: "gedcom-desk-title", text: eventTitle(event) });
  const typeLine = line?.children.find((child) => child.tag === "TYPE");
  title.setAttribute("data-line", [line, titled ? typeLine : undefined].flatMap((one) => (one ? [one.range.start.line] : [])).join(" "));
  const place = event.place?.trim();
  const when = heading.createDiv({ cls: "gedcom-desk-subtitle" });
  if (!renderEventDetail(when, { ...(event.date?.text ? { date: event.date.text } : {}), ...(place ? { place } : {}) }, host)) {
    when.remove();
  } else {
    const dated = [line?.children.find((child) => child.tag === "DATE"), line?.children.find((child) => child.tag === "PLAC")].flatMap((one) =>
      one ? [one] : [],
    );
    when.setAttribute("data-line", dated.map((one) => one.range.start.line).join(" "));
  }
  linkButton(heading, t("desk.showInSource"), () => host.showInSource(event.range));

  if (parts) {
    if (parts.rows.length > 0) {
      renderEventRows(container, parts.rows, ctx);
    }
    if (parts.notes.length > 0) {
      renderNotes(container, parts.notes, ctx);
    }
    if (parts.related.length > 0) {
      renderRelated(container, parts.related, ctx);
    }
    if (parts.media.length > 0) {
      renderEventMedia(container, parts.media, ctx);
    }
    if (parts.other.length > 0) {
      const { other } = parts;
      lazyFold(
        container,
        {
          id: "other",
          title: t("record.other"),
          count: otherCount(other),
          open: options.open?.has("other") ?? false,
          toggled: (open) => options.folded?.("other", open),
        },
        (body) => renderOther(body, other, scoped(ctx, "other")),
      );
    }
  }
  const states = parts && (parts.rows.length > 0 || parts.notes.length > 0 || parts.related.length > 0 || parts.media.length > 0 || parts.other.length > 0);
  if (!event.date?.text && !place && event.citations.length === 0 && !states) {
    container.createDiv({ cls: "gedcom-desk-none", text: t("desk.eventStatesNothing") });
  }
}
