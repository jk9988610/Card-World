# Card World — Demo (current build)

What the shipped demo **actually does** today. For vision and next steps see **ARCHITECTURE.md** and **CREATOR-DECK.md**.

---

## 1. Demo goal

**Success when:** Hand and Field render; drag and double-tap play work; `on_play` programs run; save/load restores state; art and music tools open; nothing blocks play.

**Not in this build:** in-game card authoring, Program Desk, pack install UI, `on_tick` games, player-defined meta-rules.

---

## 2. First session (starter world)

Fresh load (`seed/starter-world.json`):

| Zone | Cards |
|------|-------|
| **Hand** | Settings (with language / fullscreen / highlight / reset inner), Pixel Board, HarmonyForge |
| **Field** | Empty |

### Core gestures

| Gesture | Effect |
|---------|--------|
| Hand → Field | **Play** (or open container / tool) |
| Field → Hand | **Take** (or pick from open container) |
| Tap | Zoom card |
| Hand double-tap | Same as play |
| Field double-tap | Same as take |

### Settings container

1. Drag **Settings** to Field — other field cards stash; menu items pour after Settings.
2. Drag a menu row to Hand — runs `on_play`, applies choice; Settings closes and field restores.
3. Drag Settings back to Hand — close without choosing (if still open on field).

### Creation tools

- **Pixel Board** — `enter` style: opens editor, card stays in Hand. Paint, undo, save draft, gallery, optional cloud upload.
- **HarmonyForge** — `enter` style: iframe to `embedded/harmonyforge/`.

### Guide

- **Shop Script** (not in default hand; available in definitions): plays `guide.start` → highlights Settings → Language menu → 中文.

---

## 3. VM programs (working ops)

Programs live in `seed/programs/*.json`. Attached via `definitions[].programs.on_play`.

Implemented ops: `sequence`, `deal`, `spawn`, `set_slot`, `set_locale`, `set_locale_text`, `fullscreen_enter`, `fullscreen_exit`, `guide_start`, `highlight`, `reset_world`, `scene_push`, `scene_pop`, `art_editor_open`, `art_gallery_open`, `music_embed_open`, `open_url`.

**Not implemented:** `if`, `on_tick`, `define_card`, `unload_inner`, `store_into`, and other ops listed in **RULES.md** §D.

---

## 4. Example content (in repo, not in default hand)

| Asset | Role |
|-------|------|
| `content.door` + `door.on_play` | Text changes to “open” via `set_locale_text` |
| `founders.world_controller` + `world.bootstrap` | Legacy bootstrap; removed from starter |
| `scene.computer.desktop` + `computer.enter` | Desktop scene; no entry card in starter yet |
| `flagship.main` | Tick spawn demo — **needs `on_tick` VM** |
| `seed/packs/official.*` | Pack metadata only — no install UI |

---

## 5. Dev tooling

| Command | Purpose |
|---------|---------|
| `npm run build-seed` | `dist/seed-bundle.json` |
| `npm run validate-seed` | CI / pre-commit checks |
| `npm run export-program` | IR JSON → programming card definition snippets |

In-game `prog.export` is planned with Creator Deck (Phase 1).

---

## 6. Card layout

250×350 px shell, ratio **5:7**; Title ~14%, Image ~48%, Text ~31%.

**Card faces (today vs target):**

| | Today | Target ([征战三国](https://github.com/jk9988610/Conquer-the-Three-Kingdoms)) |
|---|--------|--------|
| Image frame | 7:5 landscape | **5:7** portrait |
| Editor grid | 35×25 | **60×84** display |
| Seed art | 8×8 `pixel/v1` placeholders | `artKey` + PNG from `card-art` manifest |

See **CARD-ART.md**.

---

## 7. Acceptance test

1. Fresh load → hand has Settings + two tools; field empty.
2. Play Settings → menu on field; pick language → locale switches.
3. Open Pixel Board → draw → apply to a blank work card or save.
4. Reload page → hand/field/locale restored.
5. `npm run validate-seed` passes.
