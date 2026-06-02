/**
 * Upload artwork PNG to Supabase Storage (`art` bucket).
 * 模式与 Beat-Battle js/remote.js uploadAudioToCloud 相同。
 */
import { formatSupabaseError } from "./supabase-error.js";

let supabaseClient = null;
let configLoaded = false;
let configAvailable = false;
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

async function loadConfig() {
  if (configLoaded) return configAvailable;
  configLoaded = true;
  try {
    const mod = await import("./supabase-config.js");
    if (mod.SUPABASE_URL && mod.SUPABASE_ANON_KEY) {
      if (!clientInitPromise) {
        clientInitPromise = (async () => {
          const { createClient } = await importSupabaseLib();
          supabaseClient = createClient(mod.SUPABASE_URL, mod.SUPABASE_ANON_KEY);
          return supabaseClient;
        })();
      }
      await clientInitPromise;
      configAvailable = true;
      return true;
    }
  } catch (e) {
    console.info("Card World: supabase-config.js not found — cloud upload disabled.", e?.message || e);
  }
  return false;
}

export async function isArtStorageConfigured() {
  return loadConfig();
}

export async function uploadArtPng(blob, { workId, title }) {
  const ok = await loadConfig();
  if (!ok || !supabaseClient) {
    throw new Error("SUPABASE_NOT_CONFIGURED");
  }
  const mod = await import("./supabase-config.js");
  const bucket = mod.ART_BUCKET || "art";
  const safeTitle = (title || "work").replace(/[^\w\u4e00-\u9fff-]+/g, "_").slice(0, 40);
  const path = `works/${workId}/${safeTitle}.png`;
  const { data, error } = await supabaseClient.storage.from(bucket).upload(path, blob, {
    contentType: blob.type || "image/png",
    upsert: true,
  });
  if (error) throw new Error(formatSupabaseError(error, bucket));
  const { data: urlData } = supabaseClient.storage.from(bucket).getPublicUrl(data.path);
  return { path: data.path, publicUrl: urlData?.publicUrl || null };
}
