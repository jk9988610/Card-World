# HarmonyForge instruments (numbered)

All slots use IDs **`INS-001` … `INS-016`**. UI shows the ID only (no guessed instrument names).

| ID | Kind | Tone.js | Role |
|----|------|---------|------|
| INS-001 | synth | MembraneSynth | Drum membrane |
| INS-002 | synth | NoiseSynth | Drum noise |
| INS-003 | synth | MetalSynth | Short metal |
| INS-004 | synth | MetalSynth | Long metal |
| INS-005 | synth | MembraneSynth | Tom membrane |
| INS-006 | synth | MetalSynth | Long cymbal metal |
| INS-007 | synth | MonoSynth | Bass |
| INS-008 | synth | PolySynth(FMSynth) | FM keys |
| INS-009 | synth | PluckSynth | Pluck |
| INS-010 | synth | PolySynth(AMSynth) | AM pad (triad) |
| INS-011 | synth | MonoSynth | Lead |
| INS-012 | synth | MonoSynth | Reed-like |
| INS-013 | synth | FMSynth | FM brass |
| INS-014 | synth | MonoSynth | Low brass |
| INS-015 | synth | MonoSynth | Bowed high |
| INS-016 | synth | MonoSynth | Bowed low |

Full synthesis parameters: see `js/instrument-registry.js` → `synthesis` on each preset.

## Sampler slots (future)

Set `kind: "sampler"` on a preset and add:

```js
sampler: { baseUrl: "samples/INS-008/", urls: { C4: "C4.mp3", ... } }
```

`InstrumentEngine` will use `Tone.Sampler`. Optional `fallbackSynth: "INS-008"` if files are missing.

## Legacy projects

Old `instrumentId` values (`kick`, `piano`, …) map to `INS-xxx` via `Instruments.LEGACY_IDS` on load.

## Tone.js version

Bundled `js/tone.min.js` — align with [Tone.js](https://tonejs.github.io/) release **15.1.22**.
