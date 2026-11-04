import { GedcomLanguageService } from "@domorium/language-service";

import { buildIndex, documentRef, type GenealogyIndex } from "../genealogy";
import { IndexCache } from "../genealogy/cache";

/** An open overview of either kind, deferred or not: its path is read from its saved state. */
export interface ShownOverview {
  type: string;
  gedcom: unknown;
  view: unknown;
}

/**
 * Readings of files no tab has open, for the overviews that show them. The
 * revision is a count of the vault's changes to the path, not the file's time
 * or size, which an edit within the same second and of the same length would
 * leave unchanged.
 */
export class OverviewReads {
  private readonly reads = new IndexCache();
  private readonly revisions = new Map<string, number>();
  private readonly readAt = new Map<string, number>();
  /** Never reset, so a revision taken before a path was forgotten cannot match one after. */
  private counter = 0;
  private readonly openings = new Map<string, number>();
  private readonly services = new Map<string, GedcomLanguageService>();

  constructor(private readonly overviews: () => ShownOverview[]) {}

  shows(path: string, except?: unknown): boolean {
    return this.overviews().some((one) => one.view !== except && one.gedcom === path);
  }

  /** Held while an overview of the path is being opened; the answer releases it. */
  opening(path: string): () => void {
    this.openings.set(path, (this.openings.get(path) ?? 0) + 1);
    let released = false;
    return () => {
      if (released) {
        return;
      }
      released = true;
      const left = (this.openings.get(path) ?? 1) - 1;
      if (left > 0) {
        this.openings.set(path, left);
        return;
      }
      this.openings.delete(path);
      if (!this.shows(path)) {
        this.forget(path);
      }
    };
  }

  revision(path: string): number | undefined {
    return this.revisions.get(path);
  }

  async read(path: string, text: () => Promise<string>): Promise<GenealogyIndex> {
    const document = documentRef(path);
    const revision = this.revisions.get(path) ?? (this.counter += 1);
    this.revisions.set(path, revision);
    const held = this.reads.held(document);
    if (held && this.readAt.get(path) === revision) {
      return held;
    }
    const source = await text();
    if (!this.holds(path)) {
      return buildIndex(new GedcomLanguageService(source));
    }
    this.readAt.set(path, revision);
    return this.reads.at(document, String(revision), () => {
      const service = new GedcomLanguageService(source);
      this.services.set(path, service);
      return service;
    });
  }

  /** The language service and index of the reading held for a path, which media are resolved against. */
  held(path: string): { service: GedcomLanguageService; index: GenealogyIndex } | null {
    const service = this.services.get(path);
    const index = this.reads.held(documentRef(path));
    return service && index ? { service, index } : null;
  }

  /** Whether anything shows the path, and so whether its overviews need reading again. */
  modified(path: string): boolean {
    if (!this.shows(path)) {
      return false;
    }
    this.revisions.set(path, (this.counter += 1));
    return true;
  }

  closed(path: string, view: unknown): void {
    if (!this.shows(path, view) && !this.openings.has(path)) {
      this.forget(path);
    }
  }

  /** On delete or create: forgets every reading at or under the path, and answers which paths that covers. */
  went(path: string, folder: boolean): (shown: string) => boolean {
    const under = (shown: string): boolean => shown === path || (folder && shown.startsWith(`${path}/`));
    for (const known of [...this.readAt.keys(), ...this.revisions.keys()]) {
      if (under(known)) {
        this.forget(known);
      }
    }
    return under;
  }

  /** The new path of each old one a rename moved, `descendants` being the new paths under a moved folder. */
  moved(from: string, to: string, descendants: string[]): Map<string, string> {
    return new Map<string, string>([
      [from, to],
      ...descendants.map((path): [string, string] => [`${from}${path.slice(to.length)}`, path]),
    ]);
  }

  private holds(path: string): boolean {
    return this.shows(path) || this.openings.has(path);
  }

  private forget(path: string): void {
    this.reads.forget(documentRef(path));
    this.readAt.delete(path);
    this.revisions.delete(path);
    this.services.delete(path);
  }
}
