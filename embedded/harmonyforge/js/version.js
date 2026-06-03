/**
 * Card World 整体版本（供工程导出 / 日志）；Harmony 界面不显示版本、不提供更新入口。
 */
const AppVersion = (() => {
  function readMeta(name) {
    return document.querySelector(`meta[name="${name}"]`)?.content?.trim() || "";
  }

  function readParentMeta(name) {
    try {
      if (window.parent === window) return "";
      return window.parent.document.querySelector(`meta[name="${name}"]`)?.content?.trim() || "";
    } catch {
      return "";
    }
  }

  function resolveBundled() {
    const pv = readParentMeta("cw-app-version");
    const pb = readParentMeta("cw-app-build");
    if (pv && pv !== "dev") {
      return { version: pv, build: pb || pv };
    }
    const cv = readMeta("cw-app-version");
    const cb = readMeta("cw-app-build");
    if (cv && cv !== "dev") {
      return { version: cv, build: cb || cv };
    }
    return { version: "0.0.0", build: "0.0.0" };
  }

  let { version: BUNDLED_VERSION, build: BUNDLED_BUILD } = resolveBundled();

  const scriptEl = document.currentScript;
  if (scriptEl?.src) {
    const m = scriptEl.src.match(/[?&]v=([^&]+)/);
    if (m) BUNDLED_BUILD = decodeURIComponent(m[1]);
  }

  function getInfo() {
    return { version: BUNDLED_VERSION, build: BUNDLED_BUILD };
  }

  function initUI() {
    const btnLogs = document.getElementById("btnLogs");
    const btnCopyLogs = document.getElementById("btnCopyLogs");
    const logDialog = document.getElementById("logDialog");
    const logContent = document.getElementById("logContent");

    if (btnLogs && logDialog) {
      btnLogs.addEventListener("click", () => {
        if (logContent) logContent.textContent = AppLogger.formatAll();
        logDialog.showModal();
        AppLogger.info("打开日志面板", `v${BUNDLED_VERSION}`);
      });
    }

    if (btnCopyLogs) {
      btnCopyLogs.addEventListener("click", async () => {
        const ok = await AppLogger.copyToClipboard();
        if (logContent) logContent.textContent = AppLogger.formatAll();
        if (ok && logDialog) {
          const prev = btnCopyLogs.textContent;
          btnCopyLogs.textContent = "已复制";
          setTimeout(() => {
            btnCopyLogs.textContent = prev;
          }, 1500);
        }
      });
    }

    const btnLogClose = document.getElementById("btnLogClose");
    const btnClearLogs = document.getElementById("btnClearLogs");
    if (btnLogClose && logDialog) {
      btnLogClose.addEventListener("click", () => logDialog.close());
    }
    if (btnClearLogs) {
      btnClearLogs.addEventListener("click", () => {
        AppLogger.clear();
        if (logContent) logContent.textContent = AppLogger.formatAll();
      });
    }
  }

  return {
    get CURRENT() {
      return BUNDLED_VERSION;
    },
    get BUILD() {
      return BUNDLED_BUILD;
    },
    getInfo,
    initUI,
    getBundled: getInfo,
  };
})();
