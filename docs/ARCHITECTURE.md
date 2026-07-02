# Card World — System Architecture

## Principles

| Principle | Meaning |
|-----------|---------|
| **Everything Is Card** | Fixed slots: Title / Image / Text, ratio 5:7. No separate game UI chrome beyond Hand and Field. |
| **IR + VM** | Card behavior = programs (IR JSON). Engine runs the same ops in dev scripts and in-world. |
| **Computer** | A container card + `scene_push`, not a JS class. |
| **Offline-first** | Play and create without network; cloud only for explicit upload/publish. |
| **No early economy** | No tips, approval gates, or power meta in early phases. |
| **Single-player feel** | Networking = list / install / publish / save — not live multiplayer. |

## Player experience (target)

Players should feel like **Founders** at a card table:

1. **Play** — drag Hand → Field; inspect with tap; take Field → Hand.
2. **Create** — pixel art and music via tool cards (`enter` play style).
3. **Design** — define new cards, attach programs, and write rules **using cards** (Creator Deck — see **CREATOR-DECK.md**).
4. **Share** — publish packs (definitions + programs + optional starter world).

Today, steps 1–2 work. Step 3 is blocked: meta-rules and card authoring are mostly hard-coded in `js/app.js`. Step 4 has seed packs but no in-game install UI.

## Packages

- **Slug**, title, version, author.
- **Install** (free), **Publish**, **Source** (open packs).
- Seed packs: `seed/packs/official.*.json` (not yet installable in UI).

## Phases

| Phase | Focus | Status |
|-------|-------|--------|
| **0** | Hand/Field, VM `on_play`, save/load, guide highlights | Done |
| **0.5** | Settings container, art editor, HarmonyForge embed, scenes | Done |
| **0.5-content** | Paint P0 faces in 征战三国; art-registry | **Now (no code)** |
| **0.6** | Card art engine alignment (5:7, 60×84, manifest) | Next code |
| **1** | Creator Deck — define cards, compose programs, attach rules | Planned |
| **2** | Pack install UI, Computer desktop entry, example worlds | Planned |
| **3** | Player publish / browse packs (no economy) | Planned |
| **4+** | Optional tip, auth-hardened cloud | Later |

See **PLAN.md** for dependencies, parallel tracks, and milestones M1–M6.

## Card art

Official and player card faces follow the **[Conquer-the-Three-Kingdoms](https://github.com/jk9988610/Conquer-the-Three-Kingdoms)** pipeline: **5:7** TCG inner art, **60×84** display PNG, optional `meta.json` effects, Supabase bucket `card-art`.

Card World’s editor and image frame are **not yet aligned** (today: 7:5 frame, 35×25 grid, 8×8 seed placeholders). See **CARD-ART.md** and **ROADMAP.md** Phase 0.6.

## Embedded apps

- **HarmonyForge** (`embedded/harmonyforge/`) — step sequencer / music production. Opened via `music.tool.studio` card. Vendored copy; sync optional via `tools/sync-harmonyforge.mjs`.
- **Pixel board** — in-host editor in `js/app.js` (`art.tool.pixel`). Target: same grid spec as 征战三国绘制.

## Repo map

| Path | Role |
|------|------|
| `js/app.js` | VM, zones, drag, containers, art/music shells |
| `seed/definitions.json` | Card definitions |
| `seed/programs/*.json` | IR programs |
| `seed/starter-world.json` | Initial hand/field |
| `tools/build-seed.mjs` | Bundle for static host |
| `tools/export-program.mjs` | Dev: IR → programming card defs |

See **DEMO.md** for playbook and **RULES.md** for rule details.
