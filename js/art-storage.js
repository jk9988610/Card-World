/**
 * Supabase art 桶：美术商店（云端作品库，与编曲发布共用 Supabase 项目）
 */
import { ART_BUCKET, ART_STORE_PREFIX, isCloudEnabled } from "./cloud-config.js";
import { shouldUseCloud } from "./net-policy.js";
import { getSupabaseClient } from "./supabase-client.js";
import { formatSupabaseError } from "./supabase-error.js";

export async function getArtClient() {
  if (!isCloudEnabled() || !shouldUseCloud()) return null;
  return getSupabaseClient();
}

export async function isArtStorageConfigured() {
  return isCloudEnabled() && !!(await getArtClient());
}

export async function getArtPublicUrl(path) {
  const sb = await getArtClient();
  if (!sb || !path) return null;
  const { data } = sb.storage.from(ART_BUCKET).getPublicUrl(path);
  return data?.publicUrl || null;
}

function assertCloudReady() {
  if (!isCloudEnabled()) throw new Error("Cloud sync is off. Enable Cloud in the top bar when online.");
  if (!shouldUseCloud()) throw new Error("Cloud sync requires network and Cloud to be enabled.");
}

export async function publishToArtShop({ id, title, text, image, pngBlob }) {
  assertCloudReady();
  const sb = await getArtClient();
  if (!sb) throw new Error("Cloud client failed to load");

  const workId = id || crypto.randomUUID();
  const base = `${ART_STORE_PREFIX}/${workId}`;
  const titleTrim = (title || "Work").trim();
  const bodyTrim = (text || "").trim();
  const publishedAt = new Date().toISOString();
  const meta = {
    id: workId,
    title: titleTrim,
    text: bodyTrim,
    image,
    publishedAt,
  };

  const metaPath = `${base}/meta.json`;
  const pngPath = `${base}/image.png`;

  const metaBlob = new Blob([JSON.stringify(meta)], { type: "application/json" });
  let { error: e1 } = await sb.storage.from(ART_BUCKET).upload(metaPath, metaBlob, {
    contentType: "application/json",
    upsert: true,
  });
  if (e1) throw new Error(formatSupabaseError(e1, ART_BUCKET));

  let { error: e2 } = await sb.storage.from(ART_BUCKET).upload(pngPath, pngBlob, {
    contentType: "image/png",
    upsert: true,
  });
  if (e2) throw new Error(formatSupabaseError(e2, ART_BUCKET));

  const row = {
    id: workId,
    title: titleTrim,
    body: bodyTrim,
    png_path: pngPath,
    meta_path: metaPath,
    pixel_image: image,
    published_at: publishedAt,
  };
  const { error: dbErr } = await sb.from("art_shop_works").upsert(row, { onConflict: "id" });
  if (dbErr) {
    console.warn("art_shop_works upsert (run supabase/schema-card-world-art.sql):", dbErr.message);
  }

  const publicUrl = await getArtPublicUrl(pngPath);
  return { id: workId, metaPath, pngPath, publicUrl, ...meta };
}

/** @deprecated 使用 publishToArtShop */
export async function uploadArtPng(blob, { workId, title }) {
  const sb = await getArtClient();
  if (!sb) throw new Error("SUPABASE_NOT_CONFIGURED");
  const safeTitle = (title || "work").replace(/[^\w\u4e00-\u9fff-]+/g, "_").slice(0, 40);
  const path = `works/${workId}/${safeTitle}.png`;
  const { data, error } = await sb.storage.from(ART_BUCKET).upload(path, blob, {
    contentType: blob.type || "image/png",
    upsert: true,
  });
  if (error) throw new Error(formatSupabaseError(error, ART_BUCKET));
  return { path: data.path, publicUrl: await getArtPublicUrl(data.path) };
}

export async function listArtShopItems() {
  const sb = await getArtClient();
  if (!sb) return [];

  const { data: rows, error: dbError } = await sb
    .from("art_shop_works")
    .select("id,title,body,png_path,meta_path,pixel_image,published_at")
    .order("published_at", { ascending: false })
    .limit(100);

  if (!dbError && rows?.length) {
    const items = [];
    for (const row of rows) {
      const pngPath = row.png_path;
      items.push({
        id: row.id,
        title: row.title,
        text: row.body,
        image: row.pixel_image,
        publishedAt: row.published_at,
        pngPath,
        previewUrl: await getArtPublicUrl(pngPath),
      });
    }
    return items;
  }

  if (dbError) {
    console.warn("art_shop_works list fallback to storage:", dbError.message);
  }

  const { data: folders, error } = await sb.storage.from(ART_BUCKET).list(ART_STORE_PREFIX, {
    limit: 100,
    sortBy: { column: "created_at", order: "desc" },
  });
  if (error) throw new Error(formatSupabaseError(error, ART_BUCKET));
  const items = [];
  for (const row of folders || []) {
    if (!row?.name || row.name.includes(".")) continue;
    const workId = row.name;
    const metaPath = `${ART_STORE_PREFIX}/${workId}/meta.json`;
    try {
      const { data: blob, error: dlErr } = await sb.storage.from(ART_BUCKET).download(metaPath);
      if (dlErr) continue;
      const meta = JSON.parse(await blob.text());
      const pngPath = `${ART_STORE_PREFIX}/${workId}/image.png`;
      items.push({
        ...meta,
        id: meta.id || workId,
        text: meta.text ?? "",
        pngPath,
        previewUrl: await getArtPublicUrl(pngPath),
      });
    } catch {
      /* skip broken entry */
    }
  }
  items.sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0));
  return items;
}

export async function downloadArtShopMeta(workId) {
  const sb = await getArtClient();
  if (!sb) throw new Error("Cloud not configured");

  const { data: row, error: dbError } = await sb
    .from("art_shop_works")
    .select("id,title,body,pixel_image,published_at")
    .eq("id", workId)
    .maybeSingle();

  if (!dbError && row) {
    return {
      id: row.id,
      title: row.title,
      text: row.body,
      image: row.pixel_image,
      publishedAt: row.published_at,
    };
  }

  const metaPath = `${ART_STORE_PREFIX}/${workId}/meta.json`;
  const { data, error } = await sb.storage.from(ART_BUCKET).download(metaPath);
  if (error) throw new Error(formatSupabaseError(error, ART_BUCKET));
  const meta = JSON.parse(await data.text());
  return {
    id: meta.id || workId,
    title: meta.title,
    text: meta.text ?? "",
    image: meta.image,
    publishedAt: meta.publishedAt,
  };
}
