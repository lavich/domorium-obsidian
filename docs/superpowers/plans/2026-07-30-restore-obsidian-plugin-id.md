# Restore the Obsidian Plugin ID Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the registered Obsidian plugin ID `domorium` and publish the compatibility fix as version `0.2.3`.

**Architecture:** This is a manifest-only identity correction plus the normal synchronized patch-version release metadata. Existing editor code, npm dependencies, settings, commands, and display name remain unchanged.

**Tech Stack:** Obsidian manifest JSON, npm package metadata, Markdown changelog, Node.js 22, TypeScript, Vitest, esbuild, GitHub Actions.

## Global Constraints

- `manifest.json` must contain `"id": "domorium"`.
- The display name must remain `"name": "gedcom"`.
- The release version must be `0.2.3` in `manifest.json`, `package.json`, `package-lock.json`, and `versions.json`.
- `minAppVersion` must remain `1.5.0`.
- No source modules, commands, settings, vault data, or dependencies may be renamed.
- Publication must use a pull request followed by the existing tag-driven GitHub Release workflow.

---

### Task 1: Restore the Permanent Plugin Identity and Prepare Version 0.2.3

**Files:**
- Modify: `manifest.json`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `versions.json`
- Modify: `CHANGELOG.md`

**Interfaces:**
- Consumes: Obsidian's registered community-plugin identity `domorium` and the existing release workflow's requirement that the tag equal `manifest.json.version`.
- Produces: Release metadata for `0.2.3` with plugin ID `domorium`, display name `gedcom`, and minimum Obsidian version `1.5.0`.

- [ ] **Step 1: Record the current incompatible state**

Run:

```bash
node -e 'const m=require("./manifest.json"); if (m.id !== "gedcom" || m.version !== "0.2.2") process.exit(1)'
```

Expected: exit code 0, proving the branch starts from the rejected `gedcom` identity and version `0.2.2`.

- [ ] **Step 2: Restore the ID and bump synchronized package versions**

Change `manifest.json` to:

```json
{
  "id": "domorium",
  "name": "gedcom",
  "version": "0.2.3",
  "minAppVersion": "1.5.0",
  "description": "Edit GEDCOM files with autocomplete, validation, navigation, and semantic highlighting.",
  "author": "Andrei Lobanov",
  "authorUrl": "https://github.com/lavich",
  "isDesktopOnly": false
}
```

Run:

```bash
npm version 0.2.3 --no-git-tag-version
```

Expected: `package.json` and `package-lock.json` both report version `0.2.3`.

- [ ] **Step 3: Add the Obsidian version mapping**

Append this entry to `versions.json`:

```json
"0.2.3": "1.5.0"
```

Keep valid JSON syntax and all previous mappings.

- [ ] **Step 4: Document the compatibility correction**

Insert this section immediately after `# Changelog` in `CHANGELOG.md`:

```markdown
## 0.2.3

- Restore the permanent Obsidian community-plugin ID `domorium` so updates
  continue to match the existing plugin listing.
- Keep the lowercase display name `gedcom` required by plugin review.
```

- [ ] **Step 5: Verify source release metadata**

Run:

```bash
node - <<'NODE'
const manifest = require("./manifest.json");
const pkg = require("./package.json");
const lock = require("./package-lock.json");
const versions = require("./versions.json");
if (manifest.id !== "domorium") throw new Error("wrong plugin ID");
if (manifest.name !== "gedcom") throw new Error("wrong display name");
if (manifest.version !== "0.2.3") throw new Error("wrong manifest version");
if (pkg.version !== "0.2.3") throw new Error("wrong package version");
if (lock.version !== "0.2.3" || lock.packages[""].version !== "0.2.3") {
  throw new Error("wrong lockfile version");
}
if (versions["0.2.3"] !== "1.5.0") throw new Error("wrong minimum app version");
NODE
```

Expected: exit code 0 with no output.

- [ ] **Step 6: Run the complete project verification**

Run:

```bash
npm run check
```

Expected: ESLint has no errors, TypeScript passes, all Vitest tests pass, and the production bundle is created.

- [ ] **Step 7: Verify the built manifest**

Run:

```bash
node - <<'NODE'
const manifest = require("./dist/manifest.json");
if (manifest.id !== "domorium") throw new Error("wrong built plugin ID");
if (manifest.name !== "gedcom") throw new Error("wrong built display name");
if (manifest.version !== "0.2.3") throw new Error("wrong built version");
NODE
```

Expected: exit code 0 with no output.

- [ ] **Step 8: Commit the release correction**

```bash
git add manifest.json package.json package-lock.json versions.json CHANGELOG.md
git commit -m "fix: restore Obsidian plugin ID"
```

### Task 2: Publish Through Pull Request and GitHub Release

**Files:**
- Verify: `.github/workflows/ci.yml`
- Verify: `.github/workflows/release.yml`

**Interfaces:**
- Consumes: committed version `0.2.3`, a clean feature branch, and the existing tag-triggered release workflow.
- Produces: a merged pull request and GitHub Release `0.2.3` containing `main.js`, `manifest.json`, and `styles.css`.

- [ ] **Step 1: Push the feature branch**

Run:

```bash
git push -u origin fix/restore-plugin-id
```

Expected: the remote branch is created successfully.

- [ ] **Step 2: Open the pull request**

Run:

```bash
gh pr create \
  --base main \
  --head fix/restore-plugin-id \
  --title "fix: restore Obsidian plugin ID" \
  --body "Restores the registered community-plugin ID \`domorium\`, keeps the lowercase display name \`gedcom\`, and prepares patch release 0.2.3."
```

Expected: GitHub returns the new pull-request URL.

- [ ] **Step 3: Verify pull-request checks**

Run:

```bash
gh pr checks --watch
```

Expected: every required check passes.

- [ ] **Step 4: Merge the pull request**

Run:

```bash
gh pr merge --merge --delete-branch
```

Expected: the pull request is merged into `main`.

- [ ] **Step 5: Tag the merged commit**

Update local `main`, confirm its manifest is version `0.2.3`, and tag that exact commit:

```bash
git -C /Users/user004/Projects/domorium-obsidian pull --ff-only
node -e 'const m=require("/Users/user004/Projects/domorium-obsidian/manifest.json"); if (m.id !== "domorium" || m.version !== "0.2.3") process.exit(1)'
git -C /Users/user004/Projects/domorium-obsidian tag 0.2.3
git -C /Users/user004/Projects/domorium-obsidian push origin 0.2.3
```

Expected: tag `0.2.3` is pushed from merged `main`.

- [ ] **Step 6: Verify the release workflow and assets**

Run:

```bash
gh run list --workflow Release --limit 1
gh release view 0.2.3
```

Expected: the Release workflow succeeds and the release contains `main.js`, `manifest.json`, and `styles.css`.

- [ ] **Step 7: Verify the published manifest**

Run:

```bash
tmp_dir="$(mktemp -d)"
gh release download 0.2.3 --pattern manifest.json --dir "$tmp_dir"
node -e 'const m=require(process.argv[1]); if (m.id !== "domorium" || m.name !== "gedcom" || m.version !== "0.2.3") process.exit(1)' "$tmp_dir/manifest.json"
```

Expected: exit code 0, confirming the public release asset uses the registered plugin ID.
