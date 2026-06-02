# Embedded apps (Card World local copies)

Apps here are **vendored copies** shipped with Card World. They run on the same GitHub Pages origin as the card game — **no iframe to external github.io sites**. Edit here without affecting the upstream project.

## `harmonyforge/`

Copy of [Music-production-website](https://github.com/jk9988610/Music-production-website) (HarmonyForge). Card World loads:

`embedded/harmonyforge/index.html`

via the in-app music console iframe. Edit files under this folder freely; the upstream site is unaffected.

### Re-sync from upstream (optional)

```bash
node tools/sync-harmonyforge.mjs
```

Then re-apply Card World–specific tweaks in `index.html` (cloud publish via `cloud-publish.js`, no external review site links) if the sync overwrote them.
