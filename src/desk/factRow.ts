import { plural, t } from "../i18n";
import { linkButton } from "./dom";
import { renderEventDetail, type EventDetail } from "./eventDetail";
import type { PageHost } from "./personPage";

export interface EventRowContent {
  name: string;
  focusKey?: string;
  /** The id of the card of the event; none where its record has no identifier. */
  open?: string;
  detail: EventDetail;
  citations: number;
  record?: { name: string; xref: string };
}

export function renderEventRow(list: HTMLElement, content: EventRowContent, host: Pick<PageHost, "openRecord">): void {
  const { name, focusKey, open, detail, citations, record } = content;
  const row = list.createDiv({ cls: "gedcom-desk-fact" });
  const button = row.createEl("button", { cls: "gedcom-desk-fact-name", text: name });
  button.setAttribute("type", "button");
  if (focusKey !== undefined) {
    button.setAttribute("data-focus-key", focusKey);
  }
  if (open !== undefined) {
    row.addEventListener("click", (click) => {
      if (!(click.target as HTMLElement).closest(".gedcom-desk-link")) {
        host.openRecord(open);
      }
    });
  } else {
    row.addClass("is-inert");
    button.setAttribute("disabled", "");
  }

  const value = row.createSpan({ cls: "gedcom-desk-fact-value" });
  const shown = renderEventDetail(value, detail, host);
  if (record) {
    if (shown) {
      value.appendText(" · ");
    }
    linkButton(value, record.name, () => host.openRecord(record.xref));
  } else if (!shown) {
    value.setText(t("desk.noDetails"));
  }
  value.toggleClass("is-empty", !shown && !record);
  row.createSpan({
    cls: ["gedcom-desk-chip", citations > 0 ? "has-source" : "no-source"],
    text: citations > 0 ? plural("desk.sources", citations) : t("desk.noSource"),
  });
}
