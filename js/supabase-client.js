/**
 * Local vendored Supabase SDK — no CDN import when cloud is used.
 */
import { getCloudConfig } from "./cloud-config.js";
import { shouldUseCloud } from "./net-policy.js";

let createClientFn = null;
let libPromise = null;
let client = null;

async function loadCreateClient() {
  if (!libPromise) {
    libPromise = import(new URL("../vendor/supabase-js.mjs", import.meta.url).href).then((m) => {
      if (!m.createClient) throw new Error("Supabase createClient missing from vendor bundle");
      return m.createClient;
    });
  }
  return libPromise;
}

export async function getSupabaseClient() {
  if (!shouldUseCloud()) return null;
  const cfg = getCloudConfig();
  if (!cfg.url || !cfg.anonKey) return null;
  if (!client) {
    const createClient = await loadCreateClient();
    client = createClient(cfg.url, cfg.anonKey);
  }
  return client;
}

export function resetSupabaseClient() {
  client = null;
  libPromise = null;
}
