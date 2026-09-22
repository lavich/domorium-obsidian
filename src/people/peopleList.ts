import { UNNAMED, type PersonRow } from "../genealogy";

/**
 * The strings the list shows, already in the reader's language.
 *
 * Resolved values rather than a translate function: the renderer then cannot
 * reach for the plugin's language state, which is module-wide and set once at
 * load, and a test can say what it expects without setting global state. The
 * view built on Obsidian fills these from the catalogue.
 */
export interface PeopleListLabels {
  count: (total: number) => string;
  /** The document and the count together: `curie.ged · 17 people`. */
  heading: (document: string, count: string) => string;
  noResults: string;
  /** What to call a person whose record carries no name. */
  unnamed: string;
  searchPlaceholder: string;
}

/** What the list needs to know about the space it is drawn in. */
export interface PeopleListMetrics {
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
export class PeopleList {
  private people: PersonRow[] = [];
  private document = "";
  private marked: string | null = null;
  private shown: PersonRow[] = [];
  private filter = "";
  private readonly countEl: HTMLElement;
  private readonly rowsEl: HTMLElement;

  private scrollTop = 0;

  constructor(
    container: HTMLElement,
    private readonly labels: PeopleListLabels,
    private readonly onChoose: (person: PersonRow) => void,
    private readonly metrics?: PeopleListMetrics,
  ) {
    container.replaceChildren();
    const root = element(container, "div", "gedcom-people");
    root.style.setProperty(
      "--gedcom-person-row-height",
      `${metrics?.rowHeight ?? ROW_HEIGHT}px`,
    );
    this.countEl = element(root, "div", "gedcom-people-count");
    this.rowsEl = element(root, "div", "gedcom-people-rows");
  }

  /** The document's name too: a list of names says nothing about whose. */
  setPeople(people: PersonRow[], document = this.document): void {
    this.document = document;
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

  /** Told by the host, which owns the scrolling element and can measure it. */
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
    const count = this.labels.count(this.shown.length);
    this.countEl.textContent = this.document
      ? this.labels.heading(this.document, count)
      : count;
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

  private drawRow(person: PersonRow, top: number | null): void {
    const row = element(this.rowsEl, "div", "gedcom-person-row");
    row.tabIndex = 0;
    if (person.xref !== undefined && person.xref === this.marked) {
      row.classList.add("is-marked");
    }
    if (top !== null) {
      row.classList.add("is-windowed");
      row.style.setProperty("--gedcom-person-top", `${top}px`);
    }
    element(row, "div", "gedcom-person-name").textContent =
      person.name === UNNAMED ? this.labels.unnamed : person.name;

    const years = spanOfYears(person);
    const place = person.place;
    if (years || place) {
      const sub = element(row, "div", "gedcom-person-sub");
      if (years) {
        element(sub, "span", "gedcom-person-years").textContent = years;
      }
      if (place) {
        element(sub, "span", "gedcom-person-place").textContent = place;
      }
    }

    row.addEventListener("click", () => {
      this.onChoose(person);
    });
  }
}

/** `1901–1975`, `1931–`, `–1975`, or nothing rather than a bare dash. */
function spanOfYears(person: PersonRow): string | null {
  const born = person.birth?.year;
  const died = person.death?.year;
  if (born === undefined && died === undefined) {
    return null;
  }
  return `${born ?? ""}–${died ?? ""}`;
}

function element(
  parent: HTMLElement,
  tag: "div" | "span" | "input",
  cls: string,
): HTMLElement {
  const node = parent.ownerDocument.createElement(tag);
  node.className = cls;
  parent.append(node);
  return node;
}
