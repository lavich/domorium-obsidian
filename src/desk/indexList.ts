import type { FamilyRow, GenealogyIndex, PersonRow, SourceRow } from "../genealogy";
import { plural, t } from "../i18n";
import { familyTitle, personName, sourceTitle, year, yearsOf } from "./labels";

export type IndexKind = "people" | "families" | "sources";

const KIND_LABEL = {
  people: "index.people",
  families: "index.families",
  sources: "index.sources",
} as const;

const SEARCH_HINT = {
  people: "index.searchPeople",
  families: "index.searchFamilies",
  sources: "index.searchSources",
} as const;

/** Two lines of text; every row is this tall so the window can be computed. */
export const ROW_HEIGHT = 44;
/** Rows drawn beyond those in view, so a short scroll shows no gap. */
const MARGIN = 10;
/** What is drawn before the list has a height to measure, as in a test. */
const FIRST_WINDOW = 40;

export interface IndexHost {
  open(xref: string): void;
  kindChanged?(kind: IndexKind): void;
}

export const INDEX_KINDS: IndexKind[] = ["people", "families", "sources"];

export interface IndexFile {
  index: GenealogyIndex;
  current: string | null;
}

export const restsOnNothing = (index: GenealogyIndex, row: PersonRow): boolean =>
  row.xref !== undefined && index.citesBy(row.xref).length === 0;

function personSearch(row: PersonRow): string {
  return [row.search, yearsOf(row).toLowerCase()].join(" ");
}

export function peopleShown(
  index: GenealogyIndex,
  query: string,
  gapsOnly: boolean,
): PersonRow[] {
  const wanted = query.trim().toLowerCase();
  return index.people.filter(
    (row) =>
      row.xref !== undefined &&
      (!gapsOnly || restsOnNothing(index, row)) &&
      (!wanted || personSearch(row).includes(wanted)),
  );
}

export function familiesShown(index: GenealogyIndex, query: string): FamilyRow[] {
  const wanted = query.trim().toLowerCase();
  return index.families.filter(
    (row) => row.xref !== undefined && (!wanted || row.search.includes(wanted)),
  );
}

export function sourcesShown(index: GenealogyIndex, query: string): SourceRow[] {
  const wanted = query.trim().toLowerCase();
  return index.sources.filter(
    (row) => row.xref !== undefined && (!wanted || row.search.includes(wanted)),
  );
}

/**
 * The index of one file. Kept across redraws so that a new text, or a new
 * current record, keeps the reader's search and scroll.
 */
export class IndexList {
  private kind: IndexKind = "people";
  private query = "";
  private gapsOnly = false;
  private file: IndexFile | null = null;
  private rows: (PersonRow | FamilyRow | SourceRow)[] = [];
  private readonly kindEl: HTMLElement;
  private readonly searchEl: HTMLInputElement;
  private readonly filtersEl: HTMLElement;
  private readonly listEl: HTMLElement;
  private readonly spacerEl: HTMLElement;
  private readonly windowEl: HTMLElement;

  constructor(
    container: HTMLElement,
    private readonly host: IndexHost,
  ) {
    container.empty();
    const root = container.createDiv({ cls: "gedcom-desk-index" });
    const head = root.createDiv({ cls: "gedcom-desk-index-head" });
    this.kindEl = head.createDiv({ cls: "gedcom-desk-seg" });
    for (const kind of ["people", "families", "sources"] as const) {
      const button = this.kindEl.createEl("button", {
        cls: "gedcom-desk-seg-button",
        text: t(KIND_LABEL[kind]),
      });
      button.setAttribute("type", "button");
      button.dataset.kind = kind;
      button.addEventListener("click", () => {
        this.showKind(kind);
        this.host.kindChanged?.(kind);
      });
    }
    this.searchEl = head.createEl("input", { cls: "gedcom-desk-search" });
    this.searchEl.setAttribute("type", "search");
    this.searchEl.addEventListener("input", () => {
      this.query = this.searchEl.value;
      this.refresh();
    });
    this.filtersEl = head.createDiv({ cls: "gedcom-desk-filters" });
    this.listEl = root.createDiv({ cls: "gedcom-desk-index-list" });
    this.spacerEl = this.listEl.createDiv({ cls: "gedcom-desk-index-spacer" });
    this.windowEl = this.spacerEl.createDiv({ cls: "gedcom-desk-index-window" });
    this.listEl.addEventListener("scroll", () => this.drawWindow(), { passive: true });
  }

  get shownKind(): IndexKind {
    return this.kind;
  }

  showKind(kind: IndexKind): void {
    this.kind = kind;
    this.query = "";
    this.searchEl.value = "";
    this.refresh();
  }

  show(file: IndexFile | null): void {
    this.file = file;
    this.refresh();
  }

  private refresh(): void {
    const file = this.file;
    this.kindEl.toggle(file !== null);
    this.searchEl.toggle(file !== null);
    if (!file) {
      this.filtersEl.empty();
      this.rows = [];
      this.spacerEl.setCssProps({ height: "" });
      this.windowEl.empty();
      this.windowEl.createDiv({ cls: "gedcom-desk-none", text: t("index.noFile") });
      return;
    }
    const { index } = file;
    const people = index.people.filter((row) => row.xref !== undefined);
    for (const button of Array.from(this.kindEl.children) as HTMLElement[]) {
      button.toggleClass("is-active", button.dataset.kind === this.kind);
    }
    this.searchEl.placeholder = t(SEARCH_HINT[this.kind]);
    this.filtersEl.empty();
    if (this.kind === "people") {
      const gaps = people.filter((row) => restsOnNothing(index, row)).length;
      this.chip(plural("index.all", people.length), !this.gapsOnly, false);
      this.chip(plural("index.gaps", gaps), this.gapsOnly, true);
      this.rows = peopleShown(index, this.query, this.gapsOnly);
    } else if (this.kind === "families") {
      this.rows = familiesShown(index, this.query);
    } else {
      this.rows = sourcesShown(index, this.query);
    }
    this.spacerEl.setCssProps({ height: `${this.rows.length * ROW_HEIGHT}px` });
    this.drawWindow();
  }

  private chip(text: string, active: boolean, gapsOnly: boolean): void {
    const chip = this.filtersEl.createEl("button", { cls: "gedcom-desk-chip-filter", text });
    chip.setAttribute("type", "button");
    chip.toggleClass("is-active", active);
    chip.addEventListener("click", () => {
      this.gapsOnly = gapsOnly;
      this.refresh();
    });
  }

  private drawWindow(): void {
    const file = this.file;
    this.windowEl.empty();
    if (!file) {
      return;
    }
    if (this.rows.length === 0) {
      this.windowEl.setCssProps({ top: "0px" });
      this.windowEl.createDiv({ cls: "gedcom-desk-none", text: this.nothing() });
      return;
    }
    const height = this.listEl.clientHeight;
    const first = Math.max(0, Math.floor(this.listEl.scrollTop / ROW_HEIGHT) - MARGIN);
    const count = height > 0 ? Math.ceil(height / ROW_HEIGHT) + 2 * MARGIN : FIRST_WINDOW;
    this.windowEl.setCssProps({ top: `${first * ROW_HEIGHT}px` });
    for (const row of this.rows.slice(first, first + count)) {
      if ("spouseNames" in row) {
        this.familyRow(row, file);
      } else if ("title" in row) {
        this.sourceRow(row, file);
      } else {
        this.personRow(row, file);
      }
    }
  }

  private nothing(): string {
    const query = this.query.trim();
    if (query) {
      const key = {
        people: "index.nothingPeople",
        families: "index.nothingFamilies",
        sources: "index.nothingSources",
      } as const;
      return t(key[this.kind], { query });
    }
    const key = {
      people: "index.noPeople",
      families: "index.noFamilies",
      sources: "index.noSources",
    } as const;
    return t(key[this.kind]);
  }

  private rowButton(xref: string, file: IndexFile): HTMLElement {
    const button = this.windowEl.createEl("button", { cls: "gedcom-desk-row" });
    button.setAttribute("type", "button");
    button.toggleClass("is-current", file.current === xref);
    button.addEventListener("click", () => this.host.open(xref));
    return button;
  }

  private personRow(row: PersonRow, file: IndexFile): void {
    const xref = row.xref;
    if (!xref) {
      return;
    }
    const button = this.rowButton(xref, file);
    const name = button.createSpan({ cls: "gedcom-desk-row-name", text: personName(row) });
    if (restsOnNothing(file.index, row)) {
      const mark = name.createSpan({ cls: "gedcom-desk-gap" });
      mark.setAttribute("aria-label", t("index.gapMark"));
    }
    button.createSpan({ cls: "gedcom-desk-row-years", text: yearsOf(row) });
    button.createSpan({ cls: "gedcom-desk-row-place", text: row.place ?? "" });
  }

  private familyRow(row: FamilyRow, file: IndexFile): void {
    const xref = row.xref;
    if (!xref) {
      return;
    }
    const button = this.rowButton(xref, file);
    button.createSpan({ cls: "gedcom-desk-row-name", text: familyTitle(row.spouseNames) });
    button.createSpan({ cls: "gedcom-desk-row-years", text: year(row.marriage) ?? "" });
    button.createSpan({ cls: "gedcom-desk-row-place", text: row.place ?? "" });
  }

  private sourceRow(row: SourceRow, file: IndexFile): void {
    const xref = row.xref;
    if (!xref) {
      return;
    }
    const button = this.rowButton(xref, file);
    button.createSpan({ cls: "gedcom-desk-row-name", text: sourceTitle(row.title) });
    const citers = new Set(file.index.citedBy(xref).map((citation) => citation.record));
    button.createSpan({ cls: "gedcom-desk-row-years", text: String(citers.size) });
    button.createSpan({ cls: "gedcom-desk-row-place", text: row.author ?? "" });
  }
}
