/**
 * Card World — minimal UI: Field, Hand, Cards only.
 */

export const APP_VERSION = "0.2.0";

const MAX_STEPS = 200;
const LOG_INSTANCE_ID = "inst_log_1";

/** @type {Map<string, object>} */
const defBySlug = new Map();
/** @type {Record<string, object>} */
let programs = {};
/** @type {Record<string, object>} */
let scenes = {};

const state = {
  hand: [],
  field: [],
  bootstrapDone: false,
};

const logLines = [];
let instanceCounter = 0;
let drag = null;
let inScene = false;

const els = {
  hand: document.getElementById("hand-cards"),
  field: document.getElementById("field-cards"),
  sceneZone: document.getElementById("zone-scene"),
  sceneField: document.getElementById("scene-field-cards"),
};

function getDef(slug) {
  return defBySlug.get(slug);
}

function resolveInstance(inst) {
  const def = getDef(inst.definitionSlug);
  if (!def) {
    return {
      ...inst,
      title: "?",
      text: "Missing definition",
      image: null,
      tags: [],
      programs: {},
    };
  }
  return {
    ...inst,
    title: inst.title ?? def.title,
    text: inst.text ?? def.text,
    image: inst.image ?? def.image,
    tags: def.tags ?? [],
    programs: def.programs ?? {},
    container: def.container,
    innerSceneId: def.innerSceneId,
  };
}

function findInstance(id) {
  const zones = inScene ? ["scene"] : ["hand", "field"];
  for (const z of zones) {
    const list = z === "scene" ? getSceneInstances() : state[z];
    const found = list.find((i) => i.instanceId === id);
    if (found) return { instance: found, zone: z };
  }
  return null;
}

function getSceneInstances() {
  return Array.from(els.sceneField.querySelectorAll(".card")).map((el) => ({
    instanceId: el.dataset.instanceId,
    definitionSlug: el.dataset.definitionSlug,
    title: el.querySelector(".card-title")?.textContent,
    text: el.querySelector(".card-text")?.textContent,
  }));
}

function nextInstanceId() {
  instanceCounter += 1;
  return `inst_${instanceCounter}_${Date.now().toString(36)}`;
}

function appendLog(msg) {
  logLines.push(msg);
  if (logLines.length > 12) logLines.shift();
  const loc = findInstance(LOG_INSTANCE_ID);
  if (loc) {
    loc.instance.text = logLines.join("\n");
    renderAll();
  }
}

function createInstance(definitionSlug, zone) {
  const inst = { instanceId: nextInstanceId(), definitionSlug, zone };
  if (zone === "scene") return inst;
  state[zone].push(inst);
  return inst;
}

function drawPixel(canvas, payload) {
  if (!payload || payload.type !== "pixel/v1") return;
  const ctx = canvas.getContext("2d");
  const w = payload.w || 8;
  const h = payload.h || 8;
  canvas.width = w;
  canvas.height = h;
  const pal = payload.palette || ["#000", "#fff"];
  const px = payload.pixels || [];
  ctx.imageSmoothingEnabled = false;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = px[y * w + x] ?? px[(y * w + x) % Math.max(px.length, 1)] ?? 0;
      ctx.fillStyle = pal[i] ?? pal[0];
      ctx.fillRect(x, y, 1, 1);
    }
  }
  const parent = canvas.parentElement;
  const cw = parent?.clientWidth || 242;
  const ch = parent?.clientHeight || 168;
  const scale = Math.min(cw / w, ch / h, 8);
  canvas.style.width = `${w * scale}px`;
  canvas.style.height = `${h * scale}px`;
}

function tagClass(tags) {
  if (tags.includes("programming")) return "tag-programming";
  if (tags.includes("log")) return "tag-log";
  if (tags.includes("guide")) return "tag-guide";
  if (tags.includes("controller")) return "tag-controller";
  if (tags.includes("content")) return "tag-content";
  if (tags.includes("version") || tags.includes("utility")) return "tag-meta";
  return "";
}

function buildCardEl(inst, zone) {
  const r = resolveInstance(inst);
  const el = document.createElement("article");
  el.className = `card ${tagClass(r.tags)}`;
  el.dataset.instanceId = inst.instanceId;
  el.dataset.definitionSlug = inst.definitionSlug;
  el.draggable = !inScene || zone === "scene";

  if (
    !state.bootstrapDone &&
    r.definitionSlug === "founders.world_controller" &&
    !inScene
  ) {
    el.classList.add("hint");
  }

  const title = document.createElement("div");
  title.className = "card-title";
  title.textContent = r.title;

  const imageWrap = document.createElement("div");
  imageWrap.className = "card-image";
  const canvas = document.createElement("canvas");
  imageWrap.appendChild(canvas);
  drawPixel(canvas, r.image);

  const text = document.createElement("div");
  text.className = "card-text";
  text.textContent = r.text;

  el.append(title, imageWrap, text);

  el.addEventListener("click", () => {
    if (drag?.moved) return;
    playCard(inst.instanceId);
  });

  el.addEventListener("dragstart", (e) => {
    drag = { id: inst.instanceId, from: zone, moved: false };
    e.dataTransfer.setData("text/plain", inst.instanceId);
    e.dataTransfer.effectAllowed = "move";
  });

  el.addEventListener("dragend", () => {
    setTimeout(() => {
      drag = null;
    }, 0);
  });

  return el;
}

function renderZone(zoneName, container, instances) {
  container.innerHTML = "";
  for (const inst of instances) {
    container.appendChild(buildCardEl(inst, zoneName));
  }
}

function renderAll() {
  if (inScene) {
    return;
  }
  renderZone("field", els.field, state.field);
  renderZone("hand", els.hand, state.hand);
}

function moveInstance(id, toZone) {
  if (inScene) return;
  const loc = findInstance(id);
  if (!loc || loc.zone === toZone) return;
  state[loc.zone] = state[loc.zone].filter((i) => i.instanceId !== id);
  loc.instance.zone = toZone;
  state[toZone].push(loc.instance);
  renderAll();
  appendLog(`Moved ${resolveInstance(loc.instance).title} → ${toZone}`);
}

function setupDropZone(container, zoneName) {
  container.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  });
  container.addEventListener("drop", (e) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    if (id) {
      if (drag) drag.moved = true;
      moveInstance(id, zoneName);
    }
  });
}

function getNode(program, nodeId) {
  return program.nodes.find((n) => n.id === nodeId);
}

function runProgram(programId, ctx) {
  const program = programs[programId];
  if (!program) {
    appendLog(`No program: ${programId}`);
    return;
  }
  let steps = 0;
  const exec = (nodeId) => {
    if (!nodeId || steps++ > MAX_STEPS) return;
    const node = getNode(program, nodeId);
    if (!node) return;

    switch (node.op) {
      case "sequence":
        for (const child of node.children || []) exec(child);
        break;
      case "deal":
        for (const slug of node.params?.cards || []) {
          createInstance(slug, node.params?.toZone || "hand");
          appendLog(`Dealt ${getDef(slug)?.title || slug}`);
        }
        renderAll();
        break;
      case "spawn": {
        const slug = node.params?.definitionSlug;
        const zone = node.params?.zone || "field";
        createInstance(slug, zone);
        appendLog(`Spawned ${getDef(slug)?.title || slug}`);
        renderAll();
        break;
      }
      case "set_slot": {
        const targetId = node.params?.targetInstanceId || ctx?.instanceId;
        const loc = findInstance(targetId);
        if (loc) {
          if (node.params?.slot === "title") loc.instance.title = node.params?.value;
          else loc.instance.text = node.params?.value;
          renderAll();
        }
        break;
      }
      case "scene_push":
        openScene(node.params?.sceneId);
        break;
      case "scene_pop":
        closeScene();
        break;
      default:
        appendLog(`Op pending: ${node.op}`);
    }
  };
  exec(program.entry);
}

function openScene(sceneId) {
  const scene = scenes[sceneId];
  if (!scene) {
    appendLog(`Unknown scene: ${sceneId}`);
    return;
  }
  inScene = true;
  els.sceneZone.classList.remove("hidden");
  els.sceneZone.setAttribute("aria-hidden", "false");
  els.sceneField.innerHTML = "";
  for (const ref of scene.field || []) {
    const inst = {
      instanceId: ref.instanceId || nextInstanceId(),
      definitionSlug: ref.definitionSlug,
    };
    els.sceneField.appendChild(buildCardEl(inst, "scene"));
  }
  appendLog(`Scene: ${scene.title || sceneId}`);
}

function closeScene() {
  inScene = false;
  els.sceneZone.classList.add("hidden");
  els.sceneZone.setAttribute("aria-hidden", "true");
  els.sceneField.innerHTML = "";
  renderAll();
  appendLog("Back to table");
}

async function copyLogToClipboard() {
  const text = logLines.join("\n") || "(empty log)";
  try {
    await navigator.clipboard.writeText(text);
    appendLog("Log copied to clipboard");
  } catch {
    appendLog("Copy failed — select Log card text");
  }
}

function playCard(instanceId) {
  const loc = findInstance(instanceId);
  if (!loc) return;

  const r = resolveInstance(loc.instance);
  appendLog(`Played: ${r.title}`);

  if (r.definitionSlug === "founders.copy_log") {
    copyLogToClipboard();
    if (loc.instance) {
      loc.instance.text = "Copied.\n" + (logLines.slice(-3).join("\n") || "");
      renderAll();
    }
    return;
  }

  if (r.definitionSlug === "seed.starter_deck") {
    appendLog("Play World Controller on the Field");
    return;
  }

  const programId = r.programs?.on_play;
  if (!programId) return;

  runProgram(programId, { instanceId });

  if (programId === "world.bootstrap") {
    state.bootstrapDone = true;
    document.querySelectorAll(".hint").forEach((el) => el.classList.remove("hint"));
    const guide = findInstance("inst_guide_1");
    if (guide) {
      guide.instance.text =
        "1. Door spawned.\n2. Play Door.\n3. Drag cards.\n4. Play Copy Log to export log.";
      renderAll();
    }
  }
}

async function loadBundle() {
  const candidates = [
    new URL("../dist/seed-bundle.json", import.meta.url).href,
    `${location.pathname.replace(/\/[^/]*$/, "/")}dist/seed-bundle.json`,
    "dist/seed-bundle.json",
  ];
  let lastErr;
  for (const url of candidates) {
    try {
      const res = await fetch(url);
      if (res.ok) return res.json();
      lastErr = new Error(`${url} → ${res.status}`);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("seed-bundle not found");
}

function applyStarter(bundle) {
  for (const d of bundle.definitions?.definitions || []) {
    defBySlug.set(d.slug, d);
  }
  programs = bundle.programs || {};
  scenes = bundle.scenes || {};

  const start = bundle.starterWorld || {};
  state.hand = (start.hand || []).map((i) => ({ ...i }));
  state.field = (start.field || []).map((i) => ({ ...i }));

  const ver = state.field.find((i) => i.definitionSlug === "founders.version");
  if (ver) ver.text = `Card World\nversion ${APP_VERSION}`;

  const logInst = state.field.find((i) => i.instanceId === LOG_INSTANCE_ID);
  if (logInst && !logInst.text) logInst.text = "Log ready.";

  for (const inst of [...state.hand, ...state.field]) {
    const n = parseInt(inst.instanceId?.replace(/\D/g, "") || "0", 10);
    if (n > instanceCounter) instanceCounter = n;
  }
}

async function init() {
  if (!els.hand || !els.field) {
    console.error("Zone elements missing");
    return;
  }

  setupDropZone(els.hand, "hand");
  setupDropZone(els.field, "field");

  els.sceneField.addEventListener("click", (e) => {
    const card = e.target.closest(".card");
    if (!card) return;
    playCard(card.dataset.instanceId);
  });

  try {
    const bundle = await loadBundle();
    applyStarter(bundle);
    renderAll();
    appendLog(`Card World v${APP_VERSION} loaded`);
    appendLog("Play World Controller on the Field");
  } catch (err) {
    console.error(err);
    appendLog(`Load failed: ${err.message}`);
    state.field.push({
      instanceId: "inst_err_1",
      definitionSlug: "founders.guide",
      title: "Load Error",
      text: String(err.message),
    });
    renderAll();
  }
}

init();
