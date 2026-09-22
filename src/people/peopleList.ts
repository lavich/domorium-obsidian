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

const DEFAULT_ROW_HEIGHT = 44;
/** Rows drawn above and below the viewport, so a scroll does not flash. */
const MARGIN_ROWS = 6;

/**
 * The list of people, drawn into a plain container. It imports nothing from
 * `obsidian` and nothing from the catalogue, so the browser harness and a unit
 * test mount the same code the sidebar does.
 *
 * Only the rows in view are in the document. Measured in Chromium at the
 * sidebar's width, twenty thousand styled rows cost a quarter of a second to
 * build and hold eighty thousand elements, and a filter that matches most
 * people pays that again on a keystroke. The window costs a subtraction.
 */
export class PeopleList {
  private people: PersonRow[] = [];
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
    this.countEl = element(root, "div", "gedcom-people-count");
    this.rowsEl = element(root, "div", "gedcom-people-rows");
  }

  /** The people of one document, in the order the file declares them. */
  setPeople(people: PersonRow[]): void {
    // A record with no identifier cannot be opened or linked to, so it is not
    // listed. The model still reports it; leaving it out is this view's call.
    this.people = people.filter((person) => !person.unaddressable);
    this.draw();
  }

  /**
   * What the reader typed. Matching is a substring test against the one
   * lowercase string the model built per person, so a name, another name, an
   * identifier, a year and a place all match without a second index.
   */
  setFilter(text: string): void {
    this.filter = text.trim().toLowerCase();
    // A new filter is a new list; keeping the old offset would land the reader
    // somewhere in the middle of it, or past its end.
    this.scrollTop = 0;
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
    this.countEl.textContent = this.labels.count(this.shown.length);
    this.rowsEl.replaceChildren();
    // A search that found nothing is worth saying, and it is not the same as a
    // document with nobody in it — the view above says that one. The message
    // is drawn where the rows would be, and is absent when it does not apply
    // rather than present and hidden.
    if (this.filter !== "" && this.shown.length === 0) {
      element(this.rowsEl, "div", "gedcom-people-empty").textContent =
        this.labels.noResults;
      return;
    }
    this.drawWindow();
  }

  /**
   * The rows the reader can see, positioned inside a box as tall as the whole
   * list would be, so that the scrollbar tells the truth about its length.
   */
  private drawWindow(): void {
    if (!this.metrics) {
      for (const person of this.shown) {
        this.drawRow(person, null);
      }
      return;
    }

    const rowHeight = this.metrics.rowHeight ?? DEFAULT_ROW_HEIGHT;
    // The only two values that cannot be a class: how tall the whole list
    // would be, and where each drawn row sits inside it. Both go through
    // custom properties, which styles.css reads; everything static is a class.
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

/**
 * `1901–1975`, or `1931–` where the record states no death, or `–1975` where it
 * states no birth. Neither year read shows nothing at all rather than a dash
 * standing on its own.
 */
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
