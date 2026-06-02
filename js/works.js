/**
 * Local 作品仓库 — browser localStorage.
 */

const WORKS_KEY = "cardworld_works_v1";

export function loadWorks() {
  try {
    const raw = localStorage.getItem(WORKS_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function writeWorks(list) {
  try {
    localStorage.setItem(WORKS_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn("Card World: could not save works", e);
  }
}

export function addWork(entry) {
  const list = loadWorks();
  list.unshift(entry);
  writeWorks(list);
  return entry;
}

export function updateWork(id, patch) {
  const list = loadWorks();
  const i = list.findIndex((w) => w.id === id);
  if (i < 0) return null;
  list[i] = { ...list[i], ...patch };
  writeWorks(list);
  return list[i];
}

export function removeWork(id) {
  const list = loadWorks().filter((w) => w.id !== id);
  writeWorks(list);
}
