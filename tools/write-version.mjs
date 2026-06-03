#!/usr/bin/env node
/**
 * Emit version.json from Card World index.html meta (cw-app-version).
 * Sync the same meta into embedded HarmonyForge index.html (no separate HF version).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function readMeta(html, name) {
  const m = html.match(new RegExp(`name="${name}"\\s+content="([^"]+)"`));
  return m?.[1]?.trim() || "";
}

function setMeta(html, name, value) {
  const re = new RegExp(`(<meta name="${name}" content=")[^"]*(")`, "g");
  if (re.test(html)) {
    return html.replace(re, `$1${value}$2`);
  }
  return html;
}

const cwHtmlPath = path.join(root, "index.html");
const cwHtml = fs.readFileSync(cwHtmlPath, "utf8");
const version = readMeta(cwHtml, "cw-app-version") || "0.0.0";
const build = readMeta(cwHtml, "cw-app-build") || version;
const manifest = { version, build };

fs.writeFileSync(
  path.join(root, "version.json"),
  `${JSON.stringify(manifest, null, 2)}\n`
);
console.log("Wrote version.json", manifest);

const hfHtmlPath = path.join(root, "embedded/harmonyforge/index.html");
let hfHtml = fs.readFileSync(hfHtmlPath, "utf8");
hfHtml = hfHtml.replace(/\s*<meta name="hf-app-version"[^>]*>\n?/g, "\n");
hfHtml = hfHtml.replace(/\s*<meta name="hf-app-build"[^>]*>\n?/g, "\n");
hfHtml = setMeta(hfHtml, "cw-app-version", version);
hfHtml = setMeta(hfHtml, "cw-app-build", build);
fs.writeFileSync(hfHtmlPath, hfHtml);
console.log("Synced embedded/harmonyforge/index.html cw-app-version", version);

const hfVersionPath = path.join(root, "embedded/harmonyforge/version.json");
if (fs.existsSync(hfVersionPath)) {
  fs.unlinkSync(hfVersionPath);
  console.log("Removed embedded/harmonyforge/version.json (use repo root version.json)");
}
