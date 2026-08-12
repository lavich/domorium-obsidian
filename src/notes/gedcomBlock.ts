import {
  GedcomLanguageService,
  semanticTokenLegend,
  type CreateDocumentOptions,
  type Diagnostic,
  type SemanticToken,
} from "@domorium/language-service";

export type BlockDialect = NonNullable<CreateDocumentOptions["dialect"]>;

const DIALECTS: BlockDialect[] = ["7.0", "5.5.1"];
const DEFAULT_DIALECT: BlockDialect = "7.0";

/**
 * A block carries no header, so the fence names the specification. A block
 * that pastes a whole file with one is judged by what it says instead.
 */
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
): RenderedBlock {
  const service = new GedcomLanguageService(source, 0, {
    fragment: true,
    dialect,
  });
  return {
    runs: runsOf(source, service.getSemanticTokens()),
    problems: service.getDiagnostics().map((diagnostic) => ({
      line: diagnostic.range.start.line + 1,
      message: diagnostic.message,
      level: diagnostic.severity,
    })),
  };
}

function runsOf(source: string, tokens: SemanticToken[]): BlockRun[] {
  const runs: BlockRun[] = [];
  let cursor = 0;
  for (const token of tokens) {
    if (token.startOffset < cursor) {
      continue;
    }
    if (token.startOffset > cursor) {
      runs.push({ text: source.slice(cursor, token.startOffset), className: null });
    }
    runs.push({
      text: source.slice(token.startOffset, token.endOffset),
      className: classOf(token),
    });
    cursor = token.endOffset;
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
