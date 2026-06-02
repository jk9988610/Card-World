-- =============================================================================
-- Card World — Art Shop (Supabase SQL Editor)
-- =============================================================================
-- Run in order in the SAME project as Beat-Battle (shared Supabase).
-- UI strings: English in app + locales/en.json; Chinese in locales/zh-Hans.json only.
--
-- BEFORE SQL:
--   Dashboard → Storage → New bucket → Name: art → Public bucket ON
--
-- RUN THIS FILE:
--   1) Table + indexes + RLS (below)
--   2) Then run: supabase/schema-art-storage-policies.sql
-- =============================================================================

-- Art shop catalog (like Beat-Battle `published_works`, but for pixel art)
create table if not exists public.art_shop_works (
  id text primary key,
  title text not null,
  body text not null default '',
  png_path text not null,
  meta_path text,
  pixel_image jsonb,
  author_label text,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

comment on table public.art_shop_works is 'Card World art shop listings; files live in Storage bucket art';
comment on column public.art_shop_works.id is 'Client work id (e.g. shop_xxx or uuid string)';
comment on column public.art_shop_works.title is 'Card title shown in game (i18n: art_export.name_label)';
comment on column public.art_shop_works.body is 'Card body text (i18n: art_export.text_label)';
comment on column public.art_shop_works.png_path is 'Storage path: art-store/{id}/image.png';
comment on column public.art_shop_works.meta_path is 'Storage path: art-store/{id}/meta.json';
comment on column public.art_shop_works.pixel_image is 'pixel/v1 JSON for download-and-edit in pixel board';
comment on column public.art_shop_works.author_label is 'Optional display name; no auth required';

create index if not exists art_shop_works_published_at_idx
  on public.art_shop_works (published_at desc);

create index if not exists art_shop_works_title_idx
  on public.art_shop_works (title);

alter table public.art_shop_works enable row level security;

drop policy if exists "art_shop_works_select" on public.art_shop_works;
create policy "art_shop_works_select"
  on public.art_shop_works for select
  using (true);

drop policy if exists "art_shop_works_insert" on public.art_shop_works;
create policy "art_shop_works_insert"
  on public.art_shop_works for insert
  with check (true);

drop policy if exists "art_shop_works_update" on public.art_shop_works;
create policy "art_shop_works_update"
  on public.art_shop_works for update
  using (true)
  with check (true);

drop policy if exists "art_shop_works_delete" on public.art_shop_works;
create policy "art_shop_works_delete"
  on public.art_shop_works for delete
  using (true);

-- Optional: grant anon/authenticated (Supabase API roles)
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.art_shop_works to anon, authenticated;
