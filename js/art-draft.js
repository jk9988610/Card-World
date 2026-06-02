/**
 * 绘画草稿：会话自动保存 + 命名草稿列表
 */

const SESSION_KEY = "cardworld_art_session_draft_v1";
const DRAFTS_KEY = "cardworld_art_drafts_v1";

export function saveSessionDraft(payload) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ ...payload, savedAt: Date.now() }));
  } catch (e) {
    console.warn("art session draft", e);
  }
}

export function loadSessionDraft() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearSessionDraft() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

export function loadNamedDrafts() {
  try {
    const raw = localStorage.getItem(DRAFTS_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function writeNamedDrafts(list) {
  try {
    localStorage.setItem(DRAFTS_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn("art drafts", e);
  }
}

export function saveNamedDraft(entry) {
  const list = loadNamedDrafts();
  const i = list.findIndex((d) => d.id === entry.id);
  if (i >= 0) list[i] = entry;
  else list.unshift(entry);
  writeNamedDrafts(list);
  return entry;
}

export function removeNamedDraft(id) {
  writeNamedDrafts(loadNamedDrafts().filter((d) => d.id !== id));
}

export function getNamedDraft(id) {
  return loadNamedDrafts().find((d) => d.id === id) || null;
}
