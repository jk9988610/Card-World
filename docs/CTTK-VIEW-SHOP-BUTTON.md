# 征战三国 —「查看商店」按钮补丁

绘制页 **上传云端** 右侧新增 **查看商店**，新标签打开 Card World 美术商店：

`https://jk9988610.github.io/Card-World/?gallery=shop`

## 应用补丁（Conquer-the-Three-Kingdoms 仓库）

```bash
cd /path/to/Conquer-the-Three-Kingdoms
git apply /path/to/Card-World/patches/cttk-view-art-shop-button.patch
npm run build
git push
```

或手动改两处：

1. `src/art/cloudConfig.ts` — 增加 `CARD_WORLD_ART_SHOP_URL`
2. `src/ui/pixelEditor.ts` — 按钮 HTML + `data-view-shop` 点击事件

## Card World 侧

需合并 PR：`?gallery=shop` 深链（`js/app.js` `maybeOpenGalleryFromQuery`），部署后「查看商店」才会直接打开画廊的 **美术商店** Tab。
