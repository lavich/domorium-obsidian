import { ItemView, type WorkspaceLeaf } from "obsidian";

import type { GenealogyIndex } from "../genealogy";
import {
  documentRef,
  personRef,
  type DocumentRef,
  type PersonRef,
  type PersonRow,
} from "../genealogy";
import { GEDCOM_ICON_ID } from "../icon";
import { plural, t } from "../i18n";
import { PeopleList, ROW_HEIGHT } from "./peopleList";

export const PEOPLE_VIEW_TYPE = "domorium-people";

/** What the sidebar needs of the plugin, which is where `obsidian` stays. */
export interface PeopleViewHost {
  /** The document the reader is looking at, or null where it is not a GEDCOM. */
  activeDocument(): { document: DocumentRef } | null;
  /** Every GEDCOM the vault holds, so the reader can choose one. */
  documents(): DocumentRef[];
  /** A reading to be had without waiting, or null. */
  indexOf(document: DocumentRef): GenealogyIndex | null;
  /** Read a document nobody has open; ask again once it resolves. */
  warm(document: DocumentRef): Promise<void>;
  openPerson(person: PersonRef, name?: string): void;
  shownPerson(): PersonRef | null;
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
    return GEDCOM_ICON_ID;
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
    this.refreshDocuments();
    const active = this.host.activeDocument();
    if (active) {
      this.show(active.document);
      return;
    }
    // Nothing open and nothing chosen yet: a view that opens on a list is
    // more use than one that opens on an instruction.
    if (!this.showing) {
      const first = this.host.documents()[0];
      if (first) {
        this.show(first);
      }
    }
  }

  /** List a document, whether the reader chose it here or opened the file. */
  private show(document: DocumentRef): void {
    const index = this.host.indexOf(document);
    if (!index) {
      // Nobody has it open, so the vault must be read first.
      void this.host.warm(document).then(() => {
        if (this.host.indexOf(document)) {
          this.show(document);
        }
      });
      return;
    }
    this.showing = document;
    this.emptyEl?.remove();
    this.emptyEl = null;
    this.list?.setPeople(index.people);
    this.refreshDocuments();
    this.markShownPerson();
  }

  private refreshDocuments(): void {
    this.list?.setDocuments(
      this.host.documents().map((one) => one.path),
      this.showing?.path,
    );
  }

  private draw(): void {
    const root = this.contentEl;
    root.empty();
    root.addClass("gedcom-people-view");

    // Obsidian styles a search field through this wrapper — radius, padding
    // and the clear button all hang off it — which is how `searchPanel.ts`
    // builds the one in the editor. A bare input gets the browser's.
    const wrap = root.createDiv({ cls: "search-input-container" });
    const search = wrap.createEl("input", { type: "search" });
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
        subject: t("people.viewTitle"),
        noResults: t("people.noResults"),
        unnamed: t("people.unnamed"),
        searchPlaceholder: t("people.searchPlaceholder"),
      },
      (person) => this.choose(person),
      // The sidebar can measure itself; the list cannot, and must not try.
      { viewport: scroller.clientHeight || 600, rowHeight: ROW_HEIGHT },
    );

    this.list.onDocumentChosen((path) => {
      this.show(documentRef(path));
    });
    this.refreshDocuments();

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
