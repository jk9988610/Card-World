# Card World — Roadmap

Prioritized work. **Current app version:** see `index.html` `cw-app-version` / `js/app.js` `APP_VERSION`.

---

## Now (shipped)

- Hand + Field, hybrid drag (mouse + touch), double-tap play/take
- VM `on_play` programs (see **RULES.md** §B)
- Save/load, locale `en` / `zh-Hans`, highlight guide
- Settings as container menu
- Pixel board + local works + optional art shop upload
- HarmonyForge embed (`music.tool.studio`)
- Scene stack (`scene_push` / `scene_pop`) — Computer desktop exists, no world entry card yet
- Service worker, offline-first (**OFFLINE.md**)

---

## Gaps

### Meta-rules / authoring

Meta-rules are **documented as card-defined** but **implemented in engine code**. Players cannot:

- Create new card types in-game
- Compose or attach programs without dev scripts
- Override play/container behavior
- Install packs from the UI

**CREATOR-DECK.md** is the authoritative plan to close this gap.

### Card art

Seed faces are **8×8 placeholders**; the pixel editor uses **35×25 (7:5)** while the card shell is **5:7**.  
**[Conquer-the-Three-Kingdoms](https://github.com/jk9988610/Conquer-the-Three-Kingdoms)** already defines the target: **60×84 display**, **500×700 logical**, PNG + `meta.json`, Supabase `card-art` manifest.

**CARD-ART.md** is the authoritative alignment spec. Card art work should **precede or run in parallel with Creator Deck** so Define Card paints at the final resolution.

---

## Phase 0.6 — Card art alignment (with 征战三国)

**Outcome:** Card World displays and edits faces the same way as 征战三国.

| Order | Item | Type |
|-------|------|------|
| 0.6.1 | Document spec (**CARD-ART.md**) | Docs ✓ |
| 0.6.2 | Image frame CSS 7:5 → **5:7** | Engine/CSS |
| 0.6.3 | Editor grid **60×84** + transparent alpha | Engine |
| 0.6.4 | `artKey` + `card-art` manifest loader + cache | Engine |
| 0.6.5 | Image import (crop 5:7, downsample) | Engine/UI |
| 0.6.6 | PNG + `meta.json` export | Engine |
| 0.6.7 | Official seed: `artKey` refs instead of 8×8 | Content |

**Until 0.6 ships:** author official art in 征战三国绘制; track `artKey` in pack notes.

---

## Phase 1 — Creator Deck (after 0.6.2 minimum)

**Outcome:** Founder can make a card, give it an `on_play` program, and save the world.

| Order | Item | Type |
|-------|------|------|
| 1.1 | `define_card` op + `customDefinitions` in save (image per **CARD-ART.md**) | Engine |
| 1.2 | `programDraft` session + attach `programs.*` to definitions | Engine |
| 1.3 | Program Desk minimal UI (list + Test + Attach) | Engine/UI |
| 1.4 | `founders.creator_deck` container + inner cards (seed) | Content |
| 1.5 | Recipe kit cards (one op per card) | Content |
| 1.6 | Tutorial + Shop Script path for Creator Deck | Content |
| 1.7 | Export pack JSON (download bridge) | Engine |
| 1.8 | Docs + `validate-seed` for creator pack | Tooling |

**Defer within Phase 1:** visual graph editor, `on_tick`, drop-on-card.

---

## Phase 1.5 — Rules in data

**Outcome:** Container and play behavior describable without new JS branches.

| Order | Item |
|-------|------|
| 1.5.1 | `unload_inner`, `store_into` IR ops (replace hard-coded paths) |
| 1.5.2 | Drop-on-card targeting |
| 1.5.3 | Rule kit cards (play styles, event attachment) |
| 1.5.4 | Optional `state.ruleOverrides` registry |

---

## Phase 2 — Worlds and install

**Outcome:** Playable examples and pack install without npm.

| Order | Item |
|-------|------|
| 2.1 | Pack list UI + Install (merge defs/programs) |
| 2.2 | `founders.computer` → `computer.enter` in starter or deck |
| 2.3 | `seed.starter_deck` backpack card (container + deck) |
| 2.4 | Example world: door quest (`content.door` in hand) |
| 2.5 | `on_tick` + `if` for `flagship.main` demo |

---

## Phase 3 — Share

**Outcome:** Players publish and others install packs (still no economy).

| Order | Item |
|-------|------|
| 3.1 | Publish pack to cloud (slug, version, manifest) |
| 3.2 | Browse / install remote packs |
| 3.3 | Auth-hardened RLS (replace open policies in **SUPABASE_ART.md**) |

---

## Phase 4+ (later)

- Response chains (“when X plays, Y may respond”)
- In-game Program Desk graph / branches
- Optional tip / support author
- Full Rules card as living changelog per world

---

## Explicitly out of scope (Card World repo)

- **Piano Studio** product line — belongs to HarmonyForge / other repos; not Card World music embed scope.
- Multiplayer real-time table
- Card economy / gacha / approval queues

---

## Doc maintenance

When shipping a phase:

1. Update **DEMO.md** “current build” table.
2. Move items from **RULES.md** §D to §A/B when implemented.
3. Bump acceptance tests in **DEMO.md** §7.
