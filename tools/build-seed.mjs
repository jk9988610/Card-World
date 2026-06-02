#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from "fs";
import { join, resolve } from "path";

const seedRoot = resolve("seed");
const outDir = resolve("dist");
mkdirSync(outDir, { recursive: true });

const definitions = JSON.parse(readFileSync(join(seedRoot, "definitions.json"), "utf8"));
const starterWorld = JSON.parse(readFileSync(join(seedRoot, "starter-world.json"), "utf8"));

const programs = {};
for (const f of readdirSync(join(seedRoot, "programs")).filter((x) => x.endsWith(".json"))) {
  const p = JSON.parse(readFileSync(join(seedRoot, "programs", f), "utf8"));
  programs[p.id] = p;
}

const packs = {};
for (const f of readdirSync(join(seedRoot, "packs")).filter((x) => x.endsWith(".json"))) {
  const p = JSON.parse(readFileSync(join(seedRoot, "packs", f), "utf8"));
  packs[p.slug] = p;
}

const scenes = {};
const sceneDir = join(seedRoot, "scenes");
if (existsSync(sceneDir)) {
  for (const f of readdirSync(sceneDir).filter((x) => x.endsWith(".json"))) {
    const s = JSON.parse(readFileSync(join(sceneDir, f), "utf8"));
    scenes[s.id] = s;
  }
}

writeFileSync(
  join(outDir, "seed-bundle.json"),
  JSON.stringify({ version: "0.1.0", builtAt: new Date().toISOString(), definitions, starterWorld, programs, packs, scenes }, null, 2)
);
console.log("Built dist/seed-bundle.json");
