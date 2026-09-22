import { ItemView, type WorkspaceLeaf } from "obsidian";

import type { FamilyRow, GenealogyIndex, Row } from "../genealogy";
import {
  documentRef,
  recordRef,
  type DocumentRef,
  type RecordRef,
  type PersonRow,
} from "../genealogy";
import { GEDCOM_ICON_ID } from "../icon";
import { plural, t } from "../i18n";
import { drawFamilyRow } from "./familyRowView";
import { drawPersonRow } from "./personRowView";
import {
  RecordList,
  ROW_HEIGHT,
  type SubjectPresentation,
} from "./recordList";

export const PEOPLE_VIEW_TYPE = "domorium-people";

type Subject = "people" | "families";

export interface PeopleViewHost {
  activeDocument(): { document: DocumentRef } | null;
  documents(): DocumentRef[];
  indexOf(document: DocumentRef): GenealogyIndex | null;
  warm(document: DocumentRef): Promise<void>;
  openPerson(person: RecordRef, name?: string): void;
  shownPerson(): RecordRef | null;
  shownFamily(): RecordRef | null;
  openFamily(family: RecordRef, name?: string): void;
}


export class PeopleView extends ItemView {
  navigation = false;

  private list: RecordList | null = null;
  private showing: DocumentRef | null = null;
  private subject: Subject = "people";
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
    this.redraw();
    this.refreshDocuments();
    this.markShownPerson();
  }

  /**
   * Everything the subject decides, set together: what is listed, how a row of
   * it is drawn, and every word the list says about it.
   */
  private redraw(): void {
    const index = this.showing && this.host.indexOf(this.showing);
    if (!index || !this.list) {
      return;
    }
    this.list.setSubjectPresentation(this.subject, presentationOf(this.subject));
    this.list.setRecords(
      this.subject === "families" ? index.families : index.people,
    );
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

    this.list = new RecordList(
      root,
      {
        subjects: [
          { id: "people", name: t("people.subjectPeople") },
          { id: "families", name: t("people.subjectFamilies") },
        ],
      },
      (record) => this.choose(record),
      presentationOf("people"),
      // The sidebar can measure itself; the list cannot, and must not try.
      { viewport: root.clientHeight || 600, rowHeight: ROW_HEIGHT },
    );

    this.list.onDocumentChosen((path) => {
      this.show(documentRef(path));
    });
    this.list.onSubjectChosen((chosen) => {
      this.subject = chosen === "families" ? "families" : "people";
      this.redraw();
      this.markShownPerson();
    });
    this.refreshDocuments();

    if (!this.showing) {
      this.emptyEl = this.list.emptyHost.createDiv({
        cls: "gedcom-people-none",
        text: t("people.noDocument"),
      });
    }
  }

  /**
   * Two documents may declare one identifier, so the document is checked; and
   * a person's page open while families are listed marks nothing, the subject
   * not being the one shown.
   */
  markShownPerson(): void {
    const shown =
      this.subject === "families"
        ? this.host.shownFamily()
        : this.host.shownPerson();
    const here =
      shown && this.showing && shown.document.path === this.showing.path;
    this.list?.setMarked(here ? shown.xref : null);
  }

  private choose(record: Row): void {
    if (!this.showing || !record.xref) {
      return;
    }
    const at = recordRef(this.showing, record.xref);
    if (this.subject === "families") {
      this.host.openFamily(at, (record as FamilyRow).name);
      return;
    }
    this.host.openPerson(at, (record as PersonRow).name);
  }
}

/** One subject, and every word and drawing that follows it. */
function presentationOf(subject: Subject): SubjectPresentation {
  if (subject === "families") {
    return {
      count: (total) => plural("families.count", total),
      noResults: t("families.noResults"),
      searchPlaceholder: t("families.searchPlaceholder"),
      draw: (row, record) =>
        drawFamilyRow(row, record as FamilyRow, (count) =>
          plural("family.childCount", count),
        ),
    };
  }
  return {
    count: (total) => plural("people.count", total),
    noResults: t("people.noResults"),
    searchPlaceholder: t("people.searchPlaceholder"),
    draw: (row, record) =>
      drawPersonRow(row, record as PersonRow, t("people.unnamed")),
  };
}
