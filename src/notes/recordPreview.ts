import { GedcomLanguageService } from "@domorium/language-service";

import { xrefFromSubpath } from "../vault/protocolLink";
import { tokenRuns, type BlockRun } from "./gedcomBlock";

const LINE_LIMIT = 40;

export type RecordPreview =
  | { kind: "record"; title: string; runs: BlockRun[]; truncated: boolean }
  | { kind: "file"; runs: BlockRun[]; truncated: boolean }
  | { kind: "missing"; xref: string };

/**
 * What a link to a record shows before it is followed. A link naming none
 * shows the head of the file, which is where a GEDCOM says what it is.
 */
export function recordPreview(
  text: string,
  subpath: string,
  limit = LINE_LIMIT,
): RecordPreview {
  const service = new GedcomLanguageService(text);
  const starts = lineStarts(text);
  const xref = xrefFromSubpath(subpath);
  if (!xref) {
    return {
      kind: "file",
      ...slice(service, text, starts, 0, starts.length, limit),
    };
  }
  const record = service
    .getDocumentSymbols()
    .find((symbol) => symbol.detail === xref);
  if (!record) {
    return { kind: "missing", xref };
  }
  const { start, end } = record.range;
  return {
    kind: "record",
    title: record.label ?? xref,
    ...slice(
      service,
      text,
      starts,
      start.line,
      end.line - start.line + 1,
      limit,
    ),
  };
}

function slice(
  service: GedcomLanguageService,
  text: string,
  starts: number[],
  firstLine: number,
  available: number,
  limit: number,
): { runs: BlockRun[]; truncated: boolean } {
  const lines = Math.min(available, limit);
  const from = starts[firstLine] ?? 0;
  const to = (starts[firstLine + lines] ?? text.length + 1) - 1;
  const source = text.slice(from, to).replace(/[\r\n]+$/u, "");
  return {
    runs: tokenRuns(source, service.getSemanticTokens({ from, to }), from),
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
