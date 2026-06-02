/**
 * In-app run log — panel view and clipboard export (Card World).
 */

const MAX_ENTRIES = 200;
const entries = [];

function pad2(n) {
  return String(n).padStart(2, "0");
}

function timestamp() {
  const d = new Date();
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

function push(level, message, detail) {
  const entry = {
    time: timestamp(),
    level,
    message,
    detail: detail != null && detail !== "" ? String(detail) : "",
  };
  entries.push(entry);
  if (entries.length > MAX_ENTRIES) entries.shift();

  const tag = `[CardWorld/${level}]`;
  const logFn = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
  if (detail !== undefined && detail !== null && detail !== "") {
    logFn(tag, message, detail);
  } else {
    logFn(tag, message);
  }
  return entry;
}

function formatEntry(e) {
  const extra = e.detail ? ` — ${e.detail}` : "";
  return `${e.time} [${e.level.toUpperCase()}] ${e.message}${extra}`;
}

function versionLine() {
  const meta = document.querySelector('meta[name="cw-app-version"]')?.content;
  const build = document.querySelector('meta[name="cw-app-build"]')?.content;
  if (meta) return `Card World v${meta} · build ${build || meta}`;
  return "Card World";
}

function formatAll() {
  const header = `=== ${versionLine()} ===`;
  if (!entries.length) return `${header}\n(no log entries yet)`;
  return `${header}\n${entries.map(formatEntry).join("\n")}`;
}

export const AppLogger = {
  info: (msg, detail) => push("info", msg, detail),
  warn: (msg, detail) => push("warn", msg, detail),
  error: (msg, detail) => push("error", msg, detail),
  formatAll,
  clear() {
    entries.length = 0;
    push("info", "Log cleared");
  },
  async copyToClipboard() {
    const text = formatAll();
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.cssText = "position:fixed;left:-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      push("info", "Log copied to clipboard");
      return true;
    } catch (err) {
      push("error", "Copy log failed", err?.message || err);
      return false;
    }
  },
};
