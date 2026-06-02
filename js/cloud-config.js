/**
 * Supabase credentials (used only when cloud opt-in is on and device is online).
 */
import { isCloudOptIn } from "./net-policy.js";

export const DEFAULT_CLOUD_CONFIG = {
  url: "https://yjqkotqmglxjhlrhynsu.supabase.co",
  anonKey:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlqcWtvdHFtZ2x4amhscmh5bnN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxOTMzNDQsImV4cCI6MjA5NTc2OTM0NH0.Cm4WjiR4NXS4RrA15frLVMZPbGUyGyjaIYQXSRua8Ew",
};

export const ART_BUCKET = "art";
export const ART_STORE_PREFIX = "art-store";

const LS_CLOUD = "cardworld-cloud-config";

export function getCloudConfig() {
  try {
    const raw = localStorage.getItem(LS_CLOUD);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.url && parsed?.anonKey) return parsed;
    }
  } catch {
    /* ignore */
  }
  if (DEFAULT_CLOUD_CONFIG.url && DEFAULT_CLOUD_CONFIG.anonKey) {
    return { ...DEFAULT_CLOUD_CONFIG };
  }
  return { url: "", anonKey: "" };
}

export function isCloudEnabled() {
  if (!isCloudOptIn()) return false;
  const c = getCloudConfig();
  return Boolean(c.url && c.anonKey);
}
