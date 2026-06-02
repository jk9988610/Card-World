/**
 * Card World — Phase 0 playable demo
 */

const BUNDLE_URL = "dist/seed-bundle.json";
const MAX_STEPS = 200;

/** @type {Map<string, object>} */
let defBySlug = new Map();
/** @type {Record<string, object>} */
let programs = {};
/** @type {Record<string, object>} */
let scenes = {};

const state = {
  hand: [],
  field: [],
  bootstrapDone: false,
};

let instanceCounter = 0;
let drag = null;
let sceneStack = null;

const els = {
  hand: document.getElementById("hand-cards"),
  field: document.getElementById("field-cards"),
  log: document.getElementById("log"),
  overlay: document.getElementById("scene-overlay"),
  sceneTitle: document.getElementById("scene-title"),
  sceneField: document.getElementById("scene-field-cards"),
  sceneClose: document.getElementById("scene-close"),
};

function log(msg) {
  const li = document.createElement("li");
  li.textContent = msg;
  els.log.prepend(li);
  while (els.log.children.length > 12) {
    els.log.lastChild.remove();
  }
}

function nextInstanceId() {
  instanceCounter += 1;
  return `inst_${instanceCounter}_${Date.now().toString(36)}`;
}

function getDef(slug) {
  return defBySlug.get(slug);
}

function resolveInstance(inst) {
  const def = getDef(inst.definitionSlug);
  if (!def) return { ...inst, title: "?", text: "?", image: null, tags: [] };
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
  for (const z of ["hand", "field"]) {
    const found = state[z].find((i) => i.instanceId === id);
    if (found) return { instance: found, zone: z };
  }
  return null;
}

function createInstance(definitionSlug, zone) {
  const inst = {
    instanceId: nextInstanceId(),
    definitionSlug,
    zone,
  };
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
  const cw = canvas.parentElement.clientWidth;
  const ch = canvas.parentElement.clientHeight;
  ctx.imageSmoothingEnabled = false;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = px[y * w + x] ?? px[(y * w + x) % px.length] ?? 0;
      ctx.fillStyle = pal[i] ?? pal[0];
      ctx.fillRect(x, y, 1, 1);
    }
  }
  const scale = Math.min(cw / w, ch / h);
  canvas.style.width = `${w * scale}px`;
  canvas.style.height = `${h * scale}px`;
}

function tagClass(tags) {
  if (tags.includes("programming")) return "tag-programming";
  if (tags.includes("guide")) return "tag-guide";
  if (tags.includes("controller")) return "tag-controller";
  if (tags.includes("computer")) return "tag-computer";
  if (tags.includes("content")) return "tag-content";
  return "";
}

function buildCardEl(inst, zone) {
  const r = resolveInstance(inst);
  const el = document.createElement("article");
  el.className = `card ${tagClass(r.tags)}`;
  el.dataset.instanceId = inst.instanceId;
  el.draggable = true;

  if (
    !state.bootstrapDone &&
    r.definitionSlug === "founders.world_controller"
  ) {
    el.classList.add("playable-hint");
  }

  const title = document.createElement("div");
  title.className = "card-title";
  title.textContent = r.title;

  const imageWrap = document.createElement("div");
  imageWrap.className = "card-image";
  const canvas = document.createElement("canvas");
  drawPixel(canvas, r.image);
  imageWrap.appendChild(canvas);

  const text = document.createElement("div");
  text.className = "card-text";
  text.textContent = r.text;

  el.append(title, imageWrap, text);

  el.addEventListener("click", (e) => {
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

function renderZone(zoneName, container) {
  container.innerHTML = "";
  for (const inst of state[zoneName]) {
    container.appendChild(buildCardEl(inst, zoneName));
  }
}

function renderAll() {
  renderZone("hand", els.hand);
  renderZone("field", els.field);
}

function moveInstance(id, toZone) {
  const loc = findInstance(id);
  if (!loc || loc.zone === toZone) return;
  state[loc.zone] = state[loc.zone].filter((i) => i.instanceId !== id);
  loc.instance.zone = toZone;
  state[toZone].push(loc.instance);
  renderAll();
  log(`Moved ${resolveInstance(loc.instance).title} → ${toZone}`);
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
    log(`No program: ${programId}`);
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
      case "deal": {
        const cards = node.params?.cards || [];
        for (const slug of cards) {
          createInstance(slug, node.params?.toZone || "hand");
          log(`Dealt ${getDef(slug)?.title || slug} to Hand`);
        }
        renderAll();
        break;
      }
      case "spawn": {
        const slug = node.params?.definitionSlug;
        const zone = node.params?.zone || "field";
        createInstance(slug, zone);
        log(`Spawned ${getDef(slug)?.title || slug} on Field`);
        renderAll();
        break;
      }
      case "set_slot": {
        const targetId =
          node.params?.targetInstanceId || ctx?.instanceId;
        const loc = findInstance(targetId);
        if (loc) {
          const slot = node.params?.slot || "text";
          if (slot === "text") loc.instance.text = node.params?.value;
          if (slot === "title") loc.instance.title = node.params?.value;
          log(`Set ${resolveInstance(loc.instance).title} text`);
          renderAll();
        }
        break;
      }
      case "scene_push": {
        const sceneId = node.params?.sceneId;
        openScene(sceneId);
        break;
      }
      default:
        log(`Op not implemented: ${node.op}`);
    }
  };

  exec(program.entry);
}

function openScene(sceneId) {
  const scene = scenes[sceneId];
  if (!scene) {
    log(`Unknown scene: ${sceneId}`);
    return;
  }
  sceneStack = sceneId;
  els.sceneTitle.textContent = scene.title || sceneId;
  els.sceneField.innerHTML = "";
  for (const ref of scene.field || []) {
    const inst = {
      instanceId: ref.instanceId || nextInstanceId(),
      definitionSlug: ref.definitionSlug,
    };
    els.sceneField.appendChild(buildCardEl(inst, "scene"));
  }
  els.overlay.classList.remove("hidden");
  els.overlay.setAttribute("aria-hidden", "false");
  log(`Entered ${scene.title || sceneId}`);
}

function closeScene() {
  sceneStack = null;
  els.overlay.classList.add("hidden");
  els.overlay.setAttribute("aria-hidden", "true");
  log("Returned to table");
}

function playCard(instanceId) {
  const loc = findInstance(instanceId);
  if (!loc) return;

  const r = resolveInstance(loc.instance);
  log(`Played: ${r.title}`);

  if (r.definitionSlug === "seed.starter_deck") {
    log("Tip: Play World Controller on the Field first.");
    return;
  }

  const programId = r.programs?.on_play;
  if (!programId) {
    if (r.tags?.includes("programming")) {
      log(`Programming card: ${r.title} — use in Program Desk (coming soon).`);
    }
    return;
  }

  runProgram(programId, { instanceId });

  if (programId === "world.bootstrap") {
    state.bootstrapDone = true;
    document.querySelectorAll(".playable-hint").forEach((el) => {
      el.classList.remove("playable-hint");
    });
  }
}

async function loadBundle() {
  const res = await fetch(BUNDLE_URL);
  if (!res.ok) throw new Error(`Failed to load ${BUNDLE_URL}`);
  const bundle = await res.json();

  for (const d of bundle.definitions?.definitions || []) {
    defBySlug.set(d.slug, d);
  }
  programs = bundle.programs || {};
  scenes = bundle.scenes || {};

  const start = bundle.starterWorld || {};
  state.hand = (start.hand || []).map((i) => ({ ...i }));
  state.field = (start.field || []).map((i) => ({ ...i }));

  for (const inst of [...state.hand, ...state.field]) {
    const n = parseInt(inst.instanceId?.replace(/\D/g, "") || "0", 10);
    if (n > instanceCounter) instanceCounter = n;
  }
}

function init() {
  setupDropZone(els.hand, "hand");
  setupDropZone(els.field, "field");
  els.sceneClose.addEventListener("click", closeScene);

  loadBundle()
    .then(() => {
      renderAll();
      log("Welcome to Card World. Click World Controller on the Field.");
    })
    .catch((err) => {
      log(`Load error: ${err.message}`);
      console.error(err);
    });
}

init();
