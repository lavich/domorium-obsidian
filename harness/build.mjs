import esbuild from "esbuild";

for (const entry of ["mount", "desk"]) {
  await esbuild.build({
    entryPoints: [`harness/${entry}.ts`],
    bundle: true,
    format: "iife",
    target: "es2021",
    outfile: `harness/dist/${entry}.js`,
    sourcemap: "inline",
    loader: { ".ged": "text" },
    logLevel: "info",
  });
}

// The design mockups in docs/design read a file the way the plugin does.
await esbuild.build({
  entryPoints: ["harness/design.ts"],
  bundle: true,
  format: "iife",
  target: "es2021",
  outfile: "docs/design/vendor/design.js",
  minify: true,
  logLevel: "info",
});
