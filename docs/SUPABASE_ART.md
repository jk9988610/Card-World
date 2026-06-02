# Supabase `art` 存储桶 — 配置与上传

Card World 将作品仓库中的像素画导出为 PNG，并上传到你在 Supabase 创建的 **`art`** 存储桶。

## 1. Supabase 控制台

1. 打开 [Supabase Dashboard](https://supabase.com/dashboard) → 你的项目。
2. **Storage** → 确认已有 bucket **`art`**（名称需与配置一致）。
3. **Project Settings → API** 复制：
   - **Project URL** → `SUPABASE_URL`
   - **anon public** key → `SUPABASE_ANON_KEY`

## 2. 本地配置

```bash
cp js/supabase-config.example.js js/supabase-config.js
```

编辑 `js/supabase-config.js`，填入 URL 与 anon key。

## 3. Storage 策略（允许匿名上传示例）

在 SQL Editor 中可按需调整。开发测试可用较宽松策略；上线请改为 **已登录用户** + RLS。

```sql
-- 允许所有人读取 art 桶内文件（公开素材库）
create policy "art public read"
on storage.objects for select
using ( bucket_id = 'art' );

-- 允许匿名上传（仅测试；生产请改为 auth.uid() = owner）
create policy "art anon insert"
on storage.objects for insert
with check ( bucket_id = 'art' );

create policy "art anon update"
on storage.objects for update
using ( bucket_id = 'art' );
```

若 bucket 为 **Private**，上传仍可进行，但 `getPublicUrl` 需配合 signed URL 或改为 authenticated 下载。

## 4. 应用内流程

1. 美术控制台 → 像素画板绘画。
2. **导出** → 填写作品名与正文 → **导出作品**。
3. **作品仓库** 中查看；点 **上传到美术素材库** 调用 `storage.from('art').upload(...)`。
4. 对象路径：`works/{workId}/{title}.png`。

## 5. 与 Beat Battle 的对应关系

若你在 Beat Battle 中用过类似代码，模式相同：

```javascript
const { data, error } = await supabase.storage
  .from("art")
  .upload(filePath, file, { contentType: "image/png", upsert: true });
```

Card World 将配置集中在 `js/supabase-config.js`，上传逻辑在 `js/art-storage.js`。

## 6. GitHub Pages 部署注意

- `supabase-config.js` **不要提交**到公开仓库（已在 `.gitignore`）。
- 静态站部署时，在构建机或本地生成该文件后再部署；或使用 CI 密钥注入（后续可加）。
