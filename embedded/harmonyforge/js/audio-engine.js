/**
 * HarmonyForge audio — Tone.js via InstrumentRegistry / InstrumentEngine.
 */
const AudioEngine = (() => {
  const MASTER_GAIN = 0.85;
  let ready = false;
  let playbackActive = false;
  let onSuspendWhilePlaying = null;
  const trackChannels = {};
  /** @type {Record<string, { instrumentId: string, inst: object, extras: any[] }>} */
  const trackInstruments = {};

  function resolveInstrumentId(trackId) {
    if (typeof Sequencer !== "undefined" && Sequencer.getTrack) {
      const t = Sequencer.getTrack(trackId);
      if (t?.engineId) return t.engineId;
      if (t?.instrumentId) return t.instrumentId;
    }
    return trackId;
  }

  function initEngine() {
    if (ready) return;
    Tone.getDestination().volume.value = Tone.gainToDb(MASTER_GAIN);
    ready = true;
    if (typeof AppLogger !== "undefined") {
      AppLogger.info("Tone.js ready", `v${Tone.version}`);
    }
  }

  function ensureContext() {
    initEngine();
    return Tone.getContext().rawContext;
  }

  async function unlockAudio() {
    await Tone.start();
    initEngine();
    return Tone.getContext().rawContext;
  }

  function isRunning() {
    return Tone.getContext().state === "running";
  }

  function now() {
    return Tone.now();
  }

  function setPlaybackActive(active) {
    playbackActive = !!active;
  }

  function setOnSuspendWhilePlaying(fn) {
    onSuspendWhilePlaying = typeof fn === "function" ? fn : null;
    if (onSuspendWhilePlaying && !Tone._hfSuspendHook) {
      Tone._hfSuspendHook = true;
      Tone.getContext().rawContext.addEventListener("statechange", () => {
        if (Tone.getContext().state === "suspended" && playbackActive && onSuspendWhilePlaying) {
          onSuspendWhilePlaying();
        }
      });
    }
  }

  function getTrackChannel(trackId, defaultVol = 0.8) {
    initEngine();
    if (!trackChannels[trackId]) {
      trackChannels[trackId] = new Tone.Gain(defaultVol).connect(Tone.getDestination());
    }
    return trackChannels[trackId];
  }

  function setTrackVolume(trackId, vol) {
    getTrackChannel(trackId, vol).gain.rampTo(vol, 0.02);
  }

  function disposeTrackInstrument(trackId) {
    const entry = trackInstruments[trackId];
    if (entry) {
      InstrumentEngine.dispose(entry.inst, entry.extras);
      delete trackInstruments[trackId];
    }
  }

  function invalidateTrack(trackId) {
    disposeTrackInstrument(trackId);
  }

  function ensureTrackInstrument(trackId, instrumentId) {
    const channel = getTrackChannel(trackId);
    const entry = trackInstruments[trackId];
    if (entry && entry.instrumentId === instrumentId) return entry.inst;
    if (entry) disposeTrackInstrument(trackId);
    const inst = InstrumentEngine.create(instrumentId);
    const extras = InstrumentEngine.connect(inst, channel);
    trackInstruments[trackId] = { instrumentId, inst, extras };
    return inst;
  }

  function triggerInstrument(trackId, instrumentId, time, noteMidi, duration, velocity = 0.85) {
    const inst = ensureTrackInstrument(trackId, instrumentId);
    const t = Math.max(time, Tone.now() + 0.001);
    InstrumentEngine.trigger(inst, t, noteMidi, duration, velocity);
  }

  function playInstrumentOn(trackId, instrumentId, time, noteMidi, stepDuration) {
    const dur = InstrumentEngine.melodicDuration(instrumentId, stepDuration);
    const preset = InstrumentRegistry.get(instrumentId);
    if (preset?.trigger === "chord_triad" && noteMidi != null) {
      triggerInstrument(trackId, instrumentId, time, noteMidi, stepDuration * 0.9, 0.42);
      return;
    }
    if (InstrumentEngine.isDrumPreset(instrumentId)) {
      triggerInstrument(trackId, instrumentId, time, null, dur, 0.85);
      return;
    }
    triggerInstrument(trackId, instrumentId, time, noteMidi, dur, 0.42);
  }

  function playTrackSoundOn(_c, _outGetter, trackId, time, noteMidi, stepDuration) {
    const instrumentId = resolveInstrumentId(trackId);
    playInstrumentOn(trackId, instrumentId, time, noteMidi, stepDuration);
  }

  function playTrackSound(trackId, time, noteMidi, stepDuration) {
    initEngine();
    const instrumentId = resolveInstrumentId(trackId);
    const t = typeof time === "number" ? time : Tone.now() + 0.01;
    if (!isRunning()) {
      if (playbackActive) return;
      unlockAudio()
        .then(() => playInstrumentOn(trackId, instrumentId, Tone.now() + 0.02, noteMidi, stepDuration))
        .catch(() => {});
      return;
    }
    playInstrumentOn(trackId, instrumentId, t, noteMidi, stepDuration);
  }

  function previewTrackNote(trackId, midi, duration) {
    const instrumentId = resolveInstrumentId(trackId);
    const stepDur = InstrumentEngine.melodicDuration(
      instrumentId,
      duration != null ? duration : InstrumentEngine.previewDuration(instrumentId)
    );
    unlockAudio()
      .then(() => triggerInstrument(trackId, instrumentId, Tone.now() + 0.03, midi, stepDur, 0.8))
      .catch(() => {});
  }

  function setTransportBpm(bpm) {
    Tone.Transport.bpm.value = bpm;
  }

  function createOfflineScheduler(volumes, trackInstrumentMap) {
    const offlineTracks = {};
    return {
      schedule(_ctx, _master, trackId, time, noteMidi, stepDuration) {
        const instrumentId = trackInstrumentMap?.[trackId] || resolveInstrumentId(trackId);
        let cached = offlineTracks[trackId];
        if (!cached || cached.instrumentId !== instrumentId) {
          if (cached) InstrumentEngine.dispose(cached.inst, cached.extras);
          const ch = new Tone.Gain(volumes[trackId] ?? 0.75).toDestination();
          const inst = InstrumentEngine.create(instrumentId);
          const extras = InstrumentEngine.connect(inst, ch);
          offlineTracks[trackId] = { instrumentId, inst, extras, channel: ch };
          cached = offlineTracks[trackId];
        }
        const dur = InstrumentEngine.melodicDuration(instrumentId, stepDuration);
        const preset = InstrumentRegistry.get(instrumentId);
        const noteDur =
          preset?.trigger === "chord_triad" && noteMidi != null ? stepDuration * 0.9 : dur;
        InstrumentEngine.trigger(cached.inst, time, noteMidi, noteDur, 0.85);
      },
    };
  }

  function midiToFreq(midi) {
    return Tone.Frequency(midi, "midi").toFrequency();
  }

  return {
    ensureContext,
    unlockAudio,
    isRunning,
    now,
    setPlaybackActive,
    setOnSuspendWhilePlaying,
    setTrackVolume,
    setTransportBpm,
    playTrackSound,
    playTrackSoundOn,
    previewTrackNote,
    invalidateTrack,
    createOfflineScheduler,
    midiToFreq,
    resolveInstrumentId,
    getInstrumentToneLabel: (instrumentId) => {
      const p = InstrumentRegistry.get(instrumentId);
      return InstrumentRegistry.toneLabel(p);
    },
    getContext: () => ensureContext(),
  };
})();
