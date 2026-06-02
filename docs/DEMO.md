# Card World — Phase 0 Demo Design

Phase 0: first player enters with **card programming tools** and an **empty world** (Hand + Field). English only for UI, cards, code, and comments.

See **ARCHITECTURE.md** for the full platform.

---

## 1. Demo goal

**Success when:** Hand/Field render; Recipe programs run; save/load works; nothing blocks play.

**Out of scope Phase 0:** tips, economy, approval, solar/power, full Store UI.

---

## 2. First player playbook

You start with an **empty Field** and **programming cards in Hand**.

### Loop

```text
Edit program (Program Desk) → Test → Attach → Save World
```

### Steps

| Step | Action |
|------|--------|
| A | Recipe: `on_play` → `spawn` → `to_field` → Test |
| B | `define_card` door; `on_play` → `set_slot` text `"Open"` |
| C | `world_controller` + `on_tick` program attached |
| D | `sequence` of spawns for a scene |
| E | `define_card` Computer + `scene_push` desktop |
| F | Store + flagship (Phase 1); Publish with slug + version |

### Founders assets in this repo

| Path | Role |
|------|------|
| `seed/programs/world.bootstrap.json` | Deal programming cards; spawn door |
| `seed/programs/door.on_play.json` | Example content |
| `seed/packs/official.*.json` | Installable packs (Phase 1) |

---

## 3. Tooling: scripts vs meta card

| Tool | When |
|------|------|
| `npm run export-program` | Dev: IR JSON → programming card defs |
| `npm run validate-seed` | CI / before commit |
| `npm run build-seed` | `dist/seed-bundle.json` for static host |
| Card `prog.export` | Phase 1: in-game download via bridge |

Phase 0: use **scripts**; `prog.export` is a stub in definitions.

---

## 4. Card layout

250×350 px, ratio **5:7**; Title ~14%, Image ~48% (242×168), Text ~31%.

---

## 5. Milestones D1–D7

Render → drag → VM spawn → editor → define_card → save/load → guide.

---

## 6. Acceptance test

Fresh load → bootstrap or spawn → save → reload → state restored.
