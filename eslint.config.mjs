// @ts-check
import stylistic from "@stylistic/eslint-plugin";
import obsidianmd from "eslint-plugin-obsidianmd";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "dist/**",
      "coverage/**",
      "esbuild.config.mjs",
      "vitest.config.ts",
    ],
  },
  ...obsidianmd.configs.recommended,
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
