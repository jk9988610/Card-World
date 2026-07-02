# Card World — Rules (current and planned)

## A. UI rules (engine, today)

| Rule | Behavior |
|------|----------|
| **Tap** | Enlarge card only (no game effect) |
| **Drag Hand → Field** | **Play** — run `on_play` program (or open container / enter tool) |
| **Drag Field → Hand** | **Take** — move only (or pick from open container) |
| **Double-tap** | Hand = play; Field = take |
| **Highlight** | Optional yellow pulse on `hintTarget` slug |
| **Locale** | UI + card text from `locales/*.json` after language menu |

Zones: **Hand**, **Field** only (no separate log UI).  
**Inner** lives on container instances (`instance.inner[]`) in save state.

---

## B. Program IR ops (implemented)

| Op | Meaning |
|----|---------|
| `sequence` | Run children in order |
| `deal` | Spawn listed definitions into a zone |
| `spawn` | Create one instance in a zone |
| `set_slot` | Change title/text on an instance |
| `set_locale` | Switch `en` / `zh-Hans` |
| `set_locale_text` | Apply localized text key to instance |
| `fullscreen_enter` / `fullscreen_exit` | Browser fullscreen |
| `guide_start` | Start highlight queue |
| `highlight` | Turn hint overlay on/off |
| `reset_world` | Restore starter snapshot |
| `scene_push` / `scene_pop` | Scene stack |
| `art_editor_open` / `art_gallery_open` | Pixel tools |
| `music_embed_open` | HarmonyForge iframe |
| `open_url` | Same-origin URL only |

Attached on cards as `programs.on_play` (and run when card is **played** from hand → field, or **reusable** play from hand).

---

## C. Meta-rules — intent vs reality

**Intent:** Meta-rules are not hard-coded gameplay. Founders override them with programming cards and templates (**CREATOR-DECK.md**).

**Reality today:** The engine implements the table below in `js/app.js`. Players cannot change these rules in-game.

### C.1 Zones

| Zone | Role |
|------|------|
| `hand` | Private, playable strip |
| `field` | Shared table |
| `inner` | Inside a container instance |

### C.2 Play vs move

| Action | Trigger | Effect |
|--------|---------|--------|
| **Play** | Hand → Field | Run `on_play` (unless container/tool path) |
| **Take** | Field → Hand | Move only |
| **Inspect** | Tap | Zoom only |

### C.3 Container / backpack (engine-built)

Applies to cards with `container` and/or `deck` tags, and **Settings** (`founders.settings`).

| Action | Trigger | Effect |
|--------|---------|--------|
| **Open** | Container hand → field | Field stash; container first; pour `inner` after |
| **Take** | Field item → hand | Pick up (menu rows: activate, not stash) |
| **Close** | Container hand → field while open | Unpicked field → `inner`; restore stash |
| **Store** | Hand → hand on container / insert while open | Stash into `inner` (items only) |

Menu/meta cards (settings, language, guide, tools with `reusable` / `enter`) run from hand without leaving hand.

### C.4 Play styles (engine reads tags / `playStyle`)

| Style | Hand → Field |
|-------|----------------|
| **consume** (default) | Card moves to field, `on_play` runs |
| **reusable** | Stays in hand, `on_play` runs |
| **enter** | Stays in hand, opens tool UI; not stashed into open backpack |
| **echo** | To field + play, copy back to hand |

Players cannot define new styles until **Rule kit** + registry land (**CREATOR-DECK.md** §4).

---

## D. Not implemented yet

### VM / engine

- `define_card` — runtime card definitions
- `programDraft` / Program Desk session
- `on_tick` program loop
- `if` and conditions (e.g. `tick_mod_30`)
- `unload_inner`, `store_into` as IR ops (behavior exists imperatively only)
- Drop-on-card targeting (zone-only drops today)
- Response chains
- Pack install UI
- `state.ruleOverrides` registry

### Content

- **Creator Deck** in starter hand
- **Backpack** card (`seed.starter_deck` / `founders.backpack`) in definitions
- **Computer** entry card in world
- In-game `prog.export` (dev script: `npm run export-program`)

See **ROADMAP.md** for order.

---

## E. Highlight guide (current default)

`guide.start` steps (`seed/programs/guide.start.json`):

1. `founders.settings` (hand)  
2. `founders.language_settings` (field, after settings)  
3. `founders.lang_zh` (hand, after language menu)

Toggle hints with **Highlight On/Off** inside Settings.  
**Shop Script** card plays `guide.start`.

(Legacy docs that listed `world_controller` → `door` are obsolete.)

---

## F. Shop Script

**Shop Script** (`founders.shop_script`): drag to field → `guide.start` → one highlighted card at a time until played.

---

## G. Related docs

| Doc | Topic |
|-----|-------|
| **CREATOR-DECK.md** | Make cards and rules in-game |
| **DEMO.md** | What works in the current build |
| **CARD-ART.md** | Card face spec; 征战三国 alignment |
| **ROADMAP.md** | Phase order |
