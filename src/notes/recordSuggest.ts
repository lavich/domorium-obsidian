import {
  EditorSuggest,
  prepareFuzzySearch,
  type App,
  type Editor,
  type EditorPosition,
  type EditorSuggestContext,
  type EditorSuggestTriggerInfo,
  type TFile,
} from "obsidian";

import { recordText, type GedcomRecord } from "../editor/records";
import { isGedcomPath } from "../vault/renamedMedia";
import { linkContext, type RecordIndex } from "./recordIndex";
import { renderRecordSuggestion } from "./recordSuggestView";

export class RecordSuggest extends EditorSuggest<GedcomRecord> {
  private path = "";

  constructor(
    app: App,
    private readonly records: RecordIndex,
  ) {
    super(app);
  }

  onTrigger(
    cursor: EditorPosition,
    editor: Editor,
    _file: TFile | null,
  ): EditorSuggestTriggerInfo | null {
    const context = linkContext(
      editor.getLine(cursor.line).slice(0, cursor.ch),
    );
    if (!context || !isGedcomPath(context.path)) {
      return null;
    }
    this.path = context.path;
    return {
      start: { line: cursor.line, ch: context.start },
      end: cursor,
      query: context.query,
    };
  }

  async getSuggestions(context: EditorSuggestContext): Promise<GedcomRecord[]> {
    const file = this.app.metadataCache.getFirstLinkpathDest(
      this.path,
      context.file?.path ?? "",
    );
    if (!file) {
      return [];
    }
    return rank(await this.records.of(file.path), context.query);
  }

  renderSuggestion(record: GedcomRecord, element: HTMLElement): void {
    renderRecordSuggestion(record, element);
  }

  selectSuggestion(record: GedcomRecord): void {
    const context = this.context;
    if (context && record.identifier) {
      context.editor.replaceRange(
        record.identifier,
        context.start,
        context.end,
      );
    }
    this.close();
  }
}

function rank(records: GedcomRecord[], query: string): GedcomRecord[] {
  if (!query) {
    return records;
  }
  const match = prepareFuzzySearch(query);
  return records
    .flatMap((record) => {
      const found = match(recordText(record));
      return found ? [{ record, score: found.score }] : [];
    })
    .sort((first, second) => second.score - first.score)
    .map((scored) => scored.record);
}
