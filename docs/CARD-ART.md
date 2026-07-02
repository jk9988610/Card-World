# Card World — Card Art（卡图制作）

**Reference project:** [Conquer-the-Three-Kingdoms](https://github.com/jk9988610/Conquer-the-Three-Kingdoms)（征战三国 TCG）  
**Status:** Documented target — **not yet aligned in Card World code**

Card World and 征战三国 share the same author and Supabase project. **Card art production should follow the 征战三国 pipeline** so official assets, player uploads, and AI-generated faces are interchangeable.

See also: 征战三国 `docs/art-assets.md` (upstream).

---

## 1. Design goal

| Goal | Meaning |
|------|---------|
| **One visual language** | Same TCG proportions, pixel density, and export bundle across both games |
| **Paint in-game or import** | Pixel editor + image crop/import → standard grid |
| **Ship as data** | PNG + optional `meta.json`; no per-card canvas code in production |
| **CDN + cache** | Supabase `card-art` manifest; browser IndexedDB cache (征战三国 pattern) |
| **AI-friendly** | Fixed grid + palette rules → batch-generate `pixel/v1` or PNG packs |

Card World cards are **5:7 portrait shells** with **Title / Image / Text**. The **image slot** should match 征战三国’s inner art frame (also **5:7**), not a separate landscape crop.

---

## 2. 征战三国 spec (what we mimic)

### 2.1 Card shell

| Item | Value |
|------|-------|
| TCG size | **63.5 × 88.9** logical units (standard 2.5"×3.5") |
| Aspect | **5 : 7** (height > width) |
| Inner margin | **3%** each side (art frame inset) |
| Layers | **Pixel art layer** + **text layer** (name, description, optional stats) |

Source: `Conquer-the-Three-Kingdoms/src/tcg/dimensions.ts`

### 2.2 Pixel grid

| Layer | Size | Role |
|-------|------|------|
| **Logical grid** | **500 × 700** | Editor draw resolution; 5:7 |
| **Display grid** | **60 × 84** | On-card pixel look (~8× block upscale) |
| **Export PNG** | **60 × 84** | Shipped asset (`{artKey}.png`) |

Source: `Conquer-the-Three-Kingdoms/src/art/gridConfig.ts`

### 2.3 Runtime format

- **Packed grid:** `Uint32Array`, **ARGB** per cell, `0` = transparent  
- **Fallback:** procedural default block (`createDefaultCardArtPacked`)  
- **Effects meta:** `{artKey}.meta.json` — highlight mask (base64), breath speed, future animations  
- **Manifest:** `manifest.json` lists `artKey` → `png` + `meta` + `baseUrl`  
- **Cache:** IndexedDB after network fetch  

Source: `packedGrid.ts`, `artMeta.ts`, `artManifest.ts`, `artCache.ts`

### 2.4 Workflows (征战三国)

```text
A. In-game paint → Upload cloud → manifest + PNG on Supabase
B. In-game paint → Export bundle → public/cards/ → npm run sync-art
C. Import image → crop 5:7 → downsample to 500×700 → edit → export
```

绘制页: https://jk9988610.github.io/Conquer-the-Three-Kingdoms/ → **绘制**

---

## 3. Card World today (gaps)

### 3.1 What we have

| Item | Card World today |
|------|------------------|
| Card shell | 5:7 TCG (`--tcg-ratio-w/h` in `css/main.css`) ✓ |
| Image frame on card | **7:5 landscape** (`--card-image-ratio-w/h`) ✗ mismatches 征战三国 |
| Editor grid | **35 × 25** (7:5) in `js/app.js` |
| Seed card faces | **8 × 8** `pixel/v1` icons — placeholders only |
| Storage format | `pixel/v1` — palette index + `pixels[]` |
| Cloud | Bucket `art` + table `art_shop_works` (**SUPABASE_ART.md**) |
| Export | PNG + `pixel/v1` in shop meta; no `meta.json` effects |

### 3.2 Problems

1. **Aspect mismatch** — editor and image frame are 7:5; 征战三国 art is 5:7. Faces look cropped or letterboxed wrong if we swap assets blindly.  
2. **Resolution mismatch** — 35×25 vs 60×84 display / 500×700 logical.  
3. **Format mismatch** — `pixel/v1` vs packed ARGB + PNG-first CDN.  
4. **No manifest lane** — Card World does not read `card-art` manifest yet.  
5. **No import pipeline** — no crop/downsample from photo (征战三国 has `imageToGrid.ts`).  
6. **No effect layer** — no highlight / breath meta on card faces.

---

## 4. Target alignment (Card World)

### 4.1 Single source of truth

```text
┌─────────────────────────────────────────────────────────┐
│  Conquer-the-Three-Kingdoms 绘制 / import / upload       │
│       ↓                                                 │
│  60×84 PNG + meta.json + artKey                         │
│       ↓                                                 │
│  Supabase bucket: card-art/manifest.json                │
│       ↓                                                 │
│  Card World: load by artKey OR embed pixel/v1 converted │
└─────────────────────────────────────────────────────────┘
```

**Rule:** New official Card World faces are **authored in 征战三国 tooling** (or a shared module extracted later), not redrawn at 8×8 in `definitions.json`.

### 4.2 Card layout target

| Slot | Target |
|------|--------|
| Shell | Keep 5:7 TCG |
| Image frame | Change to **5:7** (match inner frame math from 征战三国) |
| Title / Text | Unchanged slots; text may overlay like 征战三国 `text-layer` later |

### 4.3 Data formats (coexistence plan)

| Format | Use |
|--------|-----|
| **PNG 60×84** | CDN, thumbnails, cross-game |
| **meta.json v1** | Optional effects (highlight, breath) |
| **pixel/v1** | In-save editor round-trip; converted from packed grid for Creator Deck |
| **artKey** | String on definition (`image.artKey` or `image.ref`) → manifest lookup |

Conversion utilities (future `tools/`):

- `pixel-v1-to-png.mjs` — rasterize for shop/CDN  
- `import-cttk-bundle.mjs` — manifest entry → seed `definitions.json` patch  

### 4.4 Supabase buckets (one project)

| Bucket / table | Owner | Purpose |
|----------------|-------|---------|
| `card-art` | 征战三国 + official Card World art | Manifest + PNG + meta |
| `art` + `art_shop_works` | Card World players | User pixel shop (**SUPABASE_ART.md**) |
| `audio` + `published_works` | HarmonyForge | Music publish |

Player shop uploads may **promote** to `card-art` after review (征战三国 `schema-card-art-catalog.sql` is the future catalog).

---

## 5. Production workflows

### 5.1 Official content (recommended now, no Card World code change)

1. Open 征战三国 → **绘制**  
2. Paint at 60×84 display (500×700 logical)  
3. **上传云端** or export bundle  
4. Note `artKey` (e.g. `lvbu`, `heal-potion`)  
5. In Card World seed (interim): keep placeholder `pixel/v1` until loader lands; track `artKey` in pack README  

### 5.2 Player / Creator Deck (after engine work)

1. **Define Card** → **Paint Image** opens editor aligned to **60×84 / 5:7**  
2. Optional **Import image** (crop + downsample, port `imageToGrid` behavior)  
3. Save → `pixel/v1` in world save + optional upload to `art` shop  
4. Export pack includes image blob  

### 5.3 AI batch generation

AI should output against fixed constraints:

```yaml
canvas: 60x84   # or 500x700 if vector upscale
aspect: 5:7
background: transparent_or_#1a1a2e
style: limited_palette_pixel   # 8-16 colors
export: png + optional pixel/v1
```

Prompt template: *"60×84 pixel art, 5:7, transparent background, TCG card illustration, …"*

Validate with nearest-neighbor upscale preview at 8× before commit.

### 5.4 Dev seed placeholders

Until alignment ships, `seed/definitions.json` may keep tiny 8×8 `pixel/v1` swatches **tagged `placeholder`**. Do not invest in manual 8×8 art — replace via manifest import.

---

## 6. Implementation checklist (when coding starts)

| # | Task | Blocks |
|---|------|--------|
| A1 | Image frame CSS → **5:7** | Correct display |
| A2 | Editor grid → **60×84** (or 500×700 + downscale preview) | Paint parity |
| A3 | `drawPixelImage` support transparent `pixel/v1` | Alpha faces |
| A4 | `artKey` + fetch from `card-art` manifest | Shared CDN art |
| A5 | IndexedDB cache (port `artCache.ts` concepts) | Offline faces |
| A6 | Image import modal (crop 5:7, downsample) | Photo → card |
| A7 | Export PNG + meta.json from editor | 征战三国 bundle compat |
| A8 | Migrate seed defs: `artKey` refs for official cards | Visual quality |

**Do not start A1–A8 in the doc-only pass.** Track in **ROADMAP.md** § Phase 0.6.

---

## 7. Creator Deck connection

**Define Card** paint step must use this spec (**CREATOR-DECK.md** §5):

- Player-authored faces = same grid as official art  
- Attached `image.artKey` or embedded `pixel/v1` at **60×84**  
- Export pack includes images compatible with 征战三国 manifest entries  

---

## 8. Acceptance (card art aligned)

1. Card image frame is **5:7** on screen.  
2. Editor default canvas is **60×84** (display) with 5:7 preview on card.  
3. Loading `artKey: lvbu` from `card-art` manifest renders on a Card World card.  
4. PNG exported from Card World editor opens in 征战三国绘制 import without aspect distortion.  
5. New seed content uses `artKey` or ≥60×84 `pixel/v1`, not 8×8 placeholders.

---

## 9. Related files

| Repo | Path |
|------|------|
| 征战三国 | `src/art/gridConfig.ts`, `pixelArt.ts`, `packedGrid.ts`, `artMeta.ts` |
| 征战三国 | `src/ui/pixelEditor.ts`, `imageImportModal.ts` |
| 征战三国 | `docs/art-assets.md` |
| Card World | `js/app.js` (`ART_GRID_*`, `artPixelImageFromEditor`, `drawPixelImage`) |
| Card World | `css/main.css` (`--card-image-ratio-*`) |
| Card World | `docs/SUPABASE_ART.md` |
