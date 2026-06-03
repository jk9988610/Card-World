-- Supabase Storage：art 桶策略（SQL Editor 执行）
-- 前提：已创建 Public bucket，名称 art
-- 对照编曲发布：audio 桶策略（同一 Supabase 项目）

-- 公开读取（美术素材库预览）
drop policy if exists "art_public_read" on storage.objects;
create policy "art_public_read"
  on storage.objects for select
  using (bucket_id = 'art');

-- 匿名上传（作品仓库 → 素材库）
drop policy if exists "art_anon_insert" on storage.objects;
create policy "art_anon_insert"
  on storage.objects for insert
  with check (bucket_id = 'art');

-- 匿名更新（upsert 覆盖）
drop policy if exists "art_anon_update" on storage.objects;
create policy "art_anon_update"
  on storage.objects for update
  using (bucket_id = 'art');
