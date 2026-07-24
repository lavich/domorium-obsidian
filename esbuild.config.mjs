import { builtinModules } from "node:module";
import process from "node:process";
import { copyFile, mkdir } from "node:fs/promises";

import esbuild from "esbuild";

const production = process.argv[2] === "production";
const context = await esbuild.context({
  banner: {
    js: "/* Generated GEDCOM Obsidian plugin bundle. */",
  },
  entryPoints: ["src/main.ts"],
  bundle: true,
  external: [
    "obsidian",
    "electron",
    "@codemirror/autocomplete",
    "@codemirror/collab",
    "@codemirror/commands",
    "@codemirror/language",
    "@codemirror/lint",
    "@codemirror/search",
    "@codemirror/state",
    "@codemirror/view",
    "@lezer/common",
    "@lezer/highlight",
    "@lezer/lr",
    ...builtinModules,
  ],
  format: "cjs",
  target: "es2021",
  logLevel: "info",
  sourcemap: production ? false : "inline",
  treeShaking: true,
  outfile: "dist/main.js",
  minify: production,
});

if (production) {
  await context.rebuild();
  await context.dispose();
  await mkdir("dist", { recursive: true });
  await Promise.all([
    copyFile("manifest.json", "dist/manifest.json"),
    copyFile("styles.css", "dist/styles.css"),
  ]);
} else {
  await context.watch();
}
