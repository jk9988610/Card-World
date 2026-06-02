# Card World — Phase 0 Demo Design

This document defines the **minimum runnable demo**: a first player enters Card World and faces **card programming tools** plus a **world waiting to be programmed**. No tips, no economy, no approval, no solar/power fiction, and no optional social features in this phase.

All in-game copy, card text, and UI strings are **English**. Code and comments are **English**.

---

## 1. Demo goal

**One sentence:** The player can use programming cards to change the world on the table (Hand + Field), save work, reload it, and see that everything remains cards.

**Success criteria (demo is done when):**

1. Boot loads a fixed **Seed** (programming cards only + empty world).
2. **Hand** and **Field** render; cards use the fixed 5:7 layout (Title / Image / Text).
3. Player can **edit a program** (minimal editor), **run** it against the world, and **spawn / move / modify** cards on the Field.
4. Player can **save** and **load** the world state (Supabase or local fallback for offline dev).
5. No feature blocks the player (no currency, no power gates, no moderation queue).

**Explicitly out of scope for Phase 0:**

- Tips, payments, wallets
- Physical Store / Computer Store (may appear as stub UI only)
- Multiplayer, turns, realtime sync
- Flagship game for other players (Phase 1+)
- Solar, power, or “comfort” resource cards
- Art/music authoring tools beyond a single test tone + test pixel pattern
- Full keyboard-as-cards layout (arrow keys + confirm may use engine defaults until Phase 1)

---

## 2. First-player fantasy (what the screen means)

When the Founders (us) open the demo:

| What the player sees | What it is (implementation) |
|----------------------|-----------------------------|
| Empty **Field** | Main play zone; no pre-built menu or shop |
| Small **Hand** | Holds programming cards and tool cards dealt from Seed |
| **Programming cards** | Visual nodes that compile to **Program IR** (see ARCHITECTURE.md) |
| **World** | The Field + saved instances; “to be programmed” = no gameplay content until we Spawn it |

We are not simulating a PC in code. We are **programming a card world** with the same tools we will later use to build Computer, Store, and games.

---

## 3. Seed content (only what bootstraps the demo)

### 3.1 Engine bootstrap (not cards)

Minimal JavaScript:

- Card renderer (fixed size, three slots)
- Zone manager: **Hand**, **Field**
- Card VM (execute IR with step limit)
- Input: mouse drag (optional), keyboard for focus/confirm in dev
- Save/load adapter (Supabase table or `localStorage` for demo dev)

### 3.2 Seed deck (cards / definitions in JSON)

Programming primitives only, grouped for clarity:

| Group | Example IDs | Purpose |
|-------|-------------|---------|
| Events | `prog.on_play`, `prog.on_tick` | Entry points |
| Flow | `prog.sequence`, `prog.if`, `prog.loop` | Control flow |
| Card ops | `prog.spawn`, `prog.move`, `prog.set_slot` | Change the world |
| Zones | `prog.to_hand`, `prog.to_field` | Zone targets |
| Meta | `prog.define_card` | Create a new card template (demo may limit fields) |
| Bridge | `bridge.save_world`, `bridge.load_world` | Persistence |

**Count:** ~25–40 definitions. More can be added later; demo needs enough to script a tiny scene (e.g. spawn a “Door” card, move it, change text).

### 3.3 Initial world state

```json
{
  "hand": ["seed.deck.programming_starter"],
  "field": [],
  "programs": {},
  "definitions": {}
}
```

The programming starter deck is a **container card** or a scripted deal that puts essential `prog.*` cards into Hand.

---

## 4. Card layout (fixed, market-standard vertical)

| Constant | Value |
|----------|--------|
| Aspect ratio | **5:7** (width:height) |
| Logical size | **250 × 350** px |
| Title band | ~14% height |
| Image band | ~48% height, fixed **242:168** inner aspect |
| Text band | ~31% height |

Image slot displays:

- Pixel payload (`pixel/v1` JSON), or
- Placeholder pattern in demo

No external image or audio files in Phase 0.

---

## 5. Minimal programming UX (demo editor)

**Principle:** Easiest concrete manipulation; no graph wires in v0.

### 5.1 Recipe strip (default mode)

1. Open **Program Desk** (a Scene: Field sub-area or full-screen overlay — implementation choice).
2. Place cards left-to-right = **Sequence**.
3. Top card should be an **Event** (e.g. `On Play`).
4. **Run / Test** executes against current Field without saving the world definition.

### 5.2 Attach program to world

- Select a card on the Field (or a “World Controller” placeholder card).
- **Attach** program → stored as `programs[programId]` linked from that card or from global `world.programMain`.

### 5.3 Demo script example (behavior, not code)

Target experience for QA:

1. Play `On Tick` program: every N ticks spawn a `Note` card on Field (or increment a counter on a controller card).
2. Play `On Play` on a `Door` card: set its Text slot to `"Open"`.
3. Save world → reload page → load world → Field matches saved state.

---

## 6. Persistence (demo)

| Field | Storage |
|-------|---------|
| World instances, zones | `world_saves` row or `localStorage` key `cardworld/demo/v1` |
| Card definitions created in demo | Embedded in save blob or `definitions` JSON column |
| Programs | `programs` JSON column |

Supabase is the target; **local fallback** is acceptable so the demo runs on GitHub Pages before auth exists.

---

## 7. Demo milestones (implementation order)

| Step | Deliverable |
|------|-------------|
| D1 | Render Hand/Field + one static card |
| D2 | Drag card Hand ↔ Field |
| D3 | VM runs `Sequence` + `Spawn` |
| D4 | Recipe strip editor + Test |
| D5 | `define_card` + spawn custom template |
| D6 | Save / load world |
| D7 | Polish: step limit, pack size guard, basic Guide card in Seed |

---

## 8. From demo to “other players install flagship” (next phase, not demo)

Documented here only as a **north star** — not built in Phase 0:

1. Founders build **Computer** (container card + inner Field) using demo tools.
2. Founders build **Store** scene + `Publish` / `Install` + `slug` / `version`.
3. Founders build **flagship** game pack; publish to Store.
4. New player flow: `Install world-entry` → Computer → `Install official.flagship` → Play.

See **ARCHITECTURE.md** for the full platform shape.

---

## 9. Demo glossary (UI strings for Phase 0)

| Term | Use |
|------|-----|
| Card | Unit on the table |
| Hand / Field | Zones |
| Program | Logic made from programming cards |
| Run / Test | Execute program once or on tick |
| Save World / Load World | Persistence |
| version | Reserved for later Publish; not required in demo UI |

Avoid: repo, clone, tip, wallet, power, solar, approval.

---

## 10. Acceptance test (manual)

1. Fresh load → Field empty, Hand has programming cards.
2. Create a simple program that spawns a card on Field → Run → card appears.
3. Save → hard refresh → Load → same card on Field.
4. No console errors; VM stops after max steps if infinite loop.

**Phase 0 demo is complete when this pass is reliable.**
