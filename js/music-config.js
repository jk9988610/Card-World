/** HarmonyForge production app (no Beat Battle / review in Card World). */
export const MUSIC_PROD_URL = "https://jk9988610.github.io/Music-production-website/";

/** Production workstation only */
export const MUSIC_EMBED_MODES = {
  studio: "",
};

export const MUSIC_EMBED_SLUG_TO_MODE = {
  "music.tool.studio": "studio",
};

export function musicEmbedUrl(mode = "studio") {
  const hash = MUSIC_EMBED_MODES[mode] ?? "";
  return `${MUSIC_PROD_URL}${hash}`;
}
