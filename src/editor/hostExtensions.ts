import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { search } from "@codemirror/search";
import type { Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import {
  createStandaloneEditorExtensions,
  type GedcomEditorSettings,
} from "@domorium/codemirror";
import { tags } from "@lezer/highlight";

import {
  obsidianSearchPanel,
  replaceMode,
  type IconSetter,
} from "./searchPanel";

const obsidianHighlightStyle = HighlightStyle.define([
  { tag: tags.comment, color: "var(--text-faint)" },
  { tag: tags.keyword, color: "var(--color-cyan)" },
  { tag: tags.string, color: "var(--color-purple)" },
]);

export function createHostEditorExtensions(
  settings: GedcomEditorSettings,
  dark: boolean,
  setIcon: IconSetter,
): Extension[] {
  return [
    ...createStandaloneEditorExtensions({
      diagnostics: settings.diagnostics ?? true,
    }),
    search({ top: true, createPanel: obsidianSearchPanel(setIcon) }),
    replaceMode,
    syntaxHighlighting(obsidianHighlightStyle),
    EditorView.theme(
      {
        "&": {
          height: "100%",
          backgroundColor: "var(--background-primary)",
          color: "var(--text-normal)",
          colorScheme: dark ? "dark" : "light",
        },
        ".cm-scroller": {
          overflow: "auto",
          fontFamily: "var(--font-monospace)",
        },
        ".cm-content": { caretColor: "var(--text-normal)" },
        ".cm-gutters": {
          backgroundColor: "var(--background-primary)",
          color: "var(--text-faint)",
          border: "none",
        },
      },
      { dark },
    ),
  ];
}
