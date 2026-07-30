import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from "@codemirror/commands";
import {
  foldGutter,
  HighlightStyle,
  indentUnit,
  syntaxHighlighting,
} from "@codemirror/language";
import { lintGutter } from "@codemirror/lint";
import type { Extension } from "@codemirror/state";
import { EditorView, keymap, lineNumbers } from "@codemirror/view";
import type { GedcomEditorSettings } from "@gedcom/codemirror";
import { tags } from "@lezer/highlight";

const obsidianHighlightStyle = HighlightStyle.define([
  { tag: tags.comment, color: "var(--text-faint)" },
  { tag: tags.keyword, color: "var(--color-cyan)" },
  { tag: tags.string, color: "var(--color-purple)" },
]);

export function createHostEditorExtensions(
  settings: GedcomEditorSettings,
): Extension[] {
  const extensions: Extension[] = [
    lineNumbers(),
    history(),
    foldGutter(),
    indentUnit.of("  "),
    syntaxHighlighting(obsidianHighlightStyle),
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
  if (settings.diagnostics ?? true) {
    extensions.push(lintGutter());
  }
  return extensions;
}
