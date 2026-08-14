import {
  GedcomLanguageService,
  semanticTokenLegend,
  type CreateDocumentOptions,
  type Diagnostic,
  type InlayHint,
  type SemanticToken,
} from "@domorium/language-service";

export type BlockDialect = NonNullable<CreateDocumentOptions["dialect"]>;

const DIALECTS: BlockDialect[] = ["7.0", "5.5.1"];
const DEFAULT_DIALECT: BlockDialect = "7.0";

/** A block that pastes a whole file is judged by its own header, not by this. */
export function blockDialect(fence: string | undefined): BlockDialect {
  const named = /^\s*(?:`{3,}|~{3,})\s*gedcom\s+(\S+)/u.exec(fence ?? "")?.[1];
  return DIALECTS.find((dialect) => dialect === named) ?? DEFAULT_DIALECT;
}

export interface BlockRun {
  text: string;
  className: string | null;
}

export interface BlockProblem {
  line: number;
  message: string;
  level: Diagnostic["severity"];
}

export interface RenderedBlock {
  runs: BlockRun[];
  problems: BlockProblem[];
}

export function renderGedcomBlock(
  source: string,
  dialect: BlockDialect,
  indent = false,
): RenderedBlock {
  const service = new GedcomLanguageService(source, 0, {
    fragment: true,
    dialect,
  });
  const runs = tokenRuns(source, service.getSemanticTokens());
  return {
    runs: indent ? indentedRuns(runs, service.getInlayHints()) : runs,
    problems: service.getDiagnostics().map((diagnostic) => ({
      line: diagnostic.range.start.line + 1,
      message: diagnostic.message,
      level: diagnostic.severity,
    })),
  };
}

/**
 * The editor indents a nested line with a hint rather than a character, so a
 * file read inside a note has to be given the same room by hand.
 */
export function indentedRuns(
  runs: BlockRun[],
  hints: InlayHint[],
  firstLine = 0,
): BlockRun[] {
  const indents = new Map(
    hints.map((hint) => [hint.position.line - firstLine, hint.label]),
  );
  const indented: BlockRun[] = [];
  let line = 0;
  const openLine = (): void => {
    const indent = indents.get(line);
    if (indent) {
      indented.push({ text: indent, className: null });
    }
  };
  openLine();
  for (const run of runs) {
    run.text.split("\n").forEach((piece, index) => {
      if (index > 0) {
        indented.push({ text: "\n", className: null });
        line += 1;
        openLine();
      }
      if (piece) {
        indented.push({ text: piece, className: run.className });
      }
    });
  }
  return indented;
}

/** Token offsets are the document's; `offset` says where `source` starts in it. */
export function tokenRuns(
  source: string,
  tokens: SemanticToken[],
  offset = 0,
): BlockRun[] {
  const runs: BlockRun[] = [];
  let cursor = 0;
  for (const token of tokens) {
    const start = token.startOffset - offset;
    const end = Math.min(token.endOffset - offset, source.length);
    if (start < cursor || start >= source.length) {
      continue;
    }
    if (start > cursor) {
      runs.push({ text: source.slice(cursor, start), className: null });
    }
    runs.push({ text: source.slice(start, end), className: classOf(token) });
    cursor = end;
  }
  if (cursor < source.length) {
    runs.push({ text: source.slice(cursor), className: null });
  }
  return runs;
}

function classOf(token: SemanticToken): string | null {
  const name = semanticTokenLegend.tokenTypes[token.tokenType];
  const classes = name === undefined ? [] : [`gedcom-token-${name}`];
  if (token.tokenModifiers !== 0) {
    classes.push("gedcom-token-declaration");
  }
  return classes.length === 0 ? null : classes.join(" ");
}
