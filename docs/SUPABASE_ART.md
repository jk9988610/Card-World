# Supabase `art` 存储桶 — 配置与上传

Card World 将作品仓库中的像素画导出为 PNG，并上传到你在 Supabase 创建的 **`art`** 存储桶。

## 1. Supabase 控制台

1. 打开 [Supabase Dashboard](https://supabase.com/dashboard) → 你的项目。
2. **Storage** → 确认已有 bucket **`art`**（名称需与配置一致）。
3. **Project Settings → API** 复制：
   - **Project URL** → `SUPABASE_URL`
   - **anon public** key → `SUPABASE_ANON_KEY`

## 2. 配置（默认无需手填）

与 [Beat-Battle](https://github.com/jk9988610/Beat-Battle) 相同，项目在 `js/cloud-config.js` 中**内置** Supabase URL 与 anon key，打开即可上传/浏览美术商店。

可选：在浏览器 localStorage 覆盖 `cardworld-cloud-config`（与 Beat-Battle 的 `beat-battle-cloud-config` 类似）。

旧方式 `js/supabase-config.js` 仍可作为备用覆盖（若存在则 `art-storage` 可后续扩展读取）。

## 3. Storage 策略

与 [Beat-Battle](https://github.com/jk9988610/Beat-Battle) 的 `audio` 桶相同写法：在 SQL Editor 执行本仓库：

**`supabase/schema-art-storage-policies.sql`**

（Beat-Battle 对照文件：`supabase/schema-storage-policies.sql`）

若 bucket 为 **Private**，上传仍可进行，但 `getPublicUrl` 需配合 signed URL 或改为 authenticated 下载。

可与 Beat-Battle **共用同一 Supabase 项目**：一个项目里 `audio` 桶存音频，`art` 桶存像素画 PNG。

## 4. 应用内流程

1. 美术控制台 → 像素画板绘画。
2. **导出** → 填写作品名与正文 → **导出作品**。
3. **作品仓库** 中查看；点 **上传到美术素材库** 调用 `storage.from('art').upload(...)`。
4. 对象路径：`works/{workId}/{title}.png`。

## 5. 与 Beat-Battle 的对应关系

| Beat-Battle | Card World |
|-------------|------------|
| `js/remote.js` → `uploadAudioToCloud` | `js/art-storage.js` → `uploadArtPng` |
| `storage.from('audio').upload(...)` | `storage.from('art').upload(...)` |
| `js/config.js` / `config.example.js` | `js/supabase-config.js` / `.example.js` |
| `js/supabase-error.js` | 同路径（错误文案） |
| `published/{userId}/{workId}.ext` | `works/{workId}/{title}.png` |

Beat-Battle 参考：[remote.js](https://github.com/jk9988610/Beat-Battle/blob/main/js/remote.js)、[published-works.js](https://github.com/jk9988610/Beat-Battle/blob/main/js/published-works.js)。

## 6. GitHub Pages 部署注意

- `supabase-config.js` **不要提交**到公开仓库（已在 `.gitignore`）。
- 静态站部署时，在构建机或本地生成该文件后再部署；或使用 CI 密钥注入（后续可加）。
