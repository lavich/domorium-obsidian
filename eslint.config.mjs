// @ts-check
import stylistic from "@stylistic/eslint-plugin";
import obsidianmd from "eslint-plugin-obsidianmd";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "dist/**",
      "harness/dist/**",
      "harness/results/**",
      "coverage/**",
      "demo-vault/**",
      "esbuild.config.mjs",
      "playwright.config.ts",
      "vitest.config.ts",
    ],
  },
  ...obsidianmd.configs.recommended,
  {
    files: ["tests/**/*.ts", "harness/**/*.ts"],
    rules: {
      "obsidianmd/no-nodejs-modules": "off",
      // The harness mounts the editor without Obsidian, so `createEl` — which
      // Obsidian puts on Node at runtime — is not there to call. The platform
      // and style rules are on: the harness is told the host's platform by the
      // spec, and what it does set is measured per hover rather than static.
      "obsidianmd/prefer-create-el": "off",
    },
  },
  {
    // A unit test's DOM is happy-dom's, and Obsidian's helpers are not on it
    // either — src/testing is where they are put there, so telling that file to
    // call them is circular. Node built-ins stay refused here: what a test
    // imports is not what ships, but the rule is cheap and the line is worth
    // keeping straight.
    files: ["src/**/*.test.ts", "src/testing/**/*.ts"],
    rules: {
      "obsidianmd/prefer-create-el": "off",
    },
  },
  {
    files: ["src/main.ts"],
    rules: {
      // The one default the plugin claims is Obsidian's own for the job:
      // editor:open-search-replace already binds Mod+Alt+F / Mod+H and fails
      // its check in a GEDCOM view, and the hotkey manager then falls through
      // to the next command bound to the key, which is ours. Reassignable in
      // Settings → Hotkeys like any other.
      "obsidianmd/commands/no-default-hotkeys": "off",
    },
  },
  {
    files: ["**/*.{ts,cts,mts,tsx}"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: "./tsconfig.json",
      },
    },
  },
  {
    plugins: {
      "@stylistic": stylistic,
      "@typescript-eslint": tseslint.plugin,
    },
    rules: {
      curly: "warn",
      "@stylistic/semi": ["warn", "always"],
      "obsidianmd/ui/sentence-case": [
        "warn",
        { acronyms: ["GEDCOM"], enforceCamelCaseLower: true },
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
        },
      ],
    },
  },
);
