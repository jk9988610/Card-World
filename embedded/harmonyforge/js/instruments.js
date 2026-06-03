/**
 * Instrument catalog — builtins (INS-xxx), user (USR-xxx), empty carriers (INS-000).
 */
const Instruments = (() => {
  const EMPTY_ID = "INS-000";

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
    eguitar: "INS-009",
    chord: "INS-010",
    lead: "INS-011",
    sax: "INS-012",
    clarinet: "INS-012",
    oboe: "INS-012",
    flute: "INS-012",
    trumpet: "INS-013",
    trombone: "INS-014",
    violin: "INS-015",
    viola: "INS-015",
    cello: "INS-016",
    harp: "INS-016",
    brass: "INS-013",
    strings: "INS-015",
    synth: "INS-011",
    pad: "INS-010",
    organ: "INS-008",
    pipeorgan: "INS-008",
    pluck: "INS-009",
    bells: "INS-008",
    clap: "INS-002",
    wood: "INS-005",
    tri: "INS-005",
    perc: "INS-005",
    woodblock: "INS-005",
  };

  let CATALOG = [];
  let byId = {};

  function presetToCatalogEntry(p) {
    const displayName = p.user && p.name ? p.name : p.id;
    return {
      id: p.id,
      name: displayName,
      type: p.type,
      engineId: p.id,
      kind: p.kind,
      toneClass: InstrumentRegistry.toneLabel(p),
      class: p.kind === "empty" ? "inst-empty" : `inst-${p.type}`,
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
    { trackId: "bass", instrumentId: "INS-007" },
    { trackId: "chord", instrumentId: "INS-010" },
    { trackId: "lead", instrumentId: "INS-011" },
    { trackId: "slot1", instrumentId: EMPTY_ID },
    { trackId: "slot2", instrumentId: EMPTY_ID },
    { trackId: "slot3", instrumentId: EMPTY_ID },
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

  /** Picker list: builtins + user + empty slot label */
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

  function applyI18nNames() {
    if (!window.HF_T) return;
    for (const inst of CATALOG) {
      if (inst.user) continue;
      const key = `instruments.${inst.id}`;
      const name = window.HF_T(key);
      if (name && name !== key) inst.name = name;
    }
    const emptyLabel = window.HF_T("instruments.INS-000");
    const empty = byId[EMPTY_ID];
    if (empty && emptyLabel && emptyLabel !== "instruments.INS-000") {
      empty.name = emptyLabel;
    }
  }

  refreshCatalog();

  return {
    EMPTY_ID,
    CATALOG,
    DEFAULT_LAYOUT,
    LEGACY_IDS,
    resolveId,
    get,
    list,
    listForPicker,
    defaultVolume,
    isEmptyId,
    refreshCatalog,
    applyI18nNames,
  };
})();
