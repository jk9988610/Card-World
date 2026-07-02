# P0 卡图 — 已完成资源与上传指南

**P0 四张：** `settings` · `pixel-board` · `music-studio` · `door`

仓库里已生成 **60×84 PNG**（程序绘制，可后续在征战三国绘制页重画覆盖）。

---

## 一、资源在哪

| artKey | 文件 | 对应 Card World slug |
|--------|------|----------------------|
| `settings` | `public/card-art/settings.png` | `founders.settings` |
| `pixel-board` | `public/card-art/pixel-board.png` | `art.tool.pixel` |
| `music-studio` | `public/card-art/music-studio.png` | `music.tool.studio` |
| `door` | `public/card-art/door.png` | `content.door` |

清单：`public/card-art/manifest.json`  
登记表：`seed/art-registry.json`（四条已标 `ready`）

---

## 二、本地重新生成（可选）

```bash
npm run generate-p0-art
npm run build-card-art-manifest
```

改图：编辑 `tools/generate-p0-card-art.mjs` 里的绘制函数，或在征战三国 **绘制** 页手动画同名 artKey 后导出 PNG 覆盖 `public/card-art/`。

---

## 三、上传到 Supabase（上线 CDN）

### 前提

1. Supabase 已建公共桶 **`card-art`**（征战三国 `supabase/schema-card-art-*.sql`）。
2. 本机有 **service_role** 密钥（Dashboard → Settings → API，勿提交 Git）。

### 一条命令

```bash
npm run generate-p0-art
npm run build-card-art-manifest

SUPABASE_URL=https://yjqkotqmglxjhlrhynsu.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=你的service_role密钥 \
npm run upload-card-art
```

成功后浏览器可访问：

```text
https://yjqkotqmglxjhlrhynsu.supabase.co/storage/v1/object/public/card-art/manifest.json
https://yjqkotqmglxjhlrhynsu.supabase.co/storage/v1/object/public/card-art/door.png
```

**Card World 引擎 Phase 0.6 落地前**，游戏内仍显示 8×8 占位；CDN 上的图供 manifest 加载器接好后使用。

---

## 四、在征战三国绘制页手动画（替换程序图）

若要用可视化编辑器细修：

1. 打开 https://jk9988610.github.io/Conquer-the-Three-Kingdoms/ → **绘制**
2. 在 artKey 列表选或新建：`settings` / `pixel-board` / `music-studio` / `door`  
   （若列表没有，需先在 CTTK 仓库 `src/game/types.ts` 的 `PixelArtKey` 里加上再部署）
3. 画布 **60×84**，背景 `#1a1a2e` 或透明
4. 画完 → **上传云端**（或导出资源包）
5. 若用导出包：把 PNG 拷到 Card World `public/card-art/`，再跑第三节上传命令

画面方向见 **ART-REGISTRY.md** §5 P0 表。

---

## 五、预览 PNG

```bash
# 本地静态服务后浏览器打开
npx serve public/card-art -p 3456
# http://localhost:3456/door.png
```

或在 IDE 里直接打开 `public/card-art/*.png`。

---

## 六、下一步（工程）

| 谁 | 做什么 |
|----|--------|
| **你** | 跑第三节上传（有 service_role 时） |
| **开发** | Phase 0.6：`art/ref` + manifest 加载器 |
| **开发** | 种子 `definitions.json` 改 `image: { "type": "art/ref", "artKey": "door" }` |

详见 **PLAN.md** 阶段 0.6。
