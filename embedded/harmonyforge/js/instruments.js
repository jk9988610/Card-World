/**
 * 音色目录 — 标准制作用语命名，内部 id/voice 保持稳定以兼容旧工程
 */
const Instruments = (() => {
  /** 旧工程 ID → 现音色 ID（仅解析轨，合成以现 ID 为准） */
  /** Saved projects that store INS-xxx in trackLayout.instrumentId */
  const REGISTRY_TO_CATALOG = {
    "INS-000": null,
    "INS-001": "kick",
    "INS-002": "snare",
    "INS-003": "hihat",
    "INS-004": "openhat",
    "INS-005": "tom",
    "INS-006": "cymbal",
    "INS-007": "bass",
    "INS-008": "piano",
    "INS-009": "piano",
  };

  const LEGACY_IDS = {
    ride: "cymbal",
    splash: "cymbal",
    clap: "snare",
    wood: "tom",
    tri: "tom",
    perc: "tom",
    viola: "violin",
    clarinet: "sax",
    oboe: "sax",
    flute: "sax",
    organ: "piano",
    pipeorgan: "piano",
    pluck: "eguitar",
    pad: "piano",
    bells: "piano",
    harp: "cello",
    brass: "trumpet",
    strings: "violin",
    synth: "lead",
    woodblock: "tom",
    chord: "piano",
  };

  /** UI id → sampler registry id (InstrumentRegistry) */
  const ENGINE_ID = {
    kick: "INS-001",
    snare: "INS-002",
    hihat: "INS-003",
    openhat: "INS-004",
    tom: "INS-005",
    cymbal: "INS-006",
    bass: "INS-007",
    piano: "INS-008",
  };

  const CATALOG = [
    { id: "kick", name: "底鼓", type: "drum", voice: "kick", class: "drum-kick", engineId: "INS-001" },
    { id: "snare", name: "军鼓", type: "drum", voice: "snare", class: "drum-snare", engineId: "INS-002" },
    { id: "hihat", name: "闭镲", type: "drum", voice: "hihat", class: "drum-hat", engineId: "INS-003" },
    { id: "openhat", name: "开镲", type: "drum", voice: "openhat", class: "drum-open", engineId: "INS-004" },
    { id: "tom", name: "通鼓", type: "drum", voice: "tom", class: "drum-tom", engineId: "INS-005" },
    { id: "cymbal", name: "碎音镲", type: "drum", voice: "cymbal", class: "drum-cymbal", engineId: "INS-006" },
    { id: "bass", name: "电贝斯", type: "melodic", voice: "bass", class: "bass", engineId: "INS-007" },
    { id: "piano", name: "钢琴", type: "melodic", voice: "piano", class: "melodic-piano", engineId: "INS-008" },
    { id: "eguitar", name: "电吉他", type: "melodic", voice: "eguitar", class: "melodic-eguitar" },
    { id: "lead", name: "合成主音", type: "melodic", voice: "lead", class: "lead" },
    { id: "sax", name: "萨克斯", type: "melodic", voice: "sax", class: "melodic-sax" },
    { id: "trumpet", name: "小号", type: "melodic", voice: "trumpet", class: "melodic-trumpet" },
    { id: "trombone", name: "长号", type: "melodic", voice: "trombone", class: "melodic-trombone" },
    { id: "violin", name: "小提琴", type: "melodic", voice: "violin", class: "melodic-violin" },
    { id: "cello", name: "大提琴", type: "melodic", voice: "cello", class: "melodic-cello" },
  ];

  const byId = Object.fromEntries(CATALOG.map((i) => [i.id, i]));

  const DEFAULT_LAYOUT = [
    { trackId: "kick", instrumentId: "kick" },
    { trackId: "snare", instrumentId: "snare" },
    { trackId: "hihat", instrumentId: "hihat" },
    { trackId: "openhat", instrumentId: "openhat" },
    { trackId: "piano", instrumentId: "piano" },
    { trackId: "bass", instrumentId: "bass" },
    { trackId: "lead", instrumentId: "lead" },
  ];

  function resolveId(id) {
    let cur = id;
    const seen = new Set();
    while (LEGACY_IDS[cur] && !seen.has(cur)) {
      seen.add(cur);
      cur = LEGACY_IDS[cur];
    }
    return cur;
  }

  function get(id) {
    const resolved = resolveId(id);
    const entry = byId[resolved];
    if (!entry) return null;
    if (!entry.engineId && ENGINE_ID[resolved]) {
      return { ...entry, engineId: ENGINE_ID[resolved] };
    }
    return entry;
  }

  function engineIdFor(id) {
    const inst = get(id);
    if (inst?.engineId) return inst.engineId;
    const resolved = resolveId(id);
    if (ENGINE_ID[resolved]) return ENGINE_ID[resolved];
    if (inst?.type === "melodic") return "INS-008";
    if (inst?.type === "drum") return "INS-001";
    return resolved;
  }

  function layoutInstrumentId(rawId, rawTrackId) {
    const id = String(rawId || rawTrackId || "").trim();
    if (Object.prototype.hasOwnProperty.call(REGISTRY_TO_CATALOG, id)) {
      return REGISTRY_TO_CATALOG[id];
    }
    return resolveId(id);
  }

  function isPianoId(id) {
    return resolveId(id) === "piano" || engineIdFor(id) === "INS-008";
  }

  function list(typeFilter) {
    const items = typeFilter ? CATALOG.filter((i) => i.type === typeFilter) : [...CATALOG];
    return items;
  }

  function defaultVolume(type) {
    return type === "drum" ? 0.85 : 0.75;
  }

  function applyI18nNames() {
    if (!window.HF_T) return;
    for (const inst of CATALOG) {
      const key = `instruments.${inst.id}`;
      const name = window.HF_T(key);
      if (name && name !== key) inst.name = name;
    }
  }

  return {
    CATALOG,
    DEFAULT_LAYOUT,
    LEGACY_IDS,
    ENGINE_ID,
    resolveId,
    engineIdFor,
    layoutInstrumentId,
    isPianoId,
    REGISTRY_TO_CATALOG,
    get,
    list,
    defaultVolume,
    applyI18nNames,
  };
})();
