import { GedcomLanguageService, type Position, type WorkspaceEdit } from "@domorium/language-service";

import type { EditTarget } from "../desk/edits";

function offsetOf(text: string, at: Position): number {
  const lines = text.split("\n");
  return lines.slice(0, at.line).reduce((sum, line) => sum + line.length + 1, 0) + at.character;
}

/** The text of a tab and its service, as `GedcomView` keeps them, without CodeMirror: an edit applies only to the version it was made for. */
export class TextTab implements EditTarget {
  readonly language: GedcomLanguageService;
  version = 1;
  writes = 0;

  constructor(public text: string) {
    this.language = new GedcomLanguageService(text, this.version);
  }

  service(): GedcomLanguageService {
    return this.language;
  }

  apply(edit: WorkspaceEdit): boolean {
    if (edit.version !== this.version) {
      return false;
    }
    const spans = edit.edits
      .map((one) => ({ from: offsetOf(this.text, one.range.start), to: offsetOf(this.text, one.range.end), insert: one.newText }))
      .sort((a, b) => b.from - a.from);
    let next = this.text;
    for (const span of spans) {
      next = next.slice(0, span.from) + span.insert + next.slice(span.to);
    }
    this.writes += 1;
    this.replace(next);
    return true;
  }

  /** Changes the text from outside the card, as Source or the disk would. */
  replace(text: string): void {
    this.text = text;
    this.version += 1;
    this.language.update(text, this.version);
  }
}
