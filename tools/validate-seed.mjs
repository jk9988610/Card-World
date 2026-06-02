#!/usr/bin/env node
import { readFileSync, existsSync, readdirSync } from "fs";
import { join, resolve } from "path";

const root = resolve("seed");
let errors = 0;
const fail = (m) => { console.error("ERROR:", m); errors++; };
const load = (p) => JSON.parse(readFileSync(p, "utf8"));

if (!existsSync(join(root, "definitions.json"))) fail("missing definitions.json");
else {
  const { definitions = [] } = load(join(root, "definitions.json"));
  const slugs = new Set();
  for (const d of definitions) {
    if (slugs.has(d.slug)) fail(`duplicate slug ${d.slug}`);
    slugs.add(d.slug);
  }
  console.log(`definitions: ${definitions.length}`);
}

if (!existsSync(join(root, "starter-world.json"))) fail("missing starter-world.json");
else console.log("starter-world.json ok");

const progDir = join(root, "programs");
if (existsSync(progDir)) {
  for (const f of readdirSync(progDir).filter((x) => x.endsWith(".json"))) {
    const p = load(join(progDir, f));
    if (!p.id) fail(`${f}: missing id`);
  }
}

const packDir = join(root, "packs");
if (existsSync(packDir)) {
  for (const f of readdirSync(packDir).filter((x) => x.endsWith(".json"))) {
    const p = load(join(packDir, f));
    if (!p.slug) fail(`${f}: missing slug`);
    if (!p.version) fail(`${f}: missing version`);
  }
}

process.exit(errors ? 1 : 0);
