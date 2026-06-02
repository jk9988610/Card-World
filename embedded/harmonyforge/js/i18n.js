/**
 * HarmonyForge UI strings — English default, locales in locales/*.json
 */

let locale = "en";
let messages = {};
let fallback = {};

function interpolate(str, params) {
  if (!params || typeof str !== "string") return str;
  return str.replace(/\{(\w+)\}/g, (_, k) =>
    params[k] !== undefined && params[k] !== null ? String(params[k]) : `{${k}}`
  );
}

function getByPath(obj, path) {
  if (!path) return undefined;
  const parts = path.split(".");
  let cur = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = cur[p];
  }
  return cur;
}

export function t(key, params) {
  const raw = getByPath(messages, key) ?? getByPath(fallback, key) ?? key;
  if (typeof raw === "string") return interpolate(raw, params);
  return key;
}

export function getMessages() {
  return messages;
}

export function getLocale() {
  return locale;
}

export async function loadLocale(code) {
  const lang = code === "zh-Hans" || code === "zh" || code === "zh-CN" ? "zh-Hans" : "en";
  const base = new URL("../locales/", import.meta.url).href;
  const urls = [
    new URL(`${lang}.json`, base).href,
    `locales/${lang}.json`,
  ];
  let data = null;
  let lastErr;
  for (const url of urls) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`${url} ${res.status}`);
      data = await res.json();
      break;
    } catch (e) {
      lastErr = e;
    }
  }
  if (!data) throw lastErr || new Error("locale load failed");
  if (lang !== "en") {
    try {
      const res = await fetch(new URL("en.json", base).href, { cache: "no-store" });
      if (res.ok) fallback = await res.json();
    } catch {
      fallback = {};
    }
  } else {
    fallback = data;
  }
  locale = lang;
  messages = data;
  document.documentElement.lang = lang === "zh-Hans" ? "zh-Hans" : "en";
  return lang;
}

export function applyDomI18n(root = document) {
  root.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    const val = t(key);
    if (val !== key) el.textContent = val;
  });
  root.querySelectorAll("[data-i18n-title]").forEach((el) => {
    const key = el.getAttribute("data-i18n-title");
    const val = t(key);
    if (val !== key) el.setAttribute("title", val);
  });
  root.querySelectorAll("[data-i18n-aria-label]").forEach((el) => {
    const key = el.getAttribute("data-i18n-aria-label");
    const val = t(key);
    if (val !== key) el.setAttribute("aria-label", val);
  });
  root.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.getAttribute("data-i18n-placeholder");
    const val = t(key);
    if (val !== key) el.setAttribute("placeholder", val);
  });
  root.querySelectorAll("option[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    const val = t(key);
    if (val !== key) el.textContent = val;
  });
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc && messages.meta?.description) metaDesc.content = messages.meta.description;
  if (messages.meta?.title) document.title = messages.meta.title;
}

export function exposeGlobal() {
  window.HF_T = t;
  window.HFI18n = { t, getLocale, getMessages, applyDomI18n, loadLocale };
}

export function resolveLangFromUrl() {
  const q = new URLSearchParams(location.search).get("lang");
  if (q === "zh-Hans" || q === "zh" || q === "zh-CN") return "zh-Hans";
  if (q === "en") return "en";
  return "en";
}

export async function initI18n(code) {
  const lang = code || resolveLangFromUrl();
  await loadLocale(lang);
  applyDomI18n();
  exposeGlobal();
  return lang;
}
