# Card World — Rules (current and planned)

## A. UI rules (engine, today)

| Rule | Behavior |
|------|----------|
| **Tap** | Enlarge card only (no game effect) |
| **Drag Hand → Field** | **Play** — run `on_play` program |
| **Drag Field → Hand** | **Take** — move only |
| **Highlight** | Optional yellow pulse on “next step” cards |
| **Locale** | Card text from `locales/*.json` after Language cards are played |

Zones: **Hand**, **Field** only (no separate log UI).

---

## B. Program IR ops (today)

| Op | Meaning |
|----|---------|
| `sequence` | Run children in order |
| `deal` | Spawn listed definitions into a zone |
| `spawn` | Create one instance in a zone |
| `set_slot` | Change title/text on an instance |
| `set_locale` | Switch `en` / `zh-Hans` |
| `set_locale_text` | Apply localized text key to instance |
| `fullscreen_enter` / `fullscreen_exit` | Browser fullscreen |
| `highlight` | Turn hint overlay on/off |

Attached on cards as `programs.on_play` and run only when card is **played** (dragged Hand → Field).

---

## C. Meta-rules (platform — should be card-defined)

Meta-rules are **not** hard-coded gameplay. They are defaults the VM provides; **Founders** (and players) override them with programming cards and card templates.

### C.1 Zones

| Zone | Role |
|------|------|
| `hand` | Private, playable strip |
| `field` | Shared table |
| `inner` | Inside a **container** instance (not on table until unloaded) |

### C.2 Play vs move

| Action | Trigger | Effect |
|--------|---------|--------|
| **Play** | Hand → Field | Run `on_play` |
| **Take** | Field → Hand | Move only |
| **Inspect** | Tap | Zoom only |

### C.3 Backpack / container (v0.5 — built-in)

**Backpack** cards (`container` + `deck` tags) carry `inner: [instances]` in save state.

| Action | Trigger | Effect |
|--------|---------|--------|
| **Open** | Drag backpack Hand → Field | Other field cards → `fieldStash` (hidden); container at index 0; `inner` poured after it |
| **Pour** | Same as Open | Spilled items appear on field after the container card |
| **Take** | Drag spilled item Field → Hand | Pick up item (menu/function cards: select, not stash) |
| **Close** | Drag backpack Hand → Field (container on field) | Unpicked field cards → `inner`; backpack → hand; `fieldStash` restored to field |

While a container is open, only the container row is visible on the field; stashed cards are not rendered until close.

Meta cards (settings, language, tutorial, guide, controller, programming) use **play from hand** only: reusable cards run `on_play` without leaving the hand.

### C.4 Programming cards for containers (programs)

| Programming card | IR / op |
|------------------|---------|
| `On Play` | Event |
| `Unload Inner` | `unload_inner` → inner → hand |
| `On Store` | Event when card dropped onto this container |
| `Accept Store` | `store_from_hand`, `store_from_field` |

Founders build a **Container template** with `programs.on_play = unload_inner` and `tags: [container]`.

### C.5 Meta-rule document card (recommended)

One **Rules** card on Field (or in Settings deck) lists platform rules in Text slot; versions with `version` imprint. Players change rules by publishing new Rules packs, not by editing JS.

---

## D. What we do **not** have yet

- `inner` zone in VM state
- Drop-on-card targeting (only drop on zones)
- `unload_inner` / `store` ops
- Response chains (“when X plays, Y may respond”)
- Card storage limits, ordering inside container

---

## E. Suggested order of work

1. **VM:** `instance.inner[]`, `containedIn` pointer  
2. **Drop target:** container cards accept drag  
3. **Ops:** `unload_inner`, `store_into`  
4. **Sample:** Box + A + B Founders pack  
5. **Highlight:** after unload, hint “drag A to Field”; after play, hint “store A into Box”  
6. **Rules card** in Settings deck explaining Store/Play/Take  

---

## F. Highlight guide steps (v0.3.1)

Dynamic `hintTarget` slug — one card pulsed at a time:

1. `founders.world_controller` (hand)  
2. `content.door` (field, after bootstrap)  
3. `founders.settings` (field)  
4. `founders.language_settings` (hand, after settings played)  
5. `founders.lang_zh` or `founders.lang_en` (hand, after language settings played)  

Toggle off with **Highlight Off** card.

## G. Play styles (meta-rules + tags)

| Style | Hand → Field |
|-------|----------------|
| **consume** (default) | Card moves to Field, `on_play` runs |
| **reusable** | Stays in Hand, `on_play` runs |
| **enter** | Stays in Hand, `on_play` opens tool UI (`art.editor.open`, `music.embed.open`); never stashed into open backpack |
| **echo** | To Field + play, copy back to Hand |

Tags: `reusable`, `echo`, or field `playStyle`. Enter tools are also detected by `programs.on_play`.

## H. Shop Script

**Shop Script** on Field starts guided highlights — one target card at a time until you play it.
