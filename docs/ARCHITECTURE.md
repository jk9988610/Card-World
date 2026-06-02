# Card World — System Architecture (Consolidated)

Single reference for the Card World platform: principles, runtime, data, stores, and phased scope. Tightened from design discussions; **Phase 0** details live in **DEMO.md**.

---

## 1. Core principle

**Everything Is Card (EIC):** Anything the player can perceive or act on is represented as a card with three fixed slots (Title, Image, Text) on a fixed **5:7** vertical face. Abstract ideas (rules, mood, logic) are also cards or card-attached programs.

**Programming equivalence:** What Founders build with in-world programming cards uses the same **Program IR** and **Card VM** as the real JavaScript engine executes. No second language semantics.

**Friction-free official world:** No meta-economy, no power gates, no approval queue in early phases. Optional features (tips, inbox, download counts) come later.

---

## 2. Phased scope

| Phase | Focus | In scope |
|-------|--------|----------|
| **0 — Demo** | First player programs an empty world | Seed programming cards, Hand/Field, VM, Recipe editor, save/load |
| **1 — Founders pack** | Build Computer, Store, flagship | Container scenes, Publish/Install, Supabase packages |
| **2 — Players** | Others install and play | `world-entry`, Guide, `official.flagship` |
| **3+ — Optional** | Tips, inbox, download stats, Split Install | Not required for core loop |

---

## 3. Layered system

```
┌─────────────────────────────────────────────────────────┐
│  GitHub Pages — static HTML / JS / CSS / seed JSON     │
├─────────────────────────────────────────────────────────┤
│  Presentation — card layout, drag, keyboard, audio API   │
├─────────────────────────────────────────────────────────┤
│  Card VM — events, IR execution, zones, limits           │
├─────────────────────────────────────────────────────────┤
│  Supabase — auth (later), packages, world saves          │
└─────────────────────────────────────────────────────────┘
```

| Layer | Responsibility | Not responsible for |
|-------|----------------|---------------------|
| **Bootstrap** | Load seed, start VM, mount canvas/DOM | Game rules, shop prices |
| **Card VM** | IR, zones, containers, tick/step caps | Rendering pixels (delegates) |
| **Presentation** | Draw 250×350 cards, hit tests | Business logic |
| **Storage bridge** | Save/load world, list/install packages | Real-time multiplayer |

**No `class Computer` in application code.** A computer is a **card definition** with `container: true` and a program that `scene.push`s its inner Field.

---

## 4. Card model

### 4.1 Face layout

| Slot | ~Height share | Notes |
|------|---------------|--------|
| Title | 14% | Short label |
| Image | 48% | Fixed inner aspect **242:168**; pixel/v1 or procedural |
| Text | 31% | Description, rules snippet |

Logical size: **250×350** (scale in CSS).

### 4.2 Instance vs definition

| Concept | Fields | Mutable at runtime |
|---------|--------|-------------------|
| **Definition** | `slug`, default slots, tags, container flags | No (fork = new slug) |
| **Instance** | `definitionSlug`, slot overrides, `zone`, `state` | Yes |

### 4.3 Naming (familiar words)

| Field | Rule |
|-------|------|
| **slug** | Globally unique id, e.g. `official.flagship` |
| **title** | Display on card; can change without breaking refs if refs use slug |
| **version** | Semver string, e.g. `1.0.0` |
| **author** | Display + `authorId` in database |

Official content uses `official.*` prefix. Players use `username.*` or uuid-based slugs. No Steam-style AppID system.

---

## 5. Zones and containers

### 5.1 Zones

| Zone | Purpose |
|------|---------|
| **Hand** | Player-held cards |
| **Field** | Main table play area |
| **innerField** | Inside a container card (e.g. Computer desktop) |

### 5.2 Computer (container)

- Implemented as a card with `tags: ["container", "computer"]`.
- **Enter:** program runs `scene.push(innerFieldId)` (e.g. on play or focus+confirm).
- **Exit:** `scene.pop()`.
- **No power logic** in meta layer; electricity is not simulated.

### 5.3 Scene stack

```
World Field  →  [push]  Computer innerField  →  [push]  Program Desk
```

Same VM rules at every level (isomorphic).

---

## 6. Programming system

### 6.1 Authoring UI (phased)

| Mode | Phase | Description |
|------|-------|-------------|
| **Recipe strip** | 0 | Programming cards in a row = `Sequence` |
| **Grid sockets** | 1+ | `If` / `Loop` with named slots |
| **Graph wires** | Later | Optional |

### 6.2 Program IR (engine internal)

JSON graph: `nodes[]`, `edges[]`, `entry` event id.

**Event types (minimum):** `on_play`, `on_tick`, `on_enter_zone`, `on_drag_end`

**Ops (minimum):** `sequence`, `if`, `loop`, `spawn`, `move`, `set_slot`, `define_card`

**Limits (always on):**

- `maxStepsPerTick`
- `maxContainerDepth`
- `maxPackBytes` on install

### 6.3 Media without external files

| Media | Representation |
|-------|----------------|
| Image | `pixel/v1` JSON (palette + grid) |
| Audio | Tone.js events in program or pack JSON |

No `.png` / `.mp3` as gameplay dependencies.

---

## 7. Packages, Store, and sharing (Phase 1+)

Unified model for **World Store** and **Computer Store** (same UX, different install target).

| Action | Meaning |
|--------|---------|
| **Install** | Copy package into world Field or Computer innerField (always free in official design) |
| **Publish** | Upload package + `slug`, `version`, `author`, public **Source** |
| **Source** | View package definitions/programs (open by default) |

**Not in early phases:** Tip, wallet, approval workflow, stars, fork UI (fork = duplicate slug manually later).

### 7.1 Package kinds

| kind | Install target |
|------|----------------|
| `world` | Field / inventory |
| `computer` | Container template |
| `game` | Computer Apps area |
| `tool` | Either |

### 7.2 Networking (minimal, async)

Player experience is **single-player** except when:

- Opening Store → fetch package list (new rows since `lastSeen`)
- Install → download package blob
- Publish → upload package

No turn order, no shared Field sync, no WebSocket requirement.

**Suggested tables:** `packages`, `world_saves`, `profiles` (later).

---

## 8. Security and abuse (no approval)

Without moderation, safety relies on **hard limits** only:

| Risk | Mitigation |
|------|------------|
| Infinite loops | Step cap per tick |
| Deep nesting | Depth cap |
| Huge uploads | Byte cap |
| Malicious bridge calls | Bridge whitelist in engine |

Bad packages fail to install or run; they do not require founder approval to exist if Phase 1 enables open Publish (can default to founders-only Publish until ready).

---

## 9. First player vs later players

### 9.1 First player (Founders)

1. Enter demo: programming cards + empty Field.
2. Use programs to Spawn scene/content, define cards, attach `on_tick` / `on_play`.
3. Build Computer container + inner desktop (as cards + scenes).
4. Build Store UI (cards + `bridge.list_packages` / `install`).
5. Build flagship game inside Computer; **Publish** with `slug`, `version`.
6. Publish `world-entry` Guide: Install Computer → Install flagship → Play.

### 9.2 Later players

1. Install `official.world-entry` (or bundled default).
2. Follow Guide cards (keyboard-friendly when implemented).
3. Install and play flagship without learning programming first.

---

## 10. Technology map

| Concern | Choice |
|---------|--------|
| Host | GitHub Pages |
| Client | HTML, CSS, JavaScript |
| Data | JSON seed + Supabase |
| Audio (later) | Tone.js |
| Images | Pixel payloads, canvas draw |
| Auth | Supabase Auth when needed; demo may skip |

---

## 11. Repository layout (recommended)

```
/
  index.html
  js/
    bootstrap.js
    vm/
    render/
    bridge/
  seed/
    definitions.json
    starter-world.json
  docs/
    DEMO.md          ← Phase 0
    ARCHITECTURE.md  ← this file
```

---

## 12. Glossary (UI — prefer common English)

| Term | Meaning |
|------|---------|
| Card | Base unit |
| Hand / Field | Zones |
| Computer | Container card |
| Program | Player-authored logic (IR) |
| Install | Add a package to world or Computer |
| Publish | Share package to Store |
| Source | Inspect package contents |
| version / author / slug | Package metadata |
| Save World / Load World | Persist table state |

**Phase 0 avoids:** Tip, wallet, Buy, power, solar, repo, clone, PR, approval.

---

## 13. Document map

| Document | Audience | Content |
|----------|----------|---------|
| **DEMO.md** | Implementers building Phase 0 | First-player experience, seed list, milestones, acceptance tests |
| **ARCHITECTURE.md** | Whole project | Principles, VM, zones, packages, phases, limits |

When Phase 0 ships, update this file with actual file paths and schema versions.
