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

export function musicEmbedUrl(mode = "studio") {
  const hash = MUSIC_EMBED_MODES[mode] ?? "";
  return `${MUSIC_PROD_URL}${hash}`;
}
