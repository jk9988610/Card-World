# Supabase setup — Art Shop (Card World)

App UI is **English by default** (`locales/en.json`). Chinese is only in `locales/zh-Hans.json` — not in the database.

## Order of operations

1. **Dashboard → Storage → New bucket**  
   - Name: `art`  
   - Public bucket: **ON**

2. **SQL Editor** — run file 1:  
   `supabase/schema-card-world-art.sql`  
   Creates table `art_shop_works` and RLS policies.

3. **SQL Editor** — run file 2:  
   `supabase/schema-art-storage-policies.sql`  
   Policies for bucket `art`.

4. Open Card World → paint → **Upload** or **Export** → check **Art Shop → Shop** tab.

## Table `art_shop_works` (English columns)

| Column | Type | Purpose |
|--------|------|---------|
| `id` | text PK | Work id |
| `title` | text | Card title |
| `body` | text | Card body text |
| `png_path` | text | `art-store/{id}/image.png` |
| `meta_path` | text | `art-store/{id}/meta.json` |
| `pixel_image` | jsonb | `pixel/v1` for edit in board |
| `author_label` | text | Optional name |
| `published_at` | timestamptz | Sort order |

Storage paths stay under prefix `art-store/` in bucket `art`.

## Same project as Beat-Battle

- Beat-Battle: bucket `audio`, table `published_works`  
- Card World: bucket `art`, table `art_shop_works`  
- Shared: `js/cloud-config.js` URL + anon key (built-in)

## Production

Replace open RLS (`using (true)`) with auth-based policies when you add login.
