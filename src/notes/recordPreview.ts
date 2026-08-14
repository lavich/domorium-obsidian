import { GedcomLanguageService } from "@domorium/language-service";

import { xrefFromSubpath } from "../vault/protocolLink";
import { indentedRuns, tokenRuns, type BlockRun } from "./gedcomBlock";

const LINE_LIMIT = 40;

export interface PreviewOptions {
  indent?: boolean;
  limit?: number;
}

export type RecordPreview =
  | { kind: "record"; runs: BlockRun[]; truncated: boolean }
  | { kind: "file"; runs: BlockRun[]; truncated: boolean }
  | { kind: "missing"; xref: string };

/** A link naming no record shows the head of the file, where it says what it is. */
export function recordPreview(
  text: string,
  subpath: string,
  options: PreviewOptions = {},
): RecordPreview {
  const { indent = false, limit = LINE_LIMIT } = options;
  const service = new GedcomLanguageService(text);
  const starts = lineStarts(text);
  const xref = xrefFromSubpath(subpath);
  const read = (firstLine: number, available: number) =>
    slice(service, text, starts, firstLine, available, limit, indent);
  if (!xref) {
    return { kind: "file", ...read(0, starts.length) };
  }
  const record = service
    .getDocumentSymbols()
    .find((symbol) => symbol.detail === xref);
  if (!record) {
    return { kind: "missing", xref };
  }
  const { start, end } = record.range;
  return { kind: "record", ...read(start.line, end.line - start.line + 1) };
}

function slice(
  service: GedcomLanguageService,
  text: string,
  starts: number[],
  firstLine: number,
  available: number,
  limit: number,
  indent: boolean,
): { runs: BlockRun[]; truncated: boolean } {
  const lines = Math.min(available, limit);
  const from = starts[firstLine] ?? 0;
  const to = (starts[firstLine + lines] ?? text.length + 1) - 1;
  const source = text.slice(from, to).replace(/[\r\n]+$/u, "");
  const runs = tokenRuns(
    source,
    service.getSemanticTokens({ from, to }),
    from,
  );
  return {
    runs: indent
      ? indentedRuns(runs, service.getInlayHints({ from, to }), firstLine)
      : runs,
    truncated: lines < available,
  };
}

function lineStarts(text: string): number[] {
  const starts = [0];
  for (let index = text.indexOf("\n"); index !== -1; ) {
    starts.push(index + 1);
    index = text.indexOf("\n", index + 1);
  }
  return starts;
}
