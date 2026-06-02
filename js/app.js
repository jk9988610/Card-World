import { clearSave, loadSave, writeSave } from "./storage.js";

/**
 * Card World — tap zoom | native drag (mouse) | short long-press drag (touch)
 */

const APP_VERSION = "0.6.5";

const TOOL_SLUGS_ON_FIELD = [
  "founders.settings",
  "founders.world_controller",
  "seed.starter_deck",
  "founders.art_console",
  "founders.guide_weave_1",
];
/** Touch drag: ~half of Safari default long-press (~500ms → ~250ms) */
const TOUCH_DRAG_HOLD_MS = 250;
const TOUCH_MOVE_CANCEL_PX = 14;
const TAP_ZOOM_MAX_PX = 14;
const TAP_ZOOM_MAX_MS = 450;

const USE_TOUCH_DRAG = window.matchMedia("(hover: none) and (pointer: coarse)").matches;

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
  ["art", "#cc5de8"],
  ["tool", "#868e96"],
];

const META_TAGS = new Set([
  "settings",
  "language",
  "tutorial",
  "guide",
  "controller",
  "programming",
  "art",
  "tool",
]);

const defBySlug = new Map();
let programs = {};
let scenes = {};
let locales = { en: {} };

const ART_PALETTE = [
  "#1a1a2e",
  "#f8f9fa",
  "#e03131",
  "#ffd43b",
  "#2f9e44",
  "#339af0",
  "#cc5de8",
  "#ff922b",
];

const artEditor = {
  open: false,
  w: 8,
  h: 8,
  pixels: new Array(64).fill(0),
  colorIndex: 2,
};
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
  sceneStack: [],
  currentSceneId: null,
};

let instanceCounter = 0;
let drag = null;
let touchSession = null;
let dragGhost = null;
let touchDocListenersOn = false;
let starterSnapshot = null;
let fullscreenTried = false;

const els = {
  hand: document.getElementById("hand-cards"),
  field: document.getElementById("field-cards"),
  zoneHand: document.getElementById("zone-hand"),
  zoneField: document.getElementById("zone-field"),
  zoom: document.getElementById("card-zoom"),
  zoomBackdrop: document.getElementById("zoom-backdrop"),
  zoomSlot: document.getElementById("zoom-slot"),
  sceneBar: document.getElementById("scene-bar"),
  sceneTitle: document.getElementById("scene-title"),
  artEditor: document.getElementById("art-editor"),
  artEditorBackdrop: document.getElementById("art-editor-backdrop"),
  artEditorClose: document.getElementById("art-editor-close"),
  artEditorTitle: document.getElementById("art-editor-title"),
  artEditorHint: document.getElementById("art-editor-hint"),
  artPixelCanvas: document.getElementById("art-pixel-canvas"),
  artPalette: document.getElementById("art-palette"),
  artExportBtn: document.getElementById("art-export-btn"),
  appVersion: document.getElementById("app-version"),
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
    sceneStack: state.sceneStack,
    currentSceneId: state.currentSceneId,
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
  if (Array.isArray(save.sceneStack)) state.sceneStack = save.sceneStack;
  if (save.currentSceneId !== undefined) state.currentSceneId = save.currentSceneId;
  for (const inst of [...state.hand, ...state.field, ...state.fieldStash]) bumpCounterFromInst(inst);
  for (const frame of state.sceneStack) {
    for (const inst of [...(frame.hand || []), ...(frame.field || []), ...(frame.fieldStash || [])]) {
      bumpCounterFromInst(inst);
    }
  }
}

function getDef(slug) {
  return defBySlug.get(slug);
}

function localeCard(key) {
  return locales[currentLocale]?.cards?.[key] || locales.en?.cards?.[key];
}

function localeScene(key) {
  const k = (key || "").replace(/^scenes\./, "");
  return locales[currentLocale]?.scenes?.[k] || locales.en?.scenes?.[k];
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
  const image = inst.image ?? def.image;
  return {
    ...inst,
    title,
    text,
    image,
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

function drawPixelImage(ctx, img, destW, destH) {
  const pw = img.w || 8;
  const ph = img.h || 8;
  const pal = img.palette || ["#1a1a2e", "#f8f9fa"];
  const px = img.pixels || [];
  const cellW = destW / pw;
  const cellH = destH / ph;
  for (let y = 0; y < ph; y++) {
    for (let x = 0; x < pw; x++) {
      const idx = px[y * pw + x] ?? 0;
      ctx.fillStyle = pal[idx] ?? pal[0];
      ctx.fillRect(x * cellW, y * cellH, Math.ceil(cellW), Math.ceil(cellH));
    }
  }
}

function drawCardSwatch(canvas, tags, large = false, pixelImage = null) {
  const parent = canvas.parentElement;
  const cw = parent?.clientWidth || (large ? 300 : 80);
  const ch = parent?.clientHeight || (large ? 200 : 50);
  const pad = large ? 10 : 4;
  const w = Math.max(12, Math.floor(cw - pad * 2));
  const h = Math.max(12, Math.floor(ch - pad * 2));
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (pixelImage?.type === "pixel/v1") {
    drawPixelImage(ctx, pixelImage, w, h);
  } else {
    ctx.fillStyle = swatchColor(tags);
    ctx.fillRect(0, 0, w, h);
  }
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
  if (tags.includes("art")) return "tag-art";
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

function cloneInstList(list) {
  return list.map((i) => ({
    ...i,
    inner: i.inner ? i.inner.map((c) => ({ ...c })) : undefined,
  }));
}

function captureStarterSnapshot() {
  starterSnapshot = {
    hand: cloneInstList(state.hand),
    field: cloneInstList(state.field),
  };
}

/** Old saves had tools on field; restore canonical hand/field split. */
function migrateWorldLayoutIfNeeded() {
  if (state.currentSceneId || state.sceneStack.length) return;
  if (!starterSnapshot) return;

  const toolOnField = state.field.some((i) => TOOL_SLUGS_ON_FIELD.includes(i.definitionSlug));
  const tutorialInHand = state.hand.some((i) => i.definitionSlug === "founders.tutorial");
  const guideOnField = state.field.some((i) => i.definitionSlug === "founders.guide_weave_1");

  if (toolOnField || tutorialInHand || guideOnField) {
    const doorInHand = state.hand.filter((i) => i.definitionSlug === "content.door");
    const doorOnField = state.field.filter((i) => i.definitionSlug === "content.door");
    state.hand = [...cloneInstList(starterSnapshot.hand), ...doorInHand];
    state.field = [...cloneInstList(starterSnapshot.field), ...doorOnField];
    state.fieldStash = [];
  }
}

function worldSlice() {
  return {
    hand: cloneInstList(state.hand),
    field: cloneInstList(state.field),
    fieldStash: cloneInstList(state.fieldStash),
  };
}

function applyWorldSlice(slice) {
  state.hand = cloneInstList(slice.hand || []);
  state.field = cloneInstList(slice.field || []);
  state.fieldStash = cloneInstList(slice.fieldStash || []);
}

function updateSceneChrome() {
  const scene = state.currentSceneId ? scenes[state.currentSceneId] : null;
  if (scene) {
    document.body.classList.add("in-scene");
    document.body.classList.toggle("scene-art", scene.kind === "art");
    els.sceneBar?.classList.remove("hidden");
    const locTitle = localeScene(scene.titleKey);
    if (els.sceneTitle) {
      els.sceneTitle.textContent = locTitle?.title || scene.title || state.currentSceneId;
    }
  } else {
    document.body.classList.remove("in-scene", "scene-art");
    els.sceneBar?.classList.add("hidden");
    if (els.sceneTitle) els.sceneTitle.textContent = "";
  }
}

function pushScene(sceneId) {
  const scene = scenes[sceneId];
  if (!scene) return;
  state.sceneStack.push({
    sceneId: state.currentSceneId,
    ...worldSlice(),
  });
  state.currentSceneId = sceneId;
  applyWorldSlice({
    hand: scene.hand || [],
    field: scene.field || [],
    fieldStash: [],
  });
  updateSceneChrome();
  renderAll();
  persistSave();
}

function popScene() {
  if (!state.sceneStack.length) return;
  closeArtEditor();
  const frame = state.sceneStack.pop();
  state.currentSceneId = frame.sceneId ?? null;
  applyWorldSlice(frame);
  updateSceneChrome();
  renderAll();
  persistSave();
}

function artPixelImageFromEditor() {
  return {
    type: "pixel/v1",
    w: artEditor.w,
    h: artEditor.h,
    palette: [...ART_PALETTE],
    pixels: [...artEditor.pixels],
  };
}

function paintArtPixel(cellX, cellY) {
  if (cellX < 0 || cellY < 0 || cellX >= artEditor.w || cellY >= artEditor.h) return;
  artEditor.pixels[cellY * artEditor.w + cellX] = artEditor.colorIndex;
  redrawArtPixelCanvas();
}

function redrawArtPixelCanvas() {
  const canvas = els.artPixelCanvas;
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, artEditor.w, artEditor.h);
  drawPixelImage(ctx, artPixelImageFromEditor(), artEditor.w, artEditor.h);
}

function rebuildArtPaletteUI() {
  if (!els.artPalette) return;
  els.artPalette.innerHTML = "";
  ART_PALETTE.forEach((hex, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `art-palette-swatch${i === artEditor.colorIndex ? " active" : ""}`;
    btn.style.background = hex;
    btn.title = hex;
    btn.addEventListener("click", () => {
      artEditor.colorIndex = i;
      rebuildArtPaletteUI();
    });
    els.artPalette.appendChild(btn);
  });
}

function openArtEditor() {
  artEditor.open = true;
  artEditor.pixels = new Array(64).fill(0);
  artEditor.colorIndex = 2;
  const t = locales[currentLocale]?.art_editor || locales.en?.art_editor || {};
  if (els.artEditorTitle) els.artEditorTitle.textContent = t.title || "Pixel Board";
  if (els.artEditorHint) els.artEditorHint.textContent = t.hint || "";
  if (els.artExportBtn) els.artExportBtn.textContent = t.export || "Export work card";
  rebuildArtPaletteUI();
  redrawArtPixelCanvas();
  els.artEditor?.classList.remove("hidden");
}

function closeArtEditor() {
  artEditor.open = false;
  els.artEditor?.classList.add("hidden");
}

function cycleArtPalette() {
  artEditor.colorIndex = (artEditor.colorIndex + 1) % ART_PALETTE.length;
  rebuildArtPaletteUI();
  if (artEditor.open) redrawArtPixelCanvas();
  renderAll();
}

function exportArtWork() {
  const img = artPixelImageFromEditor();
  const t = localeCard("art_work");
  const inst = {
    instanceId: nextInstanceId(),
    definitionSlug: "art.work.blank",
    title: t?.title || "Artwork",
    text: t?.text || "",
    image: img,
    zone: "field",
  };
  state.field.push(inst);
  closeArtEditor();
  renderAll();
  persistSave();
}

function setupArtEditor() {
  const canvas = els.artPixelCanvas;
  if (!canvas) return;

  const paintAtEvent = (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * artEditor.w;
    const y = ((e.clientY - rect.top) / rect.height) * artEditor.h;
    paintArtPixel(Math.floor(x), Math.floor(y));
  };

  canvas.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    paintAtEvent(e);
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!canvas.hasPointerCapture(e.pointerId)) return;
    e.preventDefault();
    paintAtEvent(e);
  });
  canvas.addEventListener("pointerup", (e) => {
    try {
      canvas.releasePointerCapture(e.pointerId);
    } catch (_) {}
  });

  els.artEditorClose?.addEventListener("click", closeArtEditor);
  els.artEditorBackdrop?.addEventListener("click", closeArtEditor);
  els.artExportBtn?.addEventListener("click", exportArtWork);
}

function resetWorld() {
  if (!starterSnapshot) return;
  abortAllDrags();
  closeZoom();
  closeArtEditor();
  clearSave();
  state.sceneStack = [];
  state.currentSceneId = null;
  updateSceneChrome();
  state.bootstrapDone = false;
  state.highlightOn = true;
  state.hintTarget = "founders.world_controller";
  state.guideQueue = [];
  state.guideIndex = 0;
  state.hand = cloneInstList(starterSnapshot.hand);
  state.field = cloneInstList(starterSnapshot.field);
  state.fieldStash = [];
  instanceCounter = 0;
  for (const inst of [...state.hand, ...state.field]) bumpCounterFromInst(inst);
  renderAll();
  persistSave();
}

function zoneAtPoint(clientX, clientY) {
  for (const el of document.elementsFromPoint(clientX, clientY)) {
    if (el.classList?.contains("drag-ghost")) continue;
    if (el.closest?.(".dragging-source")) continue;
    if (els.zoneHand.contains(el)) return "hand";
    if (els.zoneField.contains(el)) return "field";
  }
  return null;
}

function cleanupDragVisuals(sourceEl) {
  document.querySelectorAll(".drag-ghost").forEach((n) => n.remove());
  dragGhost = null;
  if (sourceEl?.isConnected) {
    sourceEl.classList.remove("dragging-source");
  }
  document.querySelectorAll(".card.dragging-source").forEach((n) => n.classList.remove("dragging-source"));
  document.body.classList.remove("card-dragging");
}

function abortAllDrags() {
  if (touchSession?.timer) {
    clearTimeout(touchSession.timer);
    touchSession.timer = null;
  }
  const sourceEl = touchSession?.el;
  touchSession = null;
  cleanupDragVisuals(sourceEl);
  drag = null;
}

function ensureTouchDocListeners() {
  if (touchDocListenersOn) return;
  touchDocListenersOn = true;
  document.addEventListener("pointermove", onTouchDocPointerMove, { passive: false });
  document.addEventListener("pointerup", onTouchDocPointerEnd);
  document.addEventListener("pointercancel", onTouchDocPointerEnd);
  document.addEventListener("lostpointercapture", onTouchLostPointerCapture);
  window.addEventListener("blur", abortAllDrags);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") abortAllDrags();
  });
}

function onTouchLostPointerCapture(e) {
  if (!touchSession || e.pointerId !== touchSession.pointerId) return;
  if (touchSession.phase === "dragging") {
    const s = touchSession;
    touchSession = null;
    finishTouchDrag(e.clientX, e.clientY, s);
  }
}

function cancelTouchSession() {
  abortAllDrags();
}

function startTouchDrag(clientX, clientY) {
  if (!touchSession || touchSession.phase !== "pending") return;
  const s = touchSession;
  s.phase = "dragging";
  s.el.classList.add("dragging-source");
  try {
    s.el.setPointerCapture(s.pointerId);
  } catch (_) {}
  const loc = findInstance(s.instanceId);
  if (!loc) return;
  drag = { id: s.instanceId, from: s.zone, moved: false };
  dragGhost = buildCardEl(loc.instance, s.zone);
  dragGhost.classList.add("drag-ghost");
  dragGhost.style.left = `${clientX}px`;
  dragGhost.style.top = `${clientY}px`;
  document.body.appendChild(dragGhost);
  document.body.classList.add("card-dragging");
}

function finishTouchDrag(clientX, clientY, session) {
  if (!session || session.phase !== "dragging") return;
  const toZone = zoneAtPoint(clientX, clientY);
  cleanupDragVisuals(session.el);
  drag = null;
  if (toZone && toZone !== session.zone) {
    drag = { id: session.instanceId, from: session.zone, moved: true };
    handleZoneDrop(session.instanceId, session.zone, toZone);
    drag = null;
  }
}

function onTouchDocPointerMove(e) {
  if (!touchSession || e.pointerId !== touchSession.pointerId) return;
  touchSession.lastX = e.clientX;
  touchSession.lastY = e.clientY;

  if (touchSession.phase === "pending") {
    const dx = e.clientX - touchSession.startX;
    const dy = e.clientY - touchSession.startY;
    if (Math.hypot(dx, dy) < TOUCH_MOVE_CANCEL_PX) return;
    if (touchSession.zone === "hand" && Math.abs(dx) > Math.abs(dy) * 1.2) {
      cancelTouchSession();
      return;
    }
    if (touchSession.timer) {
      clearTimeout(touchSession.timer);
      touchSession.timer = null;
    }
    return;
  }

  if (touchSession.phase === "dragging") {
    e.preventDefault();
    if (dragGhost) {
      dragGhost.style.left = `${e.clientX}px`;
      dragGhost.style.top = `${e.clientY}px`;
    }
  }
}

function onTouchDocPointerEnd(e) {
  if (!touchSession || e.pointerId !== touchSession.pointerId) return;
  if (touchSession.timer) {
    clearTimeout(touchSession.timer);
    touchSession.timer = null;
  }

  const s = touchSession;
  const wasDrag = s.phase === "dragging";
  touchSession = null;

  try {
    s.el.releasePointerCapture(e.pointerId);
  } catch (_) {}

  if (wasDrag) {
    finishTouchDrag(e.clientX, e.clientY, s);
    return;
  }

  const dist = Math.hypot(e.clientX - s.startX, e.clientY - s.startY);
  const dt = Date.now() - s.startedAt;
  if (dist < TAP_ZOOM_MAX_PX && dt < TAP_ZOOM_MAX_MS) {
    openZoom(s.inst);
  }
}

function setupTouchDrag(el, inst, zone) {
  el.draggable = false;
  el.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse") return;
    cancelTouchSession();
    touchSession = {
      instanceId: inst.instanceId,
      zone,
      el,
      inst,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
      startedAt: Date.now(),
      phase: "pending",
      timer: null,
    };
    touchSession.timer = setTimeout(() => {
      if (!touchSession || touchSession.phase !== "pending") return;
      startTouchDrag(touchSession.lastX, touchSession.lastY);
    }, TOUCH_DRAG_HOLD_MS);
  });
}

function setupMouseDrag(el, inst, zone) {
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
  el.addEventListener("dragend", () => {
    cleanupDragVisuals(el);
    drag = null;
  });
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
    if (USE_TOUCH_DRAG) {
      ensureTouchDocListeners();
      setupTouchDrag(el, inst, zone);
    } else {
      setupMouseDrag(el, inst, zone);
    }
  }

  const title = document.createElement("div");
  title.className = "card-title";
  title.textContent = r.title;

  const imageWrap = document.createElement("div");
  imageWrap.className = "card-image";
  const canvas = document.createElement("canvas");
  imageWrap.appendChild(canvas);
  drawCardSwatch(canvas, r.tags, large || forZoom, r.image);

  const text = document.createElement("div");
  text.className = "card-text";
  text.textContent = r.text;

  el.append(title, imageWrap, text);
  return el;
}

function renderAll() {
  if (touchSession?.phase === "dragging" || dragGhost) {
    abortAllDrags();
  }
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

function applyZoneLabels() {
  const ui = locales[currentLocale]?.ui || locales.en?.ui || {};
  for (const el of document.querySelectorAll(".zone-label[data-i18n]")) {
    const key = el.dataset.i18n;
    if (ui[key]) el.textContent = ui[key];
  }
}

function setLocale(code) {
  if (!locales[code]) return;
  currentLocale = code;
  applyZoneLabels();
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
      case "reset_world":
        resetWorld();
        break;
      case "scene_push":
        pushScene(node.params?.sceneId);
        break;
      case "scene_pop":
        popScene();
        break;
      case "art_editor_open":
        openArtEditor();
        break;
      case "art_palette_cycle":
        cycleArtPalette();
        break;
      case "art_export_work":
        exportArtWork();
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
  scenes = bundle.scenes || {};
  const start = bundle.starterWorld || {};
  state.sceneStack = [];
  state.currentSceneId = null;
  state.hand = (start.hand || []).map((i) => ({ ...i, inner: i.inner ? [...i.inner] : undefined }));
  state.field = (start.field || []).map((i) => ({ ...i, inner: i.inner ? [...i.inner] : undefined }));
  state.fieldStash = [];
  for (const inst of [...state.hand, ...state.field]) bumpCounterFromInst(inst);
}

async function init() {
  if (els.appVersion) els.appVersion.textContent = `v${APP_VERSION}`;
  if (USE_TOUCH_DRAG) ensureTouchDocListeners();
  else {
    setupDropZone(els.zoneHand, "hand");
    setupDropZone(els.zoneField, "field");
  }
  els.zoomBackdrop.addEventListener("click", closeZoom);
  setupArtEditor();

  try {
    await loadLocales();
    applyZoneLabels();
    const bundle = await loadBundle();
    applyStarter(bundle);
    captureStarterSnapshot();
    applySaved(loadSave());
    migrateWorldLayoutIfNeeded();
    updateSceneChrome();
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
