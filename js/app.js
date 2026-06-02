import {
  clearSessionDraft,
  loadNamedDrafts,
  loadSessionDraft,
  removeNamedDraft,
  saveNamedDraft,
  saveSessionDraft,
} from "./art-draft.js";
import {
  canRedo,
  canUndo,
  createArtHistory,
  pushArtHistory,
  redoArtHistory,
  resetArtHistory,
  undoArtHistory,
} from "./art-history.js";
import {
  downloadArtShopMeta,
  isArtStorageConfigured,
  listArtShopItems,
  publishToArtShop,
  uploadArtPng,
} from "./art-storage.js";
import { isCloudEnabled } from "./cloud-config.js";
import { MUSIC_EMBED_SLUG_TO_MODE, MUSIC_PROD_URL, musicEmbedUrl } from "./music-config.js";
import { initAppVersionUI } from "./app-version.js";
import { clearAllCardWorldStorage, clearSave, loadSave, writeSave } from "./storage.js";
import { addWork, loadWorks, removeWork, updateWork } from "./works.js";

/**
 * Card World — tap zoom | hybrid drag (touch pointer + mouse native) | backpack flow
 */

const APP_VERSION = "0.12.3";

const SETTINGS_MENU_SLUGS = new Set([
  "founders.language_settings",
  "founders.fullscreen",
  "founders.exit_fullscreen",
  "founders.highlight_on",
  "founders.highlight_off",
  "founders.reset_world",
]);

const LANGUAGE_MENU_SLUGS = new Set(["founders.lang_en", "founders.lang_zh"]);

const DOUBLE_TAP_MS = 450;
const DOUBLE_TAP_MAX_PX = 18;

/** iPad / phones: native DnD is fragile; use pointer ghost. Mouse/desktop: HTML5 drag. */
const USE_POINTER_DRAG_ON_TOUCH = window.matchMedia("(hover: none) and (pointer: coarse)").matches;
const LONG_PRESS_MS = 280;
const LONG_PRESS_CANCEL_PX = 14;
const TAP_ZOOM_MAX_PX = 14;
const TAP_ZOOM_MAX_MS = 450;

const TOOL_SLUGS_ON_FIELD = [
  "founders.settings",
  "seed.starter_deck",
  "art.tool.pixel",
  "music.tool.studio",
];

const REMOVED_CARD_SLUGS = new Set([
  "founders.world_controller",
  "founders.art_console",
  "founders.music_console",
  "art.tool.export",
  "art.tool.gallery",
  "music.tool.works",
  "music.tool.store",
  "music.tool.drafts",
  "music.tool.battle",
]);

const REMOVED_SCENE_IDS = new Set(["scene.art.console", "scene.music.console"]);

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
  ["music", "#51cf66"],
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

const ART_BG = "#1a1a2e";
/** Match card image frame: 7:5 landscape (宽 > 高) */
const IMAGE_FRAME_W = 7;
const IMAGE_FRAME_H = 5;
const ART_GRID_W = 35;
const ART_GRID_H = 25;

const artEditor = {
  open: false,
  w: ART_GRID_W,
  h: ART_GRID_H,
  grid: [],
  brushColor: "#e03131",
  brushSize: 1,
  tool: "brush",
  painting: false,
  strokeDirty: false,
  lastCell: null,
  rectStart: null,
  targetInstanceId: null,
  history: createArtHistory(80),
  galleryTab: "mine",
  shopCache: [],
};
let artDraftSaveTimer = null;
let musicEmbedMode = "studio";
let currentLocale = "en";

const state = {
  hand: [],
  field: [],
  fieldStash: [],
  bootstrapDone: false,
  highlightOn: false,
  hintTarget: null,
  guideQueue: [],
  guideIndex: 0,
  sceneStack: [],
  currentSceneId: null,
};

let instanceCounter = 0;
let drag = null;
let pointerDrag = null;
let dragGhost = null;
let pointerDocListenersOn = false;
let lastCardTap = { instanceId: null, zone: null, at: 0, x: 0, y: 0 };
let starterSnapshot = null;
let autoFullscreenBound = false;

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
  artEditorClose: document.getElementById("art-editor-close"),
  artEditorTitle: document.getElementById("art-editor-title"),
  artEditorHint: document.getElementById("art-editor-hint"),
  artEditorTools: document.getElementById("art-editor-tools"),
  artPixelCanvas: document.getElementById("art-pixel-canvas"),
  artPalette: document.getElementById("art-palette"),
  artColorPicker: document.getElementById("art-color-picker"),
  artBrushPreview: document.getElementById("art-brush-preview"),
  artEditorToolsExtra: document.getElementById("art-editor-tools-extra"),
  artUndoBtn: document.getElementById("art-undo-btn"),
  artRedoBtn: document.getElementById("art-redo-btn"),
  artSaveDraftBtn: document.getElementById("art-save-draft-btn"),
  artUploadBtn: document.getElementById("art-upload-btn"),
  artDraftStatus: document.getElementById("art-draft-status"),
  artExportBtn: document.getElementById("art-export-btn"),
  artApplyBtn: document.getElementById("art-apply-btn"),
  artGalleryBtn: document.getElementById("art-gallery-btn"),
  artWorksTabs: document.getElementById("art-works-tabs"),
  artExportModal: document.getElementById("art-export-modal"),
  artExportTitle: document.getElementById("art-export-title"),
  artExportText: document.getElementById("art-export-text"),
  artExportPreview: document.getElementById("art-export-preview"),
  artExportConfirm: document.getElementById("art-export-confirm"),
  artExportCancel: document.getElementById("art-export-cancel"),
  artWorksGallery: document.getElementById("art-works-gallery"),
  artWorksList: document.getElementById("art-works-list"),
  artWorksClose: document.getElementById("art-works-close"),
  musicConsole: document.getElementById("music-console"),
  musicConsoleFrame: document.getElementById("music-console-frame"),
  musicConsoleTitle: document.getElementById("music-console-title"),
  musicConsoleHint: document.getElementById("music-console-hint"),
  musicConsoleClose: document.getElementById("music-console-close"),
  appChrome: document.getElementById("app-chrome"),
  btnClearStorage: document.getElementById("btn-clear-storage"),
  btnUpdate: document.getElementById("btn-update"),
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
  if (innerN > 0 && isContainerCard(def)) {
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

function fitPixelRect(boxW, boxH, srcW, srcH) {
  const srcAspect = srcW / srcH;
  const boxAspect = boxW / boxH;
  if (Math.abs(srcAspect - boxAspect) < 0.001) {
    return { x: 0, y: 0, w: boxW, h: boxH };
  }
  if (srcAspect > boxAspect) {
    const w = boxW;
    const h = w / srcAspect;
    return { x: 0, y: (boxH - h) / 2, w, h };
  }
  const h = boxH;
  const w = h * srcAspect;
  return { x: (boxW - w) / 2, y: 0, w, h };
}

function drawPixelImage(ctx, img, destW, destH, opts = {}) {
  const { fit = false, background = null } = opts;
  const pw = img.w || 8;
  const ph = img.h || 8;
  const pal = img.palette || ["#1a1a2e", "#f8f9fa"];
  const px = img.pixels || [];
  let x0 = 0;
  let y0 = 0;
  let scale = destW / pw;
  if (fit) {
    if (background) {
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, destW, destH);
    }
    scale = Math.min(destW / pw, destH / ph);
    const drawW = pw * scale;
    const drawH = ph * scale;
    x0 = (destW - drawW) / 2;
    y0 = (destH - drawH) / 2;
  } else {
    scale = Math.min(destW / pw, destH / ph);
  }
  for (let y = 0; y < ph; y++) {
    for (let x = 0; x < pw; x++) {
      const idx = px[y * pw + x] ?? 0;
      ctx.fillStyle = pal[idx] ?? pal[0];
      ctx.fillRect(x0 + x * scale, y0 + y * scale, Math.ceil(scale), Math.ceil(scale));
    }
  }
}

/** Size card-image canvas buffer to exact 7:5 so pixels are not stretched in the frame. */
function cardImageBufferSize(parent) {
  const boxW = Math.max(1, parent.clientWidth);
  const boxH = Math.max(1, parent.clientHeight);
  const frameAspect = IMAGE_FRAME_W / IMAGE_FRAME_H;
  const boxAspect = boxW / boxH;
  if (boxAspect > frameAspect) {
    const h = boxH;
    return { w: Math.max(1, Math.round(h * frameAspect)), h };
  }
  const w = boxW;
  return { w, h: Math.max(1, Math.round(w / frameAspect)) };
}

function drawCardSwatch(canvas, tags, large = false, pixelImage = null) {
  const paint = () => {
    const parent = canvas.parentElement;
    if (!parent) return;
    const { w, h } = cardImageBufferSize(parent);
    if (w < 2 || h < 2) {
      requestAnimationFrame(paint);
      return;
    }
    canvas.width = w;
    canvas.height = h;
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    const ctx = canvas.getContext("2d");
    if (pixelImage?.type === "pixel/v1") {
      drawPixelImage(ctx, pixelImage, w, h, { fit: true, background: "#e9ecef" });
    } else {
      ctx.fillStyle = swatchColor(tags);
      ctx.fillRect(0, 0, w, h);
    }
  };
  paint();
}

function tagClass(tags) {
  if (tags.includes("settings")) return "tag-settings";
  if (tags.includes("language")) return "tag-language";
  if (tags.includes("tutorial") || tags.includes("guide")) return "tag-guide";
  if (tags.includes("controller")) return "tag-controller";
  if (tags.includes("music")) return "tag-music";
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

function isSettingsContainer(def) {
  return def?.slug === "founders.settings";
}

function isContainerCard(def) {
  return isBackpack(def) || isSettingsContainer(def);
}

function isSettingsMenuSlug(slug) {
  return SETTINGS_MENU_SLUGS.has(slug);
}

function isMetaCard(def) {
  if (!def?.tags) return false;
  if (isContainerCard(def)) return false;
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

function isStorableItem(def) {
  if (!def) return false;
  if (isContainerCard(def)) return false;
  if (def.tags?.includes("settings")) return false;
  if (def.tags?.includes("language")) return false;
  if (def.tags?.includes("tutorial")) return false;
  if (def.tags?.includes("guide")) return false;
  return true;
}

function getOpenContainerOnField() {
  if (!state.field.length) return null;
  const head = state.field[0];
  return isContainerCard(getDef(head.definitionSlug)) ? head : null;
}

function isContainerOpen() {
  return !!getOpenContainerOnField();
}

function findContainerInHand() {
  for (const inst of state.hand) {
    if (isContainerCard(getDef(inst.definitionSlug))) return inst;
  }
  return null;
}

function fieldIndexOf(instanceId) {
  return state.field.findIndex((i) => i.instanceId === instanceId);
}

function buildDefaultSettingsMenu() {
  return [
    {
      definitionSlug: "founders.language_settings",
      instanceId: nextInstanceId(),
      inner: [
        { definitionSlug: "founders.lang_en", instanceId: nextInstanceId() },
        { definitionSlug: "founders.lang_zh", instanceId: nextInstanceId() },
      ],
    },
    { definitionSlug: "founders.fullscreen", instanceId: nextInstanceId() },
    { definitionSlug: "founders.exit_fullscreen", instanceId: nextInstanceId() },
    { definitionSlug: "founders.highlight_on", instanceId: nextInstanceId() },
    { definitionSlug: "founders.highlight_off", instanceId: nextInstanceId() },
    { definitionSlug: "founders.reset_world", instanceId: nextInstanceId() },
  ];
}

function ensureSettingsMenuInner() {
  const zones = [...state.hand, ...state.field];
  for (const inst of zones) {
    if (inst.definitionSlug !== "founders.settings") continue;
    const inner = ensureInner(inst);
    if (inner.some((i) => isSettingsMenuSlug(i.definitionSlug))) continue;
    inst.inner = [...inner, ...buildDefaultSettingsMenu()];
  }
}

function openContainerFromHand(instanceId) {
  const loc = findInstance(instanceId);
  if (!loc || loc.zone !== "hand") return false;
  const inst = loc.instance;
  const def = getDef(inst.definitionSlug);
  if (!isContainerCard(def) || isContainerOpen()) return false;

  state.fieldStash.push(...state.field);
  state.field = [];
  state.hand = state.hand.filter((i) => i.instanceId !== instanceId);
  state.field.push(inst);

  const inner = ensureInner(inst);
  let toPour;
  if (isSettingsContainer(def)) {
    toPour = inner.filter((i) => isSettingsMenuSlug(i.definitionSlug));
    inst.inner = inner.filter((i) => !isSettingsMenuSlug(i.definitionSlug));
    if (!toPour.length) {
      state.field = [];
      state.hand.push(inst);
      for (const c of state.fieldStash) state.field.push(c);
      state.fieldStash = [];
      return false;
    }
    if (!state.guideQueue.length) setHintTarget("founders.language_settings");
  } else {
    if (!inner.length) {
      state.hand.push(inst);
      for (const c of state.fieldStash) state.field.push(c);
      state.fieldStash = [];
      return false;
    }
    toPour = [...inner];
    inst.inner = [];
  }
  for (const item of toPour) state.field.push(item);

  renderAll();
  persistSave();
  return true;
}

function closeContainerOnField(containerId) {
  const idx = fieldIndexOf(containerId);
  if (idx !== 0) return;
  const inst = state.field[0];
  const def = getDef(inst.definitionSlug);
  if (!isContainerCard(def)) return;

  const inner = ensureInner(inst);
  const poured = state.field.slice(1);

  if (isSettingsContainer(def)) {
    for (const c of poured) {
      if (isSettingsMenuSlug(c.definitionSlug)) inner.push(c);
      else if (LANGUAGE_MENU_SLUGS.has(c.definitionSlug)) {
        let langMenu = inner.find((i) => i.definitionSlug === "founders.language_settings");
        if (!langMenu) {
          langMenu = {
            definitionSlug: "founders.language_settings",
            instanceId: nextInstanceId(),
            inner: [],
          };
          inner.push(langMenu);
        }
        ensureInner(langMenu).push(c);
      }
    }
    const langHand = state.hand.findIndex((i) => i.definitionSlug === "founders.language_settings");
    if (langHand >= 0) {
      const langInst = state.hand.splice(langHand, 1)[0];
      if (!inner.some((i) => i.instanceId === langInst.instanceId)) inner.push(langInst);
    }
  } else {
    inner.push(...poured);
  }

  state.field = [];
  state.hand.push(inst);
  for (const c of state.fieldStash) state.field.push(c);
  state.fieldStash = [];

  renderAll();
  persistSave();
}

function insertIntoOpenContainer(itemId, insertIndex = -1) {
  const open = getOpenContainerOnField();
  if (!open) return false;
  const itemLoc = findInstance(itemId);
  if (!itemLoc || itemLoc.zone !== "hand") return false;
  const itemDef = getDef(itemLoc.instance.definitionSlug);
  if (!isStorableItem(itemDef)) return false;

  state.hand = state.hand.filter((i) => i.instanceId !== itemId);
  let idx = insertIndex;
  if (idx < 0) idx = state.field.length;
  else idx = Math.max(1, Math.min(idx, state.field.length));
  state.field.splice(idx, 0, itemLoc.instance);
  renderAll();
  persistSave();
  return true;
}

function stashIntoClosedContainer(containerId, itemId) {
  const containerLoc = findInstance(containerId);
  const itemLoc = findInstance(itemId);
  if (!containerLoc || containerLoc.zone !== "hand" || itemLoc?.zone !== "hand") return false;
  if (!isContainerCard(getDef(containerLoc.instance.definitionSlug))) return false;
  if (!isStorableItem(getDef(itemLoc.instance.definitionSlug))) return false;
  if (containerId === itemId) return false;

  state.hand = state.hand.filter((i) => i.instanceId !== itemId);
  ensureInner(containerLoc.instance).push(itemLoc.instance);
  renderAll();
  persistSave();
  return true;
}

function stashIntoContainer(containerId, itemId, insertIndex = -1) {
  const open = getOpenContainerOnField();
  if (open?.instanceId === containerId) return insertIntoOpenContainer(itemId, insertIndex);
  return stashIntoClosedContainer(containerId, itemId);
}

function openLanguageSubmenuOnField(settingsInst, langMenuInst) {
  const settingsInner = ensureInner(settingsInst);
  for (const c of state.field.slice(1)) {
    if (c.instanceId === langMenuInst.instanceId) {
      if (!settingsInner.some((i) => i.instanceId === langMenuInst.instanceId)) {
        settingsInner.push(langMenuInst);
      }
      continue;
    }
    if (isSettingsMenuSlug(c.definitionSlug)) settingsInner.push(c);
  }
  state.field = [settingsInst];
  const langInner = ensureInner(langMenuInst);
  const toPour = langInner.filter((i) => LANGUAGE_MENU_SLUGS.has(i.definitionSlug));
  langMenuInst.inner = langInner.filter((i) => !LANGUAGE_MENU_SLUGS.has(i.definitionSlug));
  for (const item of toPour) state.field.push(item);
  if (!state.guideQueue.length) setHintTarget("founders.lang_zh");
  renderAll();
  persistSave();
}

function takeFromOpenContainer(instanceId) {
  const open = getOpenContainerOnField();
  const idx = fieldIndexOf(instanceId);
  if (!open || idx <= 0) {
    if (idx === 0 && open?.instanceId === instanceId) closeContainerOnField(instanceId);
    else moveInstance(instanceId, "hand");
    return;
  }

  const inst = state.field[idx];
  const openDef = getDef(open.definitionSlug);

  if (isSettingsContainer(openDef)) {
    if (inst.definitionSlug === "founders.language_settings") {
      openLanguageSubmenuOnField(open, inst);
      return;
    }
    state.field.splice(idx, 1);
    state.hand.push(inst);
    const programId = resolveInstance(inst).programs?.on_play;
    if (programId) runPlayEffects(programId, instanceId);
    closeContainerOnField(open.instanceId);
    advanceGuide(inst.definitionSlug);
    return;
  }

  const itemDef = getDef(inst.definitionSlug);
  if (!isStorableItem(itemDef)) return;
  state.field.splice(idx, 1);
  state.hand.push(inst);
  renderAll();
  persistSave();
}

function playContainerFromHand(instanceId) {
  openContainerFromHand(instanceId);
}

function fieldInsertIndexAtPoint(clientX, clientY) {
  const cards = [...els.field.querySelectorAll(".card")];
  if (!cards.length) return -1;
  for (let i = 0; i < cards.length; i++) {
    const rect = cards[i].getBoundingClientRect();
    if (clientY < rect.top || clientY > rect.bottom) continue;
    const mid = rect.left + rect.width / 2;
    const id = cards[i].dataset.instanceId;
    const idx = fieldIndexOf(id);
    if (idx < 0) continue;
    if (clientX < mid) return idx;
    return idx + 1;
  }
  return state.field.length;
}

function containerCardAtPoint(clientX, clientY) {
  const el = document.elementFromPoint(clientX, clientY)?.closest(".card");
  if (!el) return null;
  const id = el.dataset.instanceId;
  const loc = findInstance(id);
  if (!loc) return null;
  const def = getDef(loc.instance.definitionSlug);
  if (!isContainerCard(def)) return null;
  return { instanceId: id, zone: loc.zone };
}

function handleZoneDrop(instanceId, fromZone, toZone, dropPoint = null) {
  clearLastCardTap();
  const loc = findInstance(instanceId);
  if (!loc) return;
  const def = getDef(loc.instance.definitionSlug);

  if (fromZone === "hand" && toZone === "hand") {
    const target = dropPoint ? containerCardAtPoint(dropPoint.x, dropPoint.y) : null;
    if (target && target.instanceId !== instanceId) {
      stashIntoContainer(target.instanceId, instanceId);
    }
    return;
  }

  if (fromZone === "field" && toZone === "hand") {
    if (isContainerOpen()) takeFromOpenContainer(instanceId);
    else moveInstance(instanceId, "hand");
    return;
  }

  if (fromZone === "hand" && toZone === "field") {
    if (isContainerCard(def)) {
      playContainerFromHand(instanceId);
      tryAutoFullscreen();
      return;
    }
    if (isContainerOpen() && isStorableItem(def)) {
      const insertIdx = dropPoint ? fieldInsertIndexAtPoint(dropPoint.x, dropPoint.y) : -1;
      const open = getOpenContainerOnField();
      if (open) insertIntoOpenContainer(instanceId, insertIdx);
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
    if (!state.guideQueue.length) setHintTarget("founders.settings");
  } else if (programId === "language.open") {
    if (!state.guideQueue.length) setHintTarget("founders.lang_zh");
  } else if (programId === "language.set_zh" || programId === "language.set_en") {
    if (!state.guideQueue.length) setHintTarget(null);
  } else if (programId === "guide.start") {
    state.highlightOn = true;
  }
}

function runCardPlay(instanceId, zone) {
  const loc = findInstance(instanceId);
  if (!loc) return;
  const def = getDef(loc.instance.definitionSlug);
  if (!def) return;
  const programId = resolveInstance(loc.instance).programs?.on_play;
  const style = playStyle(def);

  if (programId) runPlayEffects(programId, instanceId);
  if (style === "echo" && zone === "hand") createInstance(loc.instance.definitionSlug, "hand");
  advanceGuide(loc.instance.definitionSlug);
  renderAll();
  persistSave();
}

function playFromHand(instanceId) {
  const loc = findInstance(instanceId);
  if (!loc || loc.zone !== "hand") return;
  const def = getDef(loc.instance.definitionSlug);
  if (isContainerCard(def)) {
    playContainerFromHand(instanceId);
    tryAutoFullscreen();
    return;
  }
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

function recallFieldToHand(instanceId) {
  const loc = findInstance(instanceId);
  if (!loc || loc.zone !== "field") return;
  if (isContainerOpen()) takeFromOpenContainer(instanceId);
  else moveInstance(instanceId, "hand");
}

function clearLastCardTap() {
  lastCardTap = { instanceId: null, zone: null, at: 0, x: 0, y: 0 };
}

/** Hand double-tap: play. Field double-tap: recall to hand (same as drag Field→Hand). */
function playCard(instanceId, zone) {
  if (zone === "hand" && isContainerOpen()) {
    const def = getDef(findInstance(instanceId)?.instance?.definitionSlug);
    const open = getOpenContainerOnField();
    if (open && isStorableItem(def)) {
      insertIntoOpenContainer(instanceId, -1);
      return;
    }
  }
  if (zone === "hand") playFromHand(instanceId);
  else if (zone === "field") recallFieldToHand(instanceId);
}

function tryDoubleTapPlay(inst, zone, clientX, clientY) {
  const now = Date.now();
  const t = lastCardTap;
  const isDouble =
    t.instanceId === inst.instanceId &&
    t.zone === zone &&
    now - t.at < DOUBLE_TAP_MS &&
    Math.hypot(clientX - t.x, clientY - t.y) < DOUBLE_TAP_MAX_PX;
  if (isDouble) {
    lastCardTap = { instanceId: null, zone: null, at: 0, x: 0, y: 0 };
    playCard(inst.instanceId, zone);
    return true;
  }
  lastCardTap = { instanceId: inst.instanceId, zone, at: now, x: clientX, y: clientY };
  return false;
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

/** Drop removed card types from saves (old consoles, review tools, etc.). */
function migrateObsoleteCardsIfNeeded() {
  const drop = (list) => list.filter((i) => !REMOVED_CARD_SLUGS.has(i.definitionSlug));
  state.hand = drop(state.hand);
  state.field = drop(state.field);
  state.fieldStash = drop(state.fieldStash || []);
  for (const frame of state.sceneStack) {
    frame.hand = drop(frame.hand || []);
    frame.field = drop(frame.field || []);
    frame.fieldStash = drop(frame.fieldStash || []);
  }
}

/** Console scenes removed — return to world with new starter hand. */
function migrateExitRemovedScenesIfNeeded() {
  if (!REMOVED_SCENE_IDS.has(state.currentSceneId)) return;
  state.sceneStack = [];
  state.currentSceneId = null;
  closeArtEditor();
  closeMusicEmbed();
  if (starterSnapshot) {
    state.hand = cloneInstList(starterSnapshot.hand);
    state.field = cloneInstList(starterSnapshot.field);
    state.fieldStash = [];
  }
}

/** Ensure starter hand includes cards added in newer versions (e.g. Music Console). */
function patchHandWithMissingStarters(hand) {
  if (!starterSnapshot?.hand?.length) return hand;
  const list = cloneInstList(hand || []);
  const have = new Set(list.map((i) => i.definitionSlug));
  for (const tmpl of starterSnapshot.hand) {
    if (have.has(tmpl.definitionSlug)) continue;
    list.push({
      ...tmpl,
      instanceId: nextInstanceId(),
      inner: tmpl.inner ? cloneInstList(tmpl.inner) : undefined,
    });
    have.add(tmpl.definitionSlug);
  }
  return list;
}

function migrateMissingStarterCardsIfNeeded() {
  if (!starterSnapshot?.hand?.length) return;
  if (!state.currentSceneId) {
    state.hand = patchHandWithMissingStarters(state.hand);
  }
  for (const frame of state.sceneStack) {
    frame.hand = patchHandWithMissingStarters(frame.hand || []);
  }
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
    state.hand = patchHandWithMissingStarters([
      ...cloneInstList(starterSnapshot.hand),
      ...doorInHand,
    ]);
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
    document.body.classList.toggle("scene-music", scene.kind === "music");
    els.sceneBar?.classList.remove("hidden");
    const locTitle = localeScene(scene.titleKey);
    if (els.sceneTitle) {
      els.sceneTitle.textContent = locTitle?.title || scene.title || state.currentSceneId;
    }
  } else {
    document.body.classList.remove("in-scene", "scene-art", "scene-music");
    els.sceneBar?.classList.add("hidden");
    if (els.sceneTitle) els.sceneTitle.textContent = "";
  }
}

function pushScene(sceneId) {
  const scene = scenes[sceneId];
  if (!scene) return;
  closeMusicEmbed();
  const slice = worldSlice();
  slice.hand = patchHandWithMissingStarters(slice.hand);
  state.sceneStack.push({
    sceneId: state.currentSceneId,
    ...slice,
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
  closeMusicEmbed();
  const frame = state.sceneStack.pop();
  state.currentSceneId = frame.sceneId ?? null;
  applyWorldSlice(frame);
  if (!state.currentSceneId) {
    state.hand = patchHandWithMissingStarters(state.hand);
  }
  updateSceneChrome();
  renderAll();
  persistSave();
}

function initArtGrid(fillColor = ART_BG) {
  artEditor.grid = new Array(artEditor.w * artEditor.h).fill(fillColor);
}

function normalizeHex(raw) {
  if (!raw) return ART_BG;
  let s = String(raw).trim().toLowerCase();
  if (!s.startsWith("#")) s = `#${s}`;
  if (/^#[0-9a-f]{3}$/.test(s)) {
    s = `#${s[1]}${s[1]}${s[2]}${s[2]}${s[3]}${s[3]}`;
  }
  return /^#[0-9a-f]{6}$/.test(s) ? s : ART_BG;
}

function setArtBrushColor(hex) {
  artEditor.brushColor = normalizeHex(hex);
  if (els.artColorPicker) els.artColorPicker.value = artEditor.brushColor;
  if (els.artBrushPreview) els.artBrushPreview.style.background = artEditor.brushColor;
  rebuildArtPaletteUI();
}

function updateArtHistoryButtons() {
  if (els.artUndoBtn) els.artUndoBtn.disabled = !canUndo(artEditor.history);
  if (els.artRedoBtn) els.artRedoBtn.disabled = !canRedo(artEditor.history);
}

function commitArtStroke() {
  if (!artEditor.strokeDirty) return;
  pushArtHistory(artEditor.history, artEditor.grid);
  artEditor.strokeDirty = false;
  updateArtHistoryButtons();
  scheduleSessionDraftSave();
}

function scheduleSessionDraftSave() {
  if (artDraftSaveTimer) clearTimeout(artDraftSaveTimer);
  artDraftSaveTimer = setTimeout(() => {
    if (!artEditor.open) return;
    saveSessionDraft({
      w: artEditor.w,
      h: artEditor.h,
      grid: artEditor.grid,
      brushColor: artEditor.brushColor,
      tool: artEditor.tool,
    });
    const t = locales[currentLocale]?.art_editor || locales.en?.art_editor || {};
    if (els.artDraftStatus) els.artDraftStatus.textContent = t.draft_saved || "";
  }, 400);
}

function setArtGrid(grid, { pushHist = false } = {}) {
  artEditor.grid = grid.slice();
  redrawArtPixelCanvas();
  if (pushHist) {
    pushArtHistory(artEditor.history, artEditor.grid);
    updateArtHistoryButtons();
  }
  scheduleSessionDraftSave();
}

function paintBrushAt(cx, cy, color, size) {
  const r = Math.max(0, (size || 1) - 1);
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy > r * r + 0.01) continue;
      const x = cx + dx;
      const y = cy + dy;
      if (x < 0 || y < 0 || x >= artEditor.w || y >= artEditor.h) continue;
      artEditor.grid[y * artEditor.w + x] = color;
    }
  }
}

function paintLine(x0, y0, x1, y1, color, size) {
  let x = x0;
  let y = y0;
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  while (true) {
    paintBrushAt(x, y, color, size);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }
}

function paintRect(x0, y0, x1, y1, color, filled) {
  const minX = Math.max(0, Math.min(x0, x1));
  const maxX = Math.min(artEditor.w - 1, Math.max(x0, x1));
  const minY = Math.max(0, Math.min(y0, y1));
  const maxY = Math.min(artEditor.h - 1, Math.max(y0, y1));
  if (filled) {
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        artEditor.grid[y * artEditor.w + x] = color;
      }
    }
    return;
  }
  for (let x = minX; x <= maxX; x++) {
    artEditor.grid[minY * artEditor.w + x] = color;
    artEditor.grid[maxY * artEditor.w + x] = color;
  }
  for (let y = minY; y <= maxY; y++) {
    artEditor.grid[y * artEditor.w + minX] = color;
    artEditor.grid[y * artEditor.w + maxX] = color;
  }
}

function artUndo() {
  const g = undoArtHistory(artEditor.history);
  if (!g) return;
  artEditor.grid = g;
  redrawArtPixelCanvas();
  updateArtHistoryButtons();
  scheduleSessionDraftSave();
}

function artRedo() {
  const g = redoArtHistory(artEditor.history);
  if (!g) return;
  artEditor.grid = g;
  redrawArtPixelCanvas();
  updateArtHistoryButtons();
  scheduleSessionDraftSave();
}

function artPixelImageFromEditor() {
  const colorToIndex = new Map();
  colorToIndex.set(ART_BG, 0);
  let next = 1;
  const pixels = artEditor.grid.map((hex) => {
    const c = normalizeHex(hex);
    if (!colorToIndex.has(c)) colorToIndex.set(c, next++);
    return colorToIndex.get(c);
  });
  const palette = new Array(colorToIndex.size);
  for (const [hex, i] of colorToIndex) palette[i] = hex;
  return {
    type: "pixel/v1",
    w: artEditor.w,
    h: artEditor.h,
    palette,
    pixels,
  };
}

function cellFromArtEvent(e) {
  const canvas = els.artPixelCanvas;
  if (!canvas) return null;
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor(((e.clientX - rect.left) / rect.width) * artEditor.w);
  const y = Math.floor(((e.clientY - rect.top) / rect.height) * artEditor.h);
  if (x < 0 || y < 0 || x >= artEditor.w || y >= artEditor.h) return null;
  return { x, y };
}

function floodFillArt(startX, startY, fillColor) {
  const i0 = startY * artEditor.w + startX;
  const target = artEditor.grid[i0];
  const fill = normalizeHex(fillColor);
  if (target === fill) return;
  const stack = [[startX, startY]];
  const seen = new Set();
  while (stack.length) {
    const [x, y] = stack.pop();
    const key = `${x},${y}`;
    if (seen.has(key)) continue;
    if (x < 0 || y < 0 || x >= artEditor.w || y >= artEditor.h) continue;
    const i = y * artEditor.w + x;
    if (artEditor.grid[i] !== target) continue;
    seen.add(key);
    artEditor.grid[i] = fill;
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
}

function applyArtToolAt(cellX, cellY, { lineFrom = null } = {}) {
  if (cellX < 0 || cellY < 0 || cellX >= artEditor.w || cellY >= artEditor.h) return;
  const i = cellY * artEditor.w + cellX;
  artEditor.strokeDirty = true;
  switch (artEditor.tool) {
    case "eraser":
      if (lineFrom) paintLine(lineFrom.x, lineFrom.y, cellX, cellY, ART_BG, artEditor.brushSize);
      else paintBrushAt(cellX, cellY, ART_BG, artEditor.brushSize);
      break;
    case "fill":
      floodFillArt(cellX, cellY, artEditor.brushColor);
      commitArtStroke();
      break;
    case "picker": {
      const picked = artEditor.grid[i] || ART_BG;
      setArtBrushColor(picked);
      artEditor.tool = "brush";
      updateArtToolUI();
      artEditor.strokeDirty = false;
      break;
    }
    case "line":
      if (lineFrom) paintLine(lineFrom.x, lineFrom.y, cellX, cellY, artEditor.brushColor, artEditor.brushSize);
      else paintBrushAt(cellX, cellY, artEditor.brushColor, artEditor.brushSize);
      break;
    default:
      if (lineFrom) paintLine(lineFrom.x, lineFrom.y, cellX, cellY, artEditor.brushColor, artEditor.brushSize);
      else paintBrushAt(cellX, cellY, artEditor.brushColor, artEditor.brushSize);
      break;
  }
  redrawArtPixelCanvas();
}

function redrawArtPixelCanvas() {
  const canvas = els.artPixelCanvas;
  if (!canvas) return;
  canvas.width = artEditor.w;
  canvas.height = artEditor.h;
  const ctx = canvas.getContext("2d");
  for (let y = 0; y < artEditor.h; y++) {
    for (let x = 0; x < artEditor.w; x++) {
      ctx.fillStyle = artEditor.grid[y * artEditor.w + x] || ART_BG;
      ctx.fillRect(x, y, 1, 1);
    }
  }
}

function rebuildArtPaletteUI() {
  if (!els.artPalette) return;
  els.artPalette.innerHTML = "";
  ART_PALETTE.forEach((hex) => {
    const btn = document.createElement("button");
    btn.type = "button";
    const active = normalizeHex(hex) === normalizeHex(artEditor.brushColor);
    btn.className = `art-palette-swatch${active ? " active" : ""}`;
    btn.style.background = hex;
    btn.title = hex;
    btn.addEventListener("click", () => setArtBrushColor(hex));
    els.artPalette.appendChild(btn);
  });
}

function updateArtToolUI() {
  if (!els.artEditorTools) return;
  for (const btn of els.artEditorTools.querySelectorAll(".art-tool-btn")) {
    btn.classList.toggle("active", btn.dataset.tool === artEditor.tool);
  }
}

function rebuildArtToolUI() {
  const t = locales[currentLocale]?.art_editor || locales.en?.art_editor || {};
  const labels = t.tools || {};
  const sizeLabels = t.brush_sizes || {};

  if (els.artEditorTools) {
    els.artEditorTools.innerHTML = "";
    for (const tool of ["brush", "eraser", "line", "rect", "fill", "picker"]) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "art-tool-btn";
      btn.dataset.tool = tool;
      btn.textContent = labels[tool] || tool;
      btn.addEventListener("click", () => {
        artEditor.tool = tool;
        updateArtToolUI();
      });
      els.artEditorTools.appendChild(btn);
    }
  }

  if (els.artEditorToolsExtra) {
    els.artEditorToolsExtra.innerHTML = "";
    for (const size of [1, 2, 3]) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "art-tool-btn art-tool-size";
      btn.dataset.size = String(size);
      btn.textContent = sizeLabels[size] || `${size}px`;
      btn.classList.toggle("active", artEditor.brushSize === size);
      btn.addEventListener("click", () => {
        artEditor.brushSize = size;
        rebuildArtToolUI();
      });
      els.artEditorToolsExtra.appendChild(btn);
    }
  }
  updateArtToolUI();
}

function findPixelBoardInstanceId() {
  for (const zone of ["hand", "field"]) {
    const found = state[zone].find((i) => i.definitionSlug === "art.tool.pixel");
    if (found) return found.instanceId;
  }
  return null;
}

function loadArtGridFromImage(img) {
  artEditor.w = ART_GRID_W;
  artEditor.h = ART_GRID_H;
  initArtGrid(ART_BG);
  if (!img || img.type !== "pixel/v1") return;
  const pw = img.w || ART_GRID_W;
  const ph = img.h || ART_GRID_H;
  const pal = img.palette || [ART_BG];
  const px = img.pixels || [];
  for (let y = 0; y < Math.min(ph, artEditor.h); y++) {
    for (let x = 0; x < Math.min(pw, artEditor.w); x++) {
      const idx = px[y * pw + x] ?? 0;
      artEditor.grid[y * artEditor.w + x] = normalizeHex(pal[idx] ?? ART_BG);
    }
  }
}

function applyArtToGame() {
  const img = artPixelImageFromEditor();
  const id = artEditor.targetInstanceId || findPixelBoardInstanceId();
  if (!id) return;
  const loc = findInstance(id);
  if (!loc) return;
  loc.instance.image = img;
  artEditor.targetInstanceId = id;
  renderAll();
  persistSave();
}

function pixelImageToPngBlob(img, scale = 8) {
  const pw = img.w || ART_GRID_W;
  const ph = img.h || ART_GRID_H;
  const pal = img.palette || [ART_BG];
  const px = img.pixels || [];
  const out = document.createElement("canvas");
  out.width = pw * scale;
  out.height = ph * scale;
  const ctx = out.getContext("2d");
  if (!ctx) return Promise.resolve(null);
  for (let y = 0; y < ph; y++) {
    for (let x = 0; x < pw; x++) {
      const idx = px[y * pw + x] ?? 0;
      ctx.fillStyle = pal[idx] ?? pal[0];
      ctx.fillRect(x * scale, y * scale, scale, scale);
    }
  }
  return new Promise((resolve) => {
    out.toBlob((blob) => resolve(blob), "image/png");
  });
}

function drawExportPreview() {
  const canvas = els.artExportPreview;
  if (!canvas) return;
  const img = artPixelImageFromEditor();
  const scale = 6;
  canvas.width = img.w * scale;
  canvas.height = img.h * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  drawPixelImage(ctx, img, canvas.width, canvas.height, { fit: false });
}

function applyExportModalI18n() {
  const t = locales[currentLocale]?.art_export || locales.en?.art_export || {};
  for (const el of document.querySelectorAll("[data-i18n-export]")) {
    const k = el.dataset.i18nExport;
    if (t[k]) el.textContent = t[k];
  }
  if (els.artExportCancel) els.artExportCancel.textContent = t.cancel || "Cancel";
  if (els.artExportConfirm) els.artExportConfirm.textContent = t.confirm || "Export";
}

function applyWorksGalleryI18n() {
  const t = locales[currentLocale]?.art_works || locales.en?.art_works || {};
  const titleEl = document.getElementById("art-works-title");
  const hintEl = document.getElementById("art-works-hint");
  if (titleEl) titleEl.textContent = t.title || "Works";
  if (hintEl) hintEl.textContent = t.hint || "";
}

function openArtExportModal() {
  applyExportModalI18n();
  const t = locales[currentLocale]?.art_export || locales.en?.art_export || {};
  if (els.artExportTitle) els.artExportTitle.value = t.default_title || "";
  if (els.artExportText) els.artExportText.value = t.default_text || "";
  drawExportPreview();
  els.artExportModal?.classList.remove("hidden");
  els.artExportModal?.setAttribute("aria-hidden", "false");
}

function closeArtExportModal() {
  els.artExportModal?.classList.add("hidden");
  els.artExportModal?.setAttribute("aria-hidden", "true");
}

function spawnExportedWorkCard(title, text, image) {
  const inst = createInstance("art.work.blank", "hand");
  inst.title = title;
  inst.text = text;
  inst.image = image;
  return inst;
}

async function confirmArtExport() {
  const t = locales[currentLocale]?.art_export || locales.en?.art_export || {};
  const title = (els.artExportTitle?.value || "").trim() || t.default_title || "Artwork";
  const text = (els.artExportText?.value || "").trim() || t.default_text || "";
  const image = artPixelImageFromEditor();
  const workId = `work_${Date.now().toString(36)}`;
  addWork({
    id: workId,
    title,
    text,
    image,
    createdAt: new Date().toISOString(),
    uploadedAt: null,
    storagePath: null,
    publicUrl: null,
  });
  if (isCloudEnabled()) {
    try {
      const blob = await pixelImageToPngBlob(image, 12);
      const pub = await publishToArtShop({ id: workId, title, text, image, pngBlob: blob });
      updateWork(workId, {
        storagePath: pub.pngPath,
        publicUrl: pub.publicUrl,
        uploadedAt: pub.publishedAt,
      });
    } catch (e) {
      console.warn("shop publish", e);
    }
  }
  clearSessionDraft();
  spawnExportedWorkCard(title, text, image);
  applyArtToGame();
  closeArtExportModal();
  closeArtEditor();
  renderAll();
  persistSave();
}

function loadImageIntoArtEditor(image) {
  loadArtGridFromImage(image);
  resetArtHistory(artEditor.history, artEditor.grid);
  updateArtHistoryButtons();
  scheduleSessionDraftSave();
}

async function uploadCurrentPaintingToShop() {
  const t = locales[currentLocale]?.art_editor || locales.en?.art_editor || {};
  if (!(await isArtStorageConfigured())) {
    alert(t.cloud_off || "云同步未就绪");
    return;
  }
  const title = prompt(t.upload_title_prompt || "作品名", t.upload_default_title || "我的作品");
  if (title === null) return;
  const text = prompt(t.upload_text_prompt || "说明（可空）", "") ?? "";
  if (els.artUploadBtn) {
    els.artUploadBtn.disabled = true;
    els.artUploadBtn.textContent = t.uploading || "上传中…";
  }
  try {
    const image = artPixelImageFromEditor();
    const blob = await pixelImageToPngBlob(image, 12);
    await publishToArtShop({
      id: `shop_${Date.now().toString(36)}`,
      title: title.trim() || t.upload_default_title || "作品",
      text: text.trim(),
      image,
      pngBlob: blob,
    });
    alert(t.upload_ok || "已上传到美术商店");
  } catch (e) {
    alert((t.upload_fail || "上传失败：") + (e.message || e));
  } finally {
    if (els.artUploadBtn) {
      els.artUploadBtn.disabled = false;
      els.artUploadBtn.textContent = t.upload_shop || "上传商店";
    }
  }
}

function saveCurrentPaintingAsDraft() {
  const t = locales[currentLocale]?.art_editor || locales.en?.art_editor || {};
  const name = prompt(t.draft_name_prompt || "草稿名称", t.draft_default_name || "草稿");
  if (name === null) return;
  const id = `draft_${Date.now().toString(36)}`;
  saveNamedDraft({
    id,
    title: name.trim() || t.draft_default_name || "草稿",
    image: artPixelImageFromEditor(),
    savedAt: new Date().toISOString(),
  });
  if (els.artDraftStatus) els.artDraftStatus.textContent = t.draft_named_saved || "草稿已保存";
}

function buildWorkPreviewCanvas(image) {
  const preview = document.createElement("canvas");
  preview.className = "art-work-preview";
  preview.width = 84;
  preview.height = 60;
  const pctx = preview.getContext("2d");
  if (pctx && image) drawPixelImage(pctx, image, 84, 60, { fit: true, background: "#e9ecef" });
  return preview;
}

function renderWorksGallery() {
  if (!els.artWorksList) return;
  const t = locales[currentLocale]?.art_works || locales.en?.art_works || {};
  els.artWorksList.innerHTML = "";

  const tab = artEditor.galleryTab;

  if (tab === "shop") {
    const items = artEditor.shopCache;
    if (!items.length) {
      const empty = document.createElement("p");
      empty.className = "art-works-empty";
      empty.textContent = t.shop_empty || "商店暂无作品";
      els.artWorksList.appendChild(empty);
      return;
    }
    for (const item of items) {
      const row = document.createElement("article");
      row.className = "art-work-row";
      const preview = item.image
        ? buildWorkPreviewCanvas(item.image)
        : (() => {
            const img = document.createElement("img");
            img.className = "art-work-preview-img";
            img.src = item.previewUrl || "";
            img.alt = item.title || "";
            return img;
          })();
      const meta = document.createElement("div");
      meta.className = "art-work-meta";
      meta.innerHTML = `<h3>${item.title || "?"}</h3><p>${item.text || ""}</p>`;
      const actions = document.createElement("div");
      actions.className = "art-work-actions";
      const dlBtn = document.createElement("button");
      dlBtn.type = "button";
      dlBtn.className = "art-editor-btn art-editor-btn-small";
      dlBtn.textContent = t.download || "下载";
      dlBtn.addEventListener("click", async () => {
        try {
          const metaFull = await downloadArtShopMeta(item.id);
          addWork({
            id: `local_${item.id}`,
            title: metaFull.title,
            text: metaFull.text,
            image: metaFull.image,
            createdAt: new Date().toISOString(),
            fromShop: true,
          });
          alert(t.downloaded || "已下载到本地作品");
        } catch (e) {
          alert((t.download_error || "下载失败：") + (e.message || e));
        }
      });
      const editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.className = "art-editor-btn art-editor-btn-small";
      editBtn.textContent = t.edit || "编辑";
      editBtn.addEventListener("click", async () => {
        try {
          const metaFull = await downloadArtShopMeta(item.id);
          closeWorksGallery();
          if (!artEditor.open) await openArtEditor();
          loadImageIntoArtEditor(metaFull.image);
        } catch (e) {
          alert((t.download_error || "加载失败：") + (e.message || e));
        }
      });
      actions.append(dlBtn, editBtn);
      row.append(preview, meta, actions);
      els.artWorksList.appendChild(row);
    }
    return;
  }

  if (tab === "drafts") {
    const drafts = loadNamedDrafts();
    if (!drafts.length) {
      const empty = document.createElement("p");
      empty.className = "art-works-empty";
      empty.textContent = t.drafts_empty || "暂无命名草稿";
      els.artWorksList.appendChild(empty);
      return;
    }
    for (const d of drafts) {
      const row = document.createElement("article");
      row.className = "art-work-row";
      const meta = document.createElement("div");
      meta.className = "art-work-meta";
      meta.innerHTML = `<h3>${d.title}</h3><p class="muted">${new Date(d.savedAt).toLocaleString()}</p>`;
      const actions = document.createElement("div");
      actions.className = "art-work-actions";
      const editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.className = "art-editor-btn art-editor-btn-small";
      editBtn.textContent = t.edit || "编辑";
      editBtn.addEventListener("click", async () => {
        closeWorksGallery();
        if (!artEditor.open) await openArtEditor();
        loadImageIntoArtEditor(d.image);
      });
      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "art-editor-btn art-editor-btn-icon";
      delBtn.textContent = "×";
      delBtn.addEventListener("click", () => {
        removeNamedDraft(d.id);
        renderWorksGallery();
      });
      actions.append(editBtn, delBtn);
      row.append(buildWorkPreviewCanvas(d.image), meta, actions);
      els.artWorksList.appendChild(row);
    }
    return;
  }

  const works = loadWorks();
  if (!works.length) {
    const empty = document.createElement("p");
    empty.className = "art-works-empty";
    empty.textContent = t.empty || "No works yet.";
    els.artWorksList.appendChild(empty);
    return;
  }
  for (const work of works) {
    const row = document.createElement("article");
    row.className = "art-work-row";
    const meta = document.createElement("div");
    meta.className = "art-work-meta";
    meta.innerHTML = `<h3>${work.title}</h3><p>${work.text || ""}</p>`;
    const actions = document.createElement("div");
    actions.className = "art-work-actions";
    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "art-editor-btn art-editor-btn-small";
    editBtn.textContent = t.edit || "编辑";
    editBtn.addEventListener("click", async () => {
      closeWorksGallery();
      if (!artEditor.open) await openArtEditor();
      loadImageIntoArtEditor(work.image);
    });
    const uploadBtn = document.createElement("button");
    uploadBtn.type = "button";
    uploadBtn.className = "art-editor-btn art-editor-btn-small";
    uploadBtn.textContent = work.publicUrl ? t.uploaded || "已上架" : t.upload || "上架";
    uploadBtn.disabled = !!work.publicUrl;
    uploadBtn.addEventListener("click", () => uploadWorkToSupabase(work.id, uploadBtn));
    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "art-editor-btn art-editor-btn-icon";
    delBtn.textContent = "×";
    delBtn.addEventListener("click", () => {
      removeWork(work.id);
      renderWorksGallery();
    });
    actions.append(editBtn, uploadBtn, delBtn);
    row.append(buildWorkPreviewCanvas(work.image), meta, actions);
    els.artWorksList.appendChild(row);
  }
}

async function uploadWorkToSupabase(workId, btn) {
  const t = locales[currentLocale]?.art_works || locales.en?.art_works || {};
  const work = loadWorks().find((w) => w.id === workId);
  if (!work?.image) return;
  if (btn) {
    btn.disabled = true;
    btn.textContent = t.uploading || "Uploading…";
  }
  try {
    const blob = await pixelImageToPngBlob(work.image, 12);
    if (!blob) throw new Error("PNG failed");
    const pub = await publishToArtShop({
      id: workId,
      title: work.title,
      text: work.text,
      image: work.image,
      pngBlob: blob,
    });
    updateWork(workId, {
      storagePath: pub.pngPath,
      publicUrl: pub.publicUrl,
      uploadedAt: pub.publishedAt,
    });
    renderWorksGallery();
  } catch (e) {
    console.error(e);
    alert((t.upload_error || "Upload failed: ") + (e.message || e));
    if (btn) {
      btn.disabled = false;
      btn.textContent = t.upload || "Upload";
    }
  }
}

function renderGalleryTabs() {
  if (!els.artWorksTabs) return;
  const t = locales[currentLocale]?.art_works || locales.en?.art_works || {};
  const tabs = [
    { id: "mine", label: t.tab_mine || "我的作品" },
    { id: "shop", label: t.tab_shop || "美术商店" },
    { id: "drafts", label: t.tab_drafts || "草稿" },
  ];
  els.artWorksTabs.innerHTML = "";
  for (const tab of tabs) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `art-works-tab${artEditor.galleryTab === tab.id ? " active" : ""}`;
    btn.textContent = tab.label;
    btn.addEventListener("click", async () => {
      artEditor.galleryTab = tab.id;
      if (tab.id === "shop") await refreshArtShopCache();
      renderGalleryTabs();
      renderWorksGallery();
    });
    els.artWorksTabs.appendChild(btn);
  }
}

async function refreshArtShopCache() {
  if (!isCloudEnabled()) {
    artEditor.shopCache = [];
    return;
  }
  try {
    artEditor.shopCache = await listArtShopItems();
  } catch (e) {
    console.warn("art shop", e);
    artEditor.shopCache = [];
  }
}

async function openWorksGallery() {
  applyWorksGalleryI18n();
  if (!artEditor.galleryTab) artEditor.galleryTab = "mine";
  renderGalleryTabs();
  if (artEditor.galleryTab === "shop") await refreshArtShopCache();
  renderWorksGallery();
  els.artWorksGallery?.classList.remove("hidden");
  els.artWorksGallery?.setAttribute("aria-hidden", "false");
}

function closeWorksGallery() {
  els.artWorksGallery?.classList.add("hidden");
  els.artWorksGallery?.setAttribute("aria-hidden", "true");
}

function musicEmbedHintForMode(mode) {
  const t = locales[currentLocale]?.music_embed || locales.en?.music_embed || {};
  return t[`hint_${mode}`] || t.hint_default || "";
}

function musicTitleForMode(mode) {
  const t = locales[currentLocale]?.music_embed || locales.en?.music_embed || {};
  return t[`title_${mode}`] || t.title_default || "HarmonyForge";
}

function openMusicEmbed(mode = "studio") {
  musicEmbedMode = mode;
  const url = musicEmbedUrl(mode);
  if (els.musicConsoleTitle) els.musicConsoleTitle.textContent = musicTitleForMode(mode);
  if (els.musicConsoleHint) els.musicConsoleHint.textContent = musicEmbedHintForMode(mode);
  if (els.musicConsoleFrame) els.musicConsoleFrame.src = url;
  document.body.classList.add("music-console-open");
  els.musicConsole?.classList.remove("hidden");
  els.musicConsole?.setAttribute("aria-hidden", "false");
}

function closeMusicEmbed() {
  document.body.classList.remove("music-console-open");
  els.musicConsole?.classList.add("hidden");
  els.musicConsole?.setAttribute("aria-hidden", "true");
  if (els.musicConsoleFrame) els.musicConsoleFrame.src = "about:blank";
}

function openExternalUrl(url) {
  if (!url) return;
  window.open(url, "_blank", "noopener,noreferrer");
}

function setupMusicConsole() {
  els.musicConsoleClose?.addEventListener("click", () => closeMusicEmbed());
}

async function openArtEditor(instanceId) {
  artEditor.open = true;
  artEditor.tool = "brush";
  artEditor.brushSize = 1;
  artEditor.strokeDirty = false;
  artEditor.lastCell = null;
  artEditor.rectStart = null;
  artEditor.targetInstanceId = instanceId || findPixelBoardInstanceId();
  const t = locales[currentLocale]?.art_editor || locales.en?.art_editor || {};
  const loc = artEditor.targetInstanceId ? findInstance(artEditor.targetInstanceId) : null;
  const session = loadSessionDraft();
  let restored = false;
  if (session?.grid?.length === ART_GRID_W * ART_GRID_H && session.w === ART_GRID_W) {
    if (window.confirm(t.restore_session || "恢复未保存的本地草稿？")) {
      artEditor.grid = session.grid.slice();
      restored = true;
    }
  }
  if (!restored) {
    if (loc?.instance?.image) loadArtGridFromImage(loc.instance.image);
    else initArtGrid(ART_BG);
  }
  resetArtHistory(artEditor.history, artEditor.grid);
  updateArtHistoryButtons();
  setArtBrushColor(artEditor.brushColor || "#e03131");
  if (els.artEditorTitle) els.artEditorTitle.textContent = t.title || "Pixel Board";
  if (els.artEditorHint) els.artEditorHint.textContent = t.hint || "";
  if (els.artDraftStatus) els.artDraftStatus.textContent = "";
  const ex = locales[currentLocale]?.art_export || locales.en?.art_export || {};
  const wk = locales[currentLocale]?.art_works || locales.en?.art_works || {};
  if (els.artExportBtn) els.artExportBtn.textContent = ex.open || "Export";
  if (els.artApplyBtn) els.artApplyBtn.textContent = t.apply || "Apply";
  if (els.artGalleryBtn) els.artGalleryBtn.textContent = wk.open || "Works";
  if (els.artSaveDraftBtn) els.artSaveDraftBtn.textContent = t.save_draft || "草稿";
  if (els.artUploadBtn) els.artUploadBtn.textContent = t.upload_shop || "上传商店";
  if (els.artUndoBtn) els.artUndoBtn.title = t.undo || "Undo";
  if (els.artRedoBtn) els.artRedoBtn.title = t.redo || "Redo";
  rebuildArtToolUI();
  document.body.classList.add("art-editor-open");
  els.artEditor?.classList.remove("hidden");
  els.artEditor?.setAttribute("aria-hidden", "false");
  try {
    await document.documentElement.requestFullscreen();
  } catch (_) {}
  tryAutoFullscreen();
  requestAnimationFrame(() => {
    layoutArtCanvasFrame();
  });
}

function layoutArtCanvasFrame() {
  const canvas = els.artPixelCanvas;
  const wrap = canvas?.parentElement;
  if (canvas && wrap) {
    const maxW = wrap.clientWidth;
    const maxH = wrap.clientHeight;
    const aspect = IMAGE_FRAME_W / IMAGE_FRAME_H;
    let cssW = maxW;
    let cssH = cssW / aspect;
    if (cssH > maxH) {
      cssH = maxH;
      cssW = cssH * aspect;
    }
    canvas.style.width = `${Math.floor(cssW)}px`;
    canvas.style.height = `${Math.floor(cssH)}px`;
  }
  redrawArtPixelCanvas();
}

async function closeArtEditor() {
  artEditor.open = false;
  artEditor.painting = false;
  artEditor.targetInstanceId = null;
  document.body.classList.remove("art-editor-open");
  els.artEditor?.classList.add("hidden");
  els.artEditor?.setAttribute("aria-hidden", "true");
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if (document.webkitExitFullscreen) await document.webkitExitFullscreen();
  } catch (_) {}
  await ensureAppFullscreen();
}

function setupArtEditor() {
  const canvas = els.artPixelCanvas;
  if (!canvas) return;

  const strokeAtEvent = (e, { lineFrom = null } = {}) => {
    const cell = cellFromArtEvent(e);
    if (!cell) return;
    applyArtToolAt(cell.x, cell.y, { lineFrom });
    artEditor.lastCell = cell;
  };

  canvas.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    artEditor.painting = true;
    artEditor.strokeDirty = false;
    canvas.setPointerCapture(e.pointerId);
    const cell = cellFromArtEvent(e);
    if (!cell) return;
    if (artEditor.tool === "rect") {
      artEditor.rectStart = cell;
      return;
    }
    artEditor.lastCell = cell;
    applyArtToolAt(cell.x, cell.y);
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!artEditor.painting || !canvas.hasPointerCapture(e.pointerId)) return;
    e.preventDefault();
    const cell = cellFromArtEvent(e);
    if (!cell) return;
    if (artEditor.tool === "rect" || artEditor.tool === "fill" || artEditor.tool === "picker") return;
    const lineFrom =
      artEditor.tool === "line" || artEditor.tool === "brush" || artEditor.tool === "eraser"
        ? artEditor.lastCell
        : null;
    if (lineFrom && (lineFrom.x !== cell.x || lineFrom.y !== cell.y)) {
      strokeAtEvent(e, { lineFrom });
    }
  });
  canvas.addEventListener("pointerup", (e) => {
    const cell = cellFromArtEvent(e);
    if (artEditor.tool === "rect" && artEditor.rectStart && cell) {
      artEditor.strokeDirty = true;
      paintRect(
        artEditor.rectStart.x,
        artEditor.rectStart.y,
        cell.x,
        cell.y,
        artEditor.brushColor,
        e.shiftKey
      );
      redrawArtPixelCanvas();
      commitArtStroke();
      artEditor.rectStart = null;
    } else {
      commitArtStroke();
    }
    artEditor.painting = false;
    artEditor.lastCell = null;
    try {
      canvas.releasePointerCapture(e.pointerId);
    } catch (_) {}
  });
  canvas.addEventListener("pointercancel", () => {
    commitArtStroke();
    artEditor.painting = false;
    artEditor.lastCell = null;
    artEditor.rectStart = null;
  });

  els.artEditorClose?.addEventListener("click", () => closeArtEditor());
  els.artExportBtn?.addEventListener("click", () => openArtExportModal());
  els.artApplyBtn?.addEventListener("click", () => {
    applyArtToGame();
    closeArtEditor();
  });
  els.artGalleryBtn?.addEventListener("click", () => openWorksGallery());
  els.artSaveDraftBtn?.addEventListener("click", () => saveCurrentPaintingAsDraft());
  els.artUploadBtn?.addEventListener("click", () => uploadCurrentPaintingToShop());
  els.artUndoBtn?.addEventListener("click", () => artUndo());
  els.artRedoBtn?.addEventListener("click", () => artRedo());
  els.artExportCancel?.addEventListener("click", () => closeArtExportModal());
  els.artExportConfirm?.addEventListener("click", () => confirmArtExport());
  els.artWorksClose?.addEventListener("click", () => closeWorksGallery());
  els.artExportModal?.addEventListener("click", (e) => {
    if (e.target === els.artExportModal) closeArtExportModal();
  });
  els.artWorksGallery?.addEventListener("click", (e) => {
    if (e.target === els.artWorksGallery) closeWorksGallery();
  });
  els.artColorPicker?.addEventListener("input", (e) => {
    setArtBrushColor(e.target.value);
  });

  document.addEventListener("fullscreenchange", () => {
    syncFullscreenBodyClass();
    if (!isFullscreenActive() && artEditor.open) closeArtEditor();
  });
  document.addEventListener("webkitfullscreenchange", () => {
    syncFullscreenBodyClass();
    if (!isFullscreenActive() && artEditor.open) closeArtEditor();
  });
}

function resetWorld() {
  if (!starterSnapshot) return;
  abortPointerDrag();
  closeZoom();
  closeArtEditor();
  closeMusicEmbed();
  clearSave();
  state.sceneStack = [];
  state.currentSceneId = null;
  updateSceneChrome();
  state.bootstrapDone = false;
  state.highlightOn = false;
  state.hintTarget = null;
  state.guideQueue = [];
  state.guideIndex = 0;
  state.hand = cloneInstList(starterSnapshot.hand);
  state.field = cloneInstList(starterSnapshot.field);
  state.fieldStash = [];
  clearLastCardTap();
  instanceCounter = 0;
  for (const inst of [...state.hand, ...state.field]) bumpCounterFromInst(inst);
  renderAll();
  persistSave();
}

function zoneAtPoint(clientX, clientY) {
  for (const el of document.elementsFromPoint(clientX, clientY)) {
    if (el.classList?.contains("drag-ghost")) continue;
    if (els.zoneHand.contains(el)) return "hand";
    if (els.zoneField.contains(el)) return "field";
  }
  return null;
}

function highlightDropZone(zone) {
  const from = pointerDrag?.from;
  els.zoneHand.classList.toggle("zone-drop-target", zone === "hand" && from !== "hand");
  els.zoneField.classList.toggle("zone-drop-target", zone === "field" && from !== "field");
}

function clearDropHighlight() {
  els.zoneHand.classList.remove("zone-drop-target");
  els.zoneField.classList.remove("zone-drop-target");
}

function beginPointerDrag(clientX, clientY) {
  if (!pointerDrag) return;
  pointerDrag.active = true;
  drag = { id: pointerDrag.id, from: pointerDrag.from, moved: false };
  const loc = findInstance(pointerDrag.id);
  if (!loc) return;
  pointerDrag.sourceEl.classList.add("card-pickup");
  dragGhost = buildCardEl(loc.instance, pointerDrag.from, { forDragGhost: true });
  dragGhost.classList.add("drag-ghost");
  dragGhost.style.left = `${clientX}px`;
  dragGhost.style.top = `${clientY}px`;
  document.body.appendChild(dragGhost);
  document.body.classList.add("card-dragging");
  try {
    pointerDrag.sourceEl.setPointerCapture(pointerDrag.pointerId);
  } catch (_) {}
}

function movePointerDrag(clientX, clientY) {
  if (!dragGhost) return;
  dragGhost.style.left = `${clientX}px`;
  dragGhost.style.top = `${clientY}px`;
  highlightDropZone(zoneAtPoint(clientX, clientY));
}

function endPointerDragVisual() {
  dragGhost?.remove();
  dragGhost = null;
  pointerDrag?.sourceEl?.classList.remove("card-pickup", "long-press-armed");
  document.body.classList.remove("card-dragging");
  clearDropHighlight();
  setTimeout(() => {
    drag = null;
  }, 50);
}

function abortPointerDrag() {
  if (pointerDrag?.timer) {
    clearTimeout(pointerDrag.timer);
    pointerDrag.timer = null;
  }
  pointerDrag = null;
  endPointerDragVisual();
  document.querySelectorAll(".drag-ghost").forEach((n) => n.remove());
  document.querySelectorAll(".card.card-pickup").forEach((n) => n.classList.remove("card-pickup", "long-press-armed"));
  document.body.classList.remove("card-dragging");
  clearDropHighlight();
  drag = null;
}

function onPointerDragDocMove(e) {
  if (!pointerDrag?.active || e.pointerId !== pointerDrag.pointerId) return;
  e.preventDefault();
  movePointerDrag(e.clientX, e.clientY);
}

function finishPointerDragSession(e) {
  const s = pointerDrag;
  if (!s) return;
  if (s.timer) {
    clearTimeout(s.timer);
    s.timer = null;
  }
  s.sourceEl?.classList.remove("long-press-armed");
  try {
    s.sourceEl?.releasePointerCapture(e.pointerId);
  } catch (_) {}

  if (s.active) {
    clearLastCardTap();
    const toZone = zoneAtPoint(e.clientX, e.clientY);
    const dropPoint = { x: e.clientX, y: e.clientY };
    endPointerDragVisual();
    if (toZone && toZone === s.from && s.from === "hand") {
      drag = { id: s.id, from: s.from, moved: true };
      handleZoneDrop(s.id, s.from, toZone, dropPoint);
      drag = null;
    } else if (toZone && toZone !== s.from) {
      drag = { id: s.id, from: s.from, moved: true };
      handleZoneDrop(s.id, s.from, toZone, dropPoint);
      drag = null;
    }
  } else {
    const dist = Math.hypot(e.clientX - s.startX, e.clientY - s.startY);
    const dt = Date.now() - s.startedAt;
    if (
      !s.movedDuringTap &&
      dist < TAP_ZOOM_MAX_PX &&
      dt < TAP_ZOOM_MAX_MS &&
      s.inst &&
      s.zone
    ) {
      tryDoubleTapPlay(s.inst, s.zone, e.clientX, e.clientY);
    }
    endPointerDragVisual();
  }
  pointerDrag = null;
}

function ensurePointerDragDocListeners() {
  if (pointerDocListenersOn) return;
  pointerDocListenersOn = true;
  document.addEventListener("pointermove", onPointerDragDocMove, { passive: false });
  window.addEventListener("blur", abortPointerDrag);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") abortPointerDrag();
  });
}

function setupCardPlay(el, inst, zone) {
  el.addEventListener("dblclick", (e) => {
    e.stopPropagation();
    playCard(inst.instanceId, zone);
  });
}

function setupNativeDrag(el, inst, zone) {
  el.draggable = true;
  setupCardPlay(el, inst, zone);
  el.addEventListener("dragstart", (e) => {
    drag = { id: inst.instanceId, from: zone, moved: false };
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", inst.instanceId);
  });
  el.addEventListener("dragend", () => {
    setTimeout(() => {
      drag = null;
    }, 50);
  });
}

function setupTouchPointerDrag(el, inst, zone) {
  el.draggable = false;
  setupCardPlay(el, inst, zone);
  el.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse") return;
    abortPointerDrag();
    pointerDrag = {
      id: inst.instanceId,
      from: zone,
      zone,
      inst,
      startX: e.clientX,
      startY: e.clientY,
      active: false,
      movedDuringTap: false,
      pointerId: e.pointerId,
      startedAt: Date.now(),
      sourceEl: el,
      timer: null,
    };
    pointerDrag.timer = setTimeout(() => {
      if (!pointerDrag || pointerDrag.pointerId !== e.pointerId || pointerDrag.active) return;
      pointerDrag.timer = null;
      el.classList.add("long-press-armed");
      beginPointerDrag(pointerDrag.startX, pointerDrag.startY);
    }, LONG_PRESS_MS);
  });

  el.addEventListener("pointermove", (e) => {
    if (e.pointerType === "mouse") return;
    if (!pointerDrag || pointerDrag.pointerId !== e.pointerId) return;
    if (pointerDrag.active) {
      e.preventDefault();
      movePointerDrag(e.clientX, e.clientY);
      return;
    }
    if (!pointerDrag.timer) return;
    const dx = e.clientX - pointerDrag.startX;
    const dy = e.clientY - pointerDrag.startY;
    if (Math.hypot(dx, dy) >= LONG_PRESS_CANCEL_PX) pointerDrag.movedDuringTap = true;
    if (Math.hypot(dx, dy) < LONG_PRESS_CANCEL_PX) return;
    if (zone === "hand" && Math.abs(dx) > Math.abs(dy) * 1.2) {
      abortPointerDrag();
      return;
    }
    clearTimeout(pointerDrag.timer);
    pointerDrag.timer = null;
  });

  el.addEventListener("pointerup", finishPointerDragSession);
  el.addEventListener("pointercancel", finishPointerDragSession);
}

function setupCardDrag(el, inst, zone) {
  if (USE_POINTER_DRAG_ON_TOUCH) {
    ensurePointerDragDocListeners();
    setupTouchPointerDrag(el, inst, zone);
  } else {
    setupNativeDrag(el, inst, zone);
  }
}

function shouldHint() {
  return false;
}

function buildCardEl(inst, zone, opts = {}) {
  const { large = false, forZoom = false, forDragGhost = false } = opts;
  const r = resolveInstance(inst);
  const el = document.createElement("article");
  el.className = `card ${tagClass(r.tags)}`;
  el.dataset.instanceId = inst.instanceId;
  el.dataset.definitionSlug = inst.definitionSlug;

  if (!forZoom && shouldHint(r.definitionSlug, zone)) el.classList.add("hint");

  if (!forZoom && !forDragGhost) {
    setupCardDrag(el, inst, zone);
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
  if (pointerDrag?.active || dragGhost) abortPointerDrag();
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
    const dropPoint = { x: e.clientX, y: e.clientY };
    if (from === zoneName && zoneName === "hand") {
      handleZoneDrop(id, from, zoneName, dropPoint);
      return;
    }
    if (from === zoneName) return;
    handleZoneDrop(id, from, zoneName, dropPoint);
  });
}

function isFullscreenActive() {
  return !!(document.fullscreenElement || document.webkitFullscreenElement);
}

function syncFullscreenBodyClass() {
  const on = isFullscreenActive();
  document.body.classList.toggle("app-fullscreen", on);
  document.body.classList.toggle("app-immersive", !on);
}

async function ensureAppFullscreen() {
  if (isFullscreenActive()) {
    syncFullscreenBodyClass();
    return true;
  }
  const el = document.documentElement;
  try {
    if (el.requestFullscreen) await el.requestFullscreen();
    else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
  } catch (_) {}
  syncFullscreenBodyClass();
  return isFullscreenActive();
}

function tryAutoFullscreen() {
  ensureAppFullscreen();
}

async function enterFullscreen() {
  await ensureAppFullscreen();
}

async function exitFullscreen() {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if (document.webkitExitFullscreen) await document.webkitExitFullscreen();
  } catch (_) {}
  syncFullscreenBodyClass();
}

function setupAutoFullscreenOnLoad() {
  syncFullscreenBodyClass();
  ensureAppFullscreen();

  if (autoFullscreenBound) return;
  autoFullscreenBound = true;

  const retry = () => ensureAppFullscreen();

  window.addEventListener("pageshow", () => {
    ensureAppFullscreen();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && !artEditor.open) {
      ensureAppFullscreen();
    }
  });

  document.addEventListener("fullscreenchange", syncFullscreenBodyClass);
  document.addEventListener("webkitfullscreenchange", syncFullscreenBodyClass);

  document.addEventListener("pointerdown", retry, { once: true, passive: true });
  document.addEventListener("keydown", retry, { once: true });
  document.addEventListener("touchend", retry, { once: true, passive: true });
}

function applyZoneLabels() {
  const ui = locales[currentLocale]?.ui || locales.en?.ui || {};
  for (const el of document.querySelectorAll("[data-i18n]")) {
    const key = el.dataset.i18n;
    if (ui[key]) el.textContent = ui[key];
  }
}

function setupAppChrome() {
  initAppVersionUI();

  if (!els.btnClearStorage) return;

  els.btnClearStorage.addEventListener("click", () => {
    const ui = locales[currentLocale]?.ui || locales.en?.ui || {};
    const msg =
      ui.clear_storage_confirm ||
      "Clear all Card World data in this browser (save, art drafts, works)? The page will reload.";
    if (!confirm(msg)) return;
    abortPointerDrag();
    closeZoom();
    closeArtEditor();
    closeMusicEmbed();
    clearAllCardWorldStorage();
    const url = new URL(location.href);
    url.searchParams.set("v", APP_VERSION);
    url.searchParams.set("_", String(Date.now()));
    location.replace(url.toString());
  });
}

function setLocale(code) {
  if (!locales[code]) return;
  currentLocale = code;
  applyZoneLabels();
  if (artEditor.open) {
    const t = locales[currentLocale]?.art_editor || locales.en?.art_editor || {};
    const ex = locales[currentLocale]?.art_export || locales.en?.art_export || {};
    const wk = locales[currentLocale]?.art_works || locales.en?.art_works || {};
    if (els.artEditorHint) els.artEditorHint.textContent = t.hint || "";
    if (els.artExportBtn) els.artExportBtn.textContent = ex.open || "Export";
    if (els.artApplyBtn) els.artApplyBtn.textContent = t.apply || "Apply";
    if (els.artGalleryBtn) els.artGalleryBtn.textContent = wk.open || "Works";
    if (els.artSaveDraftBtn) els.artSaveDraftBtn.textContent = t.save_draft || "草稿";
    if (els.artUploadBtn) els.artUploadBtn.textContent = t.upload_shop || "上传商店";
    rebuildArtToolUI();
  }
  if (els.artExportModal && !els.artExportModal.classList.contains("hidden")) {
    applyExportModalI18n();
  }
  if (els.artWorksGallery && !els.artWorksGallery.classList.contains("hidden")) {
    applyWorksGalleryI18n();
    renderWorksGallery();
  }
  if (els.musicConsole && !els.musicConsole.classList.contains("hidden")) {
    if (els.musicConsoleTitle) els.musicConsoleTitle.textContent = musicTitleForMode(musicEmbedMode);
    if (els.musicConsoleHint) els.musicConsoleHint.textContent = musicEmbedHintForMode(musicEmbedMode);
  }
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
        openArtEditor(ctx?.instanceId);
        break;
      case "art_gallery_open":
        openWorksGallery();
        break;
      case "music_embed_open": {
        const loc = ctx?.instanceId ? findInstance(ctx.instanceId) : null;
        const slug = loc?.instance?.definitionSlug;
        const mode =
          node.params?.mode ||
          (slug && MUSIC_EMBED_SLUG_TO_MODE[slug]) ||
          "studio";
        openMusicEmbed(mode);
        break;
      }
      case "open_url":
        openExternalUrl(node.params?.url || MUSIC_PROD_URL);
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
  const v = APP_VERSION;
  const urls = [
    new URL(`dist/seed-bundle.json?v=${v}`, base).href,
    `${location.pathname.replace(/\/[^/]*$/, "/")}dist/seed-bundle.json?v=${v}`,
    `dist/seed-bundle.json?v=${v}`,
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
  setupAppChrome();
  setupDropZone(els.zoneHand, "hand");
  setupDropZone(els.zoneField, "field");
  els.zoomBackdrop.addEventListener("click", closeZoom);
  setupArtEditor();
  setupMusicConsole();

  try {
    await loadLocales();
    applyZoneLabels();
    const bundle = await loadBundle();
    applyStarter(bundle);
    captureStarterSnapshot();
    applySaved(loadSave());
    migrateObsoleteCardsIfNeeded();
    migrateExitRemovedScenesIfNeeded();
    migrateMissingStarterCardsIfNeeded();
    migrateWorldLayoutIfNeeded();
    ensureSettingsMenuInner();
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

  setupAutoFullscreenOnLoad();
}

init();
