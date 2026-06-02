import { loadSave, writeSave } from "./storage.js";

/**
 * Card World v0.3 — tap zoom | drag Hand→Field play | Field→Hand take
 */

const APP_VERSION = "0.3.2";

const defBySlug = new Map();
let programs = {};
let locales = { en: {} };
let currentLocale = "en";

const state = {
  hand: [],
  field: [],
  bootstrapDone: false,
  highlightOn: true,
  hintTarget: "founders.world_controller",
};

let instanceCounter = 0;
let drag = null;
let fullscreenTried = false;

const els = {
  hand: document.getElementById("hand-cards"),
  field: document.getElementById("field-cards"),
  zoom: document.getElementById("card-zoom"),
  zoomBackdrop: document.getElementById("zoom-backdrop"),
  zoomSlot: document.getElementById("zoom-slot"),
};


function localeKeyForDef(def) {
  if (def.localeKey) return def.localeKey;
  return def.slug.replace(/\./g, "_");
}

function persistSave() {
  writeSave({
    appVersion: APP_VERSION,
    locale: currentLocale,
    highlightOn: state.highlightOn,
    bootstrapDone: state.bootstrapDone,
    hintTarget: state.hintTarget,
    hand: state.hand,
    field: state.field,
  });
}

function applySaved(save) {
  if (!save) return;
  if (save.locale && locales[save.locale]) currentLocale = save.locale;
  if (typeof save.highlightOn === "boolean") state.highlightOn = save.highlightOn;
  if (typeof save.bootstrapDone === "boolean") state.bootstrapDone = save.bootstrapDone;
  if (save.hintTarget !== undefined) state.hintTarget = save.hintTarget;
  if (Array.isArray(save.hand) && save.hand.length) state.hand = save.hand;
  if (Array.isArray(save.field) && save.field.length) state.field = save.field;
  for (const inst of [...state.hand, ...state.field]) {
    const n = parseInt(inst.instanceId?.replace(/\D/g, "") || "0", 10);
    if (n > instanceCounter) instanceCounter = n;
  }
}

function getDef(slug) {
  return defBySlug.get(slug);
}

function localeCard(key) {
  return locales[currentLocale]?.cards?.[key] || locales.en?.cards?.[key];
}

function resolveInstance(inst) {
  const def = getDef(inst.definitionSlug);
  if (!def) {
    return { ...inst, title: "?", text: "", image: null, tags: [], programs: {} };
  }
  const key = inst.localeKey || localeKeyForDef(def);
  const loc = localeCard(key);
  let title = inst.title ?? loc?.title ?? def.title;
  let text = inst.text ?? loc?.text ?? def.text;
  if (inst.textKey) {
    const t = localeCard(inst.textKey.replace(/^cards\./, ""));
    if (t?.text) text = t.text;
    if (t?.title) title = t.title;
  }
  return {
    ...inst,
    title,
    text,
    image: inst.image ?? def.image,
    tags: def.tags ?? [],
    programs: def.programs ?? {},
    localeKey: key,
  };
}

function findInstance(id) {
  for (const zone of ["hand", "field"]) {
    const found = state[zone].find((i) => i.instanceId === id);
    if (found) return { instance: found, zone };
  }
  return null;
}

function nextInstanceId() {
  instanceCounter += 1;
  return `inst_${instanceCounter}_${Date.now().toString(36)}`;
}

function createInstance(definitionSlug, zone) {
  const inst = { instanceId: nextInstanceId(), definitionSlug, zone };
  state[zone].push(inst);
  return inst;
}

function drawPixel(canvas, payload, large = false) {
  if (!payload || payload.type !== "pixel/v1") return;
  const ctx = canvas.getContext("2d");
  const w = payload.w || 8;
  const h = payload.h || 8;
  const pal = payload.palette || ["#000", "#fff"];
  const px = payload.pixels || [];
  const parent = canvas.parentElement;
  const cw = parent?.clientWidth || (large ? 320 : 160);
  const ch = parent?.clientHeight || (large ? 280 : 140);
  const block = Math.max(large ? 12 : 5, Math.floor(Math.min(cw / w, ch / h) * 0.88));
  canvas.width = w * block;
  canvas.height = h * block;
  ctx.imageSmoothingEnabled = false;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = px[y * w + x] ?? px[(y * w + x) % Math.max(px.length, 1)] ?? 0;
      ctx.fillStyle = pal[i] ?? pal[0];
      ctx.fillRect(x * block, y * block, block, block);
    }
  }
  canvas.style.width = `${w * block}px`;
  canvas.style.height = `${h * block}px`;
}

function tagClass(tags) {
  if (tags.includes("settings")) return "tag-settings";
  if (tags.includes("language")) return "tag-language";
  if (tags.includes("tutorial") || tags.includes("guide")) return "tag-guide";
  if (tags.includes("controller")) return "tag-controller";
  if (tags.includes("content")) return "tag-content";
  if (tags.includes("container")) return "tag-container";
  if (tags.includes("programming")) return "tag-programming";
  return "";
}

function setHintTarget(slug) {
  state.hintTarget = slug || null;
}

function shouldHint(slug, zone) {
  if (!state.highlightOn) return false;
  if (state.hintTarget && slug === state.hintTarget) return true;
  if (!state.bootstrapDone) {
    if (slug === "founders.world_controller" && zone === "hand") return true;
    if ((slug === "founders.tutorial" || slug === "founders.settings" || slug === "founders.guide_weave_1") && zone === "field") return true;
  }
  return false;
}

function buildCardEl(inst, zone, opts = {}) {
  const { large = false, forZoom = false } = opts;
  const r = resolveInstance(inst);
  const el = document.createElement("article");
  el.className = `card ${tagClass(r.tags)}`;
  el.dataset.instanceId = inst.instanceId;
  el.dataset.definitionSlug = inst.definitionSlug;

  if (!forZoom && shouldHint(r.definitionSlug, zone)) el.classList.add("hint");

  if (!forZoom) {
    el.draggable = true;
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      if (drag?.moved) return;
      openZoom(inst);
    });
    el.addEventListener("dragstart", (e) => {
      drag = { id: inst.instanceId, from: zone, moved: false };
      e.dataTransfer.setData("text/plain", inst.instanceId);
    });
    el.addEventListener("dragend", () => setTimeout(() => { drag = null; }, 50));
  }

  const title = document.createElement("div");
  title.className = "card-title";
  title.textContent = r.title;

  const imageWrap = document.createElement("div");
  imageWrap.className = "card-image";
  const canvas = document.createElement("canvas");
  imageWrap.appendChild(canvas);
  drawPixel(canvas, r.image, large || forZoom);

  const text = document.createElement("div");
  text.className = "card-text";
  text.textContent = r.text;

  el.append(title, imageWrap, text);
  return el;
}

function renderAll() {
  renderZone("field", els.field, state.field);
  renderZone("hand", els.hand, state.hand);
}

function renderZone(zoneName, container, instances) {
  container.innerHTML = "";
  for (const inst of instances) {
    container.appendChild(buildCardEl(inst, zoneName));
  }
}

function openZoom(inst) {
  els.zoomSlot.innerHTML = "";
  els.zoomSlot.appendChild(buildCardEl({ ...inst }, "zoom", { large: true, forZoom: true }));
  els.zoom.classList.remove("hidden");
}

function closeZoom() {
  els.zoom.classList.add("hidden");
  els.zoomSlot.innerHTML = "";
}

function moveInstance(id, toZone) {
  const loc = findInstance(id);
  if (!loc || loc.zone === toZone) return;
  state[loc.zone] = state[loc.zone].filter((i) => i.instanceId !== id);
  loc.instance.zone = toZone;
  state[toZone].push(loc.instance);
  renderAll();
  persistSave();
}

function setupDropZone(container, zoneName) {
  container.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  });
  container.addEventListener("drop", (e) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    if (!id || !drag) return;
    const from = drag.from;
    drag.moved = true;
    if (from === zoneName) return;
    if (from === "hand" && zoneName === "field") {
      moveInstance(id, "field");
      playCard(id);
      tryAutoFullscreen();
    } else if (from === "field" && zoneName === "hand") {
      moveInstance(id, "hand");
    }
  });
}

function tryAutoFullscreen() {
  if (fullscreenTried) return;
  fullscreenTried = true;
  const el = document.documentElement;
  if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
}

async function enterFullscreen() {
  try {
    await document.documentElement.requestFullscreen();
  } catch (_) {}
}

async function exitFullscreen() {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
  } catch (_) {}
}

function setLocale(code) {
  if (!locales[code]) return;
  currentLocale = code;
  renderAll();
  persistSave();
  if (els.zoom && !els.zoom.classList.contains("hidden")) {
    const id = els.zoomSlot.querySelector(".card")?.dataset?.instanceId;
    if (id) {
      const loc = findInstance(id);
      if (loc) openZoom(loc.instance);
    }
  }
}

function getNode(program, nodeId) {
  return program.nodes?.find((n) => n.id === nodeId);
}

function runProgram(programId, ctx) {
  const program = programs[programId];
  if (!program) return;
  let steps = 0;
  const exec = (nodeId) => {
    if (!nodeId || steps++ > 200) return;
    const node = getNode(program, nodeId);
    if (!node) return;
    switch (node.op) {
      case "sequence":
        for (const c of node.children || []) exec(c);
        break;
      case "deal":
        for (const slug of node.params?.cards || []) {
          createInstance(slug, node.params?.toZone || "hand");
        }
        renderAll();
        break;
      case "spawn":
        createInstance(node.params?.definitionSlug, node.params?.zone || "field");
        renderAll();
        break;
      case "set_slot": {
        const tid = node.params?.targetInstanceId || ctx?.instanceId;
        const loc = findInstance(tid);
        if (loc) {
          if (node.params?.slot === "title") loc.instance.title = node.params?.value;
          else loc.instance.text = node.params?.value;
          renderAll();
        }
        break;
      }
      case "set_locale":
        setLocale(node.params?.locale || "en");
        break;
      case "set_locale_text": {
        const loc = findInstance(ctx?.instanceId);
        if (loc) {
          const key = (node.params?.textKey || "").replace(/^cards\./, "");
          const t = localeCard(key);
          if (t) {
            loc.instance.textKey = node.params?.textKey;
            loc.instance.localeKey = key;
            if (t.text) loc.instance.text = t.text;
            if (t.title) loc.instance.title = t.title;
          }
          renderAll();
        }
        break;
      }
      case "fullscreen_enter":
        enterFullscreen();
        break;
      case "fullscreen_exit":
        exitFullscreen();
        break;
      case "highlight":
        state.highlightOn = !!node.params?.on;
        renderAll();
        persistSave();
        break;
      default:
        break;
    }
  };
  exec(program.entry);
}

function playCard(instanceId) {
  const loc = findInstance(instanceId);
  if (!loc || loc.zone !== "field") return;
  const programId = resolveInstance(loc.instance).programs?.on_play;
  if (!programId) return;
  runProgram(programId, { instanceId });
  if (programId === "world.bootstrap") {
    state.bootstrapDone = true;
    setHintTarget("content.door");
    renderAll();
  } else if (programId === "settings.open") {
    setHintTarget("founders.language_settings");
    renderAll();
  } else if (programId === "language.open") {
    setHintTarget("founders.lang_zh");
    renderAll();
  } else if (programId === "language.set_zh" || programId === "language.set_en") {
    setHintTarget(null);
    renderAll();
  }
  persistSave();
}

async function loadJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  return res.json();
}

async function loadBundle() {
  const base = new URL("../", import.meta.url).href;
  const urls = [
    new URL("dist/seed-bundle.json", base).href,
    `${location.pathname.replace(/\/[^/]*$/, "/")}dist/seed-bundle.json`,
    "dist/seed-bundle.json",
  ];
  let lastErr;
  for (const url of urls) {
    try {
      return await loadJson(url);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

async function loadLocales() {
  const base = new URL("../", import.meta.url).href;
  const prefix = `${location.pathname.replace(/\/[^/]*$/, "/")}locales/`;
  for (const code of ["en", "zh-Hans"]) {
    try {
      locales[code] = await loadJson(new URL(`locales/${code}.json`, base).href);
    } catch {
      try {
        locales[code] = await loadJson(`${prefix}${code}.json`);
      } catch {
        locales[code] = locales.en;
      }
    }
  }
}

function applyStarter(bundle) {
  for (const d of bundle.definitions?.definitions || []) {
    defBySlug.set(d.slug, d);
  }
  programs = bundle.programs || {};
  const start = bundle.starterWorld || {};
  state.hand = (start.hand || []).map((i) => ({ ...i }));
  state.field = (start.field || []).map((i) => ({ ...i }));
  for (const inst of [...state.hand, ...state.field]) {
    const n = parseInt(inst.instanceId?.replace(/\D/g, "") || "0", 10);
    if (n > instanceCounter) instanceCounter = n;
  }
}

async function init() {
  setupDropZone(els.hand, "hand");
  setupDropZone(els.field, "field");
  els.zoomBackdrop.addEventListener("click", closeZoom);

  try {
    await loadLocales();
    const bundle = await loadBundle();
    applyStarter(bundle);
    applySaved(loadSave());
    renderAll();
    persistSave();
  } catch (err) {
    console.error(err);
    state.field.push({
      instanceId: "inst_err",
      definitionSlug: "founders.tutorial",
      localeKey: "load_error",
      text: String(err.message),
    });
    renderAll();
  }
}

init();
