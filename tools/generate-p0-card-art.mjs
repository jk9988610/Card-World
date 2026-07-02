#!/usr/bin/env node
/**
 * Generate P0 official card faces (60×84, 5:7) for art-registry entries.
 * Output: public/card-art/{artKey}.png
 *
 * Usage: node tools/generate-p0-card-art.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(ROOT, "public/card-art");
const W = 60;
const H = 84;

const C = {
  bg: [0x1a, 0x1a, 0x2e, 255],
  ink: [0xf8, 0xf9, 0xfa, 255],
  dim: [0x86, 0x8e, 0x96, 255],
  purple: [0x6f, 0x42, 0xc1, 255],
  violet: [0xcc, 0x5d, 0xe8, 255],
  red: [0xe0, 0x31, 0x31, 255],
  green: [0x51, 0xcf, 0x66, 255],
  greenD: [0x2f, 0x9e, 0x44, 255],
  blue: [0x33, 0x9a, 0xf0, 255],
  yellow: [0xff, 0xd4, 0x3b, 255],
  brown: [0x8b, 0x5a, 0x2b, 255],
  wood: [0xd4, 0xa5, 0x74, 255],
  shadow: [0x0d, 0x11, 0x17, 255],
};

function createCanvas() {
  const data = new Uint8Array(W * H * 4);
  for (let i = 0; i < W * H; i++) {
    const o = i * 4;
    data[o] = C.bg[0];
    data[o + 1] = C.bg[1];
    data[o + 2] = C.bg[2];
    data[o + 3] = C.bg[3];
  }
  return { data, w: W, h: H };
}

function px(c, x, y, color) {
  if (x < 0 || y < 0 || x >= c.w || y >= c.h) return;
  const o = (y * c.w + x) * 4;
  c.data[o] = color[0];
  c.data[o + 1] = color[1];
  c.data[o + 2] = color[2];
  c.data[o + 3] = color[3];
}

function fillRect(c, x0, y0, w, h, color) {
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) px(c, x, y, color);
  }
}

function drawBorder(c, x0, y0, w, h, color) {
  fillRect(c, x0, y0, w, 1, color);
  fillRect(c, x0, y0 + h - 1, w, 1, color);
  fillRect(c, x0, y0, 1, h, color);
  fillRect(c, x0 + w - 1, y0, 1, h, color);
}

function drawSettings() {
  const c = createCanvas();
  const cx = 30;
  const cy = 38;
  for (let a = 0; a < 8; a++) {
    const ang = (a / 8) * Math.PI * 2;
    const x = Math.round(cx + Math.cos(ang) * 14);
    const y = Math.round(cy + Math.sin(ang) * 14);
    fillRect(c, x - 2, y - 2, 5, 5, C.purple);
  }
  fillRect(c, cx - 8, cy - 8, 17, 17, C.dim);
  fillRect(c, cx - 5, cy - 5, 11, 11, C.bg);
  fillRect(c, cx - 3, cy - 3, 7, 7, C.violet);
  fillRect(c, 8, 62, 44, 2, C.dim);
  fillRect(c, 12, 66, 36, 3, C.purple);
  fillRect(c, 16, 71, 28, 2, C.dim);
  return c;
}

function drawPixelBoard() {
  const c = createCanvas();
  fillRect(c, 10, 14, 40, 48, C.shadow);
  for (let x = 10; x <= 50; x += 5) {
    for (let y = 14; y <= 62; y++) px(c, x, y, [0x2a, 0x35, 0x48, 255]);
  }
  for (let y = 14; y <= 62; y += 6) {
    for (let x = 10; x <= 50; x++) px(c, x, y, [0x2a, 0x35, 0x48, 255]);
  }
  drawBorder(c, 10, 14, 41, 49, C.dim);
  fillRect(c, 28, 8, 4, 10, C.red);
  fillRect(c, 26, 6, 8, 4, C.red);
  for (let i = 0; i < 6; i++) {
    px(c, 22 + i * 2, 34 - i, C.red);
    px(c, 22 + i * 2, 35 - i, C.yellow);
  }
  fillRect(c, 14, 68, 8, 8, C.red);
  fillRect(c, 24, 68, 8, 8, C.blue);
  fillRect(c, 34, 68, 8, 8, C.green);
  fillRect(c, 44, 68, 8, 8, C.yellow);
  return c;
}

function drawMusicStudio() {
  const c = createCanvas();
  fillRect(c, 6, 52, 48, 18, C.shadow);
  const keys = [C.ink, C.ink, C.dim, C.ink, C.ink, C.dim, C.ink];
  let x = 8;
  for (let i = 0; i < 7; i++) {
    fillRect(c, x, 54, 5, 14, keys[i]);
    x += 6;
  }
  x = 11;
  for (let i = 0; i < 6; i++) {
    if (i === 2 || i === 5) {
      x += 6;
      continue;
    }
    fillRect(c, x, 54, 3, 8, C.shadow);
    x += 6;
  }
  for (let i = 0; i < 5; i++) {
    const h = 8 + (i % 3) * 6;
    fillRect(c, 10 + i * 9, 38 - h, 5, h, C.green);
    if (i < 4) fillRect(c, 15 + i * 9, 38 - h - 4, 4, 4, C.greenD);
  }
  fillRect(c, 18, 10, 24, 4, C.greenD);
  fillRect(c, 22, 14, 16, 2, C.green);
  return c;
}

function drawDoor() {
  const c = createCanvas();
  fillRect(c, 14, 10, 32, 58, C.brown);
  fillRect(c, 16, 12, 28, 54, C.wood);
  fillRect(c, 14, 8, 32, 6, C.brown);
  fillRect(c, 18, 6, 24, 4, C.dim);
  fillRect(c, 36, 38, 4, 4, C.yellow);
  fillRect(c, 22, 18, 16, 20, C.brown);
  fillRect(c, 24, 20, 12, 16, C.shadow);
  fillRect(c, 28, 28, 4, 6, C.wood);
  for (let y = 14; y < 66; y += 8) {
    fillRect(c, 16, y, 28, 1, [0xc4, 0x90, 0x60, 255]);
  }
  fillRect(c, 12, 66, 36, 4, C.shadow);
  return c;
}

const ART = {
  settings: drawSettings,
  "pixel-board": drawPixelBoard,
  "music-studio": drawMusicStudio,
  door: drawDoor,
};

function writePng(c, filePath) {
  const png = new PNG({ width: c.w, height: c.h });
  png.data = Buffer.from(c.data);
  writeFileSync(filePath, PNG.sync.write(png));
}

function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  for (const [key, draw] of Object.entries(ART)) {
    const out = path.join(OUT_DIR, `${key}.png`);
    writePng(draw(), out);
    console.log(`wrote ${out}`);
  }
}

main();
