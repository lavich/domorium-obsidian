import { ItemView, type ViewStateResult, type WorkspaceLeaf } from "obsidian";

import {
  documentRef,
  personRef,
  type Person,
  type PersonRef,
  type PersonRow,
} from "../genealogy";
import { named, t } from "../i18n";
import { renderPersonPage, type PersonPageHost } from "./personPage";

export const PERSON_VIEW_TYPE = "domorium-person";

/** What the page needs of the plugin, which is where `obsidian` stays. */
export interface PersonViewHost {
  /** The person as the document currently states them, or null. */
  read(person: PersonRef): Person | null;
  /** Put the cursor on the record that declares this person. */
  openSource(person: PersonRef): void;
  /** A vault path made drawable, or nothing for a file that is not there. */
  resolveMedia(file: string): string | null;
  /** Show the picture's own file, whole rather than cut to a rectangle. */
  openPicture(file: string): void;
}

/**
 * The view's own state, which Obsidian persists and restores.
 *
 * The name travels with it. Obsidian draws the tab's header from
 * `getDisplayText` as soon as the view exists, which is before anything has
 * been read out of a document, and reading one needs the document to be open.
 * Carrying the name means the header is right from the first draw rather than
 * falling back to the view's own name and staying there.
 */
interface PersonViewState {
  path?: string;
  xref?: string;
  name?: string;
}

export class PersonView extends ItemView {
  /**
   * The property that makes the leaf's history record this view's states.
   * With it, and with `result.history` set below, Obsidian's own Back and
   * Forward walk the people the reader visited — measured, not assumed.
   */
  navigation = true;

  private person: PersonRef | null = null;
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
      this.person = personRef(documentRef(path), xref);
      this.name = name ?? null;
    }
    // Without this the change is not written to the leaf's history, and Back
    // has nothing to walk. Saying `false` here looks exactly like the whole
    // mechanism not working.
    result.history = true;
    this.draw();
    return Promise.resolve();
  }

  async onOpen(): Promise<void> {
    this.draw();
  }

  /** Called when the document this person was read from has changed. */
  refresh(): void {
    this.draw();
  }

  /** The person this view is showing, for a host deciding whether to refresh. */
  showing(): PersonRef | null {
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
   * The tab says who; the header says which file they came from.
   *
   * Obsidian draws both from `getDisplayText`, one string, so they cannot
   * differ through the API. Returning the document there would leave every
   * open person's tab reading `curie.ged`, which is the one thing a tab must
   * not do, so the header is written directly instead.
   *
   * `.view-header-title` is a class themes rely on rather than an API. If it
   * ever goes, this writes nothing and the header falls back to the person's
   * name — the same thing the tab says, which is wrong for nobody.
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
        openInGedcom: t("person.openInGedcom"),
        born: t("person.born"),
        died: t("person.died"),
        sexLabel: t("person.sex"),
        unnamed: t("people.unnamed"),
        unresolved: (xref) => t("person.unresolved", { xref }),
        sex: (value) => namedSex(value),
      },
      source: {
        // The file's own name, not the path: the page is narrow and the
        // reader is distinguishing two documents, not filing them.
        document: baseName(this.person?.document.path ?? ""),
        xref: this.person?.xref ?? "",
      },
      resolveMedia: (file) => this.host.resolveMedia(file),
      onOpenPicture: (picture) => {
        this.host.openPicture(picture.file);
      },
      eventLabel: (tag) => namedEvent(tag),
      onPerson: (relative) => {
        this.follow(relative);
      },
      onOpenSource: () => {
        if (this.person) {
          this.host.openSource(this.person);
        }
      },
    };
  }

  /**
   * Moving to a relative is a change of this view's state, so it goes through
   * the leaf rather than by redrawing: that is what puts it in the history the
   * reader walks back through.
   */
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

/**
 * A tag the catalogue does not name is shown as the tag. The model reads more
 * structures than the catalogue names, on purpose: an unnamed event is still
 * worth showing.
 */
function namedEvent(tag: string): string {
  return named(`event.${tag}`) ?? tag;
}

/** `family/curie.ged` reads as `curie.ged`. */
function baseName(path: string): string {
  const cut = path.lastIndexOf("/");
  return cut === -1 ? path : path.slice(cut + 1);
}

function namedSex(value: string): string {
  return named(`sex.${value}`) ?? value;
}
