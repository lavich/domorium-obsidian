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
