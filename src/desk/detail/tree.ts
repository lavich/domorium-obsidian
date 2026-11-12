import type {
  PointerCandidate,
  Position,
  StructureFieldDescription,
  StructureInput,
  StructureValueInput,
} from "@domorium/language-service";

import type { GenealogyIndex, PersonEvent, RecordLine } from "../../genealogy";
import { isFull, type Choices } from "../addableFields";
import { addPlan, refusalText, STALE, type Refusal, type WriteOutcome } from "../edits";
import { plural, t } from "../../i18n";
import { linkButton, tipPlace } from "../dom";
import { drawPicture, type MediaItem } from "../media";
import type { FileOutcome } from "../mediaFile";
import { EditableField, showMessage } from "./fieldEdit";
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
import { unwrittenId, type FocusWish, type TreeState, type Unwritten } from "./treeSession";

/** An event or an attribute the page knows on one of the lines of the record. */
export interface TreeFact {
  event: PersonEvent;
}

/** Where a menu opens: at the pointer, or under its control when the keyboard opened it. */
export interface MenuAt {
  x: number;
  y: number;
}

/** A field the menu names; `disabled` where it cannot be added. */
export interface FieldChoice {
  title: string;
  icon?: string;
  disabled: boolean;
  choose: () => void;
}

/** One of the values of a field that may hold several, checked where the line holds it. */
export interface ValueChoice {
  title: string;
  checked: boolean;
  toggle: () => void;
}

/** A record a pointer may point at, named for the list. */
export interface PointerChoice {
  title: string;
  xref: string;
  checked: boolean;
}

export interface TreeHost extends DetailHost {
  setIcon?(element: HTMLElement, icon: string): void;
  /** The fields the dialect lets be added beneath the line at this position. */
  addableAt?(at: Position): StructureFieldDescription[];
  /** The values the standard limits the line to, or none where it limits no list. */
  choicesAt?(at: Position): Choices | null;
  /** Whether a line break is the ordinary case of the line's value. */
  proseAt?(at: Position): boolean;
  /** Whether the standard gives the line at this position a value at all, as it does a shared note's opening line and not a person's. */
  holdsValueAt?(at: Position): boolean;
  /** The records a pointer of this tag under the line at `parent` may point at. */
  pointerChoicesAt?(parent: Position, tag: string): PointerCandidate[];
  /** Whether a pointer of this tag under the line at `parent` is one the standard pairs with one back. */
  pairedAt?(parent: Position, tag: string): boolean;
  /** Whether the line with this tag under the line at `parent` may go without breaking the standard. */
  removableAt?(parent: Position, tag: string): boolean;
  /** The lines the standard requires beneath a new field. */
  requiredBeneath?(field: StructureFieldDescription): StructureFieldDescription[];
  /** Why the service would refuse a value under the line at `at`, or at it where `replacing`. */
  checkValue?(at: Position, tag: string, input: StructureValueInput, replacing: boolean): Refusal | null;
  setValueAt?(at: Position, input: StructureValueInput): WriteOutcome;
  addAt?(parent: Position, tag: string, input: StructureInput): WriteOutcome;
  /** Removes the line at this position, asking first where `nested` lines go with it. */
  removeAt?(at: Position, nested: number, done: (outcome: WriteOutcome) => void): void;
  /** Draws the card again from the text, at once, after a write of its own. */
  settle?(): void;
  /** Says something through the card's polite live region. */
  announce?(text: string): void;
  chooseField?(at: MenuAt, fields: FieldChoice[]): void;
  chooseValues?(at: MenuAt, values: ValueChoice[]): void;
  /** Opens a searchable list of the records a pointer may point at. */
  choosePointer?(choices: PointerChoice[], chosen: (xref: string) => void): void;
  /** Set where the card could write but the service does not describe the record. */
  uneditable?: boolean;
  mediaFileAt?(line: RecordLine): MediaItem | null;
  replaceFile?(at: MenuAt, line: RecordLine, done: (outcome: FileOutcome) => void): void;
  openFile?(path: string): void;
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

function linesByKey(line: RecordLine, key: string, into: Map<string, RecordLine>): Map<string, RecordLine> {
  into.set(key, line);
  const seen = new Map<string, number>();
  for (const child of line.children) {
    const nth = seen.get(child.tag) ?? 0;
    seen.set(child.tag, nth + 1);
    linesByKey(child, keyOf(key, child.tag, nth), into);
  }
  return into;
}

const descendants = (line: RecordLine): number =>
  line.children.reduce((sum, child) => sum + 1 + descendants(child), 0);

const firstLine = (text: string): string => text.split("\n")[0] ?? "";

const pressable = (element: HTMLElement, label: string, focusKey: string): void => {
  element.setAttribute("role", "button");
  element.setAttribute("tabindex", "0");
  element.setAttribute("aria-label", label);
  element.setAttribute("data-focus-key", focusKey);
  element.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      event.stopPropagation();
      element.click();
    }
  });
};

function menuAt(event: MouseEvent, control: HTMLElement): MenuAt {
  if (event.detail === 0) {
    const box = control.getBoundingClientRect();
    return { x: box.left, y: box.bottom };
  }
  return { x: event.clientX, y: event.clientY };
}

const multipleText = (values: readonly string[]): string => values.join(", ");
const multipleValues = (text: string): string[] =>
  text.split(",").map((one) => one.trim()).filter((one) => one !== "");

class Tree {
  private readonly nodes = new Map<string, (open: boolean) => void>();
  private toggle: HTMLElement | null = null;
  private active: EditableField | null = null;

  constructor(
    private readonly root: HTMLElement,
    private readonly record: RecordLine,
    private readonly options: TreeOptions,
  ) {
    root.addEventListener("pointerdown", (event) => this.commitFirst(event), true);
  }

  private get editable(): boolean {
    return this.options.host.setValueAt !== undefined;
  }

  draw(): void {
    this.root.empty();
    this.nodes.clear();
    this.active = null;
    this.dropOrphans();
    this.toolbar();
    if (this.options.host.uneditable) {
      this.root.createDiv({ cls: "gedcom-tree-note", text: t("edit.noDialect") });
    }
    this.row(this.root.createDiv({ cls: "gedcom-tree-list" }), this.record, this.record, "", 0, 0);
    this.focusWished();
  }

  private live(): boolean {
    return this.root.isConnected;
  }

  /** A press on another control writes the value being typed first, and then acts on the card drawn from it. */
  private commitFirst(event: PointerEvent): void {
    const active = this.active;
    const target = event.target as HTMLElement;
    if (!active?.pending() || active.owns(target)) {
      return;
    }
    const control = target.closest<HTMLElement>("[data-focus-key]");
    const row = control ? null : target.closest<HTMLElement>(".gedcom-tree-node");
    const key = control?.getAttribute("data-focus-key") ?? (row ? `t:${row.getAttribute("data-key") ?? ""}` : null);
    if (key === null) {
      return;
    }
    event.preventDefault();
    const card = this.root.closest(".gedcom-card") ?? this.root.ownerDocument;
    active.commit();
    if (this.live()) {
      return;
    }
    const twin = [...card.querySelectorAll<HTMLElement>("[data-focus-key]")].find((one) => one.getAttribute("data-focus-key") === key);
    if (twin instanceof HTMLTextAreaElement || twin instanceof HTMLSelectElement) {
      twin.focus();
    } else {
      twin?.click();
    }
  }

  private settle(): void {
    this.options.host.settle?.();
  }

  private say(text: string): void {
    this.options.host.announce?.(text);
  }

  private focusWished(): void {
    const wish = this.options.state.takeFocus();
    if (!wish) {
      return;
    }
    const target = this.wished(wish);
    if (target) {
      target.focus();
      target.scrollIntoView({ block: "nearest" });
    }
  }

  private wished(wish: FocusWish): HTMLElement | null {
    const keyed = (focusKey: string): HTMLElement | null =>
      [...this.root.querySelectorAll<HTMLElement>("[data-focus-key]")].find((one) => one.getAttribute("data-focus-key") === focusKey) ?? null;
    if ("unwritten" in wish) {
      return this.root.querySelector<HTMLElement>(`[data-unwritten="${wish.unwritten}"] :is(textarea, select, [role=button])`);
    }
    if ("key" in wish) {
      return wish.parts.map((part) => keyed(part === "" ? `t:${wish.key}` : `t:${wish.key}:${part}`)).find((one) => one !== null) ?? keyed("tree:toggle");
    }
    const node = [...this.root.querySelectorAll<HTMLElement>(".gedcom-tree-node")].find(
      (one) => one.getAttribute("data-line") === String(wish.line) && one.parentElement?.closest(".gedcom-tree-node")?.getAttribute("data-key") === wish.under,
    );
    const key = node?.getAttribute("data-key");
    return key === undefined || key === null ? null : this.wished({ key, parts: wish.parts });
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

  /** Unwritten rows whose line is gone, or reads otherwise than when the row was made, are dropped. */
  private dropOrphans(): void {
    const { state } = this.options;
    const lines = linesByKey(this.record, "", new Map());
    for (const key of state.unwrittenParents()) {
      const line = lines.get(key);
      state.setUnwritten(
        key,
        state.unwritten(key).filter((row) => line !== undefined && line.tag === row.parent.tag && line.text === row.parent.text),
      );
    }
  }

  private pick(parent: HTMLElement, line: RecordLine, owner: RecordLine, key: string): void {
    const { host } = this.options;
    if (line.void || line.pointer === undefined || !this.editable || !host.pointerChoicesAt || !host.choosePointer) {
      return;
    }
    if (host.pairedAt?.(owner.range.start, line.tag)) {
      parent.createDiv({ cls: "gedcom-tree-paired", text: t("edit.paired") });
      return;
    }
    const candidates = host.pointerChoicesAt(owner.range.start, line.tag);
    if (candidates.length === 0) {
      return;
    }
    const button = parent.createDiv({ cls: ["gedcom-tree-pick", "clickable-icon"] });
    pressable(button, t("tree.changePointer"), `t:${key}:pick`);
    if (host.setIcon) {
      host.setIcon(button, "chevron-down");
    } else {
      button.setText("▾");
    }
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      if (!this.live()) {
        return;
      }
      host.choosePointer?.(this.pointerChoices(candidates, line.pointer), (xref) => {
        if (xref !== line.pointer) {
          this.writeValue(line, key, { pointer: xref });
        }
      });
    });
  }

  private pointerChoices(candidates: readonly PointerCandidate[], current?: string): PointerChoice[] {
    const { index } = this.options;
    return candidates.map((one) => ({
      title: recordTitle(index, one.xref) ?? one.label ?? one.xref,
      xref: one.xref,
      checked: one.xref === current,
    }));
  }

  /** Writes a value of a line and draws the card again, or says under the line why it was not written. */
  private writeValue(line: RecordLine, key: string, input: StructureValueInput, field?: EditableField, control?: HTMLElement): void {
    const { host, state } = this.options;
    const outcome = host.setValueAt?.(line.range.start, input);
    if (!outcome) {
      return;
    }
    if (outcome.ok) {
      field?.wrote(input.value ?? "");
      const warning = outcome.warnings.length > 0 ? { text: outcome.warnings.join(" "), kind: "warning" as const } : undefined;
      state.setMessage(key, warning);
      if (warning) {
        this.say(warning.text);
      }
      this.settle();
      return;
    }
    const message = { text: refusalText(outcome), kind: "error" as const };
    if (field) {
      field.refused(message);
    } else {
      state.setMessage(key, message);
      if (control) {
        showMessage(control, control, message);
      }
    }
    this.say(message.text);
    if (outcome.code === STALE) {
      this.settle();
    }
  }

  private choice(parent: HTMLElement, line: RecordLine, owner: RecordLine, key: string, values: readonly string[], labelledBy: string): void {
    const written = line.text ?? "";
    const listed = values.includes(written) ? values : [written, ...values];
    const select = parent.createEl("select", { cls: ["dropdown", "gedcom-tree-choice"] });
    select.setAttribute("aria-labelledby", labelledBy);
    select.setAttribute("data-kind", "choice");
    select.setAttribute("data-focus-key", `t:${key}:value`);
    for (const value of listed) {
      const option = select.createEl("option", { text: valueText({ ...line, text: value }, owner) });
      option.value = value;
    }
    select.value = written;
    showMessage(select, select, this.options.state.message(key));
    select.addEventListener("change", () => {
      if (this.live() && select.value !== written) {
        this.writeValue(line, key, { value: select.value }, undefined, select);
      }
    });
  }

  private several(parent: HTMLElement, label: string, current: readonly string[], values: readonly string[], focusKey: string, set: (values: string[]) => void): HTMLElement {
    const { host } = this.options;
    const button = parent.createDiv({ cls: ["gedcom-tree-several", "clickable-icon"] });
    pressable(button, t("edit.chooseValues", { field: label }), focusKey);
    button.setText(current.length > 0 ? multipleText(current) : t("edit.noValues"));
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      if (!this.live()) {
        return;
      }
      host.chooseValues?.(
        menuAt(event, button),
        values.map((value) => ({
          title: value,
          checked: current.includes(value),
          toggle: () => set(current.includes(value) ? current.filter((one) => one !== value) : values.filter((one) => one === value || current.includes(one))),
        })),
      );
    });
    return button;
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
    for (const row of this.options.state.unwritten(parentKey)) {
      this.unwrittenRow(parent, row, owner, parentKey, depth);
    }
  }

  /** The control beside a shared note's text, drawn where the pointer is, that opens the note's own card. */
  private noteControl(parent: HTMLElement, line: RecordLine, key: string): void {
    const { host, index } = this.options;
    const xref = line.pointer;
    const target = xref === undefined ? undefined : index.record(xref);
    if (xref === undefined || (target?.tag !== "SNOTE" && target?.tag !== "NOTE")) {
      return;
    }
    const button = createDiv({ cls: ["gedcom-tree-open-note", "clickable-icon"] });
    parent.insertBefore(button, parent.querySelector(":scope > .gedcom-detail"));
    pressable(button, t("desk.openNote"), `t:${key}:note`);
    if (host.setIcon) {
      host.setIcon(button, "sticky-note");
    } else {
      button.setText("↗");
    }
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      if (this.live()) {
        host.openRecord(xref);
      }
    });
  }

  private fileControl(parent: HTMLElement, line: RecordLine, key: string): void {
    const { host, state } = this.options;
    const item = host.mediaFileAt?.(line) ?? null;
    const path = line.text ?? "";
    const name = item?.content.kind === "image" ? (item.content.title ?? item.content.name) : path;
    const replaces = this.editable && host.replaceFile !== undefined;
    const opens = !replaces && item?.path !== undefined && host.openFile !== undefined;
    const control = parent.createDiv({ cls: ["gedcom-tree-file", ...(replaces || opens ? ["clickable-icon"] : [])] });
    if (item?.content.kind === "image") {
      control.addClass("is-picture");
      drawPicture(control, item.content, 320, 160);
    } else {
      const icon = control.createSpan({ cls: "gedcom-tree-file-icon" });
      if (host.setIcon) {
        host.setIcon(icon, "file");
      }
      control.createSpan({ cls: "gedcom-tree-file-path", text: path }).setAttribute("dir", "auto");
    }
    if (replaces) {
      pressable(control, t("media.change", { file: name }), `t:${key}:file`);
      control.addEventListener("click", (event) => {
        event.stopPropagation();
        if (!this.live()) {
          return;
        }
        host.replaceFile?.(menuAt(event, control), line, (outcome) => this.fileChosen(key, outcome));
      });
      showMessage(control, control, state.message(key));
    } else if (opens) {
      const vaultPath = item.path;
      pressable(control, t("media.open", { file: name }), `t:${key}:file`);
      control.addEventListener("click", (event) => {
        event.stopPropagation();
        if (vaultPath !== undefined) {
          host.openFile?.(vaultPath);
        }
      });
    }
  }

  private fileChosen(key: string, outcome: FileOutcome): void {
    const { state } = this.options;
    if (outcome.ok) {
      const warning = outcome.warnings.length > 0 ? { text: outcome.warnings.join(" "), kind: "warning" as const } : undefined;
      state.setMessage(key, warning);
      if (warning) {
        this.say(warning.text);
      }
      state.wishFocus({ key, parts: ["file"] });
      this.settle();
      return;
    }
    const reason = refusalText(outcome);
    const text = "copied" in outcome && outcome.copied !== undefined ? t("media.copyKept", { reason, path: outcome.copied }) : reason;
    state.setMessage(key, { text, kind: "error" });
    this.say(text);
    if (outcome.code === STALE || !this.live()) {
      this.settle();
    } else {
      this.redraw();
    }
  }

  /** The value a record's own opening line writes: a field where the standard gives that line one and the card writes, as read otherwise. */
  private rootValue(main: HTMLElement, line: RecordLine, key: string, labelledBy: string, detail: DetailContext): void {
    const text = line.text;
    if (text === undefined) {
      return;
    }
    if (this.editable && (this.options.host.holdsValueAt?.(line.range.start) ?? false)) {
      this.valueField(main, line, line, key, labelledBy);
      return;
    }
    if (line.tag === "SNOTE" || line.tag === "NOTE") {
      renderNoteText(main, text, line.range.start.line, detail, `note:${key}`);
      return;
    }
    renderField(main, text, "text", { labelledBy }).area.setAttribute("dir", "auto");
  }

  /** What a closed node says of its line, as the parts of one line. */
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

  private valueField(main: HTMLElement, line: RecordLine, owner: RecordLine, key: string, labelledBy: string): void {
    const { host, state } = this.options;
    const text = line.text ?? "";
    if (!this.editable) {
      const field = renderField(main, valueText(line, owner), fieldKind(line, owner), { labelledBy });
      field.area.setAttribute("dir", "auto");
      return;
    }
    const choices = host.choicesAt?.(line.range.start) ?? null;
    if (choices && !choices.multiple) {
      this.choice(main, line, owner, key, choices.values, labelledBy);
      return;
    }
    if (choices?.multiple) {
      const current = multipleValues(text);
      const button = this.several(main, tagLabel(line.tag), current, choices.values, `t:${key}:value`, (next) =>
        this.writeValue(line, key, { value: multipleText(next) }, undefined, button),
      );
      showMessage(button, button, state.message(key));
      return;
    }
    new EditableField(main, {
      key,
      prose: host.proseAt?.(line.range.start) ?? false,
      fileText: text,
      readerText: valueText(line, owner),
      labelledBy,
      state,
      focusKey: `t:${key}:value`,
      ...(host.setIcon ? { setIcon: host.setIcon.bind(host) } : {}),
      write: (value, field) => this.writeValue(line, key, { value }, field),
      focused: (field, on) => {
        this.active = on ? field : this.active === field ? null : this.active;
      },
    });
  }

  private row(container: HTMLElement, line: RecordLine, owner: RecordLine, key: string, depth: number, ordinal: number): void {
    const { host, index, state, facts } = this.options;
    const root = depth === 0;
    const fact = root ? undefined : facts.get(line.range.start.line);
    const unwritten = state.unwritten(key);
    const isNode = line.children.length > 0 || unwritten.length > 0;
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
    node.setAttribute("data-line", String(line.range.start.line));
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

    const isFile = !root && line.tag === "FILE" && owner.tag === "OBJE" && line.text !== undefined;
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
        this.rootValue(main, line, key, name.id, detail);
        return;
      }
      detail.notes = { drawn: 0, prefix: `${key}.` };
      if (isFile) {
        this.fileControl(main, line, key);
      } else if (line.void || line.pointer !== undefined) {
        renderPointer(main, line, detail, `t:${key}:link`);
        this.noteControl(main, line, key);
        this.pick(main, line, owner, key);
      } else if (line.text !== undefined && (line.tag === "NOTE" || line.tag === "SNOTE") && !this.editable) {
        renderNoteText(main, line.text, line.range.start.line, detail, `note:${key}`);
      } else if (line.text !== undefined && !(fact && line.text === "Y")) {
        this.valueField(main, line, owner, key, name.id);
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
          text.createSpan({ cls: ["gedcom-tree-part", `is-${part.kind}`], text: part.text });
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
      if (isNode && !open && !isFile) {
        paintSummary();
      } else {
        paintValue();
      }
    };

    const addable = host.addAt ? (host.addableAt?.(line.range.start) ?? []) : [];
    const canAdd = addable.length > 0;
    const canRemove = !root && host.removeAt !== undefined && (host.removableAt?.(owner.range.start, line.tag) ?? false);
    const actions = canAdd || canRemove ? header.createDiv({ cls: "gedcom-tree-actions" }) : null;
    if (actions) {
      header.setAttribute("data-actions", String(Number(canAdd) + Number(canRemove)));
    }
    if (actions && canRemove) {
      const remove = actions.createDiv({ cls: ["gedcom-tree-remove", "clickable-icon"] });
      pressable(remove, t("tree.removeField"), `t:${key}:remove`);
      if (host.setIcon) {
        host.setIcon(remove, "trash-2");
      } else {
        remove.setText("×");
      }
      const ownerKey = key.includes(".") ? key.slice(0, key.lastIndexOf(".")) : "";
      remove.addEventListener("click", (event) => {
        event.stopPropagation();
        if (!this.live()) {
          return;
        }
        host.removeAt?.(line.range.start, descendants(line), (outcome) => {
          if (outcome.ok) {
            state.setMessage(key, undefined);
            state.wishFocus({ key: ownerKey, parts: ["add", ""] });
            this.settle();
            return;
          }
          this.say(refusalText(outcome));
          if (outcome.code === STALE) {
            this.settle();
          }
        });
      });
    }
    if (actions && canAdd) {
      const add = actions.createDiv({ cls: ["gedcom-tree-add", "clickable-icon"] });
      pressable(add, t("tree.addField"), `t:${key}:add`);
      if (host.setIcon) {
        host.setIcon(add, "plus");
      } else {
        add.setText("+");
      }
      add.addEventListener("click", (event) => {
        event.stopPropagation();
        if (this.live()) {
          host.chooseField?.(menuAt(event, add), this.fieldChoices(line, key, addable));
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

  /** The entries of a line's menu: every field the dialect allows beneath it, those that cannot be added disabled. */
  private fieldChoices(line: RecordLine, key: string, fields: readonly StructureFieldDescription[]): FieldChoice[] {
    const offPointer = (field: StructureFieldDescription): boolean => field.reciprocal || (field.candidates ?? []).length === 0;
    return fields.flatMap((field): FieldChoice[] => {
      const title = tagLabel(field.tag);
      const full = isFull(field);
      if (field.payload.kind === "text-or-pointer") {
        return [
          { title: t("edit.asText", { field: title }), disabled: full, choose: () => this.add(line, key, field, "text") },
          { title: t("edit.asRecord", { field: title }), disabled: full || offPointer(field), choose: () => this.add(line, key, field, "pointer") },
        ];
      }
      const disabled = full || (field.payload.kind === "pointer" && offPointer(field));
      return [{ title, disabled, choose: () => this.add(line, key, field, "text") }];
    });
  }

  private add(line: RecordLine, key: string, field: StructureFieldDescription, as: "text" | "pointer"): void {
    const { host, state } = this.options;
    const plan = addPlan(field, as);
    if (plan.kind === "now") {
      this.written(host.addAt?.(line.range.start, field.tag, plan.input), key, ["add", "value", ""]);
      return;
    }
    const required = host.requiredBeneath?.(field) ?? [];
    const unwritten = (pointer?: string): void => {
      const row: Unwritten = {
        id: unwrittenId(),
        field,
        value: "",
        ...(pointer === undefined ? {} : { pointer }),
        children: required.map((one) => ({ field: one, value: "" })),
        parent: { tag: line.tag, text: line.text, range: line.range },
      };
      state.setUnwritten(key, [...state.unwritten(key), row]);
      state.setOpen(key, true);
      state.wishFocus({ unwritten: row.id });
      this.redraw();
    };
    if (plan.kind === "pointer") {
      host.choosePointer?.(this.pointerChoices(field.candidates ?? []), (xref) => {
        if (required.length > 0) {
          unwritten(xref);
        } else {
          this.written(host.addAt?.(line.range.start, field.tag, { pointer: xref }), key, ["pick", "link", "add"]);
        }
      });
      return;
    }
    unwritten();
  }

  /** After a line was added: its parent opened and the focus on the new line, or the refusal said. */
  private written(outcome: WriteOutcome | undefined, under: string, parts: string[]): boolean {
    if (!outcome) {
      return false;
    }
    if (!outcome.ok) {
      this.say(refusalText(outcome));
      if (outcome.code === STALE) {
        this.settle();
      }
      return false;
    }
    this.options.state.setOpen(under, true);
    this.options.state.wishFocus({ under, line: outcome.line, parts });
    this.settle();
    return true;
  }

  private redraw(): void {
    if (this.live()) {
      this.draw();
    } else {
      this.settle();
    }
  }

  /** A field chosen in a menu, drawn with what the standard requires beneath it, written once each has a value. */
  private unwrittenRow(container: HTMLElement, row: Unwritten, owner: RecordLine, parentKey: string, depth: number): void {
    const { host, state } = this.options;
    const node = container.createDiv({ cls: ["gedcom-tree-node", "tree-item", "is-unwritten"] });
    node.setAttribute("data-depth", String(depth));
    node.setAttribute("data-unwritten", String(row.id));
    node.setAttribute("title", t("edit.unwritten"));
    const messageKey = `u:${row.id}`;
    const save = (next: Unwritten): void => {
      state.setUnwritten(parentKey, state.unwritten(parentKey).map((one) => (one.id === row.id ? next : one)));
    };
    const drop = (): void => {
      state.setUnwritten(parentKey, state.unwritten(parentKey).filter((one) => one.id !== row.id));
      state.setMessage(messageKey, undefined);
    };
    const empty = (one: Unwritten): boolean =>
      one.value === "" && one.pointer === undefined && one.children.every((child) => child.value === "");
    const complete = (one: Unwritten): boolean =>
      (one.value !== "" || one.pointer !== undefined || !one.field.payloadRequired || one.field.payload.kind === "none") &&
      one.children.every((child) => child.value !== "") &&
      !empty(one);
    const current = (): Unwritten => state.unwritten(parentKey).find((one) => one.id === row.id) ?? row;
    let mainControl: HTMLElement | null = null;
    const refuse = (refusal: Refusal): void => {
      const message = { text: refusalText(refusal), kind: "error" as const };
      state.setMessage(messageKey, message);
      if (mainControl) {
        showMessage(mainControl.closest(".gedcom-field") ?? mainControl, mainControl, message);
      }
      this.say(message.text);
    };
    const changed = (next: Unwritten): void => {
      save(next);
      if (next.value !== "" && host.checkValue) {
        const refusal = host.checkValue(owner.range.start, next.field.tag, { value: next.value }, false);
        if (refusal) {
          refuse(refusal);
          return;
        }
      }
      if (!complete(next)) {
        return;
      }
      const input: StructureInput = {
        ...(next.pointer === undefined ? (next.value === "" ? {} : { value: next.value }) : { pointer: next.pointer }),
        ...(next.children.length > 0 ? { children: next.children.map((child) => ({ tag: child.field.tag, value: child.value })) } : {}),
      };
      const outcome = host.addAt?.(owner.range.start, next.field.tag, input);
      if (!outcome) {
        return;
      }
      if (outcome.ok) {
        drop();
        this.written(outcome, parentKey, ["value", "add", ""]);
      } else {
        refuse(outcome);
        if (outcome.code === STALE) {
          this.settle();
        }
      }
    };
    const gone = (): void => {
      if (!node.isConnected || node.contains(node.ownerDocument.activeElement)) {
        return;
      }
      if (empty(current())) {
        drop();
        this.redraw();
      }
    };
    const left = (): void => {
      window.setTimeout(gone, 0);
    };

    const control = (parent: HTMLElement, field: StructureFieldDescription, value: string, labelledBy: string, key: string, set: (value: string) => void): HTMLElement => {
      const { payload } = field;
      if (payload.kind === "enum" && !payload.multiple) {
        const select = parent.createEl("select", { cls: ["dropdown", "gedcom-tree-choice"] });
        select.setAttribute("aria-labelledby", labelledBy);
        select.setAttribute("data-focus-key", key);
        select.createEl("option", { text: "" }).value = "";
        for (const one of payload.values) {
          select.createEl("option", { text: valueText({ tag: field.tag, text: one } as RecordLine, { tag: owner.tag } as RecordLine) }).value = one;
        }
        select.value = value;
        select.addEventListener("change", () => set(select.value));
        select.addEventListener("blur", left);
        return select;
      }
      if (payload.kind === "enum") {
        const button = this.several(parent, tagLabel(field.tag), multipleValues(value), payload.values, key, (next) => set(multipleText(next)));
        button.addEventListener("blur", left);
        return button;
      }
      const editor = new EditableField(parent, {
        key: `${messageKey}:${field.tag}`,
        prose: field.prose,
        fileText: value,
        readerText: value,
        labelledBy,
        state,
        focusKey: key,
        ...(host.setIcon ? { setIcon: host.setIcon.bind(host) } : {}),
        write: (text, self) => {
          self.wrote(text);
          set(text);
        },
        focused: (field, on) => {
          this.active = on ? field : this.active === field ? null : this.active;
        },
        left: gone,
      });
      return editor.field.area;
    };

    const header = node.createDiv({ cls: "gedcom-tree-row" });
    const name = header.createSpan({ cls: "gedcom-tree-label", text: tagLabel(row.field.tag) });
    name.id = labelId();
    const main = header.createDiv({ cls: "gedcom-tree-main" });
    if (row.pointer !== undefined) {
      main.createSpan({ cls: "gedcom-tree-chosen", text: recordTitle(this.options.index, row.pointer) ?? row.pointer });
    } else if (row.field.payload.kind !== "none") {
      mainControl = control(main, row.field, row.value, name.id, `u:${row.id}:value`, (value) => changed({ ...current(), value }));
      const message = state.message(messageKey);
      showMessage(mainControl.closest(".gedcom-field") ?? mainControl, mainControl, message);
    }
    if (row.children.length > 0) {
      const children = node.createDiv({ cls: ["gedcom-tree-children", "tree-item-children"] });
      row.children.forEach((child, at) => {
        const childNode = children.createDiv({ cls: ["gedcom-tree-node", "tree-item", "is-unwritten"] });
        childNode.setAttribute("data-depth", String(depth + 1));
        const childRow = childNode.createDiv({ cls: "gedcom-tree-row" });
        const childName = childRow.createSpan({ cls: "gedcom-tree-label", text: tagLabel(child.field.tag) });
        childName.id = labelId();
        const childMain = childRow.createDiv({ cls: "gedcom-tree-main" });
        const made = control(childMain, child.field, child.value, childName.id, `u:${row.id}:${child.field.tag}`, (value) => {
          const now = current();
          changed({ ...now, children: now.children.map((one, which) => (which === at ? { ...one, value } : one)) });
        });
        if (mainControl === null) {
          mainControl = made;
        }
      });
    }
  }
}

/** The lines of a record as a tree of rows in the file's order, beneath its opening line; nodes are closed until the reader opens them. */
export function renderTree(parent: HTMLElement, record: RecordLine, options: TreeOptions): void {
  new Tree(parent.createDiv({ cls: "gedcom-tree" }), record, options).draw();
}
