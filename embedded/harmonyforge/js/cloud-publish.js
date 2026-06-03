/**
 * HarmonyForge cloud publish — Supabase (Card World settings only).
 */
const CloudPublish = (() => {
  const t = (key, params) =>
    typeof window.HF_T === "function" ? window.HF_T(key, params) : key;

  const LS_SESSION = "harmonyforge-cloud-session";
  /** Legacy session key from older embedded builds */
  const LS_SESSION_LEGACY = "beat-battle-cloud-session";
  const LS_CLOUD_KEYS = [
    "cardworld-cloud-config",
    /** @deprecated legacy config key */
    "beat-battle-cloud-config",
  ];

  const DEFAULT_CLOUD_CONFIG = {
    url: "https://yjqkotqmglxjhlrhynsu.supabase.co",
    anonKey:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlqcWtvdHFtZ2x4amhscmh5bnN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxOTMzNDQsImV4cCI6MjA5NTc2OTM0NH0.Cm4WjiR4NXS4RrA15frLVMZPbGUyGyjaIYQXSRua8Ew",
  };

  let client = null;
  let cachedUser = null;

  function getCloudConfig() {
    for (const key of LS_CLOUD_KEYS) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        if (parsed?.url && parsed?.anonKey) return parsed;
      } catch {
        /* ignore */
      }
    }
    if (DEFAULT_CLOUD_CONFIG.url && DEFAULT_CLOUD_CONFIG.anonKey) {
      return { ...DEFAULT_CLOUD_CONFIG };
    }
    return { url: "", anonKey: "" };
  }

  function isCloudOptIn() {
    try {
      return localStorage.getItem("cardworld_cloud_opt_in") === "1";
    } catch {
      return false;
    }
  }

  function isCloudEnabled() {
    if (!isCloudOptIn()) return false;
    if (typeof navigator !== "undefined" && navigator.onLine === false) return false;
    const c = getCloudConfig();
    return Boolean(c.url && c.anonKey);
  }

  function loadSession() {
    for (const key of [LS_SESSION, LS_SESSION_LEGACY]) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        if (parsed?.userId && parsed?.userName) return parsed;
      } catch {
        /* ignore */
      }
    }
    return null;
  }

  function saveSession({ userId, userName }) {
    if (!userId || !userName) return;
    localStorage.setItem(
      LS_SESSION,
      JSON.stringify({ userId, userName, savedAt: Date.now() })
    );
    try {
      localStorage.removeItem(LS_SESSION_LEGACY);
    } catch {
      /* ignore */
    }
  }

  async function loadSupabase() {
    const { createClient } = await import(
      new URL("../../../vendor/supabase-js.mjs", import.meta.url).href
    );
    return createClient;
  }

  async function ensureClient() {
    if (!isCloudEnabled()) {
      throw new Error(t("cloud.cloud_off"));
    }
    if (!client) {
      const createClient = await loadSupabase();
      const { url, anonKey } = getCloudConfig();
      client = createClient(url, anonKey);
    }
    return client;
  }

  async function findOrCreateUser(name) {
    const sb = await ensureClient();
    const trimmed = name.trim();
    const { data: existing } = await sb.from("users").select("*").eq("name", trimmed).maybeSingle();
    if (existing) return existing;
    const { data, error } = await sb.from("users").insert({ name: trimmed }).select().single();
    if (error) throw error;
    return data;
  }

  async function ensureUser(userName) {
    const session = loadSession();
    if (session?.userId && session?.userName) {
      if (!userName || session.userName === userName.trim()) {
        cachedUser = { id: session.userId, name: session.userName };
        return cachedUser;
      }
    }
    const name = (userName || session?.userName || "").trim();
    if (!name) throw new Error(t("cloud.need_nickname"));
    const user = await findOrCreateUser(name);
    saveSession({ userId: user.id, userName: user.name });
    cachedUser = { id: user.id, name: user.name };
    return cachedUser;
  }

  const MAX_PROJECT_JSON_BYTES = 2 * 1024 * 1024;

  async function uploadAudioToCloud(path, blob) {
    const sb = await ensureClient();
    const { error } = await sb.storage.from("audio").upload(path, blob, {
      upsert: true,
      contentType: blob.type || "audio/mpeg",
    });
    if (error) throw error;
    return path;
  }

  /** bundle or bare project (publish JSON) */
  function normalizeProjectJsonPayload(data) {
    if (!data || typeof data !== "object") {
      throw new Error(t("cloud.invalid_project"));
    }
    if (data.harmonyforge != null && data.project) return data;
    if (data.sequencer || data.arranger) {
      return {
        harmonyforge: 2,
        kind: "project",
        project: data,
      };
    }
    throw new Error(t("cloud.not_hf_project"));
  }

  function buildPublishProjectJson(project, meta = {}) {
    if (typeof ProjectIO !== "undefined" && ProjectIO.buildBundle) {
      return normalizeProjectJsonPayload(ProjectIO.buildBundle(project, meta));
    }
    return normalizeProjectJsonPayload({
      harmonyforge: 2,
      kind: "project",
      meta: { exportedAt: new Date().toISOString(), ...meta },
      project,
    });
  }

  async function listMyPublishedWorks(userName) {
    const user = await ensureUser(userName);
    const sb = await ensureClient();
    const { data, error } = await sb
      .from("published_works")
      .select("id,user_id,user_name,title,audio_path,published_at,project_json")
      .eq("user_id", user.id)
      .order("published_at", { ascending: false })
      .limit(80);
    if (error) throw error;
    return (data || []).map(mapPublishedRow);
  }

  async function fetchMyPublishedWork(workId, userName) {
    const user = await ensureUser(userName);
    const sb = await ensureClient();
    const { data, error } = await sb
      .from("published_works")
      .select("id,user_id,user_name,title,audio_path,published_at,project_json")
      .eq("id", workId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error(t("cloud.work_missing"));
    return mapPublishedRow(data);
  }

  async function deletePublishedWork(workId, userName) {
    const user = await ensureUser(userName);
    const sb = await ensureClient();
    const { data: row, error: fetchErr } = await sb
      .from("published_works")
      .select("audio_path,user_id")
      .eq("id", workId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (fetchErr) throw fetchErr;
    if (!row) throw new Error(t("cloud.delete_missing"));
    if (row.audio_path) {
      await sb.storage.from("audio").remove([row.audio_path]).catch(() => {});
    }
    const { error } = await sb.from("published_works").delete().eq("id", workId).eq("user_id", user.id);
    if (error) throw error;
  }

  async function renamePublishedWork(workId, title, userName) {
    const user = await ensureUser(userName);
    const trimmed = title?.trim();
    if (!trimmed) throw new Error(t("cloud.title_required"));
    const sb = await ensureClient();
    const { data, error } = await sb
      .from("published_works")
      .update({ title: trimmed })
      .eq("id", workId)
      .eq("user_id", user.id)
      .select()
      .single();
    if (error) throw error;
    return mapPublishedRow(data);
  }

  async function republishWork(workId, { title, project, userName }) {
    const user = await ensureUser(userName);
    const sb = await ensureClient();
    const { data: existing, error: fetchErr } = await sb
      .from("published_works")
      .select("id,audio_path,user_id,title")
      .eq("id", workId)
      .eq("user_id", user.id)
      .single();
    if (fetchErr) throw fetchErr;

    if (typeof AudioExport === "undefined" || !AudioExport.renderExportBlob) {
      throw new Error(t("cloud.audio_module_missing"));
    }
    const projectJson = buildPublishProjectJson(project, {
      title: title || existing.title,
      source: "republish",
      workId,
    });
    const bytes = new TextEncoder().encode(JSON.stringify(projectJson)).length;
    if (bytes > MAX_PROJECT_JSON_BYTES) {
      throw new Error(t("cloud.json_too_large_mb", { mb: MAX_PROJECT_JSON_BYTES / 1024 / 1024 }));
    }

    const blob = await AudioExport.renderExportBlob(project, "mp3");
    const ext = (blob.type || "audio/mpeg").split("/")[1]?.split(";")[0] || "mp3";
    let audioPath = existing.audio_path;
    if (!audioPath) {
      audioPath = `published/${user.id}/${workId}.${ext}`;
    }
    await uploadAudioToCloud(audioPath, blob);

    const updates = {
      title: (title || existing.title).trim(),
      audio_path: audioPath,
      project_json: projectJson,
      published_at: new Date().toISOString(),
    };
    const { data, error } = await sb
      .from("published_works")
      .update(updates)
      .eq("id", workId)
      .eq("user_id", user.id)
      .select()
      .single();
    if (error) throw error;
    return mapPublishedRow(data);
  }

  async function publishWork({ title, audioBlob, userName, projectJson }) {
    const user = await ensureUser(userName);
    if (!title?.trim()) throw new Error(t("cloud.need_title"));
    if (!(audioBlob instanceof Blob)) throw new Error(t("cloud.invalid_audio"));

    let jsonPayload = null;
    if (projectJson != null) {
      jsonPayload = normalizeProjectJsonPayload(projectJson);
      const bytes = new TextEncoder().encode(JSON.stringify(jsonPayload)).length;
      if (bytes > MAX_PROJECT_JSON_BYTES) {
        throw new Error(t("cloud.json_size", { kb: Math.round(bytes / 1024), mb: MAX_PROJECT_JSON_BYTES / 1024 / 1024 }));
      }
    }

    const workId = crypto.randomUUID();
    const ext = (audioBlob.type || "audio/mpeg").split("/")[1]?.split(";")[0] || "mp3";
    const audioPath = `published/${user.id}/${workId}.${ext}`;
    await uploadAudioToCloud(audioPath, audioBlob);

    const insertRow = {
      id: workId,
      user_id: user.id,
      user_name: user.name,
      title: title.trim(),
      audio_path: audioPath,
    };
    if (jsonPayload) insertRow.project_json = jsonPayload;

    const sb = await ensureClient();
    const { data, error } = await sb.from("published_works").insert(insertRow).select().single();
    if (error) throw error;
    return {
      id: data.id,
      title: data.title,
      userName: data.user_name,
      publishedAt: new Date(data.published_at).getTime(),
      hasProjectJson: data.project_json != null,
    };
  }

  function getPublicAudioUrl(audioPath) {
    if (!audioPath) return "";
    const { url } = getCloudConfig();
    const base = String(url || "").replace(/\/$/, "");
    return `${base}/storage/v1/object/public/audio/${audioPath}`;
  }

  function mapPublishedRow(row) {
    const audioPath = row.audio_path;
    return {
      id: row.id,
      userId: row.user_id,
      userName: row.user_name,
      title: row.title,
      audioPath,
      publishedAt: new Date(row.published_at).getTime(),
      audioUrl: getPublicAudioUrl(audioPath),
      hasProjectJson: row.project_json != null,
      projectJson: row.project_json ?? null,
    };
  }

  function projectJsonToProject(bundle) {
    if (typeof ProjectIO !== "undefined" && ProjectIO.extractProject) {
      return ProjectIO.extractProject(bundle);
    }
    if (bundle?.harmonyforge != null && bundle.project) return bundle.project;
    if (bundle?.sequencer || bundle?.arranger) return bundle;
    throw new Error(t("cloud.invalid_project_format"));
  }

  function safeStoreFilename(work) {
    const raw = `${work.title || "work"}-${work.userName || "player"}`
      .replace(/[<>:"/\\|?*\s]+/g, "_")
      .replace(/_+/g, "_")
      .slice(0, 72);
    const base = raw || work.id.slice(0, 8);
    return `${base}.hfproj`;
  }

  function formatStoreTime(ts) {
    try {
      return new Date(ts).toLocaleString("zh-CN", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  }

  /** Public works with project_json */
  async function listPublishStoreWorks(limit = 60) {
    const sb = await ensureClient();
    const { data, error } = await sb
      .from("published_works")
      .select("id,user_id,user_name,title,audio_path,published_at,project_json")
      .not("project_json", "is", null)
      .order("published_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data || []).map(mapPublishedRow);
  }

  function downloadPublishedJson(work) {
    if (!work?.projectJson) throw new Error(t("cloud.no_project_json"));
    const bundle = normalizeProjectJsonPayload(work.projectJson);
    const json = JSON.stringify(bundle, null, 2);
    const blob = new Blob([json], { type: "application/json;charset=utf-8" });
    const name = safeStoreFilename(work);
    if (typeof FileSave !== "undefined" && FileSave.saveBlob) {
      FileSave.saveBlob(blob, name);
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    }
    return name;
  }

  function initWorksRepoUI({
    setStatus,
    getProjectData,
    onLoadPublishedProject,
    getEditingWorkId,
    setEditingWorkId,
  }) {
    const btn = document.getElementById("btnWorksRepo");
    const dialog = document.getElementById("worksRepoDialog");
    const listEl = document.getElementById("worksRepoList");
    const statusEl = document.getElementById("worksRepoStatus");
    const btnRefresh = document.getElementById("btnWorksRepoRefresh");
    const btnClose = document.getElementById("btnWorksRepoClose");

    if (!btn || !dialog || !listEl) return;

    let loading = false;

    function setRepoStatus(text) {
      if (statusEl) statusEl.textContent = text || "";
    }

    function renderEmpty(msg) {
      listEl.innerHTML = "";
      const li = document.createElement("li");
      li.className = "publish-store-empty";
      li.textContent = msg;
      listEl.appendChild(li);
    }

    async function ensureWorkJson(work) {
      if (work.projectJson) return work;
      const session = loadSession();
      const full = await fetchMyPublishedWork(work.id, session?.userName);
      if (!full.projectJson) throw new Error(t("cloud.no_project_json_edit"));
      return full;
    }

    async function refreshRepo() {
      if (loading) return;
      const session = loadSession();
      if (!session?.userId) {
        renderEmpty(t("cloud.publish_first_for_repo"));
        setRepoStatus("");
        return;
      }
      loading = true;
      btnRefresh.disabled = true;
      setRepoStatus(t("cloud.loading_works"));
      renderEmpty(t("cloud.loading"));
      try {
        const works = await listMyPublishedWorks(session.userName);
        listEl.innerHTML = "";
        if (!works.length) {
          renderEmpty(t("cloud.no_works_repo"));
          setRepoStatus(t("cloud.works_repo_count", { n: 0 }));
          return;
        }
        const editingId = getEditingWorkId?.();
        works.forEach((work) => {
          const li = document.createElement("li");
          li.className = "publish-store-item";
          if (work.id === editingId) li.classList.add("works-repo-item-active");

          const head = document.createElement("div");
          head.className = "publish-store-item-head";
          const titleEl = document.createElement("div");
          titleEl.className = "publish-store-item-title";
          titleEl.textContent = work.title || t("cloud.unnamed");
          const time = document.createElement("div");
          time.className = "publish-store-item-meta";
          time.textContent = formatStoreTime(work.publishedAt);
          head.append(titleEl, time);

          const sub = document.createElement("div");
          sub.className = "publish-store-item-author";
          sub.textContent = work.hasProjectJson ? t("cloud.has_json") : t("cloud.audio_only");

          const actions = document.createElement("div");
          actions.className = "publish-store-item-actions";

          const btnEdit = document.createElement("button");
          btnEdit.type = "button";
          btnEdit.className = "btn btn-xs";
          btnEdit.textContent = t("cloud.edit");
          btnEdit.disabled = !work.hasProjectJson;
          btnEdit.addEventListener("click", async () => {
            try {
              setStatus?.(t("cloud.fetching"));
              const full = await ensureWorkJson(work);
              const project = projectJsonToProject(full.projectJson);
              const ok = onLoadPublishedProject?.(project, {
                title: full.title,
                workId: full.id,
                archiveReason: `Before edit: ${full.title}`,
              });
              if (ok !== false) {
                setEditingWorkId?.(full.id);
                dialog.close();
                setStatus?.(t("cloud.editing", { title: full.title }));
              }
            } catch (err) {
              alert(err.message);
            }
          });

          const btnRepublish = document.createElement("button");
          btnRepublish.type = "button";
          btnRepublish.className = "btn btn-xs btn-ghost";
          btnRepublish.textContent = t("cloud.republish");
          btnRepublish.addEventListener("click", async () => {
            try {
              if (typeof getProjectData !== "function") throw new Error(t("cloud.cannot_read_project"));
              const session = loadSession();
              let project = getProjectData();
              if (getEditingWorkId?.() !== work.id) {
                if (!confirm(t("cloud.wrong_project", { title: work.title }))) return;
                const full = await ensureWorkJson(work);
                project = projectJsonToProject(full.projectJson);
                onLoadPublishedProject?.(project, {
                  title: full.title,
                  workId: full.id,
                  skipConfirm: true,
                  archiveReason: `Before republish: ${full.title}`,
                });
                setEditingWorkId?.(full.id);
              }
              if (!confirm(t("cloud.overwrite_confirm", { title: work.title }))) return;
              setStatus?.(t("cloud.republishing"));
              btnRepublish.disabled = true;
              await republishWork(work.id, {
                title: work.title,
                project: getProjectData(),
                userName: session.userName,
              });
              setStatus?.(t("cloud.republished", { title: work.title }));
              AppLogger?.info("Republish", work.title);
              refreshRepo();
            } catch (err) {
              alert(t("cloud.republish_failed_alert", { msg: err.message }));
            } finally {
              btnRepublish.disabled = false;
            }
          });

          const btnRename = document.createElement("button");
          btnRename.type = "button";
          btnRename.className = "btn btn-xs btn-ghost";
          btnRename.textContent = t("cloud.rename");
          btnRename.addEventListener("click", async () => {
            const next = prompt(t("cloud.rename_prompt"), work.title || "");
            if (next == null) return;
            try {
              const session = loadSession();
              await renamePublishedWork(work.id, next, session.userName);
              refreshRepo();
              setStatus?.(t("cloud.renamed"));
            } catch (err) {
              alert(err.message);
            }
          });

          const btnDel = document.createElement("button");
          btnDel.type = "button";
          btnDel.className = "btn btn-xs btn-ghost";
          btnDel.textContent = t("cloud.delete");
          btnDel.addEventListener("click", async () => {
            if (!confirm(t("cloud.delete_confirm", { title: work.title }))) return;
            try {
              const session = loadSession();
              await deletePublishedWork(work.id, session.userName);
              if (getEditingWorkId?.() === work.id) setEditingWorkId?.(null);
              refreshRepo();
              setStatus?.(t("cloud.deleted"));
            } catch (err) {
              alert(err.message);
            }
          });

          if (work.hasProjectJson) {
            const btnDown = document.createElement("button");
            btnDown.type = "button";
            btnDown.className = "btn btn-xs btn-ghost";
            btnDown.textContent = t("cloud.download_json");
            btnDown.addEventListener("click", async () => {
              try {
                const full = await ensureWorkJson(work);
                downloadPublishedJson(full);
              } catch (err) {
                alert(err.message);
              }
            });
            actions.append(btnDown);
          }

          if (work.audioUrl) {
            const link = document.createElement("a");
            link.className = "btn btn-xs btn-ghost";
            link.href = work.audioUrl;
            link.target = "_blank";
            link.rel = "noopener";
            link.textContent = t("cloud.preview");
            actions.append(link);
          }

          actions.prepend(btnEdit, btnRepublish, btnRename, btnDel);
          li.append(head, sub, actions);
          listEl.appendChild(li);
        });
        setRepoStatus(t("cloud.works_repo_count", { n: works.length }));
      } catch (err) {
        renderEmpty(t("cloud.load_failed_repo"));
        AppLogger?.error("Works repo", err.message);
        alert(err.message);
      } finally {
        loading = false;
        btnRefresh.disabled = false;
      }
    }

    btn.addEventListener("click", () => {
      if (!isCloudEnabled()) {
        alert(t("cloud.configure_cloud"));
        return;
      }
      dialog.showModal();
      refreshRepo();
    });

    btnRefresh?.addEventListener("click", refreshRepo);
    btnClose?.addEventListener("click", () => dialog.close());
  }

  function initPublishStoreUI({ setStatus, onLoadPublishedProject }) {
    const btnStore = document.getElementById("btnPublishStore");
    const dialog = document.getElementById("publishStoreDialog");
    const listEl = document.getElementById("publishStoreList");
    const statusEl = document.getElementById("publishStoreStatus");
    const btnRefresh = document.getElementById("btnPublishStoreRefresh");
    const btnClose = document.getElementById("btnPublishStoreClose");

    if (!btnStore || !dialog || !listEl) return;

    let loading = false;
    let cachedWorks = [];

    function setStoreStatus(text) {
      if (statusEl) statusEl.textContent = text || "";
    }

    function renderEmpty(message) {
      listEl.innerHTML = "";
      const li = document.createElement("li");
      li.className = "publish-store-empty";
      li.textContent = message;
      listEl.appendChild(li);
    }

    function renderWorks(works) {
      listEl.innerHTML = "";
      if (!works.length) {
        renderEmpty(t("cloud.no_public_json"));
        return;
      }
      works.forEach((work) => {
        const li = document.createElement("li");
        li.className = "publish-store-item";
        li.setAttribute("role", "listitem");

        const head = document.createElement("div");
        head.className = "publish-store-item-head";
        const title = document.createElement("div");
        title.className = "publish-store-item-title";
        title.textContent = work.title || t("cloud.unnamed");
        const time = document.createElement("div");
        time.className = "publish-store-item-meta";
        time.textContent = formatStoreTime(work.publishedAt);
        head.append(title, time);

        const author = document.createElement("div");
        author.className = "publish-store-item-author";
        author.textContent = t("cloud.author", { name: work.userName || "—" });

        const actions = document.createElement("div");
        actions.className = "publish-store-item-actions";

        const btnDown = document.createElement("button");
        btnDown.type = "button";
        btnDown.className = "btn btn-xs btn-ghost";
        btnDown.textContent = t("cloud.download_json");
        btnDown.addEventListener("click", () => {
          try {
            const name = downloadPublishedJson(work);
            AppLogger?.info("Store download", name);
            setStatus?.(t("cloud.downloaded_name", { name }));
          } catch (err) {
            alert(err.message);
          }
        });

        const btnLoad = document.createElement("button");
        btnLoad.type = "button";
        btnLoad.className = "btn btn-xs";
        btnLoad.textContent = t("cloud.download_and_load");
        btnLoad.addEventListener("click", () => {
          try {
            if (typeof onLoadPublishedProject !== "function") {
              throw new Error(t("cloud.load_interface_missing"));
            }
            const name = downloadPublishedJson(work);
            const project = projectJsonToProject(work.projectJson);
            const ok = onLoadPublishedProject(project, {
              title: work.title,
              userName: work.userName,
              filename: name,
              archiveReason: `Before load: ${work.title}`,
            });
            if (ok !== false) {
              dialog.close();
              AppLogger?.info("Loaded from store", work.title);
              setStatus?.(t("cloud.loaded_store", { title: work.title }));
            }
          } catch (err) {
            AppLogger?.error("Store load failed", err.message);
            alert(t("cloud.load_store_failed_alert", { msg: err.message }));
          }
        });

        actions.append(btnDown, btnLoad);

        if (work.audioUrl) {
          const link = document.createElement("a");
          link.className = "btn btn-xs btn-ghost";
          link.href = work.audioUrl;
          link.target = "_blank";
          link.rel = "noopener";
          link.textContent = t("cloud.preview_mp3");
          actions.append(link);
        }

        li.append(head, author, actions);
        listEl.appendChild(li);
      });
    }

    async function refreshStore() {
      if (loading) return;
      if (!isCloudEnabled()) {
        renderEmpty(t("cloud.configure_cloud"));
        setStoreStatus(t("cloud.store_disconnected"));
        return;
      }
      loading = true;
      btnRefresh.disabled = true;
      setStoreStatus(t("cloud.loading_works"));
      renderEmpty(t("cloud.loading"));
      try {
        cachedWorks = await listPublishStoreWorks();
        renderWorks(cachedWorks);
        setStoreStatus(t("cloud.store_count", { n: cachedWorks.length }));
      } catch (err) {
        renderEmpty(t("cloud.load_failed_retry"));
        setStoreStatus("");
        AppLogger?.error("Publish store", err.message);
        alert(t("cloud.cannot_load_store", { msg: err.message }));
      } finally {
        loading = false;
        btnRefresh.disabled = false;
      }
    }

    btnStore.addEventListener("click", () => {
      if (!isCloudEnabled()) {
        alert(t("cloud.configure_cloud_long"));
        return;
      }
      dialog.showModal();
      refreshStore();
    });

    btnRefresh?.addEventListener("click", refreshStore);
    btnClose?.addEventListener("click", () => dialog.close());
  }


  function initUI({
    getProjectData,
    setStatus,
    onLoadPublishedProject,
    getEditingWorkId,
    setEditingWorkId,
  }) {
        const btnPublish = document.getElementById("btnPublish");
    const publishDialog = document.getElementById("publishDialog");
    const publishForm = document.getElementById("publishForm");
    const publishTitle = document.getElementById("publishTitle");
    const publishNickname = document.getElementById("publishNickname");

    if (!btnPublish || !publishDialog) return;

    btnPublish.addEventListener("click", () => {
      const s = loadSession();
      if (publishTitle) publishTitle.value = "";
      if (publishNickname) publishNickname.value = s?.userName || "";
      publishDialog.showModal();
    });

    if (publishForm) {
      publishForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const submitter = e.submitter;
        if (!submitter || submitter.value !== "ok") {
          publishDialog.close();
          return;
        }
        const title = publishTitle?.value?.trim();
        const nick = publishNickname?.value?.trim();
        publishDialog.close();
        try {
          if (!isCloudEnabled()) {
            throw new Error(t("cloud.configure_cloud"));
          }
          if (!nick) {
            throw new Error(t("cloud.need_nickname"));
          }
          if (typeof getProjectData !== "function") {
            throw new Error(t("cloud.cannot_read_project"));
          }
          if (typeof AudioExport === "undefined" || !AudioExport.renderExportBlob) {
            throw new Error(t("cloud.audio_module_missing"));
          }
          setStatus?.(t("cloud.publish_rendering"));
          btnPublish.disabled = true;
          const project = getProjectData();
          const projectJson = buildPublishProjectJson(project, {
            title,
            source: "publish",
          });
          const blob = await AudioExport.renderExportBlob(project, "mp3");
          const work = await publishWork({
            title,
            audioBlob: blob,
            userName: nick,
            projectJson,
          });
          const jsonNote = work.hasProjectJson ? ` (${t("cloud.has_json")})` : "";
          AppLogger.info("Published", `${work.title} · ${work.id.slice(0, 8)}${jsonNote}`);
          setStatus?.(t("cloud.published", { title: work.title, note: jsonNote }));
        } catch (err) {
          AppLogger.error("Publish failed", err.message);
          setStatus?.(t("cloud.publish_failed_status", { msg: err.message }));
          alert(t("cloud.publish_failed", { msg: err.message }));
        } finally {
          btnPublish.disabled = false;
        }
      });
    }

    initPublishStoreUI({ setStatus, onLoadPublishedProject });
    initWorksRepoUI({
      setStatus,
      getProjectData,
      onLoadPublishedProject,
      getEditingWorkId,
      setEditingWorkId,
    });
  }

  return {
    loadSession,
    saveSession,
    isCloudEnabled,
    ensureUser,
    publishWork,
    buildPublishProjectJson,
    listPublishStoreWorks,
    listMyPublishedWorks,
    fetchMyPublishedWork,
    deletePublishedWork,
    renamePublishedWork,
    republishWork,
    downloadPublishedJson,
    initUI,
  };
})();

if (typeof globalThis !== "undefined") {
  globalThis.CloudPublish = CloudPublish;
  globalThis.BeatBattleCloud = CloudPublish;
}
