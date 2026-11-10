import type { PointerCandidate, Position, StructureFieldDescription } from "@domorium/language-service";

import type { GenealogyIndex, PersonEvent, RecordLine } from "../../genealogy";
import { isFull } from "../addableFields";
import { plural, t } from "../../i18n";
import { linkButton, tipPlace } from "../dom";
import { placeAt, placeId } from "../placeRows";
import { labelId, renderField } from "./fields";
import { tagLabel } from "./labels";
import {
  fieldKind,
  recordTitle,
  renderNoteText,
  renderPointer,
  valueText,
  type DetailContext,
  type DetailHost,
} from "./lineView";
import type { TreeState } from "./treeSession";

/** An event or an attribute the page knows on one of the lines of the record. */
export interface TreeFact {
  event: PersonEvent;
}

/** A field the menu names; `disabled` where the standard allows no more of it. */
export interface FieldChoice {
  title: string;
  disabled: boolean;
  /** Set on the one a pointer points at now. */
  checked?: boolean;
}

/** A record a pointer may point at, named for the list. */
export interface PointerChoice {
  title: string;
  xref: string;
  checked: boolean;
}

export interface TreeHost extends DetailHost {
  setIcon?(element: HTMLElement, icon: string): void;
  /** The fields the dialect lets be added to the line at this position; where the host cannot say, every node is offered a button and no list. */
  addableAt?(at: Position): StructureFieldDescription[];
  /** The values the standard limits the line to, or none where it limits no list. */
  choicesAt?(at: Position): string[];
  /** The records a pointer of this tag under the line at `parent` may point at. */
  pointerChoicesAt?(parent: Position, tag: string): PointerCandidate[];
  chooseField?(event: MouseEvent, fields: FieldChoice[]): void;
  /** Whether the line with this tag under the line at `parent` may go without breaking the standard. */
  removableAt?(parent: Position, tag: string): boolean;
  /** Removes the line at this position; `nested` is how many lines under it go with it. */
  removeAt?(at: Position, nested: number): void;
  /** Opens a searchable list of the records a pointer may point at. */
  choosePointer?(choices: PointerChoice[]): void;
}

export interface TreeOptions {
  index: GenealogyIndex;
  host: TreeHost;
  /** The facts of the record by the number of their line. */
  facts: ReadonlyMap<number, TreeFact>;
  state: TreeState;
  /** Where the toolbar goes, when it sits outside the scrolling tree; the tree makes its own otherwise. */
  header?: HTMLElement;
}

export function factsByLine(facts: readonly TreeFact[]): Map<number, TreeFact> {
  return new Map(facts.map((fact) => [fact.event.range.start.line, fact]));
}

interface SummaryPart {
  text: string;
  kind: "value" | "date" | "place";
}

let drawn = 0;

function keyOf(parent: string, tag: string, nth: number): string {
  return `${parent === "" ? "" : `${parent}.`}${tag}[${nth}]`;
}

function nodeKeys(lines: readonly RecordLine[], parent: string): string[] {
  const seen = new Map<string, number>();
  return lines.flatMap((line) => {
    const nth = seen.get(line.tag) ?? 0;
    seen.set(line.tag, nth + 1);
    const key = keyOf(parent, line.tag, nth);
    return line.children.length > 0 ? [key, ...nodeKeys(line.children, key)] : [];
  });
}

const descendants = (line: RecordLine): number =>
  line.children.reduce((sum, child) => sum + 1 + descendants(child), 0);

const firstLine = (text: string): string => text.split("\n")[0] ?? "";

class Tree {
  private readonly nodes = new Map<string, (open: boolean) => void>();
  private toggle: HTMLElement | null = null;

  constructor(
    private readonly root: HTMLElement,
    private readonly record: RecordLine,
    private readonly options: TreeOptions,
  ) {}

  draw(): void {
    this.root.empty();
    this.nodes.clear();
    this.toolbar();
    this.row(this.root.createDiv({ cls: "gedcom-tree-list" }), this.record, this.record, "", 0, 0);
  }

  private toolbar(): void {
    const bar = this.options.header ?? this.root.createDiv({ cls: ["gedcom-tree-bar", "nav-header"] });
    bar.empty();
    const toggle = bar
      .createDiv({ cls: "nav-buttons-container" })
      .createDiv({ cls: ["gedcom-tree-control", "gedcom-tree-toggle", "clickable-icon", "nav-action-button"] });
    toggle.setAttribute("role", "button");
    toggle.setAttribute("tabindex", "0");
    toggle.setAttribute("data-focus-key", "tree:toggle");
    tipPlace(toggle, "bottom");
    const press = (): void => this.setAll(!this.allOpen());
    toggle.addEventListener("click", press);
    toggle.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        press();
      }
    });
    this.toggle = toggle;
    this.refreshToggle();
  }

  private pick(parent: HTMLElement, line: RecordLine, owner: RecordLine, focusKey: string): void {
    const { host, index } = this.options;
    if (line.void || line.pointer === undefined || !host.pointerChoicesAt || !host.choosePointer) {
      return;
    }
    const candidates = host.pointerChoicesAt(owner.range.start, line.tag);
    if (candidates.length === 0) {
      return;
    }
    const titleOf = (one: PointerCandidate): string => recordTitle(index, one.xref) ?? one.label ?? one.xref;
    const button = parent.createDiv({ cls: ["gedcom-tree-pick", "clickable-icon"] });
    button.setAttribute("role", "button");
    button.setAttribute("tabindex", "0");
    button.setAttribute("aria-label", t("tree.changePointer"));
    button.setAttribute("data-focus-key", focusKey);
    if (host.setIcon) {
      host.setIcon(button, "chevron-down");
    } else {
      button.setText("▾");
    }
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      host.choosePointer?.(candidates.map((one) => ({ title: titleOf(one), xref: one.xref, checked: one.xref === line.pointer })));
    });
    button.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        event.stopPropagation();
        button.click();
      }
    });
  }

  private choice(parent: HTMLElement, line: RecordLine, owner: RecordLine, choices: readonly string[], labelledBy: string): void {
    const written = line.text ?? "";
    const values = choices.includes(written) ? choices : [written, ...choices];
    const select = parent.createEl("select", { cls: ["dropdown", "gedcom-tree-choice"] });
    select.setAttribute("aria-labelledby", labelledBy);
    select.setAttribute("data-kind", "choice");
    for (const value of values) {
      const option = select.createEl("option", { text: valueText({ ...line, text: value }, owner) });
      option.value = value;
    }
    select.value = written;
    select.addEventListener("change", () => {
      select.value = written;
    });
  }

  private allOpen(): boolean {
    return ["", ...nodeKeys(this.record.children, "")].every((key) => this.options.state.isOpen(key));
  }

  private refreshToggle(): void {
    const { toggle } = this;
    if (!toggle) {
      return;
    }
    const open = this.allOpen();
    const name = t(open ? "tree.closeAll" : "tree.openAll");
    toggle.setAttribute("aria-label", name);
    toggle.setAttribute("data-open", String(open));
    if (this.options.host.setIcon) {
      this.options.host.setIcon(toggle, open ? "chevrons-down-up" : "chevrons-up-down");
    } else {
      toggle.setText(name);
    }
  }

  private setAll(open: boolean): void {
    for (const key of ["", ...nodeKeys(this.record.children, "")]) {
      this.options.state.setOpen(key, open);
    }
    for (const [, set] of this.nodes) {
      set(open);
    }
    this.refreshToggle();
  }

  private lines(parent: HTMLElement, lines: readonly RecordLine[], owner: RecordLine, parentKey: string, depth: number): void {
    const seen = new Map<string, number>();
    for (const line of lines) {
      const nth = seen.get(line.tag) ?? 0;
      seen.set(line.tag, nth + 1);
      const same = lines.filter((one) => one.tag === line.tag).length;
      this.row(parent, line, owner, keyOf(parentKey, line.tag, nth), depth, same > 1 ? nth + 1 : 0);
    }
  }

  private place(parent: HTMLElement, name: string, focusKey: string, clipped = false): void {
    const id = placeId(name);
    if (placeAt(this.options.index, id) === undefined) {
      parent.appendText(name);
      return;
    }
    const link = linkButton(parent, clipped ? "" : name, () => this.options.host.openRecord(id));
    link.setAttribute("data-focus-key", focusKey);
    if (clipped) {
      link.createSpan({ cls: "gedcom-tree-clip", text: name });
    }
  }

  /** What a closed node says of its line, as the parts of one line; a part that is a place is a link. */
  private summary(line: RecordLine, owner: RecordLine, fact: TreeFact | undefined): SummaryPart[] {
    const { index } = this.options;
    let value: string | undefined;
    if (line.void) {
      value = t("record.void");
    } else if (line.pointer !== undefined) {
      const target = index.record(line.pointer);
      value =
        target && (target.tag === "SNOTE" || target.tag === "NOTE") && target.text !== undefined
          ? target.text
          : (recordTitle(index, line.pointer) ?? t("desk.missingRecord"));
    } else if (line.text !== undefined && !(fact && line.text === "Y")) {
      value = valueText(line, owner);
    }
    const parts: SummaryPart[] = [];
    if (value !== undefined && value !== "") {
      parts.push({ text: firstLine(value), kind: "value" });
    }
    if (fact) {
      const date = fact.event.date?.text;
      const place = fact.event.place?.trim();
      if (date) {
        parts.push({ text: date, kind: "date" });
      }
      if (place) {
        parts.push({ text: place, kind: "place" });
      }
    }
    return parts;
  }

  private row(container: HTMLElement, line: RecordLine, owner: RecordLine, key: string, depth: number, ordinal: number): void {
    const { host, index, state, facts } = this.options;
    const root = depth === 0;
    const fact = root ? undefined : facts.get(line.range.start.line);
    const isNode = line.children.length > 0;
    const label = tagLabel(line.tag);
    const named = ordinal > 0 ? `${label} ${ordinal}` : label;
    const node = container.createDiv({
      cls: [
        "gedcom-tree-node", "tree-item",
        ...(isNode ? ["mod-collapsible"] : []),
        ...(root ? ["is-root"] : []),
      ],
    });
    node.setAttribute("data-depth", String(depth));
    node.setAttribute("data-key", key);
    const header = node.createDiv({
      cls: isNode ? ["gedcom-tree-row", "tree-item-self", "is-clickable", "mod-collapsible"] : "gedcom-tree-row",
    });
    header.setAttribute("data-line", String(line.range.start.line));

    let open = isNode && state.isOpen(key);
    drawn += 1;
    const childrenId = `gedcom-tree-children-${drawn}`;
    let chevron: HTMLElement | null = null;
    if (isNode) {
      chevron = header.createDiv({ cls: ["gedcom-tree-chevron", "tree-item-icon", "collapse-icon"] });
      host.setIcon?.(chevron, "right-triangle");
      chevron.setAttribute("role", "button");
      chevron.setAttribute("tabindex", "0");
      chevron.setAttribute("aria-label", named);
      chevron.setAttribute("aria-controls", childrenId);
      chevron.setAttribute("data-focus-key", `t:${key}`);
    }

    const name = header.createSpan({
      cls: isNode ? ["gedcom-tree-label", "tree-item-inner"] : "gedcom-tree-label",
      text: label,
    });
    name.id = labelId();
    const main = header.createDiv({ cls: "gedcom-tree-main" });

    const missing =
      line.pointer !== undefined && !line.void && recordTitle(index, line.pointer) === undefined;
    const rootName = root ? (recordTitle(index, line.xref ?? "") ?? "") : "";
    const detail: DetailContext = {
      index,
      host,
      notes: { drawn: 0, prefix: `${key}.` },
      open: { has: (id) => state.isOpen(id) },
      folded: (id, now) => state.setOpen(id, now),
    };
    const paintValue = (): void => {
      if (root) {
        return;
      }
      detail.notes = { drawn: 0, prefix: `${key}.` };
      if (line.void || line.pointer !== undefined) {
        renderPointer(main, line, detail, `t:${key}:link`);
        this.pick(main, line, owner, `t:${key}:pick`);
      } else if (line.text !== undefined && (line.tag === "NOTE" || line.tag === "SNOTE")) {
        renderNoteText(main, line.text, line.range.start.line, detail, `note:${key}`);
      } else if (line.text !== undefined && !(fact && line.text === "Y")) {
        if (line.tag === "PLAC") {
          this.place(main, line.text, `t:${key}:place`);
        } else {
          const choices = fieldKind(line, owner) === "choice" ? (host.choicesAt?.(line.range.start) ?? []) : [];
          if (choices.length > 0) {
            this.choice(main, line, owner, choices, name.id);
          } else {
            const field = renderField(main, valueText(line, owner), fieldKind(line, owner), { labelledBy: name.id });
            field.area.setAttribute("dir", "auto");
          }
        }
      }
    };
    const paintSummary = (): void => {
      const parts: SummaryPart[] = root ? (rootName === "" ? [] : [{ text: rootName, kind: "value" }]) : this.summary(line, owner, fact);
      if (parts.length > 0) {
        const text = main.createSpan({ cls: "gedcom-tree-summary" });
        text.setAttribute("dir", "auto");
        parts.forEach((part, at) => {
          if (at > 0) {
            text.createSpan({ cls: "gedcom-tree-join", text: " · " });
          }
          const one = text.createSpan({ cls: ["gedcom-tree-part", `is-${part.kind}`] });
          if (part.kind === "place") {
            this.place(one, part.text, `t:${key}:place`, true);
          } else {
            one.setText(part.text);
          }
        });
      }
      if (missing) {
        linkButton(main, t("desk.showInSource"), () => host.showInSource(line.range));
      }
      const cited = root ? 0 : line.children.filter((child) => child.tag === "SOUR").length;
      if (cited > 0) {
        const dot = main.createSpan({ cls: ["gedcom-desk-source", "has-source"] });
        const words = plural("desk.sources", cited);
        dot.setAttribute("role", "img");
        dot.setAttribute("aria-label", words);
        dot.setAttribute("title", words);
      }
    };
    const paint = (): void => {
      main.empty();
      if (isNode && !open) {
        paintSummary();
      } else {
        paintValue();
      }
    };

    const addable = host.addableAt ? host.addableAt(line.range.start) : null;
    const canAdd = addable ? addable.some((field) => !isFull(field)) : isNode;
    const canRemove = !root && (host.removableAt?.(owner.range.start, line.tag) ?? false) && host.removeAt !== undefined;
    const actions = canAdd || canRemove ? header.createDiv({ cls: "gedcom-tree-actions" }) : null;
    if (actions && canRemove) {
      const nested = descendants(line);
      const remove = actions.createDiv({ cls: ["gedcom-tree-remove", "clickable-icon"] });
      remove.setAttribute("role", "button");
      remove.setAttribute("tabindex", "0");
      remove.setAttribute("aria-label", t("tree.removeField"));
      remove.setAttribute("data-focus-key", `t:${key}:remove`);
      if (host.setIcon) {
        host.setIcon(remove, "trash-2");
      } else {
        remove.setText("×");
      }
      remove.addEventListener("click", (event) => {
        event.stopPropagation();
        host.removeAt?.(line.range.start, nested);
      });
      remove.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          event.stopPropagation();
          remove.click();
        }
      });
    }
    if (actions && canAdd) {
      const add = actions.createDiv({ cls: ["gedcom-tree-add", "clickable-icon"] });
      add.setAttribute("role", "button");
      add.setAttribute("tabindex", "0");
      add.setAttribute("aria-label", t("tree.addField"));
      add.setAttribute("data-focus-key", `t:${key}:add`);
      if (host.setIcon) {
        host.setIcon(add, "plus");
      } else {
        add.setText("+");
      }
      const choose = (event: MouseEvent): void => {
        event.stopPropagation();
        host.chooseField?.(event, (addable ?? []).map((field) => ({ title: tagLabel(field.tag), disabled: isFull(field) })));
      };
      add.addEventListener("click", choose);
      add.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          event.stopPropagation();
          add.click();
        }
      });
    }

    const children = isNode ? node.createDiv({ cls: ["gedcom-tree-children", "tree-item-children"] }) : null;
    let filled = false;
    const show = (): void => {
      node.toggleClass("is-open", open);
      node.toggleClass("is-collapsed", isNode && !open);
      chevron?.toggleClass("is-collapsed", !open);
      chevron?.setAttribute("aria-expanded", String(open));
      if (children) {
        children.toggleAttribute("hidden", !open);
        if (open && !filled) {
          filled = true;
          this.lines(children, line.children, line, key, depth + 1);
        }
      }
      paint();
    };
    if (children) {
      children.id = childrenId;
      this.nodes.set(key, (next) => {
        if (next !== open) {
          open = next;
          state.setOpen(key, next);
          show();
          this.refreshToggle();
        }
      });
      chevron?.addEventListener("click", () => this.nodes.get(key)?.(!open));
      chevron?.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          this.nodes.get(key)?.(!open);
        }
      });
      header.addEventListener("click", (click) => {
        if (!(click.target as HTMLElement).closest("button, [role=button], a, textarea, select")) {
          this.nodes.get(key)?.(!open);
        }
      });
    }
    show();
  }
}

/** The lines of a record as a tree of rows in the file's order, nodes closed until the reader opens them; none where the record states nothing but its opening line. */
export function renderTree(parent: HTMLElement, record: RecordLine, options: TreeOptions): void {
  if (record.children.length === 0) {
    return;
  }
  new Tree(parent.createDiv({ cls: "gedcom-tree" }), record, options).draw();
}
