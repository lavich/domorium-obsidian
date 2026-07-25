# GEDCOM for Obsidian

Edit source `.ged` and `.gedcom` files directly in Obsidian with validation,
autocomplete, navigation, folding, and semantic highlighting.

![GEDCOM editor in Obsidian](images/gedcom-obsidian.png)

## Features

- Context-aware GEDCOM tag autocomplete
- Real-time validation errors and warnings
- Semantic highlighting for levels, tags, and cross-references
- Documentation tooltips for GEDCOM tags
- Go to definition for XREF values
- Find XREF references and highlight declarations and usages
- Safe XREF rename as one undoable edit
- Web links and vault-relative file links
- Quick fixes for broken references and invalid levels
- Folding and visual indentation for nested records
- Desktop and mobile Obsidian support

The plugin keeps the GEDCOM file as the source of truth. It does not convert
records into Markdown, create a second genealogy database, or send vault data
to a remote service.

## Usage

1. Enable **GEDCOM** in **Settings → Community plugins**.
2. Open a `.ged` or `.gedcom` file in your vault.
3. Edit the source directly. Obsidian saves changes back to the same file.

Use **Go to GEDCOM definition** from the command palette to jump from an XREF
usage to its record declaration. **Find GEDCOM references** moves between
matching declarations and usages, and **Rename GEDCOM reference** updates the
current XREF atomically. Editor behavior can be adjusted in the plugin settings.

## Privacy

GEDCOM works locally inside the vault. It does not require an account, make
network requests, access files outside the vault, show advertisements, or
collect analytics or telemetry.

## Beta installation

Until GEDCOM is available in Community Plugins, install the latest GitHub
release using [BRAT](https://github.com/TfTHacker/obsidian42-brat) and this
repository URL:

```text
https://github.com/lavich/gedcom-obsidian
```

For a manual installation, copy `main.js`, `manifest.json`, and `styles.css`
from the latest release into:

```text
<vault>/.obsidian/plugins/gedcom/
```

Reload Community Plugins and enable **GEDCOM**.

## Development

```bash
npm install
npm run check
```

The packaged plugin is written to `dist/`.

The shared GEDCOM parser and editor-independent language service are maintained in the main
[GEDCOM repository](https://github.com/lavich/gedcom) and consumed as
versioned public npm packages.

## License

MIT © 2026 Andrei Lobanov
