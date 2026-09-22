import type { DocumentSymbol } from "@domorium/language-service";
import { ItemView, type WorkspaceLeaf } from "obsidian";

import { IndexCache } from "../genealogy/cache";
import {
  personRef,
  type DocumentRef,
  type PersonRef,
  type PersonRow,
} from "../genealogy";
import { plural, t } from "../i18n";
import { PeopleList, ROW_HEIGHT } from "./peopleList";

export const PEOPLE_VIEW_TYPE = "domorium-people";

/** What the sidebar needs of the plugin, which is where `obsidian` stays. */
export interface PeopleViewHost {
  /** The document the reader is looking at, or null where it is not a GEDCOM. */
  activeDocument(): { document: DocumentRef; revision: string } | null;
  /** The symbols of that document, read from the open view rather than disk. */
  symbolsOf(document: DocumentRef): DocumentSymbol[];
  openPerson(person: PersonRef, name?: string): void;
  shownPerson(): PersonRef | null;
  indexes(): IndexCache;
}

function baseName(path: string): string {
  const cut = path.lastIndexOf("/");
  return cut === -1 ? path : path.slice(cut + 1);
}

export class PeopleView extends ItemView {
  navigation = false;

  private list: PeopleList | null = null;
  private scroller: HTMLElement | null = null;
  private showing: DocumentRef | null = null;
  private emptyEl: HTMLElement | null = null;

  constructor(
    leaf: WorkspaceLeaf,
    private readonly host: PeopleViewHost,
  ) {
    super(leaf);
  }

  getViewType(): string {
    return PEOPLE_VIEW_TYPE;
  }

  getDisplayText(): string {
    return t("people.viewTitle");
  }

  getIcon(): string {
    return "users";
  }

  async onOpen(): Promise<void> {
    this.draw();
    this.refresh();
  }

  /**
   * Called when the reader moves between leaves. A move to something that is
   * not a GEDCOM leaves the list as it was: stepping into a note to read
   * something should not cost the reader the list they were using.
   */
  refresh(): void {
    const active = this.host.activeDocument();
    if (!active) {
      return;
    }
    const index = this.host
      .indexes()
      .at(active.document, active.revision, () =>
        this.host.symbolsOf(active.document),
      );
    this.showing = active.document;
    this.emptyEl?.remove();
    this.emptyEl = null;
    this.list?.setPeople(index.people, baseName(active.document.path));
    this.markShownPerson();
  }

  private draw(): void {
    const root = this.contentEl;
    root.empty();
    root.addClass("gedcom-people-view");

    const search = root.createEl("input", {
      cls: "gedcom-people-search",
      type: "search",
    });
    search.placeholder = t("people.searchPlaceholder");
    search.addEventListener("input", () => {
      this.list?.setFilter(search.value);
      if (this.scroller) {
        this.scroller.scrollTop = 0;
      }
    });

    const scroller = root.createDiv({ cls: "gedcom-people-scroller" });
    this.scroller = scroller;
    scroller.addEventListener("scroll", () => {
      this.list?.onScrolled(scroller.scrollTop);
    });

    this.list = new PeopleList(
      scroller,
      {
        count: (total) => plural("people.count", total),
        heading: (document, count) => `${document} · ${count}`,
        noResults: t("people.noResults"),
        unnamed: t("people.unnamed"),
        searchPlaceholder: t("people.searchPlaceholder"),
      },
      (person) => this.choose(person),
      // The sidebar can measure itself; the list cannot, and must not try.
      { viewport: scroller.clientHeight || 600, rowHeight: ROW_HEIGHT },
    );

    if (!this.showing) {
      this.emptyEl = scroller.createDiv({
        cls: "gedcom-people-none",
        text: t("people.noDocument"),
      });
    }
  }

  /** Two documents may declare one identifier, so the document is checked. */
  markShownPerson(): void {
    const shown = this.host.shownPerson();
    const here =
      shown && this.showing && shown.document.path === this.showing.path;
    this.list?.setMarked(here ? shown.xref : null);
  }

  private choose(person: PersonRow): void {
    if (!this.showing || !person.xref) {
      return;
    }
    this.host.openPerson(personRef(this.showing, person.xref), person.name);
  }
}
