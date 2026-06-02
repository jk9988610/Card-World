/**
 * Supabase art 桶：美术商店（对标 Beat-Battle 制作库 + audio 桶）
 */
import { ART_BUCKET, ART_STORE_PREFIX, getCloudConfig, isCloudEnabled } from "./cloud-config.js";
import { formatSupabaseError } from "./supabase-error.js";

let supabaseClient = null;
let clientInitPromise = null;
let supabaseLibPromise = null;

const SUPABASE_CDN_URLS = [
  "https://esm.sh/@supabase/supabase-js@2.49.1?bundle",
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.1/+esm",
];

async function importSupabaseLib() {
  if (!supabaseLibPromise) {
    supabaseLibPromise = (async () => {
      let lastErr;
      for (const url of SUPABASE_CDN_URLS) {
        try {
          return await import(url);
        } catch (e) {
          lastErr = e;
        }
      }
      throw lastErr || new Error("Supabase SDK 无法加载");
    })();
  }
  return supabaseLibPromise;
}

export async function getArtClient() {
  if (!isCloudEnabled()) return null;
  if (supabaseClient) return supabaseClient;
  if (!clientInitPromise) {
    clientInitPromise = (async () => {
      const { createClient } = await importSupabaseLib();
      const { url, anonKey } = getCloudConfig();
      supabaseClient = createClient(url, anonKey);
      return supabaseClient;
    })();
  }
  return clientInitPromise;
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

export async function publishToArtShop({ id, title, text, image, pngBlob }) {
  const sb = await getArtClient();
  if (!sb) throw new Error("云同步未配置");

  const workId = id || crypto.randomUUID();
  const base = `${ART_STORE_PREFIX}/${workId}`;
  const meta = {
    id: workId,
    title: (title || "作品").trim(),
    text: (text || "").trim(),
    image,
    publishedAt: new Date().toISOString(),
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
      const text = await blob.text();
      const meta = JSON.parse(text);
      const pngPath = `${ART_STORE_PREFIX}/${workId}/image.png`;
      items.push({
        ...meta,
        id: meta.id || workId,
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
  if (!sb) throw new Error("云同步未配置");
  const metaPath = `${ART_STORE_PREFIX}/${workId}/meta.json`;
  const { data, error } = await sb.storage.from(ART_BUCKET).download(metaPath);
  if (error) throw new Error(formatSupabaseError(error, ART_BUCKET));
  return JSON.parse(await data.text());
}
