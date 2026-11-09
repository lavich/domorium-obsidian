import type { GenealogyIndex, Source } from "../genealogy";
import { t } from "../i18n";
import { sourceTitle } from "./labels";
import { renderGallery, type MediaItem } from "./media";
import { linkButton } from "./dom";
import { drawTree, type PageHost, type PersonPageOptions } from "./personPage";

export function renderSourcePage(
  container: HTMLElement,
  source: Source,
  index: GenealogyIndex,
  host: PageHost,
  media: MediaItem[] = [],
  options: Pick<PersonPageOptions, "open" | "folded" | "tree"> = {},
): void {
  const page = container;
  const heading = page.createDiv({ cls: "gedcom-desk-heading" });
  heading.createEl("h1", { cls: "gedcom-desk-title", text: sourceTitle(source.title) });
  const publication = source.fields.find((field) => field.tag === "PUBL")?.value;
  heading.createDiv({
    cls: "gedcom-desk-subtitle",
    text: [source.author, publication].filter(Boolean).join(" · ") || t("desk.noAuthor"),
  });
  linkButton(heading, t("desk.showInSource"), () => host.showInSource(source.range));

  drawTree(page, source.xref === undefined ? undefined : index.record(source.xref), index, host, { selected: null, ...options }, []);

  renderGallery(page, media, host);
}
