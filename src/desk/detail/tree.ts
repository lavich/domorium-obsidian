import type { GenealogyIndex, PersonEvent, RecordLine } from "../../genealogy";
import { plural, t } from "../../i18n";
import { linkButton } from "../dom";
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

/** An event or an attribute the page knows on one of the lines of the record, and the id that opens its card. */
export interface TreeFact {
  eventId?: string;
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
  private pressedRow: HTMLElement | null = null;

  constructor(
    private readonly root: HTMLElement,
    private readonly record: RecordLine,
    private readonly options: TreeOptions,
  ) {}

  draw(): void {
    this.root.empty();
    this.nodes.clear();
    this.pressedRow = null;
    this.toolbar();
    this.lines(this.root.createDiv({ cls: "gedcom-tree-list" }), this.record.children, this.record, "", 1);
  }

  private redraw(): void {
    const active = this.root.ownerDocument.activeElement;
    const focused = active !== null && this.root.contains(active) ? active.closest("[data-focus-key]") : null;
    const focusKey = focused?.getAttribute("data-focus-key") ?? null;
    this.draw();
    if (focusKey !== null) {
      [...this.root.querySelectorAll<HTMLElement>("[data-focus-key]")]
        .find((one) => one.getAttribute("data-focus-key") === focusKey)
        ?.focus({ preventScroll: true });
    }
  }

  private toolbar(): void {
    const { state } = this.options;
    const bar = this.root.createDiv({ cls: "gedcom-tree-bar" });
    const button = (key: string, text: string, act: () => void): void => {
      const one = bar.createEl("button", { cls: "gedcom-tree-control", text });
      one.setAttribute("type", "button");
      one.setAttribute("data-focus-key", key);
      one.addEventListener("click", act);
    };
    button("tags", t(state.tags() ? "tree.hideTags" : "tree.showTags"), () => {
      state.setTags(!state.tags());
      if (state.changed) {
        state.changed();
      } else {
        this.redraw();
      }
    });
    button("tree:open", t("tree.openAll"), () => this.setAll(true));
    button("tree:close", t("tree.closeAll"), () => this.setAll(false));
  }

  private setAll(open: boolean): void {
    for (const key of nodeKeys(this.record.children, "")) {
      this.options.state.setOpen(key, open);
    }
    for (const [, set] of this.nodes) {
      set(open);
    }
  }

  private lines(parent: HTMLElement, lines: readonly RecordLine[], owner: RecordLine, parentKey: string, depth: number): void {
    const seen = new Map<string, number>();
    for (const line of lines) {
      const nth = seen.get(line.tag) ?? 0;
      seen.set(line.tag, nth + 1);
      this.row(parent, line, owner, keyOf(parentKey, line.tag, nth), depth);
    }
  }

  private place(parent: HTMLElement, name: string, focusKey: string): void {
    const id = placeId(name);
    if (placeAt(this.options.index, id) === undefined) {
      parent.appendText(name);
      return;
    }
    linkButton(parent, name, () => this.options.host.openRecord(id)).setAttribute("data-focus-key", focusKey);
  }

  /** What a closed node says of its line, as the parts of one line; a part that is a place is a link. */
  private summary(line: RecordLine, owner: RecordLine, fact: TreeFact | undefined): { text: string; place?: boolean }[] {
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
    const parts: { text: string; place?: boolean }[] = [];
    if (value !== undefined && value !== "") {
      parts.push({ text: firstLine(value) });
    }
    if (fact) {
      const date = fact.event.date?.text;
      const place = fact.event.place?.trim();
      if (date) {
        parts.push({ text: date });
      }
      if (place) {
        parts.push({ text: place, place: true });
      }
    }
    return parts;
  }

  private row(container: HTMLElement, line: RecordLine, owner: RecordLine, key: string, depth: number): void {
    const { host, index, state, facts } = this.options;
    const fact = facts.get(line.range.start.line);
    const isNode = line.children.length > 0;
    const label = tagLabel(line.tag);
    const node = container.createDiv({ cls: "gedcom-tree-node" });
    node.setAttribute("data-depth", String(depth));
    node.setAttribute("data-key", key);
    const header = node.createDiv({ cls: "gedcom-tree-row" });
    header.setAttribute("data-line", String(line.range.start.line));
    header.addEventListener("pointerdown", () => {
      this.pressedRow?.removeClass("is-pressed");
      this.pressedRow = header;
      header.addClass("is-pressed");
      state.press(key);
    });
    if (state.pressed() === key) {
      this.pressedRow = header;
      header.addClass("is-pressed");
    }

    let open = isNode && state.isOpen(key);
    drawn += 1;
    const childrenId = `gedcom-tree-children-${drawn}`;
    let chevron: HTMLElement | null = null;
    if (isNode) {
      chevron = header.createEl("button", { cls: "gedcom-tree-chevron" });
      chevron.setAttribute("type", "button");
      chevron.setAttribute("aria-label", t("tree.toggle", { name: label }));
      chevron.setAttribute("aria-controls", childrenId);
      chevron.setAttribute("data-focus-key", `t:${key}`);
    }

    const name = fact?.eventId === undefined
      ? header.createSpan({ cls: "gedcom-tree-label", text: label })
      : header.createEl("button", { cls: "gedcom-tree-label is-fact", text: label });
    name.id = labelId();
    if (fact?.eventId !== undefined) {
      const eventId = fact.eventId;
      name.setAttribute("type", "button");
      name.setAttribute("data-focus-key", `t:${key}:label`);
      name.addEventListener("click", () => host.openRecord(eventId));
    }
    if (state.tags() && label !== line.tag) {
      header.createSpan({ cls: "gedcom-tree-tag", text: line.tag });
    }
    const main = header.createDiv({ cls: "gedcom-tree-main" });

    const missing =
      line.pointer !== undefined && !line.void && recordTitle(index, line.pointer) === undefined;
    if (!missing) {
      const source = header.createEl("button", { cls: "gedcom-tree-source" });
      source.setAttribute("type", "button");
      source.setAttribute("aria-label", t("tree.showInSource", { name: label }));
      source.setAttribute("data-focus-key", `src:${key}`);
      if (host.setIcon) {
        host.setIcon(source, "code");
      } else {
        source.setText("</>");
      }
      source.addEventListener("click", () => host.showInSource(line.range));
    }

    const detail: DetailContext = {
      index,
      host,
      notes: { drawn: 0, prefix: `${key}.` },
      open: { has: (id) => state.isOpen(id) },
      folded: (id, now) => state.setOpen(id, now),
    };
    const paintValue = (): void => {
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
      const parts = this.summary(line, owner, fact);
      if (parts.length > 0) {
        const text = main.createSpan({ cls: "gedcom-tree-summary" });
        text.setAttribute("dir", "auto");
        parts.forEach((part, at) => {
          if (at > 0) {
            text.createSpan({ cls: "gedcom-tree-join", text: " · " });
          }
          const one = text.createSpan({ cls: "gedcom-tree-part" });
          if (part.place) {
            this.place(one, part.text, `t:${key}:place`);
          } else {
            one.setText(part.text);
          }
        });
      }
      const cited = line.children.filter((child) => child.tag === "SOUR").length;
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

    const children = isNode ? node.createDiv({ cls: "gedcom-tree-children" }) : null;
    let filled = false;
    const show = (): void => {
      node.toggleClass("is-open", open);
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
        }
      });
      chevron?.addEventListener("click", () => this.nodes.get(key)?.(!open));
    }
    show();

    if (!isNode && header.querySelector("button:not(.gedcom-tree-source), a") === null) {
      header.querySelector(".gedcom-tree-source")?.setAttribute("tabindex", "-1");
    }
  }
}

/** The lines of a record as a tree of rows in the file's order, nodes closed until the reader opens them; none where the record states nothing but its opening line. */
export function renderTree(parent: HTMLElement, record: RecordLine, options: TreeOptions): void {
  if (record.children.length === 0) {
    return;
  }
  new Tree(parent.createDiv({ cls: "gedcom-tree" }), record, options).draw();
}
