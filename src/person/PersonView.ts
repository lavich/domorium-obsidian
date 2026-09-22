import { ItemView, type ViewStateResult, type WorkspaceLeaf } from "obsidian";

import {
  documentRef,
  recordRef,
  UNTITLED,
  type Citation,
  type DocumentRef,
  type Person,
  type RecordRef,
  type PersonRow,
} from "../genealogy";
import { named, t } from "../i18n";
import { renderPersonPage, type PersonPageHost } from "./personPage";

export const PERSON_VIEW_TYPE = "domorium-person";

export interface PersonViewHost {
  read(person: RecordRef): Person | null;
  warm(document: DocumentRef): Promise<void>;
  openRecord(person: RecordRef): void;
  resolveMedia(file: string): string | null;
  openPicture(file: string): void;
  openFamily(family: RecordRef, name?: string): void;
  /** What this person cites, in the order the record writes them. */
  citesBy(person: RecordRef): Citation[];
  titleOf(document: DocumentRef, xref: string): string;
  openSource(source: RecordRef, title?: string): void;
}

/**
 * The name travels with it because `getDisplayText` is called as soon as the
 * view exists, before a document has been read, and reading one needs that
 * document open.
 */
interface PersonViewState {
  path?: string;
  xref?: string;
  name?: string;
}

export class PersonView extends ItemView {
  /** With `result.history` below, this is what makes Back walk the trail. */
  navigation = true;

  private person: RecordRef | null = null;
  private name: string | null = null;

  constructor(
    leaf: WorkspaceLeaf,
    private readonly host: PersonViewHost,
  ) {
    super(leaf);
  }

  getViewType(): string {
    return PERSON_VIEW_TYPE;
  }

  getIcon(): string {
    return "user";
  }

  getDisplayText(): string {
    const read = this.person && this.host.read(this.person);
    return read?.name ?? this.name ?? t("people.viewTitle");
  }

  getState(): Record<string, unknown> {
    return this.person
      ? {
          path: this.person.document.path,
          xref: this.person.xref,
          ...(this.name === null ? {} : { name: this.name }),
        }
      : {};
  }

  setState(state: unknown, result: ViewStateResult): Promise<void> {
    const { path, xref, name } = (state ?? {}) as PersonViewState;
    if (path && xref) {
      this.person = recordRef(documentRef(path), xref);
      this.name = name ?? null;
    }
    // Without this nothing is written to the leaf's history, and Back has
    // nothing to walk — a failure that looks like the API not working.
    result.history = true;
    this.draw();
    return Promise.resolve();
  }

  async onOpen(): Promise<void> {
    this.draw();
  }

  refresh(): void {
    this.draw();
  }

  showing(): RecordRef | null {
    return this.person;
  }

  private draw(): void {
    const root = this.contentEl;
    if (!this.person) {
      root.empty();
      root.createDiv({
        cls: "gedcom-people-none",
        text: t("people.noDocument"),
      });
      return;
    }

    const read = this.host.read(this.person);
    if (!read) {
      const wanted = this.person;
      void this.host.warm(wanted.document).then(() => {
        if (this.person === wanted && this.host.read(wanted)) {
          this.draw();
        }
      });
      root.empty();
      root.createDiv({
        cls: "gedcom-person-unresolved",
        text: t("person.unresolved", { xref: this.person.xref }),
      });
      return;
    }

    this.name = read.name;
    renderPersonPage(root, read, this.pageHost());
    this.retitle();
  }

  /**
   * The tab says who; the header says which file. Obsidian draws both from
   * `getDisplayText`, one string, so they cannot differ through the API, and
   * naming the document there would leave every tab reading `curie.ged`.
   *
   * `.view-header-title` is a class themes rely on rather than an API. If it
   * goes, this writes nothing and the header falls back to the person's name.
   */
  private retitle(): void {
    const leaf = this.leaf as unknown as { updateHeader?: () => void };
    leaf.updateHeader?.();
    const title = this.containerEl.querySelector(".view-header-title");
    if (title && this.person) {
      title.textContent = baseName(this.person.document.path);
    }
  }

  private pageHost(): PersonPageHost {
    return {
      labels: {
        otherNames: t("person.otherNames"),
        parents: t("person.parents"),
        partners: t("person.partners"),
        children: t("person.children"),
        events: t("person.events"),
        sources: t("source.citations"),
        childFamilies: t("person.childFamilies"),
        spouseFamilies: t("person.spouseFamilies"),
        openInGedcom: t("person.openInGedcom"),
        born: t("person.born"),
        died: t("person.died"),
        sexLabel: t("person.sex"),
        unnamed: t("people.unnamed"),
        unresolved: (xref) => t("person.unresolved", { xref }),
        sex: (value) => namedSex(value),
      },
      source: {
        document: baseName(this.person?.document.path ?? ""),
        xref: this.person?.xref ?? "",
      },
      resolveMedia: (file) => this.host.resolveMedia(file),
      onOpenPicture: (picture) => {
        this.host.openPicture(picture.file);
      },
      eventLabel: (tag) => namedEvent(tag),
      citations: this.person ? this.host.citesBy(this.person) : [],
      titleOf: (xref) => this.titleOf(xref),
      within: (what) => t("source.within", { what }),
      onSource: (citation) => {
        if (this.person) {
          this.host.openSource(
            recordRef(this.person.document, citation.source),
            this.titleOf(citation.source),
          );
        }
      },
      onPerson: (relative) => {
        this.follow(relative);
      },
      onFamily: (family) => {
        if (this.person && family.xref) {
          this.host.openFamily(
            recordRef(this.person.document, family.xref),
            family.name,
          );
        }
      },
      onOpenRecord: () => {
        if (this.person) {
          this.host.openRecord(this.person);
        }
      },
    };
  }

  /** A source stating no title of its own is named by its identifier. */
  private titleOf(xref: string): string {
    if (!this.person) {
      return xref;
    }
    const title = this.host.titleOf(this.person.document, xref);
    return title === UNTITLED ? xref : title;
  }

  /** Through the leaf rather than by redrawing: that is what records history. */
  private follow(relative: PersonRow): void {
    if (!this.person || !relative.xref) {
      return;
    }
    void this.leaf.setViewState({
      type: PERSON_VIEW_TYPE,
      active: true,
      state: {
        path: this.person.document.path,
        xref: relative.xref,
        name: relative.name,
      },
    });
  }
}

function namedEvent(tag: string): string {
  return named(`event.${tag}`) ?? tag;
}

function baseName(path: string): string {
  const cut = path.lastIndexOf("/");
  return cut === -1 ? path : path.slice(cut + 1);
}

function namedSex(value: string): string {
  return named(`sex.${value}`) ?? value;
}
