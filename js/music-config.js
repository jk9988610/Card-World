/**
 * HarmonyForge — bundled under Card World (embedded/harmonyforge).
 * No external github.io iframe; same origin as the card game.
 */

function harmonyForgeBaseUrl() {
  return new URL("embedded/harmonyforge/", location.href).href;
}

/** Local vendored production app */
export const MUSIC_PROD_URL = harmonyForgeBaseUrl();

/** Production workstation only */
export const MUSIC_EMBED_MODES = {
  studio: "",
};

export const MUSIC_EMBED_SLUG_TO_MODE = {
  "music.tool.studio": "studio",
};

function readCardWorldVersion() {
  if (typeof document === "undefined") return "";
  const v = document.querySelector('meta[name="cw-app-version"]')?.content?.trim();
  return v && v !== "dev" ? v : "";
}

export function musicEmbedUrl(mode = "studio", locale = "en") {
  const hash = MUSIC_EMBED_MODES[mode] ?? "";
  const u = new URL(MUSIC_PROD_URL, typeof location !== "undefined" ? location.href : "http://localhost/");
  const lang = locale === "zh-Hans" || locale === "zh" || locale === "zh-CN" ? "zh-Hans" : "en";
  u.searchParams.set("lang", lang);
  const ver = readCardWorldVersion();
  if (ver) u.searchParams.set("v", ver);
  return `${u.href}${hash}`;
}
