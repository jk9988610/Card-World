/**
 * Card World — version manifest check & cache-bust reload (HarmonyForge-style).
 * Bundled version from meta tags; compares to remote version.json.
 */

function readMeta(name) {
  return document.querySelector(`meta[name="${name}"]`)?.content?.trim() || "";
}

let BUNDLED_VERSION = readMeta("cw-app-version") || "0.0.0";
let BUNDLED_BUILD = readMeta("cw-app-build") || BUNDLED_VERSION;

const scriptSrc = import.meta.url;
const buildFromImport = scriptSrc.match(/[?&]v=([^&]+)/);
if (buildFromImport) BUNDLED_BUILD = decodeURIComponent(buildFromImport[1]);

let remoteVersion = null;
let remoteBuild = null;

function versionUrl() {
  const base = location.pathname.replace(/\/[^/]*$/, "/");
  return `${base}version.json?t=${Date.now()}`;
}

export function getBundled() {
  return { version: BUNDLED_VERSION, build: BUNDLED_BUILD };
}

export function compareVersion(a, b) {
  const pa = String(a).split(".").map(Number);
  const pb = String(b).split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d !== 0) return d;
  }
  return 0;
}

export function isNewer(remote) {
  if (!remote?.version) return false;
  const local = getBundled();
  if (compareVersion(remote.version, local.version) > 0) return true;
  if (remote.version === local.version && remote.build && remote.build !== local.build) return true;
  return false;
}

async function fetchRemote() {
  const res = await fetch(versionUrl(), {
    cache: "no-store",
    headers: { Accept: "application/json", Pragma: "no-cache" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function syncVersionLabels() {
  document.querySelectorAll(".app-version-value").forEach((el) => {
    el.textContent = BUNDLED_VERSION;
  });
  const chrome = document.getElementById("app-chrome");
  if (chrome && remoteVersion && isNewer({ version: remoteVersion, build: remoteBuild })) {
    chrome.classList.add("has-update");
    chrome.title = `可更新至 v${remoteVersion}`;
  } else if (chrome) {
    chrome.classList.remove("has-update");
    chrome.title = "";
  }
}

function noteRemote(remote) {
  if (!remote) return;
  remoteVersion = remote.version ?? remoteVersion;
  remoteBuild = remote.build ?? remoteBuild;
  syncVersionLabels();
}

export async function hydrateFromManifest() {
  try {
    const remote = await fetchRemote();
    noteRemote(remote);
    return remote;
  } catch (err) {
    console.warn("Card World: could not load version.json", err);
    return null;
  }
}

export async function checkUpdate() {
  try {
    const remote = await fetchRemote();
    noteRemote(remote);
    const bundled = getBundled();
    if (isNewer(remote)) {
      return { status: "available", remote, bundled };
    }
    return { status: "latest", remote, bundled };
  } catch (err) {
    return { status: "error", message: err.message };
  }
}

export async function applyUpdate(remote) {
  if (!remote) {
    const result = await checkUpdate();
    if (result.status !== "available") return result;
    remote = result.remote;
  }

  if (typeof caches !== "undefined") {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    } catch {
      /* ignore */
    }
  }

  const url = new URL(location.href);
  url.searchParams.set("v", remote.build || remote.version);
  url.searchParams.set("_", String(Date.now()));
  location.replace(url.toString());
  return { status: "reloading" };
}

export function initAppVersionUI() {
  syncVersionLabels();
  hydrateFromManifest();

  const btnUpdate = document.getElementById("btn-update");
  if (!btnUpdate) return;

  btnUpdate.addEventListener("click", async () => {
    btnUpdate.disabled = true;
    const prev = btnUpdate.textContent;
    const checking =
      document.documentElement.lang?.startsWith("zh") ? "检测中…" : "Checking…";
    btnUpdate.textContent = checking;
    try {
      const result = await checkUpdate();
      const bundled = result.bundled || getBundled();
      const isZh = document.documentElement.lang?.startsWith("zh");

      if (result.status === "available") {
        const updating = isZh ? "更新中…" : "Updating…";
        btnUpdate.textContent = updating;
        const msg = isZh
          ? `发现新版本 v${result.remote.version} (build ${result.remote.build})\n当前 v${bundled.version} (build ${bundled.build})\n\n是否立即更新？`
          : `New version v${result.remote.version} (build ${result.remote.build})\nCurrent v${bundled.version} (build ${bundled.build})\n\nUpdate now?`;
        if (confirm(msg)) await applyUpdate(result.remote);
        else btnUpdate.textContent = prev;
      } else if (result.status === "latest") {
        const msg = isZh
          ? `已是最新版本\n运行 v${bundled.version} (build ${bundled.build})`
          : `Already up to date\nRunning v${bundled.version} (build ${bundled.build})`;
        alert(msg);
        btnUpdate.textContent = prev;
      } else {
        const msg = isZh
          ? `检查更新失败：${result.message || "未知错误"}`
          : `Update check failed: ${result.message || "unknown"}`;
        alert(msg);
        btnUpdate.textContent = prev;
      }
    } finally {
      btnUpdate.disabled = false;
      if (btnUpdate.textContent === checking || btnUpdate.textContent === "检测中…" || btnUpdate.textContent === "Updating…" || btnUpdate.textContent === "更新中…") {
        btnUpdate.textContent = prev;
      }
    }
  });
}

export const APP_VERSION_BUNDLED = BUNDLED_VERSION;
