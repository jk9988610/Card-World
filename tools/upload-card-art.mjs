#!/usr/bin/env node
/**
 * Upload public/card-art/* to Supabase bucket card-art.
 *
 * Requires:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage:
 *   node tools/generate-p0-card-art.mjs
 *   node tools/build-card-art-manifest.mjs
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node tools/upload-card-art.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CARDS_DIR = path.join(ROOT, "public/card-art");
const BUCKET = process.env.SUPABASE_ART_BUCKET?.trim() || "card-art";

const url = process.env.SUPABASE_URL?.trim();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!url || !key) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key);

async function upload(rel) {
  const abs = path.join(CARDS_DIR, rel);
  const body = readFileSync(abs);
  const contentType = rel.endsWith(".png") ? "image/png" : "application/json";
  const { error } = await supabase.storage.from(BUCKET).upload(rel, body, {
    upsert: true,
    contentType,
  });
  if (error) throw new Error(`${rel}: ${error.message}`);
  console.log(`uploaded ${rel}`);
}

async function main() {
  const files = readdirSync(CARDS_DIR).filter((f) => /\.(png|json)$/i.test(f));
  for (const f of files) await upload(f);
  console.log("Done. Manifest URL:");
  console.log(`${url.replace(/\/+$/, "")}/storage/v1/object/public/${BUCKET}/manifest.json`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
