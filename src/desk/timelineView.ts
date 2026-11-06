import { t } from "../i18n";
import { renderEventDetail } from "./eventDetail";
import { yearText } from "./labels";
import type { PageHost } from "./personPage";
import type { Timeline, TimelineEntry } from "./timeline";

function renderEntry(list: HTMLElement, entry: TimelineEntry, host: PageHost): void {
  const row = list.createDiv({ cls: ["gedcom-desk-moment", entry.own ? "is-own" : "is-kin"] });
  row.createDiv({ cls: "gedcom-desk-moment-year", text: entry.year === undefined ? "" : yearText(entry.year) });
  row.createDiv({ cls: "gedcom-desk-moment-dot" });
  const text = row.createDiv({ cls: "gedcom-desk-moment-text" });
  const what = text.createEl("button", { cls: "gedcom-desk-moment-what", text: entry.label });
  what.setAttribute("type", "button");
  const eventId = entry.eventId;
  const relative = entry.relative;
  if (eventId) {
    what.addEventListener("click", () => host.openRecord(eventId));
  } else if (relative) {
    what.addEventListener("click", () => host.openRecord(relative.xref));
  } else {
    what.setAttribute("disabled", "");
  }
  const detail = text.createDiv({ cls: "gedcom-desk-moment-detail" });
  const { date, place, value } = entry.event;
  const shown = renderEventDetail(detail, { ...(date?.text ? { date: date.text } : {}), ...(place ? { place } : {}), ...(value ? { text: value } : {}) }, host);
  if (!shown) {
    detail.remove();
  }
}

export function renderTimeline(parent: HTMLElement, timeline: Timeline, host: PageHost): void {
  const list = parent.createDiv({ cls: "gedcom-desk-timeline" });
  if (timeline.entries.length === 0) {
    list.createDiv({ cls: "gedcom-desk-none", text: t("timeline.empty") });
  }
  for (const entry of timeline.entries) {
    renderEntry(list, entry, host);
  }
  if (timeline.undated.length > 0) {
    parent.createEl("h3", { cls: "gedcom-desk-subsection", text: t("timeline.undated") });
    const undated = parent.createDiv({ cls: "gedcom-desk-timeline" });
    for (const entry of timeline.undated) {
      renderEntry(undated, entry, host);
    }
  }
}
