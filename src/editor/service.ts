import type { DocumentLink } from "@domorium/codemirror";

export function resolveVaultRelativePath(
  documentPath: string,
  target: string,
): string | null {
  const parts = documentPath.split("/").slice(0, -1);
  for (const part of target.replaceAll("\\", "/").split("/")) {
    if (!part || part === ".") {
      continue;
    }
    if (part === "..") {
      if (parts.length === 0) {
        return null;
      }
      parts.pop();
    } else {
      parts.push(part);
    }
  }
  return parts.join("/");
}

export interface DocumentLinkRouter {
  openExternal(url: string): void;
  openVaultFile(path: string): void;
}

export function routeDocumentLink(
  link: DocumentLink,
  documentPath: string,
  router: DocumentLinkRouter,
): boolean {
  if (link.kind === "http") {
    router.openExternal(link.targetText);
    return true;
  }
  if (link.kind !== "file-relative") {
    return false;
  }
  const path = resolveVaultRelativePath(documentPath, link.targetText);
  if (!path) {
    return false;
  }
  router.openVaultFile(path);
  return true;
}
