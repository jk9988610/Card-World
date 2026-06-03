/**
 * Keeps a pool of empty tracks (INS-000) so new user timbres always have a slot.
 */
const TrackPool = (() => {
  const MIN_EMPTY = 2;

  function countEmpty() {
    if (typeof Sequencer === "undefined") return 0;
    return Sequencer.getTracks().filter((t) => Instruments.isEmptyId(t.instrumentId)).length;
  }

  function ensureEmptyTracks() {
    if (typeof Sequencer === "undefined") return;
    let empty = countEmpty();
    while (empty < MIN_EMPTY && Sequencer.trackCount < Sequencer.MAX_TRACKS) {
      const r = Sequencer.addTrack(Instruments.EMPTY_ID);
      if (!r.ok) break;
      empty += 1;
    }
  }

  /** Assign instrument to first empty track, or add new track; then refill pool */
  function assignToEmptySlot(instrumentId) {
    if (typeof Sequencer === "undefined") return null;
    const empty = Sequencer.getTracks().find((t) => Instruments.isEmptyId(t.instrumentId));
    if (empty) {
      Sequencer.setTrackInstrument(empty.id, instrumentId);
      if (typeof AudioEngine !== "undefined") AudioEngine.invalidateTrack(empty.id);
      ensureEmptyTracks();
      return empty.id;
    }
    if (Sequencer.trackCount >= Sequencer.MAX_TRACKS) return null;
    const r = Sequencer.addTrack(instrumentId);
    if (r.ok) ensureEmptyTracks();
    return r.trackId || null;
  }

  return {
    MIN_EMPTY,
    ensureEmptyTracks,
    assignToEmptySlot,
    countEmpty,
  };
})();
