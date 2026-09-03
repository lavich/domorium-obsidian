# Working in this repository

`domorium-obsidian` is an Obsidian community plugin — id `domorium`, display
name **Gedcom** — that adds GEDCOM 5.5.1 and 7.0 language support to Obsidian:
validation, autocomplete, navigation, folding, semantic highlighting, and links
from notes into records.

The GEDCOM file stays the source of truth. The plugin does not convert records
into Markdown, build a second genealogy database, or send vault data anywhere.

## What lives elsewhere

The GEDCOM parser and the editor-independent language service are **not** in
this repository. They are maintained in
[lavich/domorium](https://github.com/lavich/domorium) and consumed here as the
versioned npm packages `@domorium/codemirror` and `@domorium/language-service`.

A change to parsing, validation rules, or language-service behavior belongs
upstream. This repository only adapts that language support to Obsidian. Say so
early rather than working around an upstream gap here.

## Commands

```bash
npm run check         # lint + typecheck + unit tests + build — run before any commit
npm run test          # Vitest unit tests only
npm run test:browser  # Playwright specs against the standalone harness
npm run dev           # esbuild watch build
npm run build         # typecheck, then production bundle into dist/
```

CI runs `lint`, `typecheck`, `test`, `build` and, in a second job,
`test:browser`. `npm run check` covers everything except the browser specs.

## Layout

| Path | What it holds |
| --- | --- |
| `src/main.ts` | Plugin entry: lifecycle, commands, icon, `obsidian://` protocol handler |
| `src/GedcomView.ts` | The file view for `.ged` and `.gedcom` |
| `src/api.ts` | The API other plugins and `dataviewjs` reach |
| `src/commands.ts` | Command palette definitions |
| `src/editor/` | CodeMirror wiring: service, host extensions, status, search, records |
| `src/notes/` | GEDCOM inside Markdown notes: code blocks, record index, previews, embeds, suggest |
| `src/vault/` | Vault-level concerns: `obsidian://` links, renamed media |
| `src/settings*.ts` | Settings tab, definitions, persisted data |
| `harness/` | Standalone browser harness the Playwright specs mount |
| `tests/` | Playwright specs |
| `demo-vault/` | A real Obsidian vault for manual testing |

Unit tests sit beside their subject as `*.test.ts`. Prefer extending an existing
test file over adding a new one. They run in Vitest's `node` environment; a test
that needs a DOM opens with `// @vitest-environment happy-dom`. Painting and
geometry still belong in the Playwright specs, which have a real browser.

## Constraints

- The plugin supports desktop **and** mobile (`isDesktopOnly: false`). Node
  built-ins are unavailable in anything under `src/`;
  `eslint-plugin-obsidianmd` enforces this, and it is relaxed only for `tests/`
  and `harness/`.
- `dist/` and `main.js` are build output. Never edit them.
- Conventional Commits. Release commits read `chore(release): X.Y.Z`.
- A release bumps `package.json` and `manifest.json` and adds the version to
  `versions.json` mapped to its `minAppVersion`. The git tag is the bare
  version, and pushing it triggers the release workflow.

## The minimum app version, and what it costs

`minAppVersion` is **1.5.0** and has never moved: every release in
`versions.json` maps to it. Raising it does not break anyone — Obsidian installs
the newest plugin version its app supports, so a reader below the floor simply
stops receiving updates — but it does strand them, so the floor moves only when
something is worth the trade.

Nothing so far has been. Each time a newer API was declined, the workaround was
cheap and is recorded here. **Raise the floor once, and collect every entry at
or below the new floor in the same release** — that is what this table is for,
rather than paying the cost twice for one API.

| Wanted | Needs | What is done instead | Where |
| --- | --- | --- | --- |
| `Workspace.revealLeaf` | 1.7.2 | `setActiveLeaf(leaf, { focus: true })`, which brings a tab forward but will not uncollapse a sidebar | `src/GedcomView.ts` |
| Only `getSettingDefinitions` | 1.13.0 | The deprecated `display()` and its `render()` are kept beside it, for an app that does not call the new one | `src/settings.ts` |

`eslint-plugin-obsidianmd` catches a call above the floor
(`obsidianmd/no-unsupported-api`), so a new entry announces itself at lint time
rather than in someone's vault. When one arrives, add a row; when the floor
moves, delete the rows it clears along with the code they describe.

Obsidian 1.7.2 is from September 2024 and 1.13.0 is recent, so the two rows are
not equally cheap to clear.

## Spec-driven changes with OpenSpec

Non-trivial work goes through [OpenSpec](https://github.com/Fission-AI/OpenSpec):
the change is specified, reviewed, and only then implemented. Specs and
proposals live in `openspec/` and are committed alongside the code they
describe.

```
openspec/config.yaml      schema + project context and rules handed to the AI
openspec/specs/           current capability specs
openspec/changes/         one directory per in-flight change
openspec/changes/archive/ completed changes, by date
```

The CLI is a developer tool installed globally, not a dependency of this
package:

```bash
npm install -g @fission-ai/openspec@latest   # 1.10.0 at time of writing
openspec update                              # refresh the generated skills after an upgrade
npm run openspec:validate                    # validate every spec and change, strictly
```

The generated skills under `.claude/skills/openspec-*/` are **not** tracked in
git — `openspec init --tools claude` regenerates them, and `openspec update`
refreshes them. Run `init` once after cloning.

Slash commands, in the order a change usually moves through them:

| Command | Use |
| --- | --- |
| `/openspec-explore` | Think a problem through before committing to a shape |
| `/openspec-propose` | Describe an idea, get proposal, design, delta specs, and tasks in one step |
| `/openspec-new-change` | The same, artifact by artifact, when the shape is still moving |
| `/openspec-continue-change` | Create the next artifact of a change in progress |
| `/openspec-update-change` | Revise a change's plan and keep its artifacts coherent — never touches code |
| `/openspec-apply-change` | Implement the tasks |
| `/openspec-verify-change` | Check the implementation against the artifacts |
| `/openspec-sync-specs` | Fold a change's delta specs into the main specs without archiving |
| `/openspec-archive-change` | Archive the finished change |

`/openspec-propose` and the other planning commands deliberately stop at
planning. Implementation starts only when you ask for it.
