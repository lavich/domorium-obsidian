import { plural, t } from "../i18n";
import { yearText } from "./labels";
import type { PageHost } from "./personPage";
import type { PlaceEntry, Timeline, TimelineEntry } from "./timeline";

function renderEntry(list: HTMLElement, entry: TimelineEntry, host: PageHost): void {
  const row = list.createDiv({ cls: ["gedcom-desk-moment", entry.own ? "is-own" : "is-kin"] });
  row.createDiv({ cls: "gedcom-desk-moment-year", text: entry.year === undefined ? "" : yearText(entry.year) });
  row.createDiv({ cls: "gedcom-desk-moment-dot" });
  const text = row.createDiv({ cls: "gedcom-desk-moment-text" });
  const what = text.createEl("button", { cls: "gedcom-desk-moment-what", text: entry.label });
  what.setAttribute("type", "button");
  const fact = entry.fact;
  const relative = entry.relative;
  if (fact) {
    what.addEventListener("click", () => host.select(fact));
  } else if (relative) {
    what.addEventListener("click", () => host.openRecord(relative.xref));
  } else {
    what.setAttribute("disabled", "");
  }
  const detail = [entry.event.date?.text, entry.event.value, entry.event.place]
    .filter(Boolean)
    .join(" · ");
  if (detail) {
    text.createDiv({ cls: "gedcom-desk-moment-detail", text: detail });
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
    parent.createEl("h3", { cls: "gedcom-desk-section", text: t("timeline.undated") });
    const undated = parent.createDiv({ cls: "gedcom-desk-timeline" });
    for (const entry of timeline.undated) {
      renderEntry(undated, entry, host);
    }
  }
}

export function renderPlaces(parent: HTMLElement, places: PlaceEntry[]): void {
  const list = parent.createDiv({ cls: "gedcom-desk-places" });
  if (places.length === 0) {
    list.createDiv({ cls: "gedcom-desk-none", text: t("places.empty") });
  }
  for (const place of places) {
    const row = list.createDiv({ cls: "gedcom-desk-place" });
    const text = row.createDiv({ cls: "gedcom-desk-place-text" });
    text.createDiv({ cls: "gedcom-desk-place-name", text: place.place });
    text.createDiv({ cls: "gedcom-desk-place-events", text: place.events.join(" · ") });
    row.createDiv({ cls: "gedcom-desk-place-count", text: plural("places.count", place.events.length) });
  }
}
