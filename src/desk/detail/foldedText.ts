import { t } from "../../i18n";

/** A text longer than this many lines, or characters, shows the first of either and a button for the rest. */
export const SHOWN = { lines: 5, characters: 300 } as const;

export interface FoldedText {
  /** Names the text across redraws: the place of the note on the card. */
  key: string;
  open: boolean;
  toggled: (open: boolean) => void;
}

function preview(text: string): string {
  const lines = text.split("\n").slice(0, SHOWN.lines).join("\n");
  return lines.length > SHOWN.characters ? `${lines.slice(0, SHOWN.characters).trimEnd()}…` : lines;
}

export function isLong(text: string): boolean {
  return text.split("\n").length > SHOWN.lines || text.length > SHOWN.characters;
}

/** A text as written, folded where it is long; what the reader opened stays through a redraw. */
export function renderFoldedText(parent: HTMLElement, text: string, { key, open, toggled }: FoldedText): HTMLElement {
  const box = parent.createDiv({ cls: "gedcom-detail-text" });
  const body = box.createDiv({ cls: "gedcom-detail-text-body" });
  if (!isLong(text)) {
    body.setText(text);
    return box;
  }
  let shown = open;
  const button = box.createEl("button", { cls: "gedcom-desk-link gedcom-detail-more" });
  button.setAttribute("type", "button");
  button.setAttribute("data-focus-key", key);
  const draw = (): void => {
    body.setText(shown ? text : preview(text));
    button.setText(shown ? t("record.less") : t("record.more"));
    button.setAttribute("aria-expanded", String(shown));
  };
  draw();
  button.addEventListener("click", () => {
    shown = !shown;
    draw();
    toggled(shown);
  });
  return box;
}
