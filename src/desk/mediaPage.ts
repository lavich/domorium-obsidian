import type { GenealogyIndex, MediaRecord } from "../genealogy";
import { t } from "../i18n";
import { recordTitle } from "./detail/lineView";
import { drawPicture, renderTile, type MediaHost, type MediaItem } from "./media";
import { linkButton } from "./dom";
import type { PageHost } from "./personPage";

export interface MediaPageItems {
  whole: MediaItem | null;
  links: MediaItem[];
}

export function renderMediaPage(
  container: HTMLElement,
  media: MediaRecord,
  items: MediaPageItems,
  index: GenealogyIndex,
  host: PageHost & MediaHost,
): void {
  const page = container;
  const heading = page.createDiv({ cls: "gedcom-desk-heading" });
  heading.createEl("h1", {
    cls: "gedcom-desk-title",
    text: media.title ?? media.file ?? t("desk.media"),
  });
  if (media.file && media.title) {
    heading.createDiv({ cls: "gedcom-desk-subtitle", text: media.file });
  }
  linkButton(heading, t("desk.showInSource"), () => host.showInSource(media.range));

  const whole = items.whole;
  if (whole?.content.kind === "image") {
    const path = whole.path;
    const stage = page.createEl(path ? "button" : "div", { cls: "gedcom-desk-media-stage" });
    drawPicture(stage, whole.content, 640, 480);
    if (path) {
      stage.setAttribute("type", "button");
      stage.setAttribute("aria-label", media.title ?? media.file ?? t("desk.media"));
      stage.addEventListener("click", () => host.openFile(path));
    }
  } else if (whole) {
    renderTile(page.createDiv({ cls: "gedcom-desk-gallery" }), { ...whole, record: undefined }, host);
  }

  page.createEl("h2", { cls: "gedcom-desk-section", text: t("desk.usedBy") });
  const list = page.createDiv({ cls: "gedcom-desk-used-by" });
  if (media.links.length === 0) {
    list.createDiv({ cls: "gedcom-desk-none", text: t("desk.usedByNone") });
  }
  media.links.forEach((link, at) => {
    const entry = list.createDiv({ cls: "gedcom-desk-user" });
    const item = items.links[at];
    if (item?.content.kind === "image") {
      drawPicture(entry, item.content, 72, 90);
    }
    const text = entry.createDiv({ cls: "gedcom-desk-user-text" });
    const button = text.createEl("button", { cls: "gedcom-desk-person" });
    button.setAttribute("type", "button");
    button.createSpan({ cls: "gedcom-desk-person-name", text: recordTitle(index, link.record) ?? t("desk.wholeRecord") });
    button.addEventListener("click", () => host.openRecord(link.record));
    if (link.title) {
      text.createDiv({ cls: "gedcom-desk-user-caption", text: link.title });
    }
  });
}
