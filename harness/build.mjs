import esbuild from "esbuild";

await esbuild.build({
  entryPoints: ["harness/mount.ts"],
  bundle: true,
  format: "iife",
  target: "es2021",
  outfile: "harness/dist/mount.js",
  sourcemap: "inline",
  logLevel: "info",
});
