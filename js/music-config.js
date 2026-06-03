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

export const MUSIC_STUDIO_SLUG = "music.tool.studio";

export const MUSIC_EMBED_SLUG_TO_MODE = {
  [MUSIC_STUDIO_SLUG]: "studio",
};

export function isHarmonyForgeEmbedUrl(src) {
  if (!src || src === "about:blank") return false;
  try {
    return new URL(src, typeof location !== "undefined" ? location.href : undefined).pathname.includes(
      "/embedded/harmonyforge/"
    );
  } catch {
    return false;
  }
}

export function musicEmbedUrl(mode = "studio", locale = "en") {
  const hash = MUSIC_EMBED_MODES[mode] ?? "";
  const u = new URL(MUSIC_PROD_URL, typeof location !== "undefined" ? location.href : "http://localhost/");
  const lang = locale === "zh-Hans" || locale === "zh" || locale === "zh-CN" ? "zh-Hans" : "en";
  u.searchParams.set("lang", lang);
  return `${u.href}${hash}`;
}
