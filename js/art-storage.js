/**
 * Upload artwork PNG to Supabase Storage (`art` bucket).
 * Pattern: storage.from(bucket).upload(path, file, options)
 */

let supabaseClient = null;
let configLoaded = false;
let configAvailable = false;

async function loadConfig() {
  if (configLoaded) return configAvailable;
  configLoaded = true;
  try {
    const mod = await import("./supabase-config.js");
    if (mod.SUPABASE_URL && mod.SUPABASE_ANON_KEY) {
      const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.49.1");
      supabaseClient = createClient(mod.SUPABASE_URL, mod.SUPABASE_ANON_KEY);
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
    contentType: "image/png",
    upsert: true,
  });
  if (error) throw error;
  const { data: urlData } = supabaseClient.storage.from(bucket).getPublicUrl(data.path);
  return { path: data.path, publicUrl: urlData?.publicUrl || null };
}
