import {
  GedcomLanguageService,
  type DocumentHighlight,
  type DocumentLink,
  type Position,
  type Range,
  type ReferenceOptions,
  type WorkspaceEdit,
} from "gedcom-language-service";
import type { Text } from "@codemirror/state";

import { toOffsets } from "./positions";

export interface CodeMirrorChange {
  from: number;
  to: number;
  insert: string;
}

export interface CodeMirrorEditTarget {
  state: { doc: Text };
  dispatch(spec: {
    changes: CodeMirrorChange[];
    userEvent: string;
  }): void;
}

export function applyWorkspaceEditToTarget(
  target: CodeMirrorEditTarget,
  edit: WorkspaceEdit,
  version: number,
): boolean {
  const changes = toCodeMirrorChanges(target.state.doc, edit, version);
  if (!changes) {
    return false;
  }
  target.dispatch({ changes, userEvent: "input.gedcom" });
  return true;
}

export function toCodeMirrorChanges(
  doc: Text,
  edit: WorkspaceEdit,
  version: number,
): CodeMirrorChange[] | null {
  if (edit.version !== version) {
    return null;
  }
  if (
    edit.edits.some(
      ({ range }) =>
        !isValidPosition(doc, range.start) ||
        !isValidPosition(doc, range.end) ||
        comparePosition(range.start, range.end) > 0,
    )
  ) {
    return null;
  }
  const changes = edit.edits
    .map((textEdit) => {
      const range = toOffsets(doc, textEdit.range);
      return { from: range.from, to: range.to, insert: textEdit.newText };
    })
    .sort((left, right) => left.from - right.from || left.to - right.to);
  for (let index = 1; index < changes.length; index += 1) {
    if (changes[index - 1].to > changes[index].from) {
      return null;
    }
  }
  return changes;
}

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

function isValidPosition(doc: Text, position: Position): boolean {
  if (
    !Number.isInteger(position.line) ||
    !Number.isInteger(position.character) ||
    position.line < 0 ||
    position.character < 0 ||
    position.line >= doc.lines
  ) {
    return false;
  }
  return position.character <= doc.line(position.line + 1).length;
}

function comparePosition(left: Position, right: Position): number {
  return left.line - right.line || left.character - right.character;
}

export class EditorLanguageService {
  readonly service = new GedcomLanguageService();
  private text = "";
  private version = 0;

  update(text: string): GedcomLanguageService {
    if (text !== this.text) {
      this.text = text;
      this.version += 1;
      this.service.update(text, this.version);
    }
    return this.service;
  }

  clear(): void {
    this.text = "";
    this.version += 1;
    this.service.update("", this.version);
  }

  getVersion(): number {
    return this.version;
  }

  getReferences(position: Position, options: ReferenceOptions): Range[] {
    return this.service.getReferences(position, options);
  }

  getDocumentHighlights(position: Position): DocumentHighlight[] {
    return this.service.getDocumentHighlights(position);
  }

  getDocumentLinks(): DocumentLink[] {
    return this.service.getDocumentLinks();
  }

  prepareRename(position: Position) {
    return this.service.prepareRename(position);
  }

  rename(position: Position, newName: string) {
    return this.service.rename(position, newName, this.version);
  }

  isCurrent(edit: WorkspaceEdit): boolean {
    return edit.version === this.version;
  }
}
