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
      // The harness mounts the editor without Obsidian, so the element, style
      // and platform helpers those rules ask for do not exist there.
      "obsidianmd/prefer-create-el": "off",
      "obsidianmd/no-static-styles-assignment": "off",
      "obsidianmd/platform": "off",
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
