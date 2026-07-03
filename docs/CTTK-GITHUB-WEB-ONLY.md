# 征战三国 — 纯 GitHub 网页操作（不用手机本地 Git）

所有改动已准备在 Card World 仓库：

**`imports/conquer-three-kingdoms/`**

打开征战三国仓库网页即可复制粘贴，**无需 Termux / SSH / 本地 push**。

仓库地址：https://github.com/jk9988610/Conquer-the-Three-Kingdoms

---

## 一次性部署（约 10 分钟）

### 第 1 步：新建 3 个文件

在 GitHub 上进入对应目录 → **Add file** → **Create new file**，文件名与内容从本仓库复制：

| 在征战三国创建路径 | 复制内容来源（Card World 仓库） |
|-------------------|--------------------------------|
| `src/art/artShopStorage.ts` | `imports/conquer-three-kingdoms/src/art/artShopStorage.ts` |
| `src/art/pixelV1.ts` | `imports/conquer-three-kingdoms/src/art/pixelV1.ts` |
| `src/ui/artShopModal.ts` | `imports/conquer-three-kingdoms/src/ui/artShopModal.ts` |

每个文件：粘贴全文 → 底部 **Commit changes** → 建议说明 `feat: add art shop modal files`。

### 第 2 步：替换 2 个大文件（整文件覆盖）

点铅笔 **Edit**，**全选删除**原内容，粘贴 Card World 里对应完整文件：

| 征战三国文件 | Card World 来源 |
|-------------|-----------------|
| `src/art/cloudConfig.ts` | `imports/conquer-three-kingdoms/src/art/cloudConfig.ts` |
| `src/ui/pixelEditor.ts` | `imports/conquer-three-kingdoms/src/ui/pixelEditor.ts` |

Commit message：`feat: wire 查看商店 to embedded art shop modal`

### 第 3 步：追加 CSS（不要覆盖整个 style.css）

1. 打开征战三国 `src/style.css` → **Edit**
2. 滚到**文件最末尾**
3. 粘贴 `imports/conquer-three-kingdoms/style-append.css` 的全部内容
4. Commit：`style: art shop fullscreen overlay`

### 第 4 步：等 GitHub Actions 部署

征战三国 push 到 `main` 后，Actions 会自动发布 Pages。  
约 1–2 分钟后打开：

https://jk9988610.github.io/Conquer-the-Three-Kingdoms/

→ **绘制** → 点 **查看商店**，应出现全屏美术商店弹窗。

---

## 以后怎么改（日常纯网页流程）

1. 打开 https://github.com/jk9988610/Conquer-the-Three-Kingdoms  
2. 找到要改的文件 → 铅笔 **Edit**  
3. 改完 → **Commit changes**（可直接 commit 到 `main`）  
4. 等 Actions 跑完 → 刷新 Pages  

**不需要** `git pull` / `git push` / Termux。

### 常用入口

| 想改什么 | 文件 |
|---------|------|
| 商店列表逻辑 | `src/art/artShopStorage.ts` |
| 弹窗 UI | `src/ui/artShopModal.ts` |
| 绘制页按钮 | `src/ui/pixelEditor.ts`（搜 `data-view-shop`） |
| 弹窗样式 | `src/style.css`（搜 `art-shop-overlay`） |
| 卡图上传云端 | `src/art/artCloudUpload.ts` |

---

## 与 Card World 的关系

- **征战三国**：独立运行；绘制页内嵌美术商店弹窗  
- **Card World**：同一 Supabase 的 `art` 桶 / `art_shop_works` 表；用户在 Card World 上传的作品会出现在征战三国商店里  
- **不再使用**外链跳转到 Card World  

---

## 若网页编辑 `pixelEditor.ts` 太慢

可在 GitHub 该文件页 **Raw** 打开 Card World 的完整文件，或本仓库：

`imports/conquer-three-kingdoms/src/ui/pixelEditor.ts`

下载后 GitHub 网页 **Upload files** 覆盖（同一目录下拖拽上传）。
