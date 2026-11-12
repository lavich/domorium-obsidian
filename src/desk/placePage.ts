import type { GenealogyIndex } from "../genealogy";
import { plural, t } from "../i18n";
import { linkButton } from "./dom";
import { refusalText, type Refusal, type WriteOutcome } from "./edits";
import { EditableField } from "./detail/fieldEdit";
import { labelId, renderField } from "./detail/fields";
import { tagLabel } from "./detail/labels";
import type { TreeState } from "./detail/treeSession";
import { eventName, familyTitle, personName } from "./labels";
import { placeLines, planRename, type PlaceLine, type Rename } from "./placeEdits";
import type { PlaceRow } from "./placeRows";

export const NAME_FOCUS = "place:name";

export interface PlaceHost {
  /** Selects the record and opens its tree at the line written at `line`. */
  revealLine(xref: string, line: number): void;
  setIcon?(element: HTMLElement, icon: string): void;
  announce?(text: string): void;
  /** Writes the rename once the reader agrees; null where the reader declined. */
  renamePlace?: (rename: Rename, done: (outcome: WriteOutcome | null) => void) => void;
  /** Set where the card could write but the service does not describe every line of the place. */
  uneditable?: boolean;
}

function recordName(index: GenealogyIndex, xref: string): string {
  const person = index.person(xref);
  if (person) {
    return personName(person);
  }
  const family = index.family(xref);
  return family ? familyTitle(family.spouseNames) : xref;
}

function sourceDot(parent: HTMLElement, citations: number): void {
  if (citations > 0) {
    const label = plural("desk.sources", citations);
    const dot = parent.createSpan({ cls: ["gedcom-desk-source", "has-source"] });
    dot.setAttribute("role", "img");
    dot.setAttribute("aria-label", label);
    dot.setAttribute("title", label);
  }
}

function lineRow(list: HTMLElement, line: PlaceLine, index: GenealogyIndex, host: PlaceHost): void {
  const { event, record } = line;
  const reveal = (): void => host.revealLine(record, event.range.start.line);
  const row = list.createDiv({ cls: ["gedcom-desk-fact", "is-event", "gedcom-place-line"] });
  row.setAttribute("role", "listitem");
  row.setAttribute("data-line", String(line.at.line));
  row.addEventListener("click", reveal);
  const date = event.date?.text;
  row.createSpan({ cls: ["gedcom-desk-fact-date", ...(date ? [] : ["is-empty"])], text: date ?? "—" });
  const main = row.createDiv({ cls: "gedcom-desk-fact-main" });
  const head = main.createDiv({ cls: "gedcom-desk-fact-head" });
  head.createSpan({ cls: "gedcom-desk-fact-name", text: eventName(event) });
  sourceDot(head, event.citations.length);
  const link = linkButton(main.createDiv({ cls: "gedcom-desk-fact-value" }), recordName(index, record), reveal);
  link.setAttribute("data-focus-key", `place:line:${line.at.line}`);
  link.addEventListener("click", (click) => click.stopPropagation());
}

function nameField(parent: HTMLElement, place: PlaceRow, index: GenealogyIndex, host: PlaceHost, state: TreeState): HTMLTextAreaElement {
  const label = parent.createDiv({ cls: "gedcom-place-label", text: tagLabel("PLAC") });
  label.id = labelId();
  const { renamePlace } = host;
  if (!renamePlace) {
    return renderField(parent, place.name, "text", { labelledBy: label.id }).area;
  }
  let asking = false;
  const refuse = (field: EditableField, refusal: Refusal): void => {
    const message = { text: refusalText(refusal), kind: "error" as const };
    field.refused(message);
    host.announce?.(message.text);
  };
  const field = new EditableField(parent, {
    key: "place",
    prose: false,
    fileText: place.name,
    readerText: place.name,
    labelledBy: label.id,
    state,
    focusKey: NAME_FOCUS,
    ...(host.setIcon ? { setIcon: host.setIcon.bind(host) } : {}),
    focused: () => undefined,
    write: (text, editing) => {
      if (asking) {
        return;
      }
      const plan = planRename(index, place.key, text);
      if (plan === null) {
        editing.putBack();
        return;
      }
      if ("ok" in plan) {
        refuse(editing, plan);
        return;
      }
      asking = true;
      renamePlace(plan, (outcome) => {
        asking = false;
        if (outcome === null) {
          editing.putBack();
        } else if (outcome.ok) {
          editing.wrote(plan.value);
        } else {
          refuse(editing, outcome);
        }
      });
    },
  });
  return field.field.area;
}

/** The card of a place: its name, which renames it in every line, over a row for each line that names it. */
export function renderPlacePage(container: HTMLElement, place: PlaceRow, index: GenealogyIndex, host: PlaceHost, state: TreeState): void {
  const page = container.createDiv({ cls: "gedcom-place" });
  const name = nameField(page.createDiv({ cls: "gedcom-place-name" }), place, index, host, state);
  if (host.uneditable) {
    page.createDiv({ cls: "gedcom-tree-note", text: t("edit.noDialect") });
  }
  const list = page.createDiv({ cls: ["gedcom-desk-facts", "gedcom-place-lines"] });
  list.setAttribute("role", "list");
  list.setAttribute("aria-label", t("place.occurrences"));
  for (const line of placeLines(index, place.key)) {
    lineRow(list, line, index, host);
  }
  const wish = state.takeFocus();
  if (wish && "key" in wish && wish.key === "place") {
    name.focus();
  }
}
