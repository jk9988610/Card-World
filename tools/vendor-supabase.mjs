#!/usr/bin/env node
/** Bundle @supabase/supabase-js for offline use (no CDN). */
import * as esbuild from "esbuild";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const entry = path.join(root, "node_modules/@supabase/supabase-js/dist/module/index.js");

await esbuild.build({
  entryPoints: [entry],
  bundle: true,
  format: "esm",
  platform: "browser",
  outfile: path.join(root, "vendor/supabase-js.mjs"),
  logLevel: "info",
});

console.log("Wrote vendor/supabase-js.mjs");
