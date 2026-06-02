# Offline-first (Card World)

Card World is designed for **disconnected use**. Network is only needed when you explicitly opt in.

## Default behavior

| Feature | Offline | Needs Cloud + network |
|---------|---------|------------------------|
| Cards, backpack, settings, scenes | Yes | — |
| Pixel board, local works repo | Yes | — |
| HarmonyForge (`embedded/harmonyforge/`) | Yes | Publish / shop / sync |
| App update check | — | User taps **Update** |
| Art shop upload / cloud gallery | — | **Cloud on** in top bar |

## Cloud (upload only)

- **Default**: cloud off — no Supabase calls.
- **Upload / art shop**: cloud turns on automatically while online (no top-bar toggle).

## Technical notes

- `js/net-policy.js` — opt-in and `navigator.onLine` gate.
- `sw.js` — caches same-origin shell; falls back when offline after first load.
- No automatic `version.json` fetch on startup (only **Update** button).
- No Google Fonts in embedded HarmonyForge (system fonts).
- External URLs are blocked from `openExternalUrl` (same-origin only).

## Rebuild vendored Supabase

```bash
npm install @supabase/supabase-js@2.49.1 --no-save
node tools/vendor-supabase.mjs
```
