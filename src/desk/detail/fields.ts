/** `text` for a value the reader types; `choice` for one the standard limits to a list, which will be a dropdown when it can be changed. */
export type FieldKind = "text" | "choice";

export interface Field {
  box: HTMLElement;
  area: HTMLTextAreaElement;
}

let labels = 0;

/** An id for the label of a row, so that its field can say what it is the value of. */
export function labelId(): string {
  labels += 1;
  return `gedcom-field-label-${labels}`;
}

/**
 * A value drawn as a field that cannot be changed yet: a real text area, so that it can be selected and copied and
 * the card needs no new markup when it becomes editable. It grows with what it holds, shows a frame only while the
 * pointer or the focus is on it, and is not in the tab order until it can be edited.
 */
export function renderField(
  parent: HTMLElement,
  text: string,
  kind: FieldKind = "text",
  options: { labelledBy?: string; cls?: string } = {},
): Field {
  const box = parent.createDiv({ cls: options.cls === undefined ? "gedcom-field" : ["gedcom-field", options.cls] });
  box.setAttribute("data-kind", kind);
  box.setAttribute("data-value", text);
  const area = box.createEl("textarea", { cls: "gedcom-field-input" });
  area.setAttribute("readonly", "");
  area.setAttribute("rows", "1");
  area.setAttribute("tabindex", "-1");
  if (options.labelledBy !== undefined) {
    area.setAttribute("aria-labelledby", options.labelledBy);
  }
  area.setText(text);
  return { box, area };
}

export function setFieldText(field: Field, text: string): void {
  field.box.setAttribute("data-value", text);
  field.area.setText(text);
}
