import {
  GedcomLanguageService,
  type DocumentHighlight,
  type DocumentLink,
  type Position,
  type Range,
  type ReferenceOptions,
  type WorkspaceEdit,
} from "@domorium/language-service";
import type { Text } from "@codemirror/state";

import { toOffsets } from "./positions";

export interface CodeMirrorChange {
  from: number;
  to: number;
  insert: string;
}

export function toCodeMirrorChanges(
  doc: Text,
  edit: WorkspaceEdit,
  version: number,
): CodeMirrorChange[] | null {
  if (edit.version !== version) {
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
