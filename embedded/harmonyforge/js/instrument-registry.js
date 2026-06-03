/**
 * HarmonyForge instrument registry — numbered IDs, no guessed instrument names.
 * kind: "sampler" | "synth" (current slots are synth; sampler URLs can be added per slot).
 */
const InstrumentRegistry = (() => {
  /** @typedef {'drum'|'melodic'} TrackType */
  /** @typedef {'sampler'|'synth'} EngineKind */
  /**
   * @typedef {object} Preset
   * @property {string} id e.g. INS-001
   * @property {EngineKind} kind
   * @property {TrackType} type
   * @property {string} toneClass Tone.js class name
   * @property {string} [polyClass] for PolySynth inner voice
   * @property {object} [options] constructor options
   * @property {object} [polyOptions] PolySynth wrapper options
   * @property {string} trigger drum_noise | drum_metal | drum_membrane | melodic | chord_triad | piano_fm
   * @property {object} [triggerOpts]
   * @property {string} synthesis How this sound is built (for docs / UI)
   * @property {object} [sampler] { urls, baseUrl } when kind === sampler
   * @property {string} [postChain] e.g. piano_eq
   * @property {object} [duration] { melodic, preview }
   */

  const PRESETS = [

    {
      id: "INS-000",
      kind: "empty",
      type: "melodic",
      toneClass: "Empty",
      trigger: "empty",
      synthesis: "Empty track carrier — assign any instrument from the picker.",
    },

    {
      id: "INS-001",
      kind: "synth",
      type: "drum",
      toneClass: "MembraneSynth",
      options: {
        pitchDecay: 0.05,
        octaves: 10,
        oscillator: { type: "sine" },
        envelope: { attack: 0.001, decay: 0.4, sustain: 0, release: 0.08 },
      },
      trigger: "drum_membrane",
      triggerOpts: { note: "C1", velocityScale: 1 },
      synthesis:
        "Tone.MembraneSynth: sine osc, pitchDecay 0.05, octaves 10; amp env attack 0.001 decay 0.4 sustain 0 release 0.08; trigger note C1.",
    },
    {
      id: "INS-002",
      kind: "synth",
      type: "drum",
      toneClass: "NoiseSynth",
      options: {
        noise: { type: "pink" },
        envelope: { attack: 0.001, decay: 0.22, sustain: 0, release: 0.06 },
      },
      trigger: "drum_noise",
      synthesis:
        "Tone.NoiseSynth: pink noise; amp env attack 0.001 decay 0.22 sustain 0 release 0.06; trigger duration-only (no pitch).",
    },
    {
      id: "INS-003",
      kind: "synth",
      type: "drum",
      toneClass: "MetalSynth",
      options: {
        envelope: { attack: 0.001, decay: 0.035, release: 0.01 },
        harmonicity: 5.1,
        modulationIndex: 32,
        resonance: 7500,
        octaves: 0.6,
      },
      trigger: "drum_metal",
      triggerOpts: { note: "C6", length: "32n", velocityScale: 0.7 },
      synthesis:
        "Tone.MetalSynth: harmonicity 5.1, modulationIndex 32, resonance 7500, octaves 0.6; short decay; trigger C6 as 32n.",
    },
    {
      id: "INS-004",
      kind: "synth",
      type: "drum",
      toneClass: "MetalSynth",
      options: {
        envelope: { attack: 0.001, decay: 0.28, release: 0.12 },
        harmonicity: 4.2,
        modulationIndex: 24,
        resonance: 5200,
        octaves: 1.4,
      },
      trigger: "drum_metal",
      triggerOpts: { note: "C6", length: "8n", velocityScale: 0.65 },
      synthesis:
        "Tone.MetalSynth: harmonicity 4.2, modulationIndex 24, resonance 5200, octaves 1.4; longer decay; trigger C6 as 8n.",
    },
    {
      id: "INS-005",
      kind: "synth",
      type: "drum",
      toneClass: "MembraneSynth",
      options: {
        pitchDecay: 0.04,
        octaves: 5,
        envelope: { attack: 0.001, decay: 0.32, sustain: 0, release: 0.08 },
      },
      trigger: "drum_membrane",
      triggerOpts: { note: "G2", velocityScale: 0.85 },
      synthesis:
        "Tone.MembraneSynth: pitchDecay 0.04, octaves 5; amp env decay 0.32; trigger note G2.",
    },
    {
      id: "INS-006",
      kind: "synth",
      type: "drum",
      toneClass: "MetalSynth",
      options: {
        envelope: { attack: 0.001, decay: 0.65, release: 0.2 },
        harmonicity: 5.5,
        modulationIndex: 36,
        resonance: 9000,
        octaves: 1.8,
      },
      trigger: "drum_metal",
      triggerOpts: { note: "C6", length: "2n", velocityScale: 0.55 },
      synthesis:
        "Tone.MetalSynth: harmonicity 5.5, modulationIndex 36, resonance 9000, octaves 1.8; long decay; trigger C6 as 2n.",
    },
    {
      id: "INS-007",
      kind: "synth",
      type: "melodic",
      toneClass: "MonoSynth",
      options: {
        oscillator: { type: "sawtooth" },
        filter: { Q: 2.5, type: "lowpass", rolloff: -24, frequency: 380 },
        filterEnvelope: {
          attack: 0.01,
          decay: 0.18,
          sustain: 0.25,
          release: 0.2,
          baseFrequency: 90,
          octaves: 3.8,
        },
        envelope: { attack: 0.008, decay: 0.24, sustain: 0.3, release: 0.22 },
      },
      trigger: "melodic",
      duration: { melodicMin: 0.32, preview: 0.42 },
      synthesis:
        "Tone.MonoSynth: sawtooth osc; lowpass filter 380 Hz + filter envelope (base 90 Hz, 3.8 oct); amp env short pluck.",
    },

    {
      id: "INS-008",
      kind: "sampler",
      type: "melodic",
      toneClass: "Sampler",
      trigger: "sampler_melodic",
      sampler: {
        baseUrl: "https://tonejs.github.io/audio/salamander/",
        urls: {
          A0: "A0.mp3",
          C1: "C1.mp3",
          "D#1": "Ds1.mp3",
          "F#1": "Fs1.mp3",
          A1: "A1.mp3",
          C2: "C2.mp3",
          "D#2": "Ds2.mp3",
          "F#2": "Fs2.mp3",
          A2: "A2.mp3",
          C3: "C3.mp3",
          "D#3": "Ds3.mp3",
          "F#3": "Fs3.mp3",
          A3: "A3.mp3",
          C4: "C4.mp3",
          "D#4": "Ds4.mp3",
          "F#4": "Fs4.mp3",
          A4: "A4.mp3",
          C5: "C5.mp3",
          "D#5": "Ds5.mp3",
          "F#5": "Fs5.mp3",
          A5: "A5.mp3",
          C6: "C6.mp3",
          "D#6": "Ds6.mp3",
          "F#6": "Fs6.mp3",
          A6: "A6.mp3",
          C7: "C7.mp3",
          "D#7": "Ds7.mp3",
          "F#7": "Fs7.mp3",
          A7: "A7.mp3",
          C8: "C8.mp3",
        },
      },
      fallbackPresetId: "INS-008-FM",
      duration: { melodicMin: 0.2, preview: 0.5 },
      synthesis:
        "Tone.Sampler: Salamander grand piano multisamples (tonejs.github.io/audio/salamander/). Fallback: INS-008-FM if load fails.",
    },

    {
      id: "INS-008-FM",
      kind: "synth",
      type: "melodic",
      toneClass: "PolySynth",
      polyClass: "FMSynth",
      polyOptions: { maxPolyphony: 8 },
      options: {
        volume: -2,
        harmonicity: 3.8,
        modulationIndex: 5.2,
        oscillator: { type: "triangle" },
        modulation: { type: "sine" },
        envelope: { attack: 0.001, decay: 0.36, sustain: 0, release: 0.55 },
        modulationEnvelope: { attack: 0.001, sustain: 0, release: 0.008, decay: 0.02 },
      },
      trigger: "piano_fm",
      postChain: "piano_eq",
      hidden: true,
      duration: { melodicGate: true, preview: 0.38 },
      synthesis: "Fallback FM piano when INS-008 sampler unavailable.",
    },

    {
      id: "INS-009",
      kind: "synth",
      type: "melodic",
      toneClass: "PluckSynth",
      options: {
        attackNoise: 0.85,
        dampening: 2400,
        resonance: 0.78,
        release: 0.55,
      },
      trigger: "melodic",
      duration: { preview: 0.34 },
      synthesis:
        "Tone.PluckSynth: attackNoise 0.85, dampening 2400, resonance 0.78, release 0.55; karplus-strong style pluck.",
    },
    {
      id: "INS-010",
      kind: "synth",
      type: "melodic",
      toneClass: "PolySynth",
      polyClass: "AMSynth",
      polyOptions: { maxPolyphony: 8 },
      options: {
        harmonicity: 2.2,
        oscillator: { type: "square" },
        envelope: { attack: 0.06, decay: 0.3, sustain: 0.62, release: 1.1 },
      },
      trigger: "chord_triad",
      duration: { chordHold: true },
      synthesis:
        "Tone.PolySynth(Tone.AMSynth): square carrier, harmonicity 2.2; trigger major triad (root, +4, +7 semitones) per step.",
    },
    {
      id: "INS-011",
      kind: "synth",
      type: "melodic",
      toneClass: "MonoSynth",
      options: {
        oscillator: { type: "sawtooth" },
        filter: { type: "lowpass", frequency: 2800, Q: 2, rolloff: -12 },
        filterEnvelope: {
          attack: 0.02,
          decay: 0.15,
          sustain: 0.55,
          release: 0.35,
          baseFrequency: 600,
          octaves: 2.8,
        },
        envelope: { attack: 0.02, decay: 0.18, sustain: 0.7, release: 0.4 },
      },
      trigger: "melodic",
      duration: { melodicMin: 0.58, preview: 0.62 },
      synthesis:
        "Tone.MonoSynth: saw + lowpass 2800 Hz with sweeping filter envelope; longer sustain for lead lines.",
    },
    {
      id: "INS-012",
      kind: "synth",
      type: "melodic",
      toneClass: "MonoSynth",
      options: {
        oscillator: { type: "sawtooth" },
        filter: { type: "bandpass", frequency: 1100, Q: 2.8, rolloff: -12 },
        filterEnvelope: {
          attack: 0.07,
          decay: 0.16,
          sustain: 0.55,
          release: 0.28,
          baseFrequency: 700,
          octaves: 2.6,
        },
        envelope: { attack: 0.09, decay: 0.16, sustain: 0.58, release: 0.32 },
      },
      trigger: "melodic",
      duration: { melodicMin: 0.36, preview: 0.52 },
      synthesis:
        "Tone.MonoSynth: saw through bandpass ~1100 Hz (reed-like bandwidth), slow attack envelope.",
    },
    {
      id: "INS-013",
      kind: "synth",
      type: "melodic",
      toneClass: "FMSynth",
      options: {
        harmonicity: 2.4,
        modulationIndex: 6.5,
        oscillator: { type: "sine" },
        modulation: { type: "square" },
        envelope: { attack: 0.02, decay: 0.14, sustain: 0.52, release: 0.28 },
        modulationEnvelope: {
          attack: 0.01,
          decay: 0.1,
          sustain: 0.25,
          release: 0.12,
        },
      },
      trigger: "melodic",
      duration: { melodicMin: 0.36, preview: 0.44 },
      synthesis:
        "Tone.FMSynth: sine carrier, square modulator, harmonicity 2.4, modulationIndex 6.5; bright brass-like FM.",
    },
    {
      id: "INS-014",
      kind: "synth",
      type: "melodic",
      toneClass: "MonoSynth",
      options: {
        oscillator: { type: "sawtooth" },
        filter: { type: "lowpass", frequency: 1200, Q: 2.2, rolloff: -24 },
        filterEnvelope: {
          attack: 0.08,
          decay: 0.2,
          sustain: 0.65,
          release: 0.38,
          baseFrequency: 280,
          octaves: 2.2,
        },
        envelope: { attack: 0.07, decay: 0.22, sustain: 0.72, release: 0.42 },
      },
      trigger: "melodic",
      duration: { melodicMin: 0.32, preview: 0.48 },
      synthesis:
        "Tone.MonoSynth: saw + lowpass 1200 Hz, slower filter attack for trombone-like swell.",
    },
    {
      id: "INS-015",
      kind: "synth",
      type: "melodic",
      toneClass: "MonoSynth",
      options: {
        portamento: 0.04,
        oscillator: { type: "sawtooth" },
        filter: { type: "lowpass", frequency: 2200, Q: 1.6, rolloff: -12 },
        filterEnvelope: {
          attack: 0.22,
          decay: 0.14,
          sustain: 0.72,
          release: 0.35,
          baseFrequency: 900,
          octaves: 2.4,
        },
        envelope: { attack: 0.2, decay: 0.1, sustain: 0.9, release: 0.48 },
      },
      trigger: "melodic",
      duration: { melodicMin: 0.68, preview: 0.74 },
      synthesis:
        "Tone.MonoSynth: saw, portamento 0.04, slow filter attack (~0.22s) for bowed string envelope.",
    },
    {
      id: "INS-016",
      kind: "synth",
      type: "melodic",
      toneClass: "MonoSynth",
      options: {
        portamento: 0.05,
        oscillator: { type: "fatsawtooth", spread: 18, count: 3 },
        filter: { type: "lowpass", frequency: 750, Q: 1.4, rolloff: -24 },
        filterEnvelope: {
          attack: 0.26,
          decay: 0.18,
          sustain: 0.75,
          release: 0.45,
          baseFrequency: 320,
          octaves: 1.6,
        },
        envelope: { attack: 0.24, decay: 0.14, sustain: 0.92, release: 0.62 },
      },
      trigger: "melodic",
      duration: { melodicMin: 0.72, preview: 0.78 },
      synthesis:
        "Tone.MonoSynth: fatsawtooth (spread 18, count 3), lowpass 750 Hz, slow attack for cello weight.",
    },
  ];

  const userPresets = new Map();

  function rebuildIndex() {
    const map = {};
    PRESETS.forEach((p) => {
      map[p.id] = p;
    });
    userPresets.forEach((p, id) => {
      map[id] = p;
    });
    return map;
  }

  let byId = rebuildIndex();

  function get(id) {
    return byId[id] || null;
  }

  function list(typeFilter, opts = {}) {
    const includeHidden = opts.includeHidden === true;
    const items = [...PRESETS, ...userPresets.values()].filter((p) => {
      if (!includeHidden && p.hidden) return false;
      if (p.kind === "empty" && !opts.includeEmpty) return false;
      return true;
    });
    if (typeFilter) return items.filter((p) => p.type === typeFilter);
    return items;
  }

  function registerUserPreset(preset) {
    if (!preset?.id) return null;
    userPresets.set(preset.id, { ...preset, user: true });
    byId = rebuildIndex();
    return preset;
  }

  function unregisterUserPreset(id) {
    userPresets.delete(id);
    byId = rebuildIndex();
  }

  function isEmptyId(id) {
    return id === "INS-000";
  }

  function toneLabel(preset) {
    if (!preset) return "Synth";
    if (preset.kind === "empty") return "Empty";
    if (preset.kind === "sampler") return "Sampler";
    if (preset.toneClass === "PolySynth" && preset.polyClass) {
      return `PolySynth(${preset.polyClass})`;
    }
    return preset.toneClass || "Synth";
  }

  return {
    PRESETS,
    EMPTY_ID: "INS-000",
    get,
    list,
    registerUserPreset,
    unregisterUserPreset,
    isEmptyId,
    toneLabel,
  };
})();
