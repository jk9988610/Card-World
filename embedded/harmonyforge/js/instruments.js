/**
 * Instrument catalog — builtins (INS-xxx), user (USR-xxx), empty carriers (INS-000).
 */
const Instruments = (() => {
  const EMPTY_ID = "INS-000";

  /** Step / track label colors (legacy class names, still used in CSS gradients). */
  const VISUAL_CLASS_BY_ID = {
    "INS-000": "inst-empty",
    "INS-001": "drum-kick",
    "INS-002": "drum-snare",
    "INS-003": "drum-hat",
    "INS-004": "drum-open",
    "INS-005": "drum-tom",
    "INS-006": "drum-cymbal",
    "INS-007": "bass",
    "INS-008": "melodic-piano",
    "INS-009": "chord",
  };

  const VOICE_BY_ID = {
    "INS-001": "kick",
    "INS-002": "snare",
    "INS-003": "hihat",
    "INS-004": "openhat",
    "INS-005": "tom",
    "INS-006": "cymbal",
    "INS-007": "bass",
    "INS-008": "piano",
    "INS-009": "chord",
  };

  const LEGACY_IDS = {
    kick: "INS-001",
    snare: "INS-002",
    hihat: "INS-003",
    openhat: "INS-004",
    tom: "INS-005",
    cymbal: "INS-006",
    ride: "INS-006",
    splash: "INS-006",
    bass: "INS-007",
    piano: "INS-008",
    eguitar: "INS-008",
    chord: "INS-009",
    pad: "INS-009",
    lead: "INS-008",
    sax: "INS-008",
    clarinet: "INS-008",
    oboe: "INS-008",
    flute: "INS-008",
    trumpet: "INS-008",
    trombone: "INS-008",
    violin: "INS-008",
    viola: "INS-008",
    cello: "INS-008",
    harp: "INS-008",
    brass: "INS-008",
    strings: "INS-008",
    synth: "INS-008",
    organ: "INS-008",
    pipeorgan: "INS-008",
    pluck: "INS-008",
    bells: "INS-008",
    clap: "INS-002",
    wood: "INS-005",
    tri: "INS-005",
    perc: "INS-005",
    woodblock: "INS-005",
    "INS-008-FM": "INS-008",
    "INS-010": "INS-009",
    "INS-011": "INS-008",
    "INS-012": "INS-008",
    "INS-013": "INS-008",
    "INS-014": "INS-008",
    "INS-015": "INS-008",
    "INS-016": "INS-008",
  };

  let CATALOG = [];
  let byId = {};

  function visualClassFor(p) {
    if (p.user) return "inst-user";
    if (VISUAL_CLASS_BY_ID[p.id]) return VISUAL_CLASS_BY_ID[p.id];
    if (p.kind === "empty") return "inst-empty";
    if (p.type === "drum") return "inst-drum";
    if (p.type === "melodic") return "inst-melodic";
    return "inst-melodic";
  }

  function catalogName(p) {
    if (p.user && p.name) return p.name;
    if (typeof window.HF_T === "function") {
      const key = `instruments.${p.id}`;
      const translated = window.HF_T(key);
      if (translated && translated !== key) return translated;
    }
    return p.id;
  }

  function presetToCatalogEntry(p) {
    return {
      id: p.id,
      name: catalogName(p),
      type: p.type,
      engineId: p.id,
      voice: VOICE_BY_ID[p.id] || p.id,
      kind: p.kind,
      toneClass: InstrumentRegistry.toneLabel(p),
      class: visualClassFor(p),
      synthesis: p.synthesis,
      user: !!p.user,
    };
  }

  function refreshCatalog() {
    const presets = InstrumentRegistry.list(null, { includeHidden: false, includeEmpty: true });
    CATALOG = presets.map(presetToCatalogEntry);
    byId = Object.fromEntries(CATALOG.map((i) => [i.id, i]));
  }

  const DEFAULT_LAYOUT = [
    { trackId: "kick", instrumentId: "INS-001" },
    { trackId: "snare", instrumentId: "INS-002" },
    { trackId: "hihat", instrumentId: "INS-003" },
    { trackId: "openhat", instrumentId: "INS-004" },
    { trackId: "tom", instrumentId: "INS-005" },
    { trackId: "cymbal", instrumentId: "INS-006" },
    { trackId: "bass", instrumentId: "INS-007" },
    { trackId: "chord", instrumentId: "INS-009" },
    { trackId: "piano", instrumentId: "INS-008" },
    { trackId: "slot1", instrumentId: EMPTY_ID },
    { trackId: "slot2", instrumentId: EMPTY_ID },
  ];

  function resolveId(id) {
    if (!id) return id;
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
    return byId[resolved] || null;
  }

  function list(typeFilter) {
    const items = typeFilter ? CATALOG.filter((i) => i.type === typeFilter) : [...CATALOG];
    return items;
  }

  function listForPicker(typeFilter) {
    return list(typeFilter);
  }

  function defaultVolume(type) {
    if (type === "empty") return 0.75;
    return type === "drum" ? 0.85 : 0.75;
  }

  function isEmptyId(id) {
    return resolveId(id) === EMPTY_ID;
  }

  function isPianoId(id) {
    return resolveId(id) === "INS-008";
  }

  function applyI18nNames() {
    for (const inst of CATALOG) {
      const p =
        typeof InstrumentRegistry !== "undefined" ? InstrumentRegistry.get(inst.id) : null;
      if (p) inst.name = catalogName(p);
    }
  }

  refreshCatalog();

  return {
    EMPTY_ID,
    CATALOG,
    DEFAULT_LAYOUT,
    LEGACY_IDS,
    VISUAL_CLASS_BY_ID,
    resolveId,
    get,
    list,
    listForPicker,
    defaultVolume,
    isEmptyId,
    isPianoId,
    refreshCatalog,
    applyI18nNames,
    visualClassFor,
  };
})();
