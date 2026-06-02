/** HarmonyForge / Beat Battle URLs (aligned with Beat-Battle session.js) */
export const MUSIC_PROD_URL = "https://jk9988610.github.io/Music-production-website/";
export const BEAT_BATTLE_URL = "https://jk9988610.github.io/Beat-Battle/";

/** Hash hints for HarmonyForge (optional; site may ignore until supported) */
export const MUSIC_EMBED_MODES = {
  studio: "",
  works: "#cardworld-works",
  store: "#cardworld-store",
  drafts: "#cardworld-drafts",
};

export const MUSIC_EMBED_SLUG_TO_MODE = {
  "music.tool.studio": "studio",
  "music.tool.works": "works",
  "music.tool.store": "store",
  "music.tool.drafts": "drafts",
};

export function musicEmbedUrl(mode = "studio") {
  const hash = MUSIC_EMBED_MODES[mode] ?? "";
  return `${MUSIC_PROD_URL}${hash}`;
}
