import type { DocumentLink } from "@domorium/codemirror";
import {
  resolveFileTarget,
  type GedcomDialect,
} from "@domorium/language-service";

export interface DocumentLinkRouter {
  openExternal(url: string): void;
  openVaultFile(path: string): void;
}

export function routeDocumentLink(
  link: DocumentLink,
  documentPath: string,
  dialect: GedcomDialect | undefined,
  router: DocumentLinkRouter,
): boolean {
  if (link.kind === "http") {
    router.openExternal(link.targetText);
    return true;
  }
  if (link.kind !== "file-relative") {
    return false;
  }
  const path = resolveFileTarget(documentPath, link.targetText, dialect);
  if (!path) {
    return false;
  }
  router.openVaultFile(path);
  return true;
}
