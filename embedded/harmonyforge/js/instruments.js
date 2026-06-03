/**
 * Instrument catalog — numbered IDs (INS-001…); engine from InstrumentRegistry.
 */
const Instruments = (() => {
  /** Legacy project instrumentId / old voice names → INS-xxx */
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
    lead: "INS-011",
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

  const CATALOG = InstrumentRegistry.PRESETS.map((p) => ({
    id: p.id,
    name: p.id,
    type: p.type,
    engineId: p.id,
    kind: p.kind,
    toneClass: InstrumentRegistry.toneLabel(p),
    class: `inst-${p.type}`,
    synthesis: p.synthesis,
  }));

  const byId = Object.fromEntries(CATALOG.map((i) => [i.id, i]));

  const DEFAULT_LAYOUT = [
    { trackId: "kick", instrumentId: "INS-001" },
    { trackId: "snare", instrumentId: "INS-002" },
    { trackId: "hihat", instrumentId: "INS-003" },
    { trackId: "openhat", instrumentId: "INS-004" },
    { trackId: "bass", instrumentId: "INS-007" },
    { trackId: "chord", instrumentId: "INS-010" },
    { trackId: "lead", instrumentId: "INS-011" },
  ];

  function resolveId(id) {
    if (!id) return id;
    let cur = id;
    const seen = new Set();
    while (LEGACY_IDS[cur] && !seen.has(cur)) {
      seen.add(cur);
      cur = LEGACY_IDS[cur];
    }
    if (byId[cur]) return cur;
    return cur;
  }

  function get(id) {
    const resolved = resolveId(id);
    return byId[resolved] || null;
  }

  function list(typeFilter) {
    return typeFilter ? CATALOG.filter((i) => i.type === typeFilter) : [...CATALOG];
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
    resolveId,
    get,
    list,
    defaultVolume,
    applyI18nNames,
  };
})();
