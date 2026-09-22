import { ItemView, type ViewStateResult, type WorkspaceLeaf } from "obsidian";

import {
  documentRef,
  recordRef,
  type DocumentRef,
  type Family,
  type FamilyMember,
  type RecordRef,
} from "../genealogy";
import { named, t } from "../i18n";
import { renderFamilyPage, type FamilyPageHost } from "./familyPage";

export const FAMILY_VIEW_TYPE = "domorium-family";

export interface FamilyViewHost {
  read(family: RecordRef): Family | null;
  warm(document: DocumentRef): Promise<void>;
  openSource(family: RecordRef): void;
  openPerson(person: RecordRef, name?: string): void;
}

/**
 * The name travels with the state for the reason a person's does: the tab's
 * header is drawn before any document has been read.
 */
interface FamilyViewState {
  path?: string;
  xref?: string;
  name?: string;
}

export class FamilyView extends ItemView {
  navigation = true;

  private family: RecordRef | null = null;
  private name: string | null = null;

  constructor(
    leaf: WorkspaceLeaf,
    private readonly host: FamilyViewHost,
  ) {
    super(leaf);
  }

  getViewType(): string {
    return FAMILY_VIEW_TYPE;
  }

  getIcon(): string {
    return "users";
  }

  getDisplayText(): string {
    const read = this.family && this.host.read(this.family);
    return read?.name ?? this.name ?? t("family.viewTitle");
  }

  getState(): Record<string, unknown> {
    return this.family
      ? {
          path: this.family.document.path,
          xref: this.family.xref,
          ...(this.name === null ? {} : { name: this.name }),
        }
      : {};
  }

  setState(state: unknown, result: ViewStateResult): Promise<void> {
    const { path, xref, name } = (state ?? {}) as FamilyViewState;
    if (path && xref) {
      this.family = recordRef(documentRef(path), xref);
      this.name = name ?? null;
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
    return this.family;
  }

  private draw(): void {
    const root = this.contentEl;
    if (!this.family) {
      root.empty();
      return;
    }
    const read = this.host.read(this.family);
    if (!read) {
      const wanted = this.family;
      void this.host.warm(wanted.document).then(() => {
        if (this.family === wanted && this.host.read(wanted)) {
          this.draw();
        }
      });
      root.empty();
      root.createDiv({
        cls: "gedcom-person-unresolved",
        text: t("person.unresolved", { xref: this.family.xref }),
      });
      return;
    }

    this.name = read.name ?? null;
    renderFamilyPage(root, read, this.pageHost());
    this.retitle();
  }

  /** As Person view does, and for the same reason: see its note. */
  private retitle(): void {
    const leaf = this.leaf as unknown as { updateHeader?: () => void };
    leaf.updateHeader?.();
    const title = this.containerEl.querySelector(".view-header-title");
    if (title && this.family) {
      title.textContent = baseName(this.family.document.path);
    }
  }

  private pageHost(): FamilyPageHost {
    return {
      labels: {
        spouses: t("family.spouses"),
        children: t("family.children"),
        events: t("family.events"),
        unnamed: t("family.unnamed"),
        unresolved: (xref) => t("person.unresolved", { xref }),
      },
      eventLabel: (tag) => named(`event.${tag}`) ?? tag,
      source: {
        document: baseName(this.family?.document.path ?? ""),
        xref: this.family?.xref ?? "",
      },
      onPerson: (member: FamilyMember) => {
        if (this.family && member.xref) {
          this.host.openPerson(
            recordRef(this.family.document, member.xref),
            member.name,
          );
        }
      },
      onOpenSource: () => {
        if (this.family) {
          this.host.openSource(this.family);
        }
      },
    };
  }
}

function baseName(path: string): string {
  const cut = path.lastIndexOf("/");
  return cut === -1 ? path : path.slice(cut + 1);
}
