import type { GenealogyIndex } from "../genealogy";
import { currentLanguage, plural, t, type MessageKey } from "../i18n";
import {
  cellsOf,
  collatorFor,
  columnsOf,
  LIST_KINDS,
  listRows,
  nextSort,
  recordKind,
  restsOnNothing,
  type ListKind,
  type ListRow,
  type ListSort,
  type ListState,
  type SortKey,
} from "./listRows";

export interface ListHost {
  /** A person, a family or a source. */
  select(xref: string): void;
  /** What the reader changed: the kind, the sort or the chip. */
  changed(state: ListState): void;
  setIcon(element: HTMLElement, icon: string): void;
  coarsePointer(): boolean;
}

const COMPACT_BELOW = 640;
const WIDE_FROM = 680;
const MARGIN = 10;
const FIRST_WINDOW = 40;
const FALLBACK_ROW = { wide: 36, compact: 56 } as const;

const KIND_LABEL: Record<ListKind, MessageKey> = {
  people: "list.people",
  families: "list.families",
  sources: "list.sources",
};
const SEARCH_HINT: Record<ListKind, MessageKey> = {
  people: "list.search.people",
  families: "list.search.families",
  sources: "list.search.sources",
};
const NOTHING: Record<ListKind, MessageKey> = {
  people: "list.nothing.people",
  families: "list.nothing.families",
  sources: "list.nothing.sources",
};
const NONE: Record<ListKind, MessageKey> = {
  people: "list.none.people",
  families: "list.none.families",
  sources: "list.none.sources",
};
const COUNT: Record<ListKind, MessageKey> = {
  people: "list.count.people",
  families: "list.count.families",
  sources: "list.count.sources",
};
const COUNT_OF: Record<ListKind, MessageKey> = {
  people: "list.countOf.people",
  families: "list.countOf.families",
  sources: "list.countOf.sources",
};

let boards = 0;

const canonical = (state: ListState): string =>
  JSON.stringify([state.kind ?? "people", state.noSources === true, LIST_KINDS.map((kind) => state.sort?.[kind] ?? null)]);

/** The people, families or sources of a file as a table whose rows are windowed, sorted and filtered here and selected through the host. */
export class ListBoard {
  private readonly id = `gedcom-list-${(boards += 1)}`;
  private readonly root: HTMLElement;
  private readonly segEl: HTMLElement;
  private readonly filterEl: HTMLInputElement;
  private readonly chipsEl: HTMLElement;
  private readonly countEl: HTMLElement;
  private readonly sortBarEl: HTMLElement;
  private readonly sortSelect: HTMLSelectElement;
  private readonly directionEl: HTMLButtonElement;
  private readonly gridEl: HTMLElement;
  private readonly headEl: HTMLElement;
  private readonly scrollEl: HTMLElement;
  private readonly spacerEl: HTMLElement;
  private readonly noneEl: HTMLElement;
  private readonly observer: ResizeObserver | null = null;

  private index: GenealogyIndex | null = null;
  private kind: ListKind = "people";
  private noSources = false;
  private sorts: Partial<Record<ListKind, ListSort>> = {};
  private query = "";
  private rows: ListRow[] = [];
  private positions = new Map<string, number>();
  private totals = { people: 0, gaps: 0 };
  private marked: string | null = null;
  private active = -1;
  private rowHeight = 0;
  private compact: boolean;
  private drawn: { first: number; last: number } | null = null;

  constructor(
    parent: HTMLElement,
    private readonly host: ListHost,
  ) {
    this.compact = host.coarsePointer();
    this.root = parent.createDiv({ cls: "gedcom-list" });
    this.root.toggleClass("is-touch", this.compact);
    const bar = this.root.createDiv({ cls: "gedcom-list-bar" });
    this.segEl = bar.createDiv({ cls: "gedcom-list-seg" });
    this.segEl.setAttribute("role", "group");
    for (const kind of LIST_KINDS) {
      const button = this.segEl.createEl("button", { cls: "gedcom-list-seg-button", text: t(KIND_LABEL[kind]) });
      button.setAttribute("type", "button");
      button.dataset.kind = kind;
      button.addEventListener("click", () => this.showKind(kind));
    }
    this.filterEl = bar.createEl("input", { cls: "gedcom-list-filter" });
    this.filterEl.setAttribute("type", "text");
    this.filterEl.addEventListener("input", () => this.setQuery(this.filterEl.value));
    this.filterEl.addEventListener("keydown", (event) => this.filterKey(event));
    this.chipsEl = bar.createDiv({ cls: "gedcom-list-chips" });
    this.countEl = this.root.createDiv({ cls: "gedcom-list-count" });
    this.countEl.setAttribute("aria-live", "polite");

    this.sortBarEl = this.root.createDiv({ cls: "gedcom-list-sortbar" });
    this.sortSelect = this.sortBarEl.createEl("select", { cls: "gedcom-list-sort-select dropdown" });
    this.sortSelect.setAttribute("aria-label", t("list.sortBy"));
    this.sortSelect.addEventListener("change", () => this.chooseSort(this.sortSelect.value));
    this.directionEl = this.sortBarEl.createEl("button", { cls: "gedcom-list-direction" });
    this.directionEl.setAttribute("type", "button");
    this.directionEl.addEventListener("click", () => this.turnDirection());

    this.gridEl = this.root.createDiv({ cls: "gedcom-list-grid" });
    this.gridEl.setAttribute("role", "grid");
    this.gridEl.setAttribute("aria-label", t("list.label"));
    this.headEl = this.gridEl.createDiv({ cls: "gedcom-list-head" });
    this.headEl.setAttribute("role", "row");
    this.scrollEl = this.gridEl.createDiv({ cls: "gedcom-list-scroll" });
    this.scrollEl.setAttribute("role", "rowgroup");
    this.scrollEl.setAttribute("tabindex", "0");
    this.spacerEl = this.scrollEl.createDiv({ cls: "gedcom-list-spacer" });
    this.noneEl = this.scrollEl.createDiv({ cls: "gedcom-list-none" });
    this.scrollEl.addEventListener("scroll", () => this.drawWindow(), { passive: true });
    this.scrollEl.addEventListener("keydown", (event) => this.rowKey(event));
    this.scrollEl.addEventListener("focus", () => this.focusEntered());
    this.spacerEl.addEventListener("click", (event) => this.rowClicked(event));

    this.applyLayout();
    if (typeof ResizeObserver !== "undefined") {
      this.observer = new ResizeObserver(() => this.resized());
      this.observer.observe(this.root);
    }
  }

  /** The kind, the chip and each kind's sort: what the tab saves. */
  state(): ListState {
    const sort = Object.fromEntries(LIST_KINDS.flatMap((kind) => (this.sorts[kind] ? [[kind, this.sorts[kind]]] : [])));
    return {
      ...(this.kind === "people" ? {} : { kind: this.kind }),
      ...(this.noSources ? { noSources: true } : {}),
      ...(Object.keys(sort).length > 0 ? { sort } : {}),
    };
  }

  /** A no-op for the same file reading and the same state, so a resize never sorts again. */
  show(index: GenealogyIndex, state: ListState): void {
    if (index === this.index && canonical(state) === canonical(this.state())) {
      return;
    }
    if (index !== this.index) {
      this.index = index;
      const people = index.people.filter((row) => row.xref !== undefined);
      this.totals = { people: people.length, gaps: people.filter((row) => restsOnNothing(index, row)).length };
    }
    const kind = state.kind ?? "people";
    if (kind !== this.kind) {
      this.query = "";
      this.filterEl.value = "";
    }
    this.kind = kind;
    this.noSources = state.noSources === true;
    this.sorts = { ...state.sort };
    this.refresh(true);
  }

  select(xref: string | null, reveal: boolean): void {
    const index = this.index;
    const kind = index !== null && xref !== null ? recordKind(index, xref) : null;
    if (xref === null || kind === null) {
      this.marked = null;
      this.applyMarks();
      return;
    }
    const fresh = xref !== this.marked;
    this.marked = xref;
    if (!reveal) {
      this.applyMarks();
      return;
    }
    if (fresh) {
      if (kind !== this.kind) {
        this.switchKind(kind);
      }
      if (!this.positions.has(xref)) {
        this.query = "";
        this.filterEl.value = "";
        this.noSources = false;
        this.refresh(true);
        this.host.changed(this.state());
      }
    }
    const at = this.positions.get(xref);
    if (at === undefined) {
      this.applyMarks();
      return;
    }
    if (fresh || !this.wholeRowShown(at)) {
      this.centre(at);
    }
    this.setActive(at, false);
    this.drawWindow(true);
  }

  focusFilter(): void {
    this.filterEl.focus();
    this.filterEl.select();
  }

  scroll(): number {
    return this.scrollEl.scrollTop;
  }

  setScroll(top: number): void {
    this.scrollEl.scrollTop = top;
    this.drawWindow();
  }

  /** Measures its own width, flips between the wide and the compact layout, and draws the rows in view. */
  resized(): void {
    const width = this.root.clientWidth;
    if (width > 0) {
      const compact = this.host.coarsePointer() || (this.compact ? width < WIDE_FROM : width < COMPACT_BELOW);
      if (compact !== this.compact) {
        this.flip(compact);
        return;
      }
      this.setGutter();
    }
    this.drawWindow();
  }

  dispose(): void {
    this.observer?.disconnect();
  }

  private flip(compact: boolean): void {
    const anchor = this.rowHeight > 0 ? Math.floor(this.scrollEl.scrollTop / this.rowHeight) : 0;
    this.compact = compact;
    this.applyLayout();
    this.rowHeight = 0;
    this.drawWindow(true);
    this.measure();
    this.spacerEl.setCssProps({ height: `${this.rows.length * this.rowHeight}px` });
    this.scrollEl.scrollTop = anchor * this.rowHeight;
    this.setGutter();
    this.drawWindow(true);
  }

  private applyLayout(): void {
    this.root.toggleClass("is-compact", this.compact);
    this.headEl.toggle(!this.compact);
    this.sortBarEl.toggle(this.compact);
  }

  private setGutter(): void {
    const gutter = Math.max(0, this.scrollEl.offsetWidth - this.scrollEl.clientWidth);
    this.root.setCssProps({ "--gedcom-list-gutter": `${gutter}px` });
  }

  private showKind(kind: ListKind): void {
    this.switchKind(kind);
    this.host.changed(this.state());
  }

  private switchKind(kind: ListKind): void {
    this.kind = kind;
    this.query = "";
    this.filterEl.value = "";
    this.refresh(false);
  }

  private setQuery(query: string): void {
    this.query = query;
    this.refresh(false);
  }

  private filterKey(event: KeyboardEvent): void {
    if (event.key !== "Escape") {
      return;
    }
    event.preventDefault();
    if (this.filterEl.value !== "") {
      this.filterEl.value = "";
      this.setQuery("");
    } else {
      this.scrollEl.focus();
    }
  }

  private sortHeader(key: SortKey): void {
    const next = nextSort(this.sorts[this.kind], key);
    this.setSort(next);
  }

  private setSort(next: ListSort | undefined): void {
    if (next) {
      this.sorts[this.kind] = next;
    } else {
      delete this.sorts[this.kind];
    }
    this.refresh(false);
    this.host.changed(this.state());
  }

  private chooseSort(value: string): void {
    const current = this.sorts[this.kind];
    this.setSort(value === "" ? undefined : { by: value as SortKey, dir: current?.dir ?? "asc" });
  }

  private turnDirection(): void {
    const current = this.sorts[this.kind];
    if (current) {
      this.setSort({ by: current.by, dir: current.dir === "asc" ? "desc" : "asc" });
    }
  }

  private refresh(keepScroll: boolean): void {
    const index = this.index;
    if (!index) {
      return;
    }
    const focused = this.active >= 0 ? this.rows[this.active]?.xref : undefined;
    this.rows = listRows(
      index,
      { kind: this.kind, query: this.query, noSources: this.kind === "people" && this.noSources, sort: this.sorts[this.kind] },
      collatorFor(currentLanguage()),
    );
    this.positions = new Map(this.rows.map((row, at) => [row.xref ?? "", at]));
    const kept = focused === undefined ? undefined : this.positions.get(focused);
    this.active = kept ?? (this.active < 0 || this.rows.length === 0 ? -1 : Math.min(this.active, this.rows.length - 1));
    this.drawChrome();
    this.rowHeight = 0;
    this.drawn = null;
    this.spacerEl.empty();
    this.measureFirst();
    this.spacerEl.setCssProps({ height: `${this.rows.length * this.rowHeight}px` });
    if (!keepScroll) {
      this.scrollEl.scrollTop = 0;
    }
    this.drawWindow(true);
  }

  private drawChrome(): void {
    for (const button of Array.from(this.segEl.children) as HTMLElement[]) {
      const on = button.dataset.kind === this.kind;
      button.toggleClass("is-active", on);
      button.setAttribute("aria-pressed", String(on));
    }
    this.filterEl.placeholder = t(SEARCH_HINT[this.kind]);
    this.filterEl.setAttribute("aria-label", t(SEARCH_HINT[this.kind]));
    this.chipsEl.empty();
    this.chipsEl.toggle(this.kind === "people");
    if (this.kind === "people") {
      this.chip(plural("list.all", this.totals.people), !this.noSources, false);
      this.chip(plural("list.noSources", this.totals.gaps), this.noSources, true);
    }
    const total = this.totalOfKind();
    this.countEl.setText(
      this.rows.length === total
        ? plural(COUNT[this.kind], total)
        : plural(COUNT_OF[this.kind], total, { shown: this.rows.length }),
    );
    this.drawHeaders();
  }

  private totalOfKind(): number {
    const index = this.index;
    if (!index) {
      return 0;
    }
    if (this.kind === "people") {
      return this.totals.people;
    }
    const all = this.kind === "families" ? index.families : index.sources;
    return all.filter((row) => row.xref !== undefined).length;
  }

  private chip(text: string, active: boolean, noSources: boolean): void {
    const chip = this.chipsEl.createEl("button", { cls: "gedcom-list-chip", text });
    chip.setAttribute("type", "button");
    chip.setAttribute("aria-pressed", String(active));
    chip.toggleClass("is-active", active);
    chip.addEventListener("click", () => {
      this.noSources = noSources;
      this.refresh(false);
      this.host.changed(this.state());
    });
  }

  private drawHeaders(): void {
    const sort = this.sorts[this.kind];
    const columns = columnsOf(this.kind);
    this.headEl.empty();
    this.headEl.className = `gedcom-list-head is-${this.kind}`;
    for (const column of columns) {
      const cell = this.headEl.createDiv({ cls: `gedcom-list-headcell is-${column.key}` });
      cell.setAttribute("role", "columnheader");
      const direction = sort?.by === column.key ? sort.dir : null;
      cell.setAttribute("aria-sort", direction === "asc" ? "ascending" : direction === "desc" ? "descending" : "none");
      cell.toggleClass("is-numeric", column.numeric);
      const button = cell.createEl("button", { cls: "gedcom-list-sort", text: t(column.label) });
      button.setAttribute("type", "button");
      button.addEventListener("click", () => this.sortHeader(column.key));
    }
    this.sortSelect.empty();
    this.sortSelect.createEl("option", { text: t("list.fileOrder"), attr: { value: "" } });
    for (const column of columns) {
      this.sortSelect.createEl("option", { text: t(column.label), attr: { value: column.key } });
    }
    this.sortSelect.value = sort?.by ?? "";
    this.directionEl.empty();
    this.host.setIcon(this.directionEl, sort?.dir === "desc" ? "arrow-down" : "arrow-up");
    const label = t(sort?.dir === "desc" ? "list.sortDescending" : "list.sortAscending");
    this.directionEl.setAttribute("aria-label", label);
    this.directionEl.setAttribute("title", label);
    this.directionEl.disabled = sort === undefined;
    this.gridEl.setAttribute("aria-rowcount", String(this.rows.length + 1));
  }

  private measure(): void {
    const row = this.spacerEl.firstElementChild as HTMLElement | null;
    const height = row?.getBoundingClientRect().height ?? 0;
    this.rowHeight = height > 0 ? height : FALLBACK_ROW[this.compact ? "compact" : "wide"];
  }

  /** Draws one row to read the height the style gives it, since it follows the font size. */
  private measureFirst(): void {
    if (this.rows.length === 0) {
      this.rowHeight = FALLBACK_ROW[this.compact ? "compact" : "wide"];
      return;
    }
    this.spacerEl.append(this.makeRow(0));
    this.measure();
    this.spacerEl.empty();
  }

  private drawWindow(force = false): void {
    const total = this.rows.length;
    this.noneEl.toggle(total === 0);
    if (total === 0) {
      this.drawn = null;
      this.spacerEl.empty();
      this.noneEl.setText(this.query.trim() ? t(NOTHING[this.kind], { query: this.query.trim() }) : t(NONE[this.kind]));
      this.syncActive();
      return;
    }
    if (this.rowHeight === 0) {
      this.measureFirst();
    }
    const height = this.scrollEl.clientHeight;
    const first = Math.max(0, Math.floor(this.scrollEl.scrollTop / this.rowHeight) - MARGIN);
    const count = height > 0 ? Math.ceil(height / this.rowHeight) + 2 * MARGIN : FIRST_WINDOW;
    const last = Math.min(total - 1, first + count);
    if (!force && this.drawn?.first === first && this.drawn.last === last) {
      this.syncActive();
      return;
    }
    this.drawn = { first, last };
    this.spacerEl.setCssProps({ height: `${total * this.rowHeight}px` });
    const rows: HTMLElement[] = [];
    for (let at = first; at <= last; at += 1) {
      rows.push(this.makeRow(at));
    }
    if (this.active >= 0 && (this.active < first || this.active > last)) {
      rows.push(this.makeRow(this.active));
    }
    this.spacerEl.replaceChildren(...rows);
    this.syncActive();
  }

  private makeRow(at: number): HTMLElement {
    const row = this.rows[at];
    const { texts, gap } = cellsOf(this.kind, row, this.index as GenealogyIndex);
    const xref = row.xref ?? "";
    const el = createDiv({ cls: `gedcom-list-row is-${this.kind}` });
    el.id = this.rowId(at);
    el.dataset.xref = xref;
    el.dataset.pos = String(at);
    el.setAttribute("role", "row");
    el.setAttribute("aria-rowindex", String(at + 2));
    el.setAttribute("aria-selected", String(xref === this.marked));
    el.toggleClass("is-selected", xref === this.marked);
    el.toggleClass("is-focused", at === this.active);
    el.setCssProps({ top: `${at * this.rowHeight}px` });
    columnsOf(this.kind).forEach((column, position) => {
      const cell = el.createDiv({ cls: `gedcom-list-cell is-${column.key}` });
      cell.setAttribute("role", "gridcell");
      cell.toggleClass("is-numeric", column.numeric);
      if (this.kind === "people" && column.key === "sources" && gap) {
        const mark = cell.createSpan({ cls: "gedcom-list-gap" });
        mark.setAttribute("role", "img");
        mark.setAttribute("aria-label", t("list.gapMark"));
      } else {
        cell.setText(texts[position] ?? "");
      }
    });
    return el;
  }

  private rowId(at: number): string {
    return `${this.id}-r${at}`;
  }

  private applyMarks(): void {
    for (const el of Array.from(this.spacerEl.children) as HTMLElement[]) {
      const on = el.dataset.xref === this.marked;
      el.toggleClass("is-selected", on);
      el.setAttribute("aria-selected", String(on));
    }
  }

  private syncActive(): void {
    for (const el of Array.from(this.spacerEl.children) as HTMLElement[]) {
      el.toggleClass("is-focused", el.dataset.pos === String(this.active));
    }
    const shown = this.active >= 0 && this.spacerEl.querySelector(`[id="${this.rowId(this.active)}"]`) !== null;
    if (shown) {
      this.scrollEl.setAttribute("aria-activedescendant", this.rowId(this.active));
    } else {
      this.scrollEl.removeAttribute("aria-activedescendant");
    }
    this.applyMarks();
  }

  private setActive(at: number, scrollTo: boolean): void {
    this.active = at;
    if (scrollTo && at >= 0) {
      this.keepInView(at);
    }
    this.drawWindow(true);
  }

  private wholeRowShown(at: number): boolean {
    const top = at * this.rowHeight;
    const height = this.scrollEl.clientHeight;
    return height > 0 && top >= this.scrollEl.scrollTop && top + this.rowHeight <= this.scrollEl.scrollTop + height;
  }

  private centre(at: number): void {
    const height = this.scrollEl.clientHeight;
    const top = at * this.rowHeight - (height - this.rowHeight) / 2;
    this.scrollEl.scrollTop = Math.max(0, top);
  }

  private keepInView(at: number): void {
    const top = at * this.rowHeight;
    const height = this.scrollEl.clientHeight;
    if (top < this.scrollEl.scrollTop) {
      this.scrollEl.scrollTop = top;
    } else if (height > 0 && top + this.rowHeight > this.scrollEl.scrollTop + height) {
      this.scrollEl.scrollTop = top + this.rowHeight - height;
    }
  }

  private focusEntered(): void {
    if (this.active < 0 && this.rows.length > 0) {
      this.setActive(this.marked !== null ? (this.positions.get(this.marked) ?? 0) : 0, false);
    }
  }

  private rowClicked(event: Event): void {
    const row = (event.target as HTMLElement | null)?.closest<HTMLElement>(".gedcom-list-row");
    if (!row) {
      return;
    }
    this.activate(Number(row.dataset.pos), false);
  }

  private activate(at: number, scrollTo: boolean): void {
    const xref = this.rows[at]?.xref;
    if (xref === undefined) {
      return;
    }
    this.marked = xref;
    this.setActive(at, scrollTo);
    this.host.select(xref);
  }

  private rowKey(event: KeyboardEvent): void {
    const last = this.rows.length - 1;
    const page = Math.max(1, Math.floor(this.scrollEl.clientHeight / (this.rowHeight || 1)) - 1);
    const from = this.active;
    let to: number;
    switch (event.key) {
      case "ArrowDown":
        to = from + 1;
        break;
      case "ArrowUp":
        to = from - 1;
        break;
      case "Home":
        to = 0;
        break;
      case "End":
        to = last;
        break;
      case "PageDown":
        to = from + page;
        break;
      case "PageUp":
        to = from - page;
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        if (from >= 0) {
          this.activate(from, true);
        }
        return;
      default:
        return;
    }
    event.preventDefault();
    if (last < 0) {
      return;
    }
    if (from < 0 && event.key !== "Home" && event.key !== "End") {
      to = this.marked === null ? 0 : (this.positions.get(this.marked) ?? 0);
    }
    this.setActive(Math.min(last, Math.max(0, to)), true);
  }
}
