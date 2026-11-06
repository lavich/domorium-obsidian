import type { GenealogyIndex } from "../genealogy";
import { nameBy } from "./dom";
import { FloatingSearch } from "./floatingSearch";
import { currentLanguage, plural, t, type MessageKey } from "../i18n";
import {
  cellsOf,
  collatorFor,
  columnsOf,
  LIST_KINDS,
  listRows,
  nextSort,
  recordKind,
  type ListKind,
  type ListRow,
  type ListSort,
  type ListState,
  type SortKey,
} from "./listRows";
import { eventsOf } from "./eventRows";
import { placeId, placeKeyOf, placesOf, type PlaceRow } from "./placeRows";

export interface ListHost {
  select(xref: string): void;
  changed(state: ListState): void;
  scrolled(top: number): void;
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
  places: "list.places",
  events: "list.events",
};
const SEARCH_HINT: Record<ListKind, MessageKey> = {
  people: "list.search.people",
  families: "list.search.families",
  sources: "list.search.sources",
  places: "list.search.places",
  events: "list.search.events",
};
const NOTHING: Record<ListKind, MessageKey> = {
  people: "list.nothing.people",
  families: "list.nothing.families",
  sources: "list.nothing.sources",
  places: "list.nothing.places",
  events: "list.nothing.events",
};
const NONE: Record<ListKind, MessageKey> = {
  people: "list.none.people",
  families: "list.none.families",
  sources: "list.none.sources",
  places: "list.none.places",
  events: "list.none.events",
};
const COUNT: Record<ListKind, MessageKey> = {
  people: "list.count.people",
  families: "list.count.families",
  sources: "list.count.sources",
  places: "list.count.places",
  events: "list.count.events",
};
const COUNT_OF: Record<ListKind, MessageKey> = {
  people: "list.countOf.people",
  families: "list.countOf.families",
  sources: "list.countOf.sources",
  places: "list.countOf.places",
  events: "list.countOf.events",
};

let boards = 0;

const canonical = (state: ListState): string =>
  JSON.stringify([state.kind ?? "people", LIST_KINDS.map((kind) => state.sort?.[kind] ?? null)]);

const keyOf = (row: ListRow): string => ("key" in row ? row.key : (row.xref ?? ""));

export class ListBoard {
  private readonly id = `gedcom-list-${(boards += 1)}`;
  private readonly root: HTMLElement;
  private readonly segEl: HTMLElement;
  private readonly find: FloatingSearch;
  private readonly countEl: HTMLElement;
  private readonly sortBarEl: HTMLElement;
  private readonly sortSelect: HTMLSelectElement;
  private readonly directionEl: HTMLButtonElement;
  private readonly headEl: HTMLElement;
  private readonly scrollEl: HTMLElement;
  private readonly spacerEl: HTMLElement;
  private readonly noneEl: HTMLElement;
  private readonly probeEl: HTMLElement;
  private readonly headCells: { cell: HTMLElement; label: HTMLElement; mark: HTMLElement }[] = [];
  private builtKind: ListKind | null = null;
  private readonly observer: ResizeObserver | null = null;

  private index: GenealogyIndex | null = null;
  private kind: ListKind = "people";
  private sorts: Partial<Record<ListKind, ListSort>> = {};
  private query = "";
  private rows: ListRow[] = [];
  private positions = new Map<string, number>();
  private totals = { people: 0 };
  private marked: string | null = null;
  private active = -1;
  private rowHeight = 0;
  private compact: boolean;
  private readonly live = new Map<number, HTMLElement>();

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
    this.find = new FloatingSearch(bar, {
      prefix: "gedcom-list",
      setIcon: (element, icon) => host.setIcon(element, icon),
      change: (query) => this.setQuery(query),
      step: () => undefined,
      info: () => ({ index: -1, total: this.rows.length }),
      narrowing: { count: () => this.countOf(), enter: () => this.scrollEl.focus() },
    });
    this.countEl = this.root.createDiv({ cls: "gedcom-list-count" });
    this.countEl.setAttribute("aria-live", "polite");

    this.sortBarEl = this.root.createDiv({ cls: "gedcom-list-sortbar" });
    this.sortSelect = this.sortBarEl.createEl("select", { cls: "gedcom-list-sort-select dropdown" });
    nameBy(this.sortSelect, this.sortBarEl, t("list.sortBy"));
    this.sortSelect.addEventListener("change", () => this.chooseSort(this.sortSelect.value));
    this.directionEl = this.sortBarEl.createEl("button", { cls: "gedcom-list-direction" });
    this.directionEl.setAttribute("type", "button");
    this.directionEl.addEventListener("click", () => this.turnDirection());

    this.scrollEl = this.root.createDiv({ cls: "gedcom-list-scroll" });
    this.scrollEl.setAttribute("role", "grid");
    nameBy(this.scrollEl, this.root, t("list.label"));
    this.scrollEl.setAttribute("tabindex", "0");
    this.headEl = this.scrollEl.createDiv({ cls: "gedcom-list-head" });
    this.headEl.setAttribute("role", "row");
    this.headEl.setAttribute("aria-rowindex", "1");
    columnsOf("people").forEach((_, position) => {
      const cell = this.headEl.createDiv({ cls: "gedcom-list-headcell" });
      cell.setAttribute("role", "columnheader");
      const button = cell.createEl("button", { cls: "gedcom-list-sort" });
      button.setAttribute("type", "button");
      const label = button.createSpan({ cls: "gedcom-list-sort-label" });
      const mark = button.createSpan({ cls: "gedcom-list-sort-mark" });
      mark.setAttribute("aria-hidden", "true");
      button.addEventListener("click", () => this.sortHeader(columnsOf(this.kind)[position].key));
      this.headCells.push({ cell, label, mark });
    });
    this.spacerEl = this.scrollEl.createDiv({ cls: "gedcom-list-spacer" });
    this.spacerEl.setAttribute("role", "rowgroup");
    this.noneEl = this.scrollEl.createDiv({ cls: "gedcom-list-none" });
    this.probeEl = this.root.createDiv({ cls: "gedcom-list-probe" });
    this.probeEl.setAttribute("aria-hidden", "true");
    this.scrollEl.addEventListener(
      "scroll",
      () => {
        this.host.scrolled(this.scrollEl.scrollTop);
        this.drawWindow();
      },
      { passive: true },
    );
    this.scrollEl.addEventListener("keydown", (event) => this.rowKey(event));
    this.scrollEl.addEventListener("focus", () => this.focusEntered());
    this.spacerEl.addEventListener("click", (event) => this.rowClicked(event));

    this.applyLayout();
    if (typeof ResizeObserver !== "undefined") {
      this.observer = new ResizeObserver(() => this.resized());
      this.observer.observe(this.root);
      this.observer.observe(this.probeEl);
    }
  }

  state(): ListState {
    const sort = Object.fromEntries(LIST_KINDS.flatMap((kind) => (this.sorts[kind] ? [[kind, this.sorts[kind]]] : [])));
    return {
      ...(this.kind === "people" ? {} : { kind: this.kind }),
      ...(Object.keys(sort).length > 0 ? { sort } : {}),
    };
  }

  show(index: GenealogyIndex, state: ListState): void {
    if (index === this.index && canonical(state) === canonical(this.state())) {
      return;
    }
    if (index !== this.index) {
      this.index = index;
      this.totals = { people: index.people.filter((row) => row.xref !== undefined).length };
    }
    const kind = state.kind ?? "people";
    if (kind !== this.kind) {
      this.query = "";
      this.find.reset();
    }
    this.kind = kind;
    this.sorts = { ...state.sort };
    this.refresh(true);
  }

  select(xref: string | null, reveal: boolean): void {
    const before = canonical(this.state());
    this.place(xref, reveal);
    if (canonical(this.state()) !== before) {
      this.host.changed(this.state());
    }
  }

  private place(xref: string | null, reveal: boolean): void {
    const index = this.index;
    const kind = index !== null && xref !== null ? recordKind(index, xref) : null;
    if (xref === null || kind === null) {
      this.marked = null;
      this.applyMarks();
      return;
    }
    const rowKey = placeKeyOf(xref) ?? xref;
    const fresh = xref !== this.marked;
    this.marked = xref;
    if ((this.kind === "places" || this.kind === "events") && kind !== "places" && kind !== "events") {
      this.applyMarks();
      return;
    }
    if (!reveal) {
      this.applyMarks();
      return;
    }
    if (fresh) {
      if (kind !== this.kind) {
        this.switchKind(kind);
      }
      if (!this.positions.has(rowKey)) {
        this.query = "";
        this.find.reset();
        this.refresh(true);
      }
    }
    const at = this.positions.get(rowKey);
    if (at === undefined) {
      this.applyMarks();
      return;
    }
    if (fresh || !this.wholeRowShown(at)) {
      this.centre(at);
    }
    this.setActive(at, false);
  }

  focusFilter(): void {
    if (this.find.isOpen()) {
      this.find.focus(true);
    } else {
      this.find.open();
    }
  }

  scroll(): number {
    return this.scrollEl.scrollTop;
  }

  setScroll(top: number): void {
    this.scrollTo(top);
    this.drawWindow();
  }

  resized(): void {
    const width = this.root.clientWidth;
    if (width > 0) {
      const compact = this.host.coarsePointer() || (this.compact ? width < WIDE_FROM : width < COMPACT_BELOW);
      if (compact !== this.compact) {
        this.flip(compact);
        return;
      }
    }
    this.remeasure();
    this.drawWindow();
  }

  dispose(): void {
    this.observer?.disconnect();
  }

  private flip(compact: boolean): void {
    const anchor = this.firstVisible();
    this.compact = compact;
    this.applyLayout();
    this.rowHeight = this.readRow();
    this.spacerEl.setCssProps({ height: `${this.rows.length * this.rowHeight}px` });
    this.scrollTo(anchor * this.rowHeight);
    this.drawWindow(true);
  }

  private remeasure(): void {
    const next = this.readRow();
    if (next === this.rowHeight) {
      return;
    }
    const anchor = this.firstVisible();
    this.rowHeight = next;
    this.spacerEl.setCssProps({ height: `${this.rows.length * next}px` });
    this.scrollTo(anchor * next);
    this.drawWindow(true);
  }

  private firstVisible(): number {
    return this.rowHeight > 0 ? Math.floor(this.scrollEl.scrollTop / this.rowHeight) : 0;
  }

  private readRow(): number {
    const height = this.probeEl.getBoundingClientRect().height;
    return height > 0 ? height : FALLBACK_ROW[this.compact ? "compact" : "wide"];
  }

  private scrollTo(top: number): void {
    this.scrollEl.scrollTop = top;
    this.host.scrolled(this.scrollEl.scrollTop);
  }

  private visibleHeight(): number {
    const height = this.scrollEl.clientHeight;
    return height > 0 ? Math.max(this.rowHeight, height - (this.compact ? 0 : this.headEl.offsetHeight)) : 0;
  }

  private applyLayout(): void {
    this.root.toggleClass("is-compact", this.compact);
    this.headEl.toggle(!this.compact);
    this.sortBarEl.toggle(this.compact);
  }

  private showKind(kind: ListKind): void {
    this.switchKind(kind);
    this.host.changed(this.state());
  }

  private switchKind(kind: ListKind): void {
    this.kind = kind;
    this.query = "";
    this.find.reset();
    this.refresh(false);
  }

  private setQuery(query: string): void {
    this.query = query;
    this.refresh(false);
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
    const focused = this.active >= 0 && this.rows[this.active] !== undefined ? keyOf(this.rows[this.active]) : undefined;
    this.rows = listRows(
      index,
      { kind: this.kind, query: this.query, sort: this.sorts[this.kind] },
      collatorFor(currentLanguage()),
    );
    this.positions = new Map(this.rows.map((row, at) => [keyOf(row), at]));
    const kept = focused === undefined ? undefined : this.positions.get(focused);
    this.active = kept ?? (this.active < 0 || this.rows.length === 0 ? -1 : Math.min(this.active, this.rows.length - 1));
    this.drawChrome();
    this.rowHeight = this.readRow();
    this.spacerEl.setCssProps({ height: `${this.rows.length * this.rowHeight}px` });
    if (!keepScroll) {
      this.scrollTo(0);
    }
    this.drawWindow(true);
  }

  private drawChrome(): void {
    for (const button of Array.from(this.segEl.children) as HTMLElement[]) {
      const on = button.dataset.kind === this.kind;
      button.toggleClass("is-active", on);
      button.setAttribute("aria-pressed", String(on));
    }
    this.find.describe(t(SEARCH_HINT[this.kind]));
    this.find.refresh();
    const total = this.totalOfKind();
    this.countEl.setText(
      this.rows.length === total
        ? plural(COUNT[this.kind], total)
        : plural(COUNT_OF[this.kind], total, { shown: this.rows.length }),
    );
    this.drawHeaders();
  }

  private countOf(): string {
    return plural(COUNT_OF[this.kind], this.totalOfKind(), { shown: this.rows.length });
  }

  private totalOfKind(): number {
    const index = this.index;
    if (!index) {
      return 0;
    }
    if (this.kind === "people") {
      return this.totals.people;
    }
    if (this.kind === "places") {
      return placesOf(index).length;
    }
    if (this.kind === "events") {
      return eventsOf(index).length;
    }
    const all = this.kind === "families" ? index.families : index.sources;
    return all.filter((row) => row.xref !== undefined).length;
  }

  private drawHeaders(): void {
    const sort = this.sorts[this.kind];
    const columns = columnsOf(this.kind);
    this.headEl.className = `gedcom-list-head is-${this.kind}`;
    this.headCells.forEach(({ cell, label, mark }, position) => {
      const column = columns[position];
      cell.hidden = column === undefined;
      if (column === undefined) {
        return;
      }
      const direction = sort?.by === column.key ? sort.dir : null;
      cell.className = `gedcom-list-headcell is-${column.key}${column.numeric ? " is-numeric" : ""}`;
      cell.setAttribute("aria-sort", direction === "asc" ? "ascending" : direction === "desc" ? "descending" : "none");
      label.setText(t(column.label));
      mark.setText(direction === "asc" ? "↑" : direction === "desc" ? "↓" : "");
    });
    if (this.builtKind !== this.kind) {
      this.builtKind = this.kind;
      this.sortSelect.empty();
      this.sortSelect.createEl("option", { text: t(this.kind === "places" ? "list.alphabetical" : "list.fileOrder"), attr: { value: "" } });
      for (const column of columns) {
        this.sortSelect.createEl("option", { text: t(column.label), attr: { value: column.key } });
      }
    }
    this.sortSelect.value = sort?.by ?? "";
    this.directionEl.empty();
    this.host.setIcon(this.directionEl, sort?.dir === "desc" ? "arrow-down" : "arrow-up");
    const label = t(sort?.dir === "desc" ? "list.sortDescending" : "list.sortAscending");
    this.directionEl.setAttribute("aria-label", label);
    this.directionEl.disabled = sort === undefined;
    this.scrollEl.setAttribute("aria-rowcount", String(this.rows.length + 1));
  }

  private drawWindow(force = false): void {
    const total = this.rows.length;
    this.noneEl.toggle(total === 0);
    if (force) {
      this.live.clear();
      this.spacerEl.empty();
    }
    if (total === 0) {
      this.noneEl.setText(this.query.trim() ? t(NOTHING[this.kind], { query: this.query.trim() }) : t(NONE[this.kind]));
      this.syncActive();
      return;
    }
    if (this.rowHeight === 0) {
      this.rowHeight = this.readRow();
    }
    const height = this.visibleHeight();
    const first = Math.max(0, Math.floor(this.scrollEl.scrollTop / this.rowHeight) - MARGIN);
    const count = height > 0 ? Math.ceil(height / this.rowHeight) + 2 * MARGIN : FIRST_WINDOW;
    const last = Math.min(total - 1, first + count);
    this.spacerEl.setCssProps({ height: `${total * this.rowHeight}px` });
    const wanted = new Set<number>();
    for (let at = first; at <= last; at += 1) {
      wanted.add(at);
    }
    if (this.active >= 0) {
      wanted.add(this.active);
    }
    for (const [at, el] of this.live) {
      if (!wanted.has(at)) {
        el.remove();
        this.live.delete(at);
      }
    }
    let before: HTMLElement | null = null;
    for (const at of [...wanted].sort((one, other) => one - other)) {
      let el = this.live.get(at);
      if (!el) {
        el = this.makeRow(at);
        this.live.set(at, el);
        this.spacerEl.insertBefore(el, before ? before.nextSibling : this.spacerEl.firstChild);
      }
      before = el;
    }
    this.syncActive();
  }

  private makeRow(at: number): HTMLElement {
    const row = this.rows[at];
    const { texts, gap } = cellsOf(this.kind, row, this.index as GenealogyIndex);
    const key = keyOf(row);
    const el = createDiv({ cls: `gedcom-list-row is-${this.kind}` });
    el.id = this.rowId(at);
    if (row.xref !== undefined) {
      el.dataset.xref = key;
    }
    el.dataset.key = key;
    el.dataset.pos = String(at);
    el.setAttribute("role", "row");
    el.setAttribute("aria-rowindex", String(at + 2));
    el.setAttribute("aria-selected", String(key === this.markedKey()));
    el.toggleClass("is-selected", key === this.markedKey());
    el.toggleClass("is-focused", at === this.active);
    el.setCssProps({ top: `${at * this.rowHeight}px` });
    columnsOf(this.kind).forEach((column, position) => {
      const cell = el.createDiv({ cls: `gedcom-list-cell is-${column.key}` });
      cell.setAttribute("role", "gridcell");
      cell.toggleClass("is-numeric", column.numeric);
      const text = texts[position] ?? "";
      if (this.kind === "people" && column.key === "sources" && gap) {
        const mark = cell.createSpan({ cls: "gedcom-list-gap" });
        mark.setAttribute("role", "img");
        mark.setAttribute("aria-label", t("list.gapMark"));
        if (this.compact) {
          cell.appendText(` ${this.countLabel(column.key, 0)}`);
        }
      } else {
        cell.setText(this.compact && column.numeric ? this.countLabel(column.key, Number(text)) : text);
      }
    });
    return el;
  }

  private countLabel(key: SortKey, count: number): string {
    if (key === "events") {
      return plural("list.compact.events", count);
    }
    return key === "citedBy" ? t("list.compact.citedBy", { count }) : plural(key === "children" ? "list.compact.children" : "list.compact.sources", count);
  }

  private markedKey(): string | null {
    if (this.marked === null) {
      return null;
    }
    if (this.kind === "places") {
      return placeKeyOf(this.marked);
    }
    return this.marked;
  }

  private rowId(at: number): string {
    return `${this.id}-r${at}`;
  }

  private applyMarks(): void {
    const marked = this.markedKey();
    for (const el of this.live.values()) {
      const on = el.dataset.key === marked;
      el.toggleClass("is-selected", on);
      el.setAttribute("aria-selected", String(on));
    }
  }

  private syncActive(): void {
    for (const [at, el] of this.live) {
      el.toggleClass("is-focused", at === this.active);
    }
    const shown = this.live.get(this.active);
    if (shown) {
      this.scrollEl.setAttribute("aria-activedescendant", shown.id);
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
    this.drawWindow();
  }

  private wholeRowShown(at: number): boolean {
    const top = at * this.rowHeight;
    const height = this.visibleHeight();
    return height > 0 && top >= this.scrollEl.scrollTop && top + this.rowHeight <= this.scrollEl.scrollTop + height;
  }

  private centre(at: number): void {
    const top = at * this.rowHeight - (this.visibleHeight() - this.rowHeight) / 2;
    this.scrollTo(Math.max(0, top));
  }

  private keepInView(at: number): void {
    const top = at * this.rowHeight;
    const height = this.visibleHeight();
    if (top < this.scrollEl.scrollTop) {
      this.scrollTo(top);
    } else if (height > 0 && top + this.rowHeight > this.scrollEl.scrollTop + height) {
      this.scrollTo(top + this.rowHeight - height);
    }
  }

  private focusEntered(): void {
    if (this.active < 0 && this.rows.length > 0) {
      const marked = this.markedKey();
      this.setActive(marked !== null ? (this.positions.get(marked) ?? 0) : 0, false);
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
    const row = this.rows[at];
    if (row === undefined) {
      return;
    }
    const xref = row.xref ?? ("owner" in row ? row.key : placeId((row as PlaceRow).key));
    this.marked = xref;
    this.setActive(at, scrollTo);
    this.host.select(xref);
  }

  private rowKey(event: KeyboardEvent): void {
    if (event.target !== this.scrollEl) {
      return;
    }
    const last = this.rows.length - 1;
    const page = Math.max(1, Math.floor(this.visibleHeight() / (this.rowHeight || 1)) - 1);
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
      const marked = this.markedKey();
      to = marked === null ? 0 : (this.positions.get(marked) ?? 0);
    }
    this.setActive(Math.min(last, Math.max(0, to)), true);
  }
}
