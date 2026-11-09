import type { GenealogyIndex, PersonEvent, RecordLine } from "../../genealogy";
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

export interface TreeHost extends DetailHost {
  setIcon?(element: HTMLElement, icon: string): void;
}

export interface TreeOptions {
  index: GenealogyIndex;
  host: TreeHost;
  /** The facts of the record by the number of their line. */
  facts: ReadonlyMap<number, TreeFact>;
  state: TreeState;
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
    const bar = this.root.createDiv({ cls: "gedcom-tree-bar" });
    const toggle = bar.createEl("button", { cls: ["gedcom-tree-control", "gedcom-tree-toggle", "clickable-icon"] });
    toggle.setAttribute("type", "button");
    toggle.setAttribute("data-focus-key", "tree:toggle");
    tipPlace(toggle, "bottom");
    toggle.addEventListener("click", () => this.setAll(!this.allOpen()));
    this.toggle = toggle;
    this.refreshToggle();
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
      chevron = header.createEl("button", { cls: ["gedcom-tree-chevron", "tree-item-icon", "collapse-icon"] });
      host.setIcon?.(chevron, "right-triangle");
      chevron.setAttribute("type", "button");
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
      } else if (line.text !== undefined && (line.tag === "NOTE" || line.tag === "SNOTE")) {
        renderNoteText(main, line.text, line.range.start.line, detail, `note:${key}`);
      } else if (line.text !== undefined && !(fact && line.text === "Y")) {
        if (line.tag === "PLAC") {
          this.place(main, line.text, `t:${key}:place`);
        } else {
          const field = renderField(main, valueText(line, owner), fieldKind(line, owner), { labelledBy: name.id });
          field.area.setAttribute("dir", "auto");
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
      header.addEventListener("click", (click) => {
        if (!(click.target as HTMLElement).closest("button, a, textarea")) {
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
