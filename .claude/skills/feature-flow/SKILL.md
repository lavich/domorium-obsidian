---
name: feature-flow
description: Use when the user asks for a new capability or a substantial change "through our flow", "with agent review", or invokes feature-flow — any domorium-obsidian change that should go end to end, from idea to merge, through an OpenSpec proposal, an Orca worktree and independent reviews.
---

# Feature flow: OpenSpec → Orca worktree → cross-review

[AGENTS.md](../../../AGENTS.md) and [openspec/config.yaml](../../../openspec/config.yaml)
hold the project rules this flow relies on — the upstream boundary, the layout,
desktop and mobile, the minimum app version, the check gate, commits, releases.
Read them first; this skill only orders the work.

Every edit, commit and push in this flow happens in an Orca worktree — the plan,
the implementation, fixes after review. The main checkout stays on `main` and only
pulls. A worktree is created with `--setup run`, which installs the dependencies.
To continue a branch that already exists on the remote:
`orca worktree create --name <name> --no-parent --setup run --base-branch origin/<branch> --json`,
then push with `git push origin HEAD:<branch>` — Orca names the local branch
differently.

Invoking this flow is permission to push its feature branches and open their PRs,
nothing beyond that: merging, filing upstream issues and tagging each need their
own permission.

Report to the user briefly, in their language. Decisions that change what a reader
sees in Obsidian — a page, a panel, a setting, a command, how a value reads — are
the user's.

## 1. Discussion

- Ground the request in the code, the GEDCOM specification and what the published
  `@domorium/*` packages actually answer: numbers and `file:line`, not impressions.
  Probe a package in a scratch directory outside the repository — install the
  published version and run a short script — across 7.0, 5.5.1 and a document with
  no version where it matters.
- Decide early which side of the line the change is on. Parsing, validation and
  language-service behavior belong in [lavich/domorium](https://github.com/lavich/domorium):
  there the output is an issue draft in `docs/design/upstream-issue-drafts.md`,
  filed only with the user's permission, and the plugin change waits for the
  release that carries it.
- Offer 2–3 options with a recommendation, naming the areas of the plugin each
  touches and whether it needs an API above `minAppVersion`.
- Record the user's decision verbatim with its date; it goes into the proposal.

## 2. Plan: OpenSpec in an Orca worktree

- Worktree from a fresh `main`:
  `orca worktree create --name <change> --no-parent --setup run --json`, then
  `orca worktree set --worktree path:<path> --workspace-status in-progress --json`.
- Create the change with the `openspec-propose` skill: `openspec new change <name>`,
  then proposal, design, specs and tasks, each from
  `openspec instructions <artifact> --change <name> --json`. Artifacts are in
  English with SHALL/MUST. The proposal keeps the user's requirement apart from the
  proposed scope; `openspec/config.yaml` says what else each artifact must carry.
- If the change depends on another open change, say so and give the archive order
  in the first line of `tasks.md`. A MODIFIED requirement restates the full text as
  it stands after the change that archives first, every existing scenario included.
- An API above `minAppVersion` that is declined gets a row in the table in
  AGENTS.md, in the same change.
- `npm run openspec:validate` passes.
- Keep the worktree's comment current:
  `orca worktree set --worktree path:<path> --comment "…" --json`.

## 3. Cross-review of the plan

- An independent reviewer — a subagent or a separate agent session (for example
  `orca worktree create --agent codex`) — strictly read-only, scratch files outside
  the repository. Its task: check every claim of the plan against the code
  (`file:line`) and against the published packages by probing them; find every
  consumer the change touches, the browser harness and its specs included; find
  gaps, contradictions between artifacts, overlaps with other open changes in
  `openspec/changes/`, and breaches of AGENTS.md — Node built-ins in plugin code,
  the file stops being the source of truth, an API above the floor, a workaround
  for an upstream gap. Output: Blocking / Serious / Minor, each with a failure
  scenario and a fix.
- Verify the most surprising findings yourself. Take contested decisions to the
  user, fix the rest; review again if the fixes are large.
- The plan may land on `main` as its own PR (only `openspec/changes/<name>`), and
  only with the user's permission.

## 4. Implementation

- A fresh worktree from `main`; if `main` has moved on, `git rebase origin/main`
  before starting.
- Run the tests before touching anything. Work through `tasks.md` in order, a test
  with each task; record deviations from the design under an "Implementation"
  heading in `design.md`; tick `- [x]`.
- A raised `@domorium/*` dependency: the version is published, and `npm ls` shows
  one copy of every `@domorium` package, the transitive ones included.
- The gate is `npm run check`, plus `npm run test:browser` when the change touches
  rendering, layout or panels. Say which ran.
- A changed page or panel: build the harness, check it with a screenshot from a
  temporary Playwright script at desktop and phone width, then delete the script.
  Name what still needs a look in Obsidian on the demo vault, and on a phone.
- A new string the reader sees is translated into every language the plugin ships;
  no test catches a missing one.
- A change a reader notices goes into `README.md` where the README describes it.

## 5. Cross-review of the code

- Two independent reviewers in parallel, split by concern — for example the read
  model and the plugin's edges (the document, the API other plugins reach, notes,
  the vault, dependencies) and what the reader sees (pages, panels, the editor,
  translations, styles, the harness and its specs) — read-only, over the
  uncommitted diff.
- Prove each blocking finding with a test that fails without the fix and passes
  with it. Fix, then the full gate again.

## 6. PR and merge

- Commit, `git push`, `gh pr create` with a Summary, what is not in this PR and why
  (upstream issues linked), and a Test plan of checkboxes: the checks run, and the
  checks in Obsidian and on a phone, ticked only once someone has done them. Then
  `--workspace-status in-review` on the worktree.
- Merge only on the user's explicit permission for this PR. Permission for an
  earlier task or PR does not carry over. Watch `gh pr checks <n> --watch` in the
  background, report the result and wait. With permission and every check passing:
  `gh pr merge <n> --squash`, unless the user asks to keep the commits.
- After the merge: `git pull --ff-only` in the main checkout,
  `--workspace-status completed` on the worktree; remove merged worktrees with
  `orca worktree rm` once they hold no uncommitted changes.
- Archive the change in its own PR: `openspec archive <name> --yes`, committed as
  `chore(openspec): archive <name>`.
- If the change should ship, say so. A release is its own PR, as AGENTS.md
  describes. Never create or push the release tag without explicit approval.
