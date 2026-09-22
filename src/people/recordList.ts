import type { Row } from "../genealogy";

/**
 * The strings the list shows, already in the reader's language.
 *
 * Resolved values rather than a translate function: the renderer then cannot
 * reach for the plugin's language state, which is module-wide and set once at
 * load, and a test can say what it expects without setting global state. The
 * view built on Obsidian fills these from the catalogue.
 */
export interface RecordListLabels {
  count: (total: number) => string;
  /** What of the document may be listed, and what each is called. */
  subjects: { id: string; name: string }[];
  noResults: string;
  searchPlaceholder: string;
}

/** What the list needs to know about the space it is drawn in. */
export interface RecordListMetrics {
  /** The visible height in pixels. Measured by the host, which can lay out. */
  viewport: number;
  /** One row's height. The rows are a fixed height so the window can count. */
  rowHeight?: number;
}

/**
 * One row's height, and the only place it is written. styles.css reads it from
 * `--gedcom-person-row-height`, because the window positions rows by
 * arithmetic rather than by measuring them: a stylesheet and a constant
 * disagreeing by a pixel makes a list that drifts the further it is scrolled.
 */
export const ROW_HEIGHT = 34;
/** Rows drawn above and below the viewport, so a scroll does not flash. */
const MARGIN_ROWS = 6;

/**
 * Drawn into a plain container, importing nothing from `obsidian` and nothing
 * from the catalogue, so a test and the browser harness mount what the sidebar
 * mounts.
 *
 * Only the rows in view are in the document: twenty thousand styled rows cost
 * a quarter of a second to build and hold eighty thousand elements, and a
 * filter matching most people pays that again on a keystroke.
 */
export class RecordList {
  private people: Row[] = [];
  private marked: string | null = null;
  private onDocument: ((document: string) => void) | null = null;
  private drawing: (row: HTMLElement, record: Row) => void;
  private readonly documentEl: HTMLSelectElement;
  private readonly subjectEl: HTMLSelectElement;
  private onSubject: ((subject: string) => void) | null = null;
  private shown: Row[] = [];
  private filter = "";
  private readonly countEl: HTMLElement;
  private readonly rowsEl: HTMLElement;
  private readonly scrollEl: HTMLElement;

  private scrollTop = 0;

  constructor(
    container: HTMLElement,
    private readonly labels: RecordListLabels,
    private readonly onChoose: (record: Row) => void,
    drawInto: (row: HTMLElement, record: Row) => void,
    private readonly metrics?: RecordListMetrics,
  ) {
    this.drawing = drawInto;
    container.replaceChildren();
    const root = element(container, "div", "gedcom-people");
    root.style.setProperty(
      "--gedcom-person-row-height",
      `${metrics?.rowHeight ?? ROW_HEIGHT}px`,
    );

    // Which document, and what of it. The second offers one thing today;
    // families and the rest are the same list with another subject, and a
    // reader should see that this is one of several before there are several.
    const bar = element(root, "div", "gedcom-people-bar");
    this.documentEl = element(
      bar,
      "select",
      "dropdown gedcom-people-document",
    ) as HTMLSelectElement;
    this.documentEl.addEventListener("change", () => {
      this.onDocument?.(this.documentEl.value);
    });
    this.subjectEl = element(
      bar,
      "select",
      "dropdown gedcom-people-subject",
    ) as HTMLSelectElement;
    for (const { id, name } of labels.subjects) {
      const option = this.subjectEl.ownerDocument.createElement("option");
      option.value = id;
      option.textContent = name;
      this.subjectEl.append(option);
    }
    this.subjectEl.addEventListener("change", () => {
      this.onSubject?.(this.subjectEl.value);
    });

    // The search sits under the bar and above the count, and all three stay
    // put while the rows beneath them scroll.
    const wrap = element(root, "div", "search-input-container");
    const search = element(wrap, "input", "") as HTMLInputElement;
    search.type = "search";
    search.placeholder = labels.searchPlaceholder;
    search.addEventListener("input", () => {
      this.setFilter(search.value);
      this.scrollEl.scrollTop = 0;
    });

    this.countEl = element(root, "div", "gedcom-people-count");
    this.scrollEl = element(root, "div", "gedcom-people-scroller");
    this.scrollEl.addEventListener("scroll", () => {
      this.onScrolled(this.scrollEl.scrollTop);
    });
    this.rowsEl = element(this.scrollEl, "div", "gedcom-people-rows");
  }

  /** Where the empty-vault message goes, above the rows and below the count. */
  get emptyHost(): HTMLElement {
    return this.scrollEl;
  }

  /** Every GEDCOM the vault holds, and whichever is being listed. */
  setDocuments(documents: string[], current?: string): void {
    this.documentEl.replaceChildren();
    for (const name of documents) {
      const option = this.documentEl.ownerDocument.createElement("option");
      option.value = name;
      option.textContent = name;
      this.documentEl.append(option);
    }
    this.documentEl.value = current ?? "";
  }

  onDocumentChosen(run: (document: string) => void): void {
    this.onDocument = run;
  }

  onSubjectChosen(run: (subject: string) => void): void {
    this.onSubject = run;
  }

  /**
   * Which subject is being listed. The two selections are independent: a
   * change of document keeps the subject, and a change of subject keeps the
   * document.
   */
  setSubject(subject: string): void {
    this.subjectEl.value = subject;
  }

  /** What a row is drawn as. Changed when the subject does. */
  setDrawing(draw: (row: HTMLElement, record: Row) => void): void {
    this.drawing = draw;
  }

  setRecords(people: Row[]): void {
    // A record with no identifier cannot be opened or linked to, so it is not
    // listed. The model still reports it; leaving it out is this view's call.
    this.people = people.filter((person) => !person.unaddressable);
    this.draw();
  }

  /**
   * A substring test against the one lowercase string the model built per
   * person, so name, other names, identifier, years and place all match
   * without a second index.
   */
  setFilter(text: string): void {
    this.filter = text.trim().toLowerCase();
    // A new filter is a new list; keeping the old offset would land the reader
    // somewhere in the middle of it, or past its end.
    this.scrollTop = 0;
    this.draw();
  }

  /**
   * The person a Person view is showing, so the reader can see where in the
   * list they now are. The host passes nothing for somebody from another
   * document.
   */
  setMarked(xref: string | null): void {
    if (xref === this.marked) {
      return;
    }
    this.marked = xref;
    this.draw();
  }

  onScrolled(scrollTop: number): void {
    if (scrollTop === this.scrollTop) {
      return;
    }
    this.scrollTop = scrollTop;
    this.draw();
  }

  private draw(): void {
    this.shown = this.filter
      ? this.people.filter((person) => person.search.includes(this.filter))
      : this.people;
    this.countEl.textContent = this.labels.count(this.shown.length);
    this.rowsEl.replaceChildren();
    // A search that found nothing is not the same as a document with nobody
    // in it, which the view above says.
    if (this.filter !== "" && this.shown.length === 0) {
      element(this.rowsEl, "div", "gedcom-people-empty").textContent =
        this.labels.noResults;
      return;
    }
    this.drawWindow();
  }

  /** Inside a box as tall as the whole list, so the scrollbar is honest. */
  private drawWindow(): void {
    if (!this.metrics) {
      for (const person of this.shown) {
        this.drawRow(person, null);
      }
      return;
    }

    const rowHeight = this.metrics.rowHeight ?? ROW_HEIGHT;
    // The two values that cannot be a class go through custom properties,
    // which styles.css reads.
    this.rowsEl.classList.add("is-windowed");
    this.rowsEl.style.setProperty(
      "--gedcom-people-height",
      `${this.shown.length * rowHeight}px`,
    );

    const visible = Math.ceil(this.metrics.viewport / rowHeight);
    const first = Math.max(0, Math.floor(this.scrollTop / rowHeight) - MARGIN_ROWS);
    const last = Math.min(this.shown.length, first + visible + MARGIN_ROWS * 2);

    for (let i = first; i < last; i++) {
      const person = this.shown[i];
      if (person) {
        this.drawRow(person, i * rowHeight);
      }
    }
  }

  private drawRow(record: Row, top: number | null): void {
    const row = element(this.rowsEl, "div", "gedcom-person-row");
    row.tabIndex = 0;
    if (record.xref !== undefined && record.xref === this.marked) {
      row.classList.add("is-marked");
    }
    if (top !== null) {
      row.classList.add("is-windowed");
      row.style.setProperty("--gedcom-person-top", `${top}px`);
    }
    // What a row says is the subject's business; the window, the filter and
    // the mark are not.
    this.drawing(row, record);
    row.addEventListener("click", () => {
      this.onChoose(record);
    });
  }
}

function element(
  parent: HTMLElement,
  tag: "div" | "span" | "input" | "select",
  cls: string,
): HTMLElement {
  const node = parent.ownerDocument.createElement(tag);
  node.className = cls;
  parent.append(node);
  return node;
}
