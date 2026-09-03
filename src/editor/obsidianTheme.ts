import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";

import { MODIFIER_HELD_CLASS } from "./modifierHeld";
import type { Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { tags } from "@lezer/highlight";

/*
 * A CodeMirror theme for Obsidian, in the shape @codemirror/theme-one-dark gave
 * the idea: an editor theme, a highlight style, and the two together. Where
 * one-dark writes a colour, this writes the variable Obsidian keeps it in, so
 * nothing here holds a value of its own.
 *
 * Every rule is an override — no base theme can be turned off. A theme selector
 * compiles to `.cm-<themeID> <selector>`, so where the library states its own
 * with more classes than that, two rules below are written longer to match.
 */

const background = "var(--background-primary)",
  link = "var(--link-color)",
  linkHover = "var(--link-color-hover)",
  linkWeight = "var(--link-weight)",
  linkDecorationHover = "var(--link-decoration-hover)",
  linkExternal = "var(--link-external-color)",
  linkExternalHover = "var(--link-external-color-hover)",
  linkExternalDecorationHover = "var(--link-external-decoration-hover)",
  panelBackground = "var(--background-secondary)",
  text = "var(--text-normal)",
  faint = "var(--text-faint)",
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

      // What Obsidian writes for a link in a note's source: a colour and a
      // weight. The names are minted by the highlight style below.
      //
      // The cursor and the underline wait for the modifier, because the click
      // does: a plain click in an editor has to place the caret. Obsidian's own
      // source editor gates them the same way, on a class it sets while the
      // modifier is down.
      ".gedcom-internal-link": {
        color: link,
        fontWeight: linkWeight,
      },

      // A reference to a record is a link: it goes somewhere on a click, and
      // shows what is there on a hover. The weight is left alone, which is what
      // keeps a declaration apart from a reference to it. A declaration is
      // where a reference goes rather than a way of going anywhere, and carries
      // both classes — `definition` is a modifier over `variableName` — so it
      // is excluded by name instead of by a fight over specificity.
      ".gedcom-reference-link:not(.gedcom-reference-declaration)": {
        color: link,
      },
      ".gedcom-reference-declaration": {
        color: "var(--code-function)",
        fontWeight: "var(--font-semibold)",
      },

      [`&.${MODIFIER_HELD_CLASS} .gedcom-internal-link,
        &.${MODIFIER_HELD_CLASS} .gedcom-external-link,
        &.${MODIFIER_HELD_CLASS} .gedcom-reference-link:not(.gedcom-reference-declaration)`]:
        {
          cursor: "var(--cursor-link)",
        },
      [`&.${MODIFIER_HELD_CLASS} .gedcom-internal-link:hover,
        &.${MODIFIER_HELD_CLASS} .gedcom-reference-link:not(.gedcom-reference-declaration):hover`]:
        {
          color: linkHover,
          textDecorationLine: linkDecorationHover,
        },
      [`&.${MODIFIER_HELD_CLASS} .gedcom-external-link:hover`]: {
        color: linkExternalHover,
        textDecorationLine: linkExternalDecorationHover,
      },

      ".gedcom-external-link": {
        color: linkExternal,
        fontWeight: linkWeight,
        wordBreak: "break-word",
      },

      ".gedcom-indent-hint": {
        color: "transparent",
        whiteSpace: "pre",
        userSelect: "none",
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
        padding:
          "var(--size-4-2) var(--size-4-5) var(--size-4-2) var(--size-4-3)",
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
 * The legend names lezer tags, not GEDCOM: comment is the level, keyword the
 * tag, variable the pointer, string the payload. A file is `link` and the web
 * is `url`, the distinction Obsidian keeps two sets of variables for.
 */
export const obsidianHighlightStyle = HighlightStyle.define([
  { tag: tags.comment, color: "var(--code-comment)" },
  { tag: tags.keyword, color: "var(--code-keyword)" },
  { tag: tags.string, color: "var(--code-string)" },
  // A referring pointer is dressed as what it is — a link to the record it
  // names — while a declaring pointer is `definition` over the tag its type
  // maps to, and keeps the colour a GEDCOM block in a note gives it.
  { tag: tags.variableName, class: "gedcom-reference-link" },
  {
    tag: tags.definition(tags.variableName),
    class: "gedcom-reference-declaration",
  },
  { tag: tags.link, class: "gedcom-internal-link" },
  { tag: tags.url, class: "gedcom-external-link" },
]);

/** The editor theme and the highlight style, as one extension. */
export function obsidianTheme(dark: boolean): Extension {
  return [
    obsidianEditorTheme(dark),
    syntaxHighlighting(obsidianHighlightStyle),
  ];
}
