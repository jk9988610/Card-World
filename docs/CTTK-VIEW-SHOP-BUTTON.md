# 征战三国 — 绘制页「查看商店」（内嵌全屏弹窗）

绘制页 **上传云端** 右侧的 **查看商店** 在征战三国项目内打开 **美术商店** 全屏弹窗，**不跳转 Card World 外链**。

## 功能

- 从 Supabase `art` 桶 + `art_shop_works` 表拉取作品（与 Card World 美术商店同源）
- 全屏 overlay 弹窗（可再点「全屏」进浏览器全屏）
- **导入画板**：将带 `pixel/v1` 的作品导入当前绘制画布
- **查看大图**：打开 PNG 预览

## 新增文件（CTTK 仓库）

| 文件 | 作用 |
|------|------|
| `src/art/artShopStorage.ts` | 列表 API |
| `src/art/pixelV1.ts` | pixel/v1 → 绘制网格 |
| `src/ui/artShopModal.ts` | 全屏弹窗 UI |

## 修改文件

| 文件 | 改动 |
|------|------|
| `src/art/cloudConfig.ts` | `ART_SHOP_BUCKET` / `ART_STORE_PREFIX` |
| `src/ui/pixelEditor.ts` | 按钮 + `openArtShopModal` |
| `src/style.css` | `.art-shop-overlay` 样式 |

## 应用方式

将 `patches/cttk-art-shop-modal/` 下文件覆盖到 [Conquer-the-Three-Kingdoms](https://github.com/jk9988610/Conquer-the-Three-Kingdoms) 对应路径，或：

```bash
cd /path/to/Conquer-the-Three-Kingdoms
git apply /path/to/Card-World/patches/cttk-art-shop-modal.patch
npm run build
git push
```

## 依赖

- 与 Card World 共用 Supabase 项目（`cloudConfig.ts` 已配置）
- `art` 桶 + `art_shop_works` 表（见 Card World `docs/SUPABASE_ART.md`）
