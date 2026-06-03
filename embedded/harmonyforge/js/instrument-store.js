/**
 * User instrument presets — localStorage + runtime registry sync.
 */
const InstrumentStore = (() => {
  const LS_KEY = "harmonyforge-user-instruments";

  function loadAll() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      /* ignore */
    }
    return [];
  }

  function saveAll(list) {
    localStorage.setItem(LS_KEY, JSON.stringify(list));
  }

  function nextUserId() {
    return `USR-${Date.now().toString(36)}`;
  }

  function registerPreset(preset) {
    const id = preset.id || nextUserId();
    const entry = {
      ...preset,
      id,
      user: true,
      createdAt: preset.createdAt || Date.now(),
    };
    if (typeof InstrumentRegistry !== "undefined") {
      InstrumentRegistry.registerUserPreset(entry);
    }
    const list = loadAll().filter((p) => p.id !== id);
    list.push(entry);
    saveAll(list);
    if (typeof Instruments !== "undefined" && Instruments.refreshCatalog) {
      Instruments.refreshCatalog();
    }
    return entry;
  }

  function deletePreset(id) {
    const list = loadAll().filter((p) => p.id !== id);
    saveAll(list);
    if (typeof InstrumentRegistry !== "undefined") {
      InstrumentRegistry.unregisterUserPreset(id);
    }
    if (typeof Instruments !== "undefined" && Instruments.refreshCatalog) {
      Instruments.refreshCatalog();
    }
  }

  function importFromProject(list) {
    if (!Array.isArray(list)) return;
    list.forEach((p) => {
      if (p?.id && p.user) registerPreset(p);
    });
  }

  function exportForProject() {
    return loadAll();
  }

  function hydrate() {
    loadAll().forEach((p) => {
      if (typeof InstrumentRegistry !== "undefined") {
        InstrumentRegistry.registerUserPreset(p);
      }
    });
    if (typeof Instruments !== "undefined" && Instruments.refreshCatalog) {
      Instruments.refreshCatalog();
    }
  }

  function replaceAll(list) {
    const prev = loadAll();
    if (typeof InstrumentRegistry !== "undefined") {
      prev.forEach((p) => InstrumentRegistry.unregisterUserPreset(p.id));
    }
    saveAll(Array.isArray(list) ? list : []);
    hydrate();
  }

  return {
    loadAll,
    registerPreset,
    deletePreset,
    importFromProject,
    exportForProject,
    hydrate,
    replaceAll,
    nextUserId,
  };
})();
