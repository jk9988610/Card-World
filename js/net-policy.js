/**
 * Offline-first network policy — cloud and remote fetches only when opted in and online.
 */

const LS_CLOUD_OPT_IN = "cardworld_cloud_opt_in";

export function isBrowserOnline() {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine !== false;
}

/** User enabled cloud sync (art shop upload, remote gallery). Default: off. */
export function isCloudOptIn() {
  try {
    return localStorage.getItem(LS_CLOUD_OPT_IN) === "1";
  } catch {
    return false;
  }
}

export function setCloudOptIn(enabled) {
  try {
    localStorage.setItem(LS_CLOUD_OPT_IN, enabled ? "1" : "0");
  } catch {
    /* ignore */
  }
}

export function canUseNetwork() {
  return isBrowserOnline();
}

/** Cloud API calls allowed only when opted in and browser reports online. */
export function shouldUseCloud() {
  return isCloudOptIn() && canUseNetwork();
}
