#!/usr/bin/env node
/** Emit version.json from index.html meta cw-app-version */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const m = html.match(/name="cw-app-version"\s+content="([^"]+)"/);
const version = m?.[1] || "0.0.0";
const buildM = html.match(/name="cw-app-build"\s+content="([^"]+)"/);
const build = buildM?.[1] || version;
const out = { version, build };
fs.writeFileSync(path.join(root, "version.json"), `${JSON.stringify(out, null, 2)}\n`);
console.log("Wrote version.json", out);
