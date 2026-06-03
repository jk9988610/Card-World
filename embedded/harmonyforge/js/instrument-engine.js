/**
 * Creates and triggers instruments from InstrumentRegistry (sampler or synth).
 */
const InstrumentEngine = (() => {
  function midiToNote(midi) {
    return Tone.Frequency(midi, "midi").toNote();
  }

  function getPianoStrikeParams(noteMidi) {
    const m = typeof noteMidi === "number" ? noteMidi : 60;
    const modEnv = { attack: 0.001, sustain: 0, release: 0.008 };
    const ampEnv = { attack: 0.001, sustain: 0 };
    if (m < 50) {
      return {
        harmonicity: 7.8,
        modulationIndex: 3.2,
        oscillator: { type: "sine" },
        modulation: { type: "sine" },
        envelope: { ...ampEnv, decay: 0.5, release: 0.72 },
        modulationEnvelope: { ...modEnv, decay: 0.01 },
      };
    }
    if (m < 62) {
      return {
        harmonicity: 6.2,
        modulationIndex: 3.8,
        oscillator: { type: "sine" },
        modulation: { type: "sine" },
        envelope: { ...ampEnv, decay: 0.44, release: 0.65 },
        modulationEnvelope: { ...modEnv, decay: 0.014 },
      };
    }
    if (m < 72) {
      return {
        harmonicity: 3.8,
        modulationIndex: 5.2,
        oscillator: { type: "triangle" },
        modulation: { type: "sine" },
        envelope: { ...ampEnv, decay: 0.36, release: 0.58 },
        modulationEnvelope: { ...modEnv, decay: 0.02 },
      };
    }
    return {
      harmonicity: 2.01,
      modulationIndex: 6.5,
      oscillator: { type: "triangle" },
      modulation: { type: "sine" },
      envelope: { ...ampEnv, decay: 0.34, release: 0.55 },
      modulationEnvelope: { ...modEnv, decay: 0.032 },
    };
  }

  function pianoGateDuration(stepDuration) {
    const step = Math.max(stepDuration, 0.06);
    return Math.min(step * 0.48, 0.32);
  }

  function createSynth(preset) {
    const C = Tone[preset.toneClass];
    if (!C) throw new Error(`Unknown Tone class: ${preset.toneClass}`);
    if (preset.toneClass === "PolySynth" && preset.polyClass) {
      const Voice = Tone[preset.polyClass];
      return new C(Voice, {
        ...preset.polyOptions,
        voice: { ...preset.options },
      });
    }
    return new C(preset.options || {});
  }

  function createSampler(preset) {
    const { urls, baseUrl = "" } = preset.sampler || {};
    if (!urls || !Object.keys(urls).length) {
      throw new Error(`Sampler ${preset.id} has no urls`);
    }
    return new Tone.Sampler({ urls, baseUrl });
  }

  function create(presetId) {
    const preset = InstrumentRegistry.get(presetId);
    if (!preset) throw new Error(`Unknown instrument: ${presetId}`);
    if (preset.kind === "sampler") {
      try {
        return { preset, synth: createSampler(preset), kind: "sampler" };
      } catch (err) {
        if (preset.fallbackSynth) {
          const fb = InstrumentRegistry.get(preset.fallbackSynth);
          if (fb?.kind === "synth") {
            return { preset: fb, synth: createSynth(fb), kind: "synth", fallbackFrom: presetId };
          }
        }
        throw err;
      }
    }
    return { preset, synth: createSynth(preset), kind: "synth" };
  }

  function connect(inst, destination) {
    const { preset, synth } = inst;
    if (preset.postChain === "piano_eq") {
      const mudCut = new Tone.Filter(140, "highpass", -12);
      const bright = new Tone.EQ3({
        low: -3.5,
        mid: 1,
        high: 5,
        lowFrequency: 200,
        highFrequency: 3600,
      });
      synth.connect(mudCut);
      mudCut.connect(bright);
      bright.connect(destination);
      return [mudCut, bright];
    }
    synth.connect(destination);
    return [];
  }

  function dispose(inst, extras = []) {
    if (inst?.synth?.dispose) {
      try {
        inst.synth.dispose();
      } catch (_) {}
    }
    extras.forEach((node) => {
      try {
        node.dispose();
      } catch (_) {}
    });
  }

  function melodicDuration(presetId, stepDuration) {
    const preset = InstrumentRegistry.get(presetId);
    if (!preset) return stepDuration;
    const d = preset.duration || {};
    if (d.chordHold) return stepDuration * 0.9;
    if (d.melodicGate) return pianoGateDuration(stepDuration);
    if (d.melodicMin) return Math.max(stepDuration, d.melodicMin);
    return stepDuration;
  }

  function previewDuration(presetId) {
    const preset = InstrumentRegistry.get(presetId);
    return preset?.duration?.preview ?? 0.28;
  }

  function trigger(inst, time, noteMidi, duration, velocity = 0.85) {
    const { preset, synth } = inst;
    const t = Math.max(time, 0);
    const dur = Math.max(duration * 0.92, 0.03);
    const opts = preset.triggerOpts || {};

    switch (preset.trigger) {
      case "drum_membrane":
        synth.triggerAttackRelease(opts.note || "C2", dur, t, velocity * (opts.velocityScale ?? 1));
        break;
      case "drum_noise":
        synth.triggerAttackRelease(dur, t, velocity);
        break;
      case "drum_metal":
        synth.triggerAttackRelease(
          opts.note || "C6",
          opts.length || "8n",
          t,
          velocity * (opts.velocityScale ?? 1)
        );
        break;
      case "chord_triad": {
        if (noteMidi == null) return;
        const n = Tone.Frequency(midiToNote(noteMidi)).toMidi();
        const notes = [n, n + 4, n + 7].map((m) => midiToNote(m));
        synth.triggerAttackRelease(notes, dur, t, velocity * 0.42);
        break;
      }
      case "piano_fm": {
        if (noteMidi == null) return;
        if (synth.set) synth.set(getPianoStrikeParams(noteMidi));
        const gate = pianoGateDuration(duration);
        synth.triggerAttackRelease(midiToNote(noteMidi), gate, t, velocity * 0.92);
        break;
      }
      case "melodic":
      default:
        if (noteMidi == null) return;
        const vel =
          preset.id === "INS-015" || preset.id === "INS-016"
            ? velocity * 0.52
            : preset.id === "INS-007"
              ? velocity * 0.75
              : preset.id === "INS-009"
                ? velocity * 0.7
                : velocity;
        const noteDur = preset.id === "INS-009" ? dur * 0.85 : dur;
        synth.triggerAttackRelease(midiToNote(noteMidi), noteDur, t, vel);
        break;
    }
  }

  function isDrumPreset(presetId) {
    const p = InstrumentRegistry.get(presetId);
    return p?.type === "drum";
  }

  return {
    create,
    connect,
    dispose,
    trigger,
    melodicDuration,
    previewDuration,
    isDrumPreset,
    getPianoStrikeParams,
    midiToNote,
  };
})();
