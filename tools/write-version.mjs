#!/usr/bin/env node
/**
 * Emit version.json for Card World root and embedded HarmonyForge.
 * CI: set GITHUB_SHA so each deploy gets a unique `build` (update button can detect it).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function readMeta(html, name) {
  const m = html.match(new RegExp(`name="${name}"\\s+content="([^"]+)"`));
  return m?.[1]?.trim() || "";
}

function deployBuild(version, fallbackBuild) {
  const sha = process.env.GITHUB_SHA?.trim();
  if (sha) return `${version}+${sha.slice(0, 7)}`;
  const run = process.env.GITHUB_RUN_NUMBER?.trim();
  if (run) return `${version}+${run}`;
  return fallbackBuild || version;
}

function writeManifest(filePath, { version, build }) {
  const out = { version, build };
  fs.writeFileSync(filePath, `${JSON.stringify(out, null, 2)}\n`);
  return out;
}

// Card World (index.html meta)
const cwHtml = fs.readFileSync(path.join(root, "index.html"), "utf8");
const cwVersion = readMeta(cwHtml, "cw-app-version") || "0.0.0";
const cwMetaBuild = readMeta(cwHtml, "cw-app-build");
const cwBuild = deployBuild(cwVersion, cwMetaBuild);
const cwManifest = writeManifest(path.join(root, "version.json"), {
  version: cwVersion,
  build: cwBuild,
});
console.log("Wrote version.json", cwManifest);

// HarmonyForge embed (VERSION file; sync hf-app-version meta for bundled label)
const hfRoot = path.join(root, "embedded", "harmonyforge");
const hfVersionFile = path.join(hfRoot, "VERSION");
let hfVersion = "2.2.0";
if (fs.existsSync(hfVersionFile)) {
  hfVersion = fs.readFileSync(hfVersionFile, "utf8").trim() || hfVersion;
}
const hfIndex = path.join(hfRoot, "index.html");
if (fs.existsSync(hfIndex)) {
  let hfHtml = fs.readFileSync(hfIndex, "utf8");
  const hfMetaBuild = readMeta(hfHtml, "hf-app-build");
  const hfFallback =
    hfMetaBuild && hfMetaBuild !== "dev" ? hfMetaBuild : hfVersion;
  const hfBuild = deployBuild(hfVersion, hfFallback);
  hfHtml = hfHtml.replace(
    /(<meta name="hf-app-version" content=")[^"]*(")/,
    `$1${hfVersion}$2`
  );
  fs.writeFileSync(hfIndex, hfHtml);
  const hfManifest = writeManifest(path.join(hfRoot, "version.json"), {
    version: hfVersion,
    build: hfBuild,
  });
  console.log("Wrote embedded/harmonyforge/version.json", hfManifest);
}
