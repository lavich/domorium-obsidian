import {
  autocompletion,
  type CompletionContext,
  type CompletionResult,
} from "@codemirror/autocomplete";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { foldGutter, foldService, indentUnit } from "@codemirror/language";
import { linter, lintGutter, type Diagnostic as CmDiagnostic } from "@codemirror/lint";
import { EditorState, type Extension } from "@codemirror/state";
import {
  Decoration,
  EditorView,
  hoverTooltip,
  keymap,
  lineNumbers,
  type DecorationSet,
  ViewPlugin,
  type ViewUpdate,
  WidgetType,
} from "@codemirror/view";
import type {
  CompletionItem,
  DocumentLink,
  WorkspaceEdit,
} from "@domorium/language-service";
import { semanticTokenLegend } from "@domorium/language-service";

import { toOffset, toOffsets, toPosition } from "./positions";
import { EditorLanguageService } from "./service";

export interface GedcomEditorSettings {
  diagnostics: boolean;
  indentationHints: boolean;
}

export interface GedcomEditorActions {
  applyWorkspaceEdit(edit: WorkspaceEdit): boolean;
  openDocumentLink(link: DocumentLink): void;
}

const completionType: Record<number, string> = {
  5: "property",
  18: "enum",
  17: "variable",
};

function completionLabel(item: CompletionItem): string {
  return item.label;
}

function completionSource(
  language: EditorLanguageService,
  context: CompletionContext,
): CompletionResult | null {
  const before = context.matchBefore(/[A-Z0-9_@]*$/i);
  const linePrefix = context.state.doc
    .lineAt(context.pos)
    .text.slice(0, context.pos - context.state.doc.lineAt(context.pos).from);
  if (
    !context.explicit &&
    (!before || before.from === before.to) &&
    !linePrefix.endsWith(" ")
  ) {
    return null;
  }
  const service = language.update(context.state.doc.toString());
  const items = service.getCompletionItems(toPosition(context.state.doc, context.pos));
  if (items.length === 0) {
    return null;
  }
  return {
    from: before?.from ?? context.pos,
    options: items.map((item) => ({
      label: completionLabel(item),
      detail: item.detail,
      type: item.kind ? completionType[item.kind] : undefined,
    })),
  };
}

function semanticDecorations(
  state: EditorState,
  language: EditorLanguageService,
  indentationHints: boolean,
): DecorationSet {
  const service = language.update(state.doc.toString());
  const tokens = service
    .getSemanticTokens()
    .map((token) => {
      const from = toOffset(state.doc, { line: token.line, character: token.char });
      const tokenType = semanticTokenLegend.tokenTypes[token.tokenType] ?? "unknown";
      const declaration = token.tokenModifiers !== 0 ? " domorium-token-declaration" : "";
      return Decoration.mark({ class: `domorium-token-${tokenType}${declaration}` }).range(
        from,
        Math.min(from + token.length, state.doc.length),
      );
    })
    .filter((range) => range.from < range.to);
  const hints = (indentationHints ? service.getInlayHints() : []).map((hint) => {
    return Decoration.widget({ widget: new IndentHintWidget(hint.label), side: -1 }).range(
      toOffset(state.doc, hint.position),
    );
  });
  return Decoration.set(
    [...tokens, ...hints].sort((a, b) => a.from - b.from || a.to - b.to),
    true,
  );
}

class IndentHintWidget extends WidgetType {
  constructor(private readonly label: string) {
    super();
  }

  toDOM(): HTMLElement {
    return createSpan({ cls: "domorium-indent-hint", text: this.label });
  }

  eq(other: IndentHintWidget): boolean {
    return other.label === this.label;
  }
}

function semanticPlugin(
  language: EditorLanguageService,
  indentationHints: boolean,
) {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = semanticDecorations(view.state, language, indentationHints);
      }

      update(update: ViewUpdate): void {
        if (update.docChanged) {
          this.decorations = semanticDecorations(
            update.state,
            language,
            indentationHints,
          );
        }
      }
    },
    { decorations: (value) => value.decorations },
  );
}

function diagnosticSource(
  language: EditorLanguageService,
  actions: GedcomEditorActions,
) {
  return linter((view) => {
    const service = language.update(view.state.doc.toString());
    return service.getDiagnostics().map((diagnostic): CmDiagnostic => {
      const range = toOffsets(view.state.doc, diagnostic.range);
      const codeActions = service.getCodeActions(
        diagnostic.range,
        [diagnostic],
        language.getVersion(),
      );
      return {
        from: range.from,
        to: Math.max(range.from, range.to),
        severity:
          diagnostic.severity === "error"
            ? "error"
            : diagnostic.severity === "warning"
              ? "warning"
              : "info",
        message: diagnostic.message,
        source: "Domorium",
        actions: Array.isArray(codeActions)
          ? codeActions.flatMap((action) => {
              const edits = [
                ...(action.edit
                  ? [{ name: action.title, edit: action.edit }]
                  : []),
                ...(action.choices ?? []).map((choice) => ({
                  name: choice.title,
                  edit: choice.edit,
                })),
              ];
              return edits.map(({ name, edit }) => ({
                name,
                apply: () => {
                  actions.applyWorkspaceEdit(edit);
                },
              }));
            })
          : undefined,
      };
    });
  }, { delay: 250 });
}

function documentLinkNavigation(
  language: EditorLanguageService,
  actions: GedcomEditorActions,
): Extension {
  return EditorView.domEventHandlers({
    click(event, view) {
      if (!(event.metaKey || event.ctrlKey) || event.button !== 0) {
        return false;
      }
      const offset = view.posAtCoords({ x: event.clientX, y: event.clientY });
      if (offset === null) {
        return false;
      }
      const links = language
        .update(view.state.doc.toString())
        .getDocumentLinks();
      const link = links.find((candidate) => {
        const range = toOffsets(view.state.doc, candidate.range);
        return offset >= range.from && offset < range.to;
      });
      if (!link) {
        return false;
      }
      event.preventDefault();
      actions.openDocumentLink(link);
      return true;
    },
  });
}

function hoverSource(language: EditorLanguageService) {
  return hoverTooltip((view, offset) => {
    const service = language.update(view.state.doc.toString());
    const hover = service.getHover(toPosition(view.state.doc, offset));
    if (!hover) {
      return null;
    }
    const text = hover.contents.value;
    return {
      pos: offset,
      create() {
        const dom = createDiv({ cls: "domorium-hover", text });
        return { dom };
      },
    };
  });
}

function foldingSource(language: EditorLanguageService) {
  return foldService.of((state, lineStart) => {
    const line = state.doc.lineAt(lineStart);
    const service = language.update(state.doc.toString());
    const range = service
      .getFoldingRanges()
      .find((candidate) => candidate.startLine === line.number - 1);
    if (!range) {
      return null;
    }
    const endLine = state.doc.line(Math.min(range.endLine + 1, state.doc.lines));
    return { from: line.to, to: endLine.to };
  });
}

function definitionNavigation(language: EditorLanguageService): Extension {
  return EditorView.domEventHandlers({
    mousedown(event, view) {
      if (!(event.metaKey || event.ctrlKey) || event.button !== 0) {
        return false;
      }
      const offset = view.posAtCoords({ x: event.clientX, y: event.clientY });
      if (offset === null) {
        return false;
      }
      const service = language.update(view.state.doc.toString());
      const definition = service.getDefinitionRanges(toPosition(view.state.doc, offset))[0];
      if (!definition) {
        return false;
      }
      event.preventDefault();
      const from = toOffset(view.state.doc, definition.start);
      view.dispatch({ selection: { anchor: from }, scrollIntoView: true });
      view.focus();
      return true;
    },
  });
}

function referenceHighlights(language: EditorLanguageService): Extension {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = this.build(view);
      }

      update(update: ViewUpdate): void {
        if (update.docChanged || update.selectionSet) {
          this.decorations = this.build(update.view);
        }
      }

      private build(view: EditorView): DecorationSet {
        const service = language.update(view.state.doc.toString());
        const position = toPosition(
          view.state.doc,
          view.state.selection.main.head,
        );
        return Decoration.set(
          service
            .getDocumentHighlights(position)
            .map((highlight) => {
              const range = toOffsets(view.state.doc, highlight.range);
              return Decoration.mark({
                class:
                  highlight.kind === "write"
                    ? "domorium-reference-write"
                    : "domorium-reference-read",
              }).range(range.from, range.to);
            }),
        );
      }
    },
    { decorations: (value) => value.decorations },
  );
}

export function createEditorExtensions(
  language: EditorLanguageService,
  settings: GedcomEditorSettings,
  actions: GedcomEditorActions,
): Extension[] {
  const extensions: Extension[] = [
    lineNumbers(),
    history(),
    foldGutter(),
    autocompletion({ override: [(context) => completionSource(language, context)] }),
    hoverSource(language),
    semanticPlugin(language, settings.indentationHints),
    foldingSource(language),
    definitionNavigation(language),
    documentLinkNavigation(language, actions),
    referenceHighlights(language),
    indentUnit.of("  "),
    EditorView.lineWrapping,
    EditorView.contentAttributes.of({ spellcheck: "false", autocorrect: "off" }),
    EditorView.theme({
      "&": { height: "100%", backgroundColor: "var(--background-primary)" },
      ".cm-scroller": { overflow: "auto", fontFamily: "var(--font-monospace)" },
      ".cm-content": { caretColor: "var(--text-normal)" },
      ".cm-gutters": {
        backgroundColor: "var(--background-primary)",
        color: "var(--text-faint)",
        border: "none",
      },
    }),
    keymap.of([indentWithTab, ...defaultKeymap, ...historyKeymap]),
  ];
  if (settings.diagnostics) {
    extensions.push(lintGutter(), diagnosticSource(language, actions));
  }
  return extensions;
}
