# Restore the Obsidian Plugin ID

## Context

Obsidian's review service rejects the current manifest because the submitted
plugin is registered under the permanent ID `domorium`, while version `0.2.2`
uses `gedcom`. The display name also received a warning when it was written in
all caps.

## Design

- Restore `manifest.json` field `id` from `gedcom` to `domorium`.
- Keep the display field `name` as lowercase `gedcom`.
- Do not rename source modules, npm packages, commands, settings, or vault data.
- Release the correction as patch version `0.2.3`.
- Add `0.2.3` to `versions.json` with the existing minimum Obsidian version.
- Document the compatibility correction in `CHANGELOG.md`.

This preserves the identity of the existing community plugin and allows
Obsidian to treat the release as an update rather than a different plugin.

## Validation

- Assert that the source and built manifests contain `id: domorium`,
  `name: gedcom`, and version `0.2.3`.
- Run lint, type checking, unit tests, and the production build.
- Open a pull request and publish GitHub release `0.2.3` only after CI passes.

## Rollout

The release assets remain `main.js`, `manifest.json`, and `styles.css`. No data
migration is required because only the mistaken manifest identity is restored.
