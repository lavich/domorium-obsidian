import { plural, t } from "../i18n";
import { linkButton } from "./dom";
import { renderEventDetail, type EventDetail } from "./eventDetail";
import type { PageHost } from "./personPage";

export interface EventRowContent {
  name: string;
  detail: EventDetail;
  citations: number;
  record?: { name: string; xref: string };
  /** The number of the line of the event in the file, for the row to carry. */
  line?: number;
}

type Host = Pick<PageHost, "openRecord">;

function begin(list: HTMLElement, content: EventRowContent): HTMLElement {
  const row = list.createDiv({ cls: ["gedcom-desk-fact", "is-event"] });
  if (content.line !== undefined) {
    row.setAttribute("data-line", String(content.line));
  }
  return row;
}

/** A dot at the end of what a fact states, where it cites a source; a fact that cites none has none. */
function sourceDot(parent: HTMLElement, citations: number): void {
  if (citations > 0) {
    const label = plural("desk.sources", citations);
    const dot = parent.createSpan({ cls: ["gedcom-desk-source", "has-source"] });
    dot.setAttribute("role", "img");
    dot.setAttribute("aria-label", label);
    dot.setAttribute("title", label);
  }
}

/** What an event states after its date: its place, its text, the other spouse, the record it belongs to. */
function where(parent: HTMLElement, content: EventRowContent, host: Host, skip: ReadonlySet<keyof EventDetail> = new Set()): boolean {
  const { detail, record } = content;
  const rest: EventDetail = {
    ...(detail.place && !skip.has("place") ? { place: detail.place } : {}),
    ...(detail.text && !skip.has("text") ? { text: detail.text } : {}),
    ...(detail.spouse ? { spouse: detail.spouse } : {}),
  };
  const shown = renderEventDetail(parent, rest, host);
  if (record) {
    if (shown) {
      parent.appendText(" · ");
    }
    linkButton(parent, record.name, () => host.openRecord(record.xref));
  }
  return shown || record !== undefined;
}

/** An event as a row: its date on the left, its name and what it states on the right. */
export function renderEventRow(list: HTMLElement, content: EventRowContent, host: Host): void {
  const row = begin(list, content);
  row.createSpan({
    cls: ["gedcom-desk-fact-date", content.detail.date ? "" : "is-empty"].filter(Boolean),
    text: content.detail.date ?? "—",
  });
  const main = row.createDiv({ cls: "gedcom-desk-fact-main" });
  const head = main.createDiv({ cls: "gedcom-desk-fact-head" });
  head.createSpan({ cls: "gedcom-desk-fact-name", text: content.name });
  sourceDot(head, content.citations);
  const value = main.createDiv({ cls: "gedcom-desk-fact-value" });
  if (!where(value, content, host)) {
    if (content.detail.date) {
      value.remove();
    } else {
      value.setText(t("desk.noDetails"));
      value.addClass("is-empty");
    }
  }
}
