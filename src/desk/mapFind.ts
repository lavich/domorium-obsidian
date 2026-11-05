import { plural, t } from "../i18n";
import type { IconSetter } from "./dom";
import type { PlaceGroup } from "./fileMap";
import { FloatingSearch } from "./floatingSearch";
import { matchPlaces } from "./mapSearch";

export interface FindHost {
  groups(): readonly PlaceGroup[];
  collator(): Intl.Collator;
  matchesChanged(keys: ReadonlySet<string> | null): void;
  goTo(group: PlaceGroup): void;
  cleared(): void;
  note(text: string): void;
  setIcon: IconSetter;
}

export class MapFind {
  private readonly search: FloatingSearch;
  private query = "";
  private drawn: PlaceGroup[] = [];
  private at = -1;

  constructor(parent: HTMLElement, private readonly host: FindHost) {
    this.search = new FloatingSearch(parent, {
      prefix: "gedcom-map",
      setIcon: host.setIcon,
      change: (query) => {
        this.query = query;
        this.at = -1;
        this.read();
        if (this.query.trim() === "") {
          this.host.cleared();
        }
      },
      step: (by) => this.step(by),
      info: () => ({ index: this.at, total: this.drawn.length }),
      words: {
        label: t("map.search"),
        none: t("map.search.none"),
        matches: (count) => plural("map.search.matches", count),
        matchOf: (current, total) => t("map.search.matchOf", { current, total }),
      },
    });
  }

  get el(): HTMLElement {
    return this.search.el;
  }

  open(): void {
    this.search.open();
    this.search.focus(true);
  }

  isOpen(): boolean {
    return this.search.isOpen();
  }

  refresh(): void {
    this.read();
    this.search.refresh();
  }

  private read(): void {
    const found = matchPlaces(this.host.groups(), this.query, this.host.collator());
    this.drawn = found.drawn;
    const querying = this.query.trim() !== "";
    this.host.matchesChanged(querying ? new Set(found.drawn.map((one) => one.place.key)) : null);
    const [lone] = found.unmapped;
    this.host.note(querying && found.drawn.length === 0 && lone !== undefined ? t("map.search.unmapped", { name: lone.place.name }) : "");
    if (this.at >= this.drawn.length) {
      this.at = -1;
    }
  }

  private step(by: 1 | -1): void {
    if (this.drawn.length === 0) {
      return;
    }
    this.at = (this.at + by + this.drawn.length) % this.drawn.length;
    const group = this.drawn[this.at];
    if (group !== undefined) {
      this.host.goTo(group);
    }
  }
}
