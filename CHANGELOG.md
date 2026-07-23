# Changelog

## 0.2.0

- Add rename support for GEDCOM record identifiers and all their references.
- Add code actions for creating missing referenced records and removing dangling links.
- Add go-to-definition and reference discovery for GEDCOM cross-references.
- Preserve local file links and editor changes while applying reference edits.

## 0.1.1

- Add searchable settings support for Obsidian 1.13.0 and later.
- Improve validation of persisted plugin settings.
- Update editor DOM creation to use Obsidian helpers.
- Add ESLint quality checks to CI.
- Add provenance attestations for release assets.

## 0.1.0

- Open and edit `.ged` and `.gedcom` files directly in Obsidian.
- Add GEDCOM semantic syntax highlighting and visual structure indentation.
- Report validation errors and warnings while editing.
- Add context-aware completion and tag documentation tooltips.
- Add code folding and navigation from XREF usages to record declarations.
- Support desktop and mobile Obsidian without Node.js or Electron APIs.
