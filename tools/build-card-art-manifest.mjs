#!/usr/bin/env node
/**
 * Build public/card-art/manifest.json from *.png in that folder.
 * Usage: node tools/build-card-art-manifest.mjs
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CARDS_DIR = path.join(ROOT, "public/card-art");
const MANIFEST_PATH = path.join(CARDS_DIR, "manifest.json");

const DEFAULT_BASE =
  "https://yjqkotqmglxjhlrhynsu.supabase.co/storage/v1/object/public/card-art";

function main() {
  const files = readdirSync(CARDS_DIR);
  let baseUrl = DEFAULT_BASE;
  try {
    const existing = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
    if (existing.baseUrl?.trim()) baseUrl = existing.baseUrl.trim().replace(/\/+$/, "");
  } catch {
    /* first run */
  }

  const updatedAt = new Date().toISOString();
  const entries = {};
  for (const file of files) {
    const m = file.match(/^(.+)\.png$/i);
    if (!m) continue;
    const artKey = m[1];
    entries[artKey] = {
      png: `${artKey}.png`,
      updatedAt,
    };
  }

  const manifest = { version: 1, updatedAt, baseUrl, entries };
  writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(`Wrote ${MANIFEST_PATH} (${Object.keys(entries).length} entries)`);
}

main();
