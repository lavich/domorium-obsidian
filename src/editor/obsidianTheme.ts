import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import type { Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { tags } from "@lezer/highlight";

/*
 * A CodeMirror theme for Obsidian, in the shape @codemirror/theme-one-dark
 * gave the idea: an editor theme, a highlight style, and the two together.
 *
 * Where one-dark writes a colour, this writes the variable Obsidian keeps it
 * in, so the editor follows whatever theme the reader is wearing rather than
 * replacing it. Nothing here holds a value of its own.
 *
 * Every package CodeMirror loads brings a base theme, and none of them can be
 * turned off, so a rule here is an override. Two of them are written longer
 * than they look they need to be: a theme selector compiles to
 * `.cm-<themeID> <selector>`, and where the library states its own with more
 * classes than that, the shorter one is outweighed rather than overriding.
 */

const background = "var(--background-primary)",
  panelBackground = "var(--background-secondary)",
  text = "var(--text-normal)",
  faint = "var(--text-faint)",
  accent = "var(--color-accent)",
  border = "var(--background-modifier-border)",
  error = "var(--text-error)",
  warning = "var(--text-warning)",
  hint = "var(--text-accent)",
  activeRange = "var(--text-highlight-bg)",
  rowHover = "var(--nav-item-background-hover)",
  rowSelected = "var(--nav-item-background-selected)",
  rowSelectedText = "var(--nav-item-color-selected)";

/** The editor's own surfaces: the document, its gutters and its panels. */
export function obsidianEditorTheme(dark: boolean): Extension {
  return EditorView.theme(
    {
      "&": {
        height: "100%",
        color: text,
        backgroundColor: background,
        // What the browser paints for us — a scrollbar, a form control, the
        // selection behind a focused row — and it does not read `cm-dark`.
        colorScheme: dark ? "dark" : "light",
      },
      ".cm-scroller": {
        height: "100%",
        overflow: "auto",
        fontFamily: "var(--font-monospace)",
      },
      ".cm-content": { caretColor: text },
      ".cm-gutters": {
        backgroundColor: background,
        color: faint,
        border: "none",
      },

      ".gedcom-token-declaration": { fontWeight: "var(--font-semibold)" },
      ".gedcom-indent-hint": {
        color: "transparent",
        whiteSpace: "pre",
        userSelect: "none",
      },
      ".gedcom-reference-write": {
        background: `color-mix(in srgb, ${accent} 28%, transparent)`,
        borderRadius: "2px",
      },
      ".gedcom-reference-read": {
        background: `color-mix(in srgb, ${accent} 15%, transparent)`,
        borderRadius: "2px",
      },
      // A tooltip is a popover, not a dialog: Obsidian dresses one with the
      // generic surface variables and keeps only sizes under `--popover-*`.
      // The library paints its own grey box, which no theme can follow.
      ".cm-tooltip": {
        backgroundColor: background,
        color: text,
        border: `1px solid ${border}`,
        borderRadius: "var(--radius-m)",
        boxShadow: "var(--shadow-s)",
        maxHeight: "var(--popover-max-height)",
      },
      // The library already names a hover tooltip; it needs no second name.
      ".cm-tooltip-hover": {
        maxWidth: "var(--popover-width)",
        fontSize: "var(--popover-font-size)",
        padding: "var(--size-4-2) var(--size-4-3)",
        whiteSpace: "pre-wrap",
      },

      ".cm-panels": {
        backgroundColor: panelBackground,
        color: text,
        borderColor: border,
        fontFamily: "var(--font-interface)",
        fontSize: "var(--font-ui-small, 13px)",
      },
      // The search bar is Obsidian's own chrome, so it sits on the note
      // background the editor uses rather than the one panels expect.
      ".cm-panels-top": {
        backgroundColor: background,
        borderBottom: "none",
      },

      // A list of places in a file is a shape Obsidian already has, in its
      // search results pane; these are its measurements.
      ".cm-panel-lint li": {
        padding: "var(--size-4-2) var(--size-4-5) var(--size-4-2) var(--size-4-3)",
        borderBottom: `1px solid ${border}`,
        cursor: "var(--cursor)",
        whiteSpace: "pre-wrap",
      },
      ".cm-panel-lint li:last-child": { borderBottom: "none" },
      ".cm-panel-lint li:hover": { backgroundColor: rowHover },
      // The button hangs over this row, and text under it cannot be read.
      ".cm-panel-lint li:first-child": { paddingRight: "var(--size-4-8)" },
      // Written in the library's own shape, and once more for a focused list,
      // which it states with a class more than the plain one.
      ".cm-panel.cm-panel-lint ul li[aria-selected], .cm-panel.cm-panel-lint ul:focus li[aria-selected]":
        {
          backgroundColor: rowSelected,
          color: rowSelectedText,
        },
      // The library leaves this a bare glyph in the corner; every other button
      // in Obsidian is an icon-sized target.
      '.cm-panel-lint [name="close"]': {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        top: "var(--size-2-2)",
        right: "var(--size-2-2)",
        width: "var(--size-4-6)",
        height: "var(--size-4-6)",
        borderRadius: "var(--clickable-icon-radius)",
        color: "var(--icon-color)",
        fontSize: "var(--font-ui-medium)",
        cursor: "var(--cursor)",
      },
      '.cm-panel-lint [name="close"]:hover': {
        color: "var(--icon-color-hover)",
        backgroundColor: "var(--background-modifier-hover)",
      },
      ".cm-diagnosticSource": { display: "none" },

      ".cm-lint-marker": {
        content: "none",
        boxSizing: "border-box",
        width: "0.85em",
        height: "0.85em",
        marginTop: "0.1em",
      },
      ".cm-lint-marker-error": { background: error, borderRadius: "50%" },
      ".cm-lint-marker-warning": {
        background: warning,
        clipPath: "polygon(50% 0, 100% 100%, 0 100%)",
      },
      ".cm-lint-marker-info, .cm-lint-marker-hint": {
        background: hint,
        borderRadius: "var(--radius-s, 2px)",
      },

      // Obsidian underlines a problem; the library paints a wavy image, which
      // no variable of Obsidian's can follow.
      ".cm-lintRange": {
        backgroundImage: "none",
        paddingBottom: "0",
        textDecorationLine: "underline",
        textDecorationStyle: "wavy",
        textDecorationSkipInk: "none",
        textDecorationThickness: "1px",
      },
      ".cm-lintRange-error": { textDecorationColor: error },
      ".cm-lintRange-warning": { textDecorationColor: warning },
      ".cm-lintRange-info, .cm-lintRange-hint": { textDecorationColor: hint },
      ".cm-lintRange-active": { backgroundColor: activeRange },
    },
    // Not a colour of ours: it says which of the library's own `&dark`
    // variants apply.
    { dark },
  );
}

/**
 * The legend names lezer tags, not GEDCOM: comment is the level number,
 * keyword the pointer, string the tag. A link is `link` where it names a file
 * and `url` where it names the web, which is the distinction Obsidian keeps
 * two sets of variables for.
 */
export const obsidianHighlightStyle = HighlightStyle.define([
  { tag: tags.comment, color: "var(--code-comment)" },
  { tag: tags.keyword, color: "var(--code-keyword)" },
  { tag: tags.string, color: "var(--code-normal)" },
  {
    tag: tags.link,
    color: "var(--link-color)",
    textDecorationLine: "var(--link-decoration)",
    textDecorationThickness: "var(--link-decoration-thickness)",
    fontWeight: "var(--link-weight)",
    cursor: "var(--cursor-link)",
  },
  {
    tag: tags.url,
    color: "var(--link-external-color)",
    textDecorationLine: "var(--link-external-decoration)",
    textDecorationThickness: "var(--link-decoration-thickness)",
    fontWeight: "var(--link-weight)",
    cursor: "var(--cursor-link)",
  },
]);

/** The editor theme and the highlight style, as one extension. */
export function obsidianTheme(dark: boolean): Extension {
  return [obsidianEditorTheme(dark), syntaxHighlighting(obsidianHighlightStyle)];
}
