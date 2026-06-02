import { loadSave, writeSave } from "./storage.js";

/**
 * Card World — tap zoom | drag play | backpack pour/close flow
 */

const APP_VERSION = "0.5.0";

const SWATCH_BY_TAG = [
  ["programming", "#6f42c1"],
  ["controller", "#5c7cfa"],
  ["settings", "#868e96"],
  ["language", "#22b8cf"],
  ["tutorial", "#e03131"],
  ["guide", "#e8590c"],
  ["content", "#2f9e44"],
  ["container", "#ae3ec9"],
  ["deck", "#9c36b5"],
];

const META_TAGS = new Set(["settings", "language", "tutorial", "guide", "controller", "programming"]);

const defBySlug = new Map();
let programs = {};
let locales = { en: {} };
let currentLocale = "en";

const state = {
  hand: [],
  field: [],
  fieldStash: [],
  bootstrapDone: false,
  highlightOn: true,
  hintTarget: "founders.world_controller",
  guideQueue: [],
  guideIndex: 0,
};

let instanceCounter = 0;
let drag = null;
let fullscreenTried = false;

const els = {
  hand: document.getElementById("hand-cards"),
  field: document.getElementById("field-cards"),
  zoneHand: document.getElementById("zone-hand"),
  zoneField: document.getElementById("zone-field"),
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
    guideQueue: state.guideQueue,
    guideIndex: state.guideIndex,
    hand: state.hand,
    field: state.field,
    fieldStash: state.fieldStash,
  });
}

function bumpCounterFromInst(inst) {
  const n = parseInt(inst.instanceId?.replace(/\D/g, "") || "0", 10);
  if (n > instanceCounter) instanceCounter = n;
  for (const child of inst.inner || []) bumpCounterFromInst(child);
}

function applySaved(save) {
  if (!save) return;
  if (save.locale && locales[save.locale]) currentLocale = save.locale;
  if (typeof save.highlightOn === "boolean") state.highlightOn = save.highlightOn;
  if (typeof save.bootstrapDone === "boolean") state.bootstrapDone = save.bootstrapDone;
  if (save.hintTarget !== undefined) state.hintTarget = save.hintTarget;
  if (Array.isArray(save.guideQueue)) state.guideQueue = save.guideQueue;
  if (typeof save.guideIndex === "number") state.guideIndex = save.guideIndex;
  if (Array.isArray(save.hand) && save.hand.length) state.hand = save.hand;
  if (Array.isArray(save.field) && save.field.length) state.field = save.field;
  if (Array.isArray(save.fieldStash)) state.fieldStash = save.fieldStash;
  for (const inst of [...state.hand, ...state.field, ...state.fieldStash]) bumpCounterFromInst(inst);
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
  const innerN = inst.inner?.length || 0;
  if (innerN > 0 && isBackpack(def)) {
    text = `${text}\n(${innerN} inside)`;
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

function walkInstances(fn) {
  const visit = (inst, zone) => {
    fn(inst, zone);
    for (const child of inst.inner || []) visit(child, "inner");
  };
  for (const inst of state.hand) visit(inst, "hand");
  for (const inst of state.field) visit(inst, "field");
  for (const inst of state.fieldStash) visit(inst, "stash");
}

function findInstance(id) {
  let found = null;
  walkInstances((inst, zone) => {
    if (inst.instanceId === id) found = { instance: inst, zone };
  });
  return found;
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

function swatchColor(tags = []) {
  for (const [tag, color] of SWATCH_BY_TAG) {
    if (tags.includes(tag)) return color;
  }
  return "#495057";
}

function drawCardSwatch(canvas, tags, large = false) {
  const parent = canvas.parentElement;
  const cw = parent?.clientWidth || (large ? 300 : 80);
  const ch = parent?.clientHeight || (large ? 200 : 50);
  const pad = large ? 10 : 4;
  const w = Math.max(12, Math.floor(cw - pad * 2));
  const h = Math.max(12, Math.floor(ch - pad * 2));
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = swatchColor(tags);
  ctx.fillRect(0, 0, w, h);
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
}

function tagClass(tags) {
  if (tags.includes("settings")) return "tag-settings";
  if (tags.includes("language")) return "tag-language";
  if (tags.includes("tutorial") || tags.includes("guide")) return "tag-guide";
  if (tags.includes("controller")) return "tag-controller";
  if (tags.includes("content")) return "tag-content";
  if (tags.includes("container") || tags.includes("deck")) return "tag-container";
  if (tags.includes("programming")) return "tag-programming";
  return "";
}

function isBackpack(def) {
  if (!def?.tags) return false;
  return def.tags.includes("container") || def.tags.includes("deck");
}

function isMetaCard(def) {
  if (!def?.tags) return false;
  if (def.tags.some((t) => META_TAGS.has(t))) return true;
  if (def.tags.includes("reusable")) return true;
  return playStyle(def) === "reusable";
}

function playStyle(def) {
  if (!def) return "consume";
  if (def.playStyle) return def.playStyle;
  if (def.tags?.includes("reusable")) return "reusable";
  if (def.tags?.includes("echo")) return "echo";
  return "consume";
}

function ensureInner(inst) {
  if (!inst.inner) inst.inner = [];
  return inst.inner;
}

function recallBackpackToHand(instanceId) {
  const loc = findInstance(instanceId);
  if (!loc || loc.zone !== "field") return;
  const def = getDef(loc.instance.definitionSlug);
  if (!isBackpack(def)) {
    moveInstance(instanceId, "hand");
    return;
  }
  const others = state.field.filter((i) => i.instanceId !== instanceId);
  state.fieldStash.push(...others);
  state.field = state.field.filter((i) => i.instanceId === instanceId);
  moveInstance(instanceId, "hand");
  state.field = [];
  renderAll();
  persistSave();
}

function pourBackpackFromHand(instanceId) {
  const loc = findInstance(instanceId);
  if (!loc || loc.zone !== "hand") return false;
  const inst = loc.instance;
  const inner = ensureInner(inst);
  if (state.field.length > 0 || inner.length === 0) return false;
  for (const item of inner) {
    item.zone = "field";
    state.field.push(item);
  }
  inst.inner = [];
  renderAll();
  persistSave();
  return true;
}

function closeBackpackFromHand(instanceId) {
  const loc = findInstance(instanceId);
  if (!loc || loc.zone !== "hand") return;
  const inst = loc.instance;
  const inner = ensureInner(inst);
  for (const card of state.field) {
    inner.push(card);
  }
  state.field = [];
  moveInstance(instanceId, "field");
  for (const card of state.fieldStash) {
    card.zone = "field";
    state.field.push(card);
  }
  state.fieldStash = [];
  renderAll();
  persistSave();
}

function playBackpackFromHand(instanceId) {
  if (pourBackpackFromHand(instanceId)) return;
  closeBackpackFromHand(instanceId);
}

function handleZoneDrop(instanceId, fromZone, toZone) {
  const loc = findInstance(instanceId);
  if (!loc) return;
  const def = getDef(loc.instance.definitionSlug);

  if (fromZone === "field" && toZone === "hand") {
    if (isBackpack(def)) recallBackpackToHand(instanceId);
    else moveInstance(instanceId, "hand");
    return;
  }

  if (fromZone === "hand" && toZone === "field") {
    if (isBackpack(def)) {
      playBackpackFromHand(instanceId);
      tryAutoFullscreen();
      return;
    }
    playFromHand(instanceId);
    tryAutoFullscreen();
  }
}

function advanceGuide(playedSlug) {
  if (!state.guideQueue?.length) return;
  if (playedSlug !== state.hintTarget) return;
  state.guideIndex += 1;
  if (state.guideIndex < state.guideQueue.length) {
    setHintTarget(state.guideQueue[state.guideIndex]);
  } else {
    state.guideQueue = [];
    state.guideIndex = 0;
    setHintTarget(null);
  }
  renderAll();
  persistSave();
}

function runPlayEffects(programId, instanceId) {
  runProgram(programId, { instanceId });
  if (programId === "world.bootstrap") {
    state.bootstrapDone = true;
    if (!state.guideQueue.length) setHintTarget("content.door");
  } else if (programId === "settings.open") {
    if (!state.guideQueue.length) setHintTarget("founders.language_settings");
  } else if (programId === "language.open") {
    if (!state.guideQueue.length) setHintTarget("founders.lang_zh");
  } else if (programId === "language.set_zh" || programId === "language.set_en") {
    if (!state.guideQueue.length) setHintTarget(null);
  } else if (programId === "guide.start") {
    state.highlightOn = true;
  }
}

function playFromHand(instanceId) {
  const loc = findInstance(instanceId);
  if (!loc || loc.zone !== "hand") return;
  const def = getDef(loc.instance.definitionSlug);
  if (isBackpack(def)) return;
  const style = playStyle(def);
  const programId = resolveInstance(loc.instance).programs?.on_play;

  if (style === "reusable" || isMetaCard(def)) {
    if (programId) runPlayEffects(programId, instanceId);
    advanceGuide(loc.instance.definitionSlug);
    renderAll();
    persistSave();
    return;
  }

  moveInstance(instanceId, "field");
  const after = findInstance(instanceId);
  if (!after) return;

  if (programId) runPlayEffects(programId, instanceId);
  if (style === "echo") createInstance(loc.instance.definitionSlug, "hand");
  advanceGuide(loc.instance.definitionSlug);
  renderAll();
  persistSave();
}

function setHintTarget(slug) {
  state.hintTarget = slug || null;
}

function shouldHint(slug, zone) {
  if (!state.highlightOn || zone !== "hand") return false;
  if (state.hintTarget && slug === state.hintTarget) return true;
  if (state.guideQueue.length) return false;
  if (!state.bootstrapDone && slug === "founders.world_controller") return true;
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
  drawCardSwatch(canvas, r.tags, large || forZoom);

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
  if (!loc || loc.zone === toZone || loc.zone === "inner" || loc.zone === "stash") return;
  if (loc.zone !== "hand" && loc.zone !== "field") return;
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
    handleZoneDrop(id, from, zoneName);
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
      case "guide_start":
        state.guideQueue = [...(node.params?.steps || [])];
        state.guideIndex = 0;
        state.highlightOn = true;
        if (state.guideQueue.length) setHintTarget(state.guideQueue[0]);
        renderAll();
        persistSave();
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
  state.hand = (start.hand || []).map((i) => ({ ...i, inner: i.inner ? [...i.inner] : undefined }));
  state.field = (start.field || []).map((i) => ({ ...i, inner: i.inner ? [...i.inner] : undefined }));
  state.fieldStash = [];
  for (const inst of [...state.hand, ...state.field]) bumpCounterFromInst(inst);
}

async function init() {
  setupDropZone(els.zoneHand, "hand");
  setupDropZone(els.zoneField, "field");
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
