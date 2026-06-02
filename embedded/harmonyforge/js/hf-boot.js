/**
 * Load locale before deferred HarmonyForge scripts run.
 */
import { initI18n } from "./i18n.js";

window.__hfI18nPromise = initI18n().catch((err) => {
  console.warn("HarmonyForge i18n failed, using inline text", err);
  window.HF_T = (k) => k;
  window.HFI18n = { t: window.HF_T, getLocale: () => "en" };
});
