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

/** The inverse: how a document at `documentPath` spells a file in the vault. */
export function relativeToDocument(
  documentPath: string,
  vaultPath: string,
): string {
  const from = documentPath.split("/").slice(0, -1);
  const to = vaultPath.split("/");
  let shared = 0;
  while (
    shared < from.length &&
    shared < to.length - 1 &&
    from[shared] === to[shared]
  ) {
    shared += 1;
  }
  return [
    ...Array.from({ length: from.length - shared }, () => ".."),
    ...to.slice(shared),
  ].join("/");
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
