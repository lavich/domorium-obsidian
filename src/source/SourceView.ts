import { ItemView, type ViewStateResult, type WorkspaceLeaf } from "obsidian";

import {
  documentRef,
  recordRef,
  UNTITLED,
  type Citation,
  type DocumentRef,
  type RecordRef,
  type Source,
} from "../genealogy";
import { named, t } from "../i18n";
import { renderSourcePage, type SourcePageHost } from "./sourcePage";

export const SOURCE_VIEW_TYPE = "domorium-source";

export interface SourceViewHost {
  read(source: RecordRef): Source | null;
  warm(document: DocumentRef): Promise<void>;
  citedBy(source: RecordRef): Citation[];
  /** So the page need not read a citing record itself. */
  nameOf(document: DocumentRef, xref: string): string;
  /** Reveals the source's own lines in the GEDCOM file. */
  openRecord(source: RecordRef): void;
  /** Opens whatever cites it — a person, a family, or the record itself. */
  openCiter(document: DocumentRef, xref: string): void;
}

interface SourceViewState {
  path?: string;
  xref?: string;
  title?: string;
}

export class SourceView extends ItemView {
  navigation = true;

  private source: RecordRef | null = null;
  private title: string | null = null;

  constructor(
    leaf: WorkspaceLeaf,
    private readonly host: SourceViewHost,
  ) {
    super(leaf);
  }

  getViewType(): string {
    return SOURCE_VIEW_TYPE;
  }

  getIcon(): string {
    return "book-open";
  }

  getDisplayText(): string {
    const read = this.source && this.host.read(this.source);
    const title = read?.title;
    if (title && title !== UNTITLED) {
      return title;
    }
    return this.title ?? t("source.viewTitle");
  }

  getState(): Record<string, unknown> {
    return this.source
      ? {
          path: this.source.document.path,
          xref: this.source.xref,
          ...(this.title === null ? {} : { title: this.title }),
        }
      : {};
  }

  setState(state: unknown, result: ViewStateResult): Promise<void> {
    const { path, xref, title } = (state ?? {}) as SourceViewState;
    if (path && xref) {
      this.source = recordRef(documentRef(path), xref);
      this.title = title ?? null;
    }
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
    return this.source;
  }

  private draw(): void {
    const root = this.contentEl;
    if (!this.source) {
      root.empty();
      return;
    }
    const read = this.host.read(this.source);
    if (!read) {
      const wanted = this.source;
      void this.host.warm(wanted.document).then(() => {
        if (this.source === wanted && this.host.read(wanted)) {
          this.draw();
        }
      });
      root.empty();
      root.createDiv({
        cls: "gedcom-person-unresolved",
        text: t("person.unresolved", { xref: this.source.xref }),
      });
      return;
    }

    this.title = read.title === UNTITLED ? null : read.title;
    renderSourcePage(root, read, this.pageHost());
    this.retitle();
  }

  /** As the other pages do, and for the same reason: see Person view's note. */
  private retitle(): void {
    const leaf = this.leaf as unknown as { updateHeader?: () => void };
    leaf.updateHeader?.();
    const title = this.containerEl.querySelector(".view-header-title");
    if (title && this.source) {
      title.textContent = baseName(this.source.document.path);
    }
  }

  private pageHost(): SourcePageHost {
    const document = this.source?.document ?? documentRef("");
    return {
      labels: {
        heldAt: t("source.heldAt"),
        citedBy: t("source.citedBy"),
        citedByNobody: t("source.citedByNobody"),
        untitled: t("source.untitled"),
        address: t("repo.address"),
        web: t("repo.web"),
      },
      fieldLabel: (tag) => named(`field.${tag}`) ?? tag,
      within: (tag) => t("source.within", { what: named(`event.${tag}`) ?? tag }),
      nameOf: (xref) => this.host.nameOf(document, xref),
      source: {
        document: baseName(document.path),
        xref: this.source?.xref ?? "",
      },
      citations: this.source ? this.host.citedBy(this.source) : [],
      onCiter: (citation) => {
        this.host.openCiter(document, citation.record);
      },
      onOpenRecord: () => {
        if (this.source) {
          this.host.openRecord(this.source);
        }
      },
    };
  }
}

function baseName(path: string): string {
  const cut = path.lastIndexOf("/");
  return cut === -1 ? path : path.slice(cut + 1);
}
