#!/usr/bin/env node
/**
 * Refresh embedded/harmonyforge from Music-production-website (main).
 * Does not copy .git / .github. Re-apply Card World header patches after sync if needed.
 */
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const dest = path.join(root, "embedded", "harmonyforge");
const tmp = path.join(root, ".tmp-harmonyforge-sync");

const REPO = "https://github.com/jk9988610/Music-production-website.git";

if (fs.existsSync(tmp)) fs.rmSync(tmp, { recursive: true, force: true });
execSync(`git clone --depth 1 ${REPO} ${tmp}`, { stdio: "inherit" });

if (fs.existsSync(dest)) fs.rmSync(dest, { recursive: true, force: true });
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.cpSync(tmp, dest, { recursive: true });
for (const drop of [".git", ".github", ".tmp-harmonyforge-sync"]) {
  const p = path.join(dest, drop);
  if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
}
fs.rmSync(tmp, { recursive: true, force: true });

console.log("Synced to", dest);
console.log("Reminder: re-apply Card World patches in embedded/harmonyforge/index.html if upstream changed.");
