import { ItemView, type WorkspaceLeaf } from "obsidian";

import type { GenealogyIndex } from "../genealogy";
import {
  documentRef,
  recordRef,
  type DocumentRef,
  type RecordRef,
  type PersonRow,
} from "../genealogy";
import { GEDCOM_ICON_ID } from "../icon";
import { plural, t } from "../i18n";
import { PeopleList, ROW_HEIGHT } from "./peopleList";

export const PEOPLE_VIEW_TYPE = "domorium-people";

export interface PeopleViewHost {
  activeDocument(): { document: DocumentRef } | null;
  documents(): DocumentRef[];
  indexOf(document: DocumentRef): GenealogyIndex | null;
  warm(document: DocumentRef): Promise<void>;
  openPerson(person: RecordRef, name?: string): void;
  shownPerson(): RecordRef | null;
}


export class PeopleView extends ItemView {
  navigation = false;

  private list: PeopleList | null = null;
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

  /** A move to something that is not a GEDCOM leaves the list as it was. */
  refresh(): void {
    this.refreshDocuments();
    const active = this.host.activeDocument();
    if (active) {
      this.show(active.document);
      return;
    }
    // A view that opens on a list is more use than one on an instruction.
    if (!this.showing) {
      const first = this.host.documents()[0];
      if (first) {
        this.show(first);
      }
    }
  }

  private show(document: DocumentRef): void {
    const index = this.host.indexOf(document);
    if (!index) {
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

    this.list = new PeopleList(
      root,
      {
        count: (total) => plural("people.count", total),
        subject: t("people.viewTitle"),
        noResults: t("people.noResults"),
        unnamed: t("people.unnamed"),
        searchPlaceholder: t("people.searchPlaceholder"),
      },
      (person) => this.choose(person),
      // The sidebar can measure itself; the list cannot, and must not try.
      { viewport: root.clientHeight || 600, rowHeight: ROW_HEIGHT },
    );

    this.list.onDocumentChosen((path) => {
      this.show(documentRef(path));
    });
    this.refreshDocuments();

    if (!this.showing) {
      this.emptyEl = this.list.emptyHost.createDiv({
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
    this.host.openPerson(recordRef(this.showing, person.xref), person.name);
  }
}
