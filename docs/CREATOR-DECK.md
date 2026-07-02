# Card World — Creator Deck（创作者卡组）

**Status:** Planned — **Phase 1** priority  
**Problem:** Today’s meta-rules cannot support players designing game rules. Play, containers, and tool entry are hard-coded in `js/app.js`. Players can *use* cards but not *author* cards or rules in-game.

**Goal:** A **Creator Deck** — a backpack of programming cards dealt to the Founder at start (or opened from Settings) — so players can **make cards** and **make rules** without editing JS or JSON files.

---

## 1. Why meta-rules fail today

| Area | Documented intent | Actual behavior |
|------|-------------------|-----------------|
| Play / Take / Inspect | Card-defined meta-rules | Fixed in `handleZoneDrop`, `playFromHand`, `playCard` |
| Container open/close | IR ops `unload_inner`, `store_into` | Imperative JS (`openContainerFromHand`, `stashIntoContainer`, …) |
| Play styles | `consume` / `reusable` / `enter` / `echo` | Engine reads `tags` / `playStyle` — players cannot define new styles |
| New definitions | `define_card` | **Not implemented** — only `seed/definitions.json` at build time |
| Programs | Compose in Program Desk | **No desk** — devs use `tools/export-program.mjs` |
| Tick / react | `on_tick`, response chains | **Not implemented** |
| Rules text | Rules card on field | No dynamic rule registry |

Players can paint and compose music, but they **cannot** say “when this card hits the field, spawn three wolves” or “this backpack uses a custom store rule” without a developer ship.

---

## 2. Creator Deck — player-facing model

One **container card** (backpack) in Hand: **Creator Deck**.

```text
Creator Deck (container + deck)
├── Tutorial        — how to use the deck (text card)
├── Program Desk    — compose IR on the Field, Test, Attach
├── Define Card     — wizard: slug, title, text, image, tags
├── Attach Program  — bind compiled program id to selected instance
├── Recipe kit      — one card per IR op (see §3)
├── Rule kit        — play-style and event templates (see §4)
├── Test Bench      — spawn test instance, run last program
└── Export Pack     — download definitions + programs JSON (bridge)
```

**Core loop (same as original Phase 0 vision):**

```text
Edit on Program Desk → Test on Field → Attach to card → Save World
```

All steps use **drag and play** — no code editor in P1.

---

## 3. Recipe kit (make behavior)

Each recipe card is a **reusable** programming card. On play from hand, it **appends** its op node to the program open on Program Desk (or spawns a one-node program).

| Card | IR op | Params set on play |
|------|-------|-------------------|
| **Sequence** | `sequence` | Add child slot |
| **Deal** | `deal` | Pick definition slugs + zone |
| **Spawn** | `spawn` | Pick slug + zone |
| **Set Title** | `set_slot` | `slot: title`, text |
| **Set Text** | `set_slot` | `slot: text`, text |
| **Set Locale** | `set_locale` | `en` / `zh-Hans` |
| **Highlight On/Off** | `highlight` | |
| **Push Scene** | `scene_push` | scene id |
| **Pop Scene** | `scene_pop` | |
| **Open Art** | `art_editor_open` | |
| **Open Music** | `music_embed_open` | |

Phase 1.5+: `if`, `deal` with conditions, `on_tick` hook cards.

Program Desk holds a **working program** in session state (`state.programDraft`). **Test** runs `entry` with a chosen target instance. **Attach** writes `programs.on_play` (or other event) on the target definition.

---

## 4. Rule kit (make rules)

Rules are not a separate language — they are **definitions + programs + tags** the VM already understands, authored through cards.

### 4.1 Event attachment cards

| Card | Sets on target |
|------|----------------|
| **On Play** | `programs.on_play` → current draft program id |
| **On Tick** | `programs.on_tick` (after VM gains tick loop) |
| **On Store** | `programs.on_store` (after drop-on-card targeting) |

### 4.2 Play-style cards

| Card | Effect on target definition |
|------|----------------------------|
| **Style: Consume** | default — move to field, run program |
| **Style: Reusable** | tag `reusable` |
| **Style: Enter** | tag `reusable` + `playStyle: enter` or tool program |
| **Style: Echo** | tag `echo` |

### 4.3 Container rule template

| Card | Effect |
|------|--------|
| **Template: Container** | tags `container`, optional `deck`; default `on_play` → pour inner |
| **Template: Menu** | like Settings — reusable submenu pattern |
| **Rules Document** | spawns a text card listing active rule slugs + version |

### 4.4 Longer term: rule registry

Save blob gains `state.ruleOverrides[]` — entries `{ id, match: { tag?, slug? }, playStyle?, allowStore? }` applied before hard-coded defaults. **Rules Document** card reflects registry for humans; changing rules = play rule cards, not edit JS.

P1 can ship without full registry by only supporting **per-definition** tags and programs via Define + Attach.

---

## 5. Define Card (make cards)

**Define Card** play flow:

1. Prompt slots (modal or sequential play of sub-cards): **slug**, **title**, **text**.
2. Optional: **Paint Image** — opens art editor, writes `image: pixel/v1` on definition.
3. Optional: **Add Tags** — pick from list or type slug prefix (`content.*`, `game.*`).
4. VM op `define_card` registers into runtime `defBySlug` and `state.customDefinitions[]`.
5. **Spawn Copy** — `spawn` one instance to hand for testing.

### `define_card` IR (engine)

```json
{
  "op": "define_card",
  "params": {
    "slug": "player.my_door",
    "title": "Door",
    "text": "Closed",
    "tags": ["content"],
    "image": { "type": "pixel/v1", "..." : "..." },
    "programs": {}
  }
}
```

Persist custom definitions inside save JSON so reload keeps player-authored cards.

---

## 6. VM work required (engine, not cards)

Minimum to unblock Creator Deck:

| # | Work | Unblocks |
|---|------|----------|
| E1 | `state.customDefinitions` + `define_card` op + persist in save | Define Card |
| E2 | `state.programDraft` + compile/attach program id to definition | Program Desk, Attach |
| E3 | Program Desk UI shell (field zone for draft graph or ordered list) | Recipe kit |
| E4 | `deal` creator deck in `starter-world` or bootstrap program | First-time Founder |
| E5 | Export bridge: download `pack.json` (defs + programs) | Export Pack |
| E6 | `on_tick` loop + `if` / `tick_mod_n` | Flagship-style games |
| E7 | Drop-on-card targeting + `store_into` | Container rules in IR |
| E8 | Rule registry (optional P1.5) | True meta-rule overrides |

Cards and seed JSON can be written **before** E6–E8; those ops simply stay “locked” recipe cards until the VM catches up.

---

## 7. Creator Deck seed layout (target)

New pack: `seed/packs/official.creator-deck.json`

```json
{
  "slug": "official.creator-deck",
  "title": "Creator Deck",
  "kind": "deck",
  "installTarget": "hand",
  "includes": {
    "definitions": [ "..." ],
    "programs": [ "..." ]
  }
}
```

Starter change (when E4 lands): add to hand:

```json
{
  "definitionSlug": "founders.creator_deck",
  "instanceId": "inst_creator_deck_1",
  "inner": [
    { "definitionSlug": "prog.desk", "instanceId": "..." },
    { "definitionSlug": "prog.define_card", "instanceId": "..." }
  ]
}
```

Tutorial card text (locale keys `cards.creator_tutorial`) explains the loop in ≤ 8 lines.

---

## 8. AI-friendly content after engine lands

Once E1–E5 exist, most expansion is **data**:

- New recipe cards = one IR node each.
- Example worlds = `starter-world` variants + `deal` programs.
- Quest packs = `define_card` + `attach` sequences exported as packs.
- Pixel card faces = `pixel/v1` blobs in definitions.
- Locale strings in `locales/*.json`.

AI should **not** need to touch `app.js` for new player content.

---

## 9. Acceptance (Creator Deck done)

1. Fresh world includes Creator Deck in hand.
2. Player defines a new card (title/text/image) — appears in `spawn` lists.
3. Player builds `on_play` with Recipe cards on Program Desk — Test spawns effect on field.
4. Player attaches program to definition — playing that card from hand works.
5. Save/reload — custom definitions and programs restore.
6. Export downloads valid pack JSON; `validate-seed` passes on merged bundle.

See **ROADMAP.md** for sprint order.
