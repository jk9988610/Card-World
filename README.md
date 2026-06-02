# Card World

Everything is a card. Program the world from Hand + Field.

## Docs

- [docs/DEMO.md](docs/DEMO.md) — demo + first player playbook + tools
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — architecture

## Tools (first player / dev)

```bash
npm run validate-seed
npm run build-seed
npm run export-program -- seed/programs/door.on_play.json
npm run export-program -- seed/programs/door.on_play.json --out seed/generated/door.cards.json
```

- **`prog.export`** card: in-game export in Phase 1; use **`export-program`** script now.

## Founders seed

Built as the first player would: `seed/definitions.json`, `seed/programs/`, `seed/packs/official.*`, `seed/starter-world.json`.

**Play flow (when engine exists):** Play World Controller → programming cards dealt → Door spawned → Play Door opens.
