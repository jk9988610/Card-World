/**
 * Load UI strings from locales/*.json (?lang=zh-Hans or browser language).
 * Card definition text can use titleKey/textKey in a later phase.
 */

let strings = {};
let currentLang = "en";

export function t(key, vars = {}) {
  const parts = key.split(".");
  let v = strings;
  for (const p of parts) {
    v = v?.[p];
  }
  if (typeof v !== "string") return key;
  return v.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
}

export function lang() {
  return currentLang;
}

function pickLang(requested) {
  const supported = ["en", "zh-Hans"];
  if (requested && supported.includes(requested)) return requested;
  const nav = navigator.language || "en";
  if (nav.startsWith("zh")) return "zh-Hans";
  return "en";
}

export async function initI18n(basePath) {
  const params = new URLSearchParams(location.search);
  currentLang = pickLang(params.get("lang"));
  const url = `${basePath}locales/${currentLang}.json`;
  const res = await fetch(url);
  if (!res.ok && currentLang !== "en") {
    currentLang = "en";
    const fallback = await fetch(`${basePath}locales/en.json`);
    strings = await fallback.json();
    return;
  }
  strings = await res.json();
  document.documentElement.lang = currentLang === "zh-Hans" ? "zh-Hans" : "en";
}

export function applyI18n(root = document) {
  root.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (key) el.textContent = t(key);
  });
  root.querySelectorAll("[data-i18n-html]").forEach((el) => {
    const key = el.getAttribute("data-i18n-html");
    if (key) el.innerHTML = t(key);
  });
}
