# Card World — Official Art Registry（官方卡图登记表）

**Machine-readable:** `seed/art-registry.json`  
**Pipeline:** [CARD-ART.md](CARD-ART.md) · **Paint tool:** [征战三国绘制页](https://jk9988610.github.io/Conquer-the-Three-Kingdoms/)

This file tracks which **`artKey`** each Card World definition should use once Phase 0.6 (`card-art` manifest loader) ships. Until then, definitions keep inline **8×8 `pixel/v1` placeholders**.

---

## 1. How to use this registry

### For artists / AI

1. Pick a row with `status: "todo"`.
2. Open 征战三国 → **绘制** → select or create the **artKey** (must match registry spelling).
3. Paint at **60×84** display (500×700 logical), 5:7.
4. **上传云端** (or export bundle + `npm run sync-art` in CTTK repo).
5. Set `status` to `"ready"` in `seed/art-registry.json` and commit.

### For developers (after Phase 0.6)

Definition image field becomes:

```json
{
  "image": {
    "type": "art/ref",
    "artKey": "door"
  }
}
```

Engine resolves via `manifestUrl` in `art-registry.json` → PNG + optional `meta.json`.

### For content packs

- One `artKey` may map to **multiple** `cardWorldSlugs` (e.g. five guide-weave cards).
- 征战三国角色卡 (`lvbu`, `liu`, …) are **ready** — reuse in Card World 三国主题包 without repainting.

---

## 2. Entry schema (`seed/art-registry.json`)

| Field | Type | Required | Meaning |
|-------|------|----------|---------|
| `version` | number | yes | Registry format version |
| `updatedAt` | ISO date | yes | Last human edit |
| `manifestUrl` | URL | yes | Supabase `card-art/manifest.json` |
| `cttkRepo` | URL | no | Reference repo |
| `cttkPaintUrl` | URL | no | In-browser paint entry |
| `entries[]` | array | yes | Rows below |

**Per entry:**

| Field | Type | Meaning |
|-------|------|---------|
| `artKey` | string | kebab-case; matches `{artKey}.png` on CDN |
| `cttkCatalogId` | string \| null | `catalog.ts` `id` in 征战三国, if shared |
| `cardWorldSlugs` | string[] | `definitions.json` slugs using this face |
| `title` | `{ en, zh-Hans }` | Human label |
| `status` | `ready` \| `todo` \| `wip` \| `deprecated` | Production state |
| `notes` | string | Brief art direction |

**Rules:**

- `artKey` must be unique across entries.
- Every official `definitions.json` slug with a visible face should appear in exactly one entry’s `cardWorldSlugs` (or explicitly use `generic`).
- New artKeys must be added to 征战三国 `PixelArtKey` type before upload (or upload will still work on CDN but editor dropdown won’t list them until CTTK sync).

---

## 3. Status summary

| Status | Count | Meaning |
|--------|-------|---------|
| **ready** | 14 | 征战三国内置 10 + Card World P0 四张（`public/card-art/`） |
| **todo** | 13 | 其余官方 slug 待绘制 |

---

## 4. 征战三国已有 artKey（可直接复用）

| artKey | 征战三国卡 | Card World 用途建议 |
|--------|-----------|---------------------|
| `generic` | 默认蓝块 | 临时占位 |
| `lvbu` | 吕布 | 三国内容包角色 |
| `liu` | 刘备 | 三国内容包角色 |
| `guan` | 关羽 | 三国内容包角色 |
| `zhang` | 张飞 | 三国内容包角色 |
| `heal-potion` | 治疗药水 | 道具示例 |
| `fangtian` | 方天画戟 | 装备示例 |
| `attack-red` | 赤刃斩 | 行动牌示例 |
| `attack-orange` | 烈阳突击 | 行动牌示例 |
| `attack-purple` | 紫电一击 | 行动牌示例 |

---

## 5. Card World 官方 slug → artKey 映射（待绘制）

**P0 四张已生成：** 见 **[P0-CARD-ART.md](P0-CARD-ART.md)**（含上传 Supabase 命令）。

Priority for first paint batch (**P0 faces** — in default hand or tutorial path):

| Priority | cardWorldSlug | artKey | 状态 |
|----------|---------------|--------|------|
| P0 | `founders.settings` | `settings` | **ready** — `public/card-art/settings.png` |
| P0 | `art.tool.pixel` | `pixel-board` | **ready** |
| P0 | `music.tool.studio` | `music-studio` | **ready** |
| P0 | `content.door` | `door` | **ready** |
| P1 | `founders.shop_script` | `guide-script` | 卷轴 + 脉冲箭头 |
| P1 | `founders.language_settings` | `lang-globe` | 地球或 A/文 |
| P1 | `founders.lang_en` | `lang-en` | “EN” |
| P1 | `founders.lang_zh` | `lang-zh` | “中” |
| P2 | `founders.fullscreen` | `fullscreen` | 四角外扩 |
| P2 | `founders.exit_fullscreen` | `exit-fullscreen` | 四角内收 |
| P2 | `founders.highlight_on` | `highlight-on` | 黄色光晕框 |
| P2 | `founders.highlight_off` | `highlight-off` | 灰色框 |
| P2 | `founders.reset_world` | `reset-world` | 循环箭头 |
| P2 | `founders.back` | `back` | 返回箭头 |
| P3 | `founders.guide_weave_*` | `guide-weave` | 编织/连线图案（可 1 图 5 卡） |
| P3 | `founders.world_controller` | `world-controller` | 遗留；低优先级 |
| P3 | `art.work.blank` | `art-blank` | 空白画框 |

Full list including empty `cardWorldSlugs` rows: **`seed/art-registry.json`**.

---

## 6. New entry template

Copy into `entries` in `seed/art-registry.json`:

```json
{
  "artKey": "my-new-key",
  "cttkCatalogId": null,
  "cardWorldSlugs": ["pack.my_card"],
  "title": { "en": "My Card", "zh-Hans": "我的卡" },
  "status": "todo",
  "notes": "One-line art direction for painter or AI"
}
```

**artKey naming:** lowercase kebab-case; `[a-z0-9-]` only; prefer noun or noun-phrase (`heal-potion`, not `HealPotion`).

---

## 7. AI prompt cheat sheet

```text
60×84 pixel art, aspect ratio 5:7, transparent background,
limited palette (8–16 colors), TCG card illustration,
no anti-aliasing, crisp pixels, subject: <notes column>
```

Export PNG at exactly **60×84**; name `<artKey>.png`; pair with `meta.json` only if highlight/breath needed.

---

## 8. Wiring checklist (when Phase 0.6 lands)

For each entry with `status: "ready"`:

- [ ] PNG exists at `{manifestUrl base}/{artKey}.png`
- [ ] `seed/art-registry.json` status = `ready`
- [ ] `definitions.json` slug uses `"image": { "type": "art/ref", "artKey": "…" }`
- [ ] Remove inline 8×8 `pixel/v1` from that definition
- [ ] `npm run validate-seed` passes (future rule: slug ↔ registry)

---

## 9. Related

| Doc / file | Role |
|------------|------|
| [CARD-ART.md](CARD-ART.md) | Grid, PNG, manifest spec |
| [ROADMAP.md](ROADMAP.md) § Phase 0.6 | Engine work order |
| 征战三国 `docs/art-assets.md` | Upload & Supabase setup |
| 征战三国 `src/game/catalog.ts` | `cttkCatalogId` source |
