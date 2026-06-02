#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname, basename, resolve } from "path";

const args = process.argv.slice(2);
const inputPath = args.find((a) => !a.startsWith("--"));
const outFlag = args.indexOf("--out");
const outPath = outFlag >= 0 ? args[outFlag + 1] : null;

if (!inputPath) {
  console.error("Usage: npm run export-program -- <program.json> [--out path.json]");
  process.exit(1);
}

const ir = JSON.parse(readFileSync(resolve(inputPath), "utf8"));
const programId = ir.id ?? basename(inputPath, ".json");
const slug = ir.slug ?? programId.replace(/\./g, "-");

function nodeToDefinition(node, index) {
  return {
    slug: `prog.export.${slug}.${node.id ?? `n${index}`}`,
    title: node.label ?? node.op ?? node.type,
    text: node.summary ?? `Part of ${programId}`,
    tags: ["programming", "exported", `program:${programId}`],
    meta: { programId, nodeId: node.id, op: node.op ?? node.type, params: node.params ?? {} },
    image: { type: "pixel/v1", w: 8, h: 8, palette: ["#1a1a2e", "#4cc9f0"], pixels: [0, 1, 1, 0, 1, 0, 0, 1] },
  };
}

const programmingCards = (ir.nodes ?? []).map(nodeToDefinition);
const bundle = {
  exportedFrom: inputPath,
  programId,
  program: ir,
  programmingCards,
  metaExportCard: {
    slug: "prog.export",
    title: "Export Program",
    text: "Phase 1: bridge.export_program. Dev: npm run export-program",
    tags: ["programming", "meta"],
    meta: { implemented: false, exportsProgramId: programId },
  },
};

const json = JSON.stringify(bundle, null, 2);
if (outPath) {
  mkdirSync(dirname(resolve(outPath)), { recursive: true });
  writeFileSync(resolve(outPath), json);
  console.log(`Wrote ${outPath} (${programmingCards.length} cards)`);
} else {
  console.log(json);
}
