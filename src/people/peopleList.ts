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

/**
 * The list of people, drawn into a plain container. It imports nothing from
 * `obsidian` and nothing from the catalogue, so the browser harness and a unit
 * test mount the same code the sidebar does.
 */
export class PeopleList {
  private people: PersonRow[] = [];
  private shown: PersonRow[] = [];
  private filter = "";
  private readonly countEl: HTMLElement;
  private readonly rowsEl: HTMLElement;

  constructor(
    container: HTMLElement,
    private readonly labels: PeopleListLabels,
    private readonly onChoose: (person: PersonRow) => void,
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
    for (const person of this.shown) {
      this.drawRow(person);
    }
  }

  private drawRow(person: PersonRow): void {
    const row = element(this.rowsEl, "div", "gedcom-person-row");
    row.tabIndex = 0;
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
