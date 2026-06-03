/**
 * Tone Lab — build synth presets, name, save, assign to empty track immediately.
 */
const ToneLab = (() => {
  const BASES = [
    { id: "MonoSynth", label: "MonoSynth" },
    { id: "FMSynth", label: "FMSynth" },
    { id: "AMSynth", label: "AMSynth" },
    { id: "Synth", label: "Synth" },
  ];

  const OSC_TYPES = ["sine", "triangle", "sawtooth", "square", "fatsawtooth"];

  let previewInst = null;
  let previewExtras = [];

  function $(id) {
    return document.getElementById(id);
  }

  function readForm() {
    const base = $("toneLabBase")?.value || "MonoSynth";
    const osc = $("toneLabOsc")?.value || "sawtooth";
    const attack = Number($("toneLabAttack")?.value ?? 0.02);
    const decay = Number($("toneLabDecay")?.value ?? 0.2);
    const sustain = Number($("toneLabSustain")?.value ?? 0.5);
    const release = Number($("toneLabRelease")?.value ?? 0.3);
    const filterFreq = Number($("toneLabFilter")?.value ?? 2000);
    const name = ($("toneLabName")?.value || "").trim();

    const options = {
      oscillator: { type: osc },
      envelope: { attack, decay, sustain, release },
    };

    if (base === "MonoSynth" || base === "Synth") {
      options.filter = { type: "lowpass", frequency: filterFreq, Q: 2 };
      if (base === "MonoSynth") {
        options.filterEnvelope = {
          attack: 0.02,
          decay: 0.15,
          sustain: 0.4,
          release: 0.25,
          baseFrequency: filterFreq * 0.4,
          octaves: 2,
        };
      }
    }
    if (base === "FMSynth") {
      options.harmonicity = 2;
      options.modulationIndex = 5;
      options.modulation = { type: "sine" };
    }
    if (base === "AMSynth") {
      options.harmonicity = 1.5;
    }

    return { base, options, name };
  }

  function buildPresetFromForm() {
    const { base, options, name } = readForm();
    const id = InstrumentStore.nextUserId();
    const label = name || id;
    return {
      id,
      name: label,
      kind: "synth",
      type: "melodic",
      toneClass: base,
      options,
      trigger: "melodic",
      duration: { melodicMin: 0.35, preview: 0.45 },
      synthesis: `User ${base}: osc ${options.oscillator?.type}; env A${options.envelope.attack} D${options.envelope.decay} S${options.envelope.sustain} R${options.envelope.release}.`,
      user: true,
    };
  }

  function disposePreview() {
    if (previewInst) {
      InstrumentEngine.dispose(previewInst, previewExtras);
      previewInst = null;
      previewExtras = [];
    }
  }

  async function preview() {
    disposePreview();
    await AudioEngine.unlockAudio();
    const preset = buildPresetFromForm();
    
    previewInst = InstrumentEngine.createFromPreset(preset);
    const dest = Tone.getDestination();
    previewExtras = InstrumentEngine.connect(previewInst, dest);
    InstrumentEngine.trigger(previewInst, Tone.now() + 0.05, 60, 0.4, 0.75);
  }

  function saveAndUse() {
    const preset = buildPresetFromForm();
    if (!preset.name) {
      alert("请输入音色名称");
      return null;
    }
    InstrumentStore.registerPreset(preset);
    disposePreview();
    const trackId = TrackPool.assignToEmptySlot(preset.id);
    if (typeof window.renderSequencer === "function") {
      window.renderSequencer();
    }
    if (typeof window.renderMixer === "function") {
      window.renderMixer();
    }
    if (typeof window.setStatus === "function") {
      window.setStatus(
        trackId
          ? `已保存「${preset.name}」并载入轨道 ${trackId}`
          : `已保存「${preset.name}」— 请在空轨上选择该音色`
      );
    }
    $("toneLabDialog")?.close();
    return preset;
  }

  function init() {
    const dialog = $("toneLabDialog");
    const btnOpen = $("btnToneLab");
    if (!dialog || !btnOpen) return;

    btnOpen.addEventListener("click", () => {
      dialog.showModal();
    });

    $("btnToneLabPreview")?.addEventListener("click", () => {
      preview().catch((err) => alert(err.message));
    });

    $("btnToneLabSave")?.addEventListener("click", () => {
      saveAndUse();
    });

    $("btnToneLabClose")?.addEventListener("click", () => {
      disposePreview();
      dialog.close();
    });

    dialog.addEventListener("close", disposePreview);
  }

  return { init, buildPresetFromForm, saveAndUse, preview, BASES };
})();
