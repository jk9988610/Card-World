/**
 * Browser localStorage persistence for Card World.
 */

const STORAGE_KEY = "cardworld_save_v1";

export function loadSave() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function writeSave(payload) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (e) {
    console.warn("Card World: could not save to localStorage", e);
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (_) {}
}

/** Remove all Card World keys from localStorage (save, art, works, cloud prefs). */
export function clearAllCardWorldStorage() {
  clearSave();
  const keys = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.toLowerCase().startsWith("cardworld")) keys.push(k);
    }
    for (const k of keys) localStorage.removeItem(k);
  } catch (e) {
    console.warn("Card World: could not clear localStorage", e);
  }
}
