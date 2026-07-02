# Card World

Everything is a card. The page is only **Field**, **Hand**, and **cards**.

## Play

https://jk9988610.github.io/Card-World/

1. Drag **Settings** from Hand to Field — pour the menu.
2. Drag a menu item to Hand to apply (language, fullscreen, reset, …).
3. Drag **Pixel Board** or **HarmonyForge** to Field (or double-tap) — open a creation tool; the card stays in Hand.
4. Optional: play **Shop Script** for step-by-step highlights.

## Local

```bash
node tools/build-seed.mjs
npx serve . -p 3000
```

## Docs

| Doc | Purpose |
|-----|---------|
| [docs/PLAN.md](docs/PLAN.md) | **完整规划步骤**（总览、依赖、里程碑） |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Platform principles and phases |
| [docs/RULES.md](docs/RULES.md) | Play rules, IR ops, meta-rules (current vs planned) |
| [docs/DEMO.md](docs/DEMO.md) | What works today and acceptance checks |
| [docs/CARD-ART.md](docs/CARD-ART.md) | Card art — align with [征战三国](https://github.com/jk9988610/Conquer-the-Three-Kingdoms) |
| [docs/ART-REGISTRY.md](docs/ART-REGISTRY.md) | Official `artKey` ↔ slug registry (`seed/art-registry.json`) |
| [docs/CREATOR-DECK.md](docs/CREATOR-DECK.md) | Creator Deck — make cards and rules in-game |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Prioritized roadmap |
| [docs/OFFLINE.md](docs/OFFLINE.md) | Offline-first and cloud |
| [docs/SUPABASE_ART.md](docs/SUPABASE_ART.md) | Art shop backend setup |
