/**
 * HarmonyForge — main UI and playback
 */
(() => {
  const t = (key, params) =>
    typeof window.HF_T === "function" ? window.HF_T(key, params) : key;

  const STORAGE_KEY = "harmonyforge-project";
  const DRAFT_KEY = "harmonyforge-draft";
  let autosaveTimer = null;

  let playing = false;
  let playMode = "pattern";
  let currentStep = -1;
  let currentArrangeSection = -1;
  let playingPatternIndex = -1;
  let seqFollowEnabled = false;
  let typeLoopEnabled = false;
  let stepLoopEnabled = false;
  let loopStepIndex = 0;
  let selectedArrangeSection = -1;
  let arrangeSectionClipboard = null;
  let arrangeClipboardFromCut = false;
  let schedulerTimer = null;
  let unlockWarmTimer = null;
  /** 音频时间轴：第 0 步发声时刻（AudioContext.currentTime） */
  let playStartAnchor = 0;
  /** 已排程到音频时间轴的最后一步索引（-1 = 尚未排任何步） */
  let lastScheduledStepIndex = -1;
  let stepCounter = 0;
  let bpm = 120;
  /** 正在编辑的云端作品 id（作品仓库「编辑」后设置） */
  let editingPublishedWorkId = null;

  const SCHEDULE_LOOKAHEAD = 0.22;
  const SCHEDULE_TICK_MS = 20;
  const SCHEDULE_MAX_STEPS_PER_TICK = 24;

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const els = {
    btnPlay: $("#btnPlay"),
    btnStop: $("#btnStop"),
    bpm: $("#bpm"),
    bpmValue: $("#bpmValue"),
    patternTabs: $("#patternTabs"),
    btnRemovePattern: $("#btnRemovePattern"),
    btnAddPattern: $("#btnAddPattern"),
    tracks: $("#tracks"),
    stepLabels: $("#stepLabels"),
    arrangeTimeline: $("#arrangeTimeline"),
    btnRemoveSection: $("#btnRemoveSection"),
    arrangeInfo: $("#arrangeInfo"),
    btnRemoveSteps: $("#btnRemoveSteps"),
    btnAddSteps: $("#btnAddSteps"),
    stepCountInfo: $("#stepCountInfo"),
    trackCountInfo: $("#trackCountInfo"),
    btnAddTrack: $("#btnAddTrack"),
    btnRemoveTrack: $("#btnRemoveTrack"),
    typeCountInfo: $("#typeCountInfo"),
    mixer: $("#mixer"),
    statusText: $("#statusText"),
    btnExport: $("#btnExport"),
    exportDialog: $("#exportDialog"),
    exportForm: $("#exportForm"),
    exportFormat: $("#exportFormat"),
    exportBasename: $("#exportBasename"),
    chkSeqFollow: $("#chkSeqFollow"),
    chkTypeLoop: $("#chkTypeLoop"),
    chkStepLoop: $("#chkStepLoop"),
    btnImport: $("#btnImport"),
    projectFileInput: $("#projectFileInput"),
    btnSave: $("#btnSave"),
    btnLoad: $("#btnLoad"),
    btnClear: $("#btnClear"),
    noteDialog: $("#noteDialog"),
    noteDialogTitle: $("#noteDialogTitle"),
    notePreview: $("#notePreview"),
    noteDialogHint: $("#noteDialogHint"),
    noteGrid: $("#noteGrid"),
    noteClear: $("#noteClear"),
    noteApply: $("#noteApply"),
    choiceDialog: $("#choiceDialog"),
    choiceDialogTitle: $("#choiceDialogTitle"),
    choiceGrid: $("#choiceGrid"),
  };

  let noteEditContext = null;
  let notePendingMidi = null;

  function patternLabel(index) {
    if (index < 26) return String.fromCharCode(65 + index);
    return `P${index + 1}`;
  }


  function openChoiceDialog({ title, items, currentValue, columns, onPick }) {
    if (!els.choiceDialog || !els.choiceGrid) return;
    els.choiceDialogTitle.textContent = title;
    els.choiceGrid.innerHTML = "";
    if (columns) {
      els.choiceGrid.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
    } else {
      els.choiceGrid.style.gridTemplateColumns = "";
    }
    items.forEach((item) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className =
        "note-btn" + (String(item.value) === String(currentValue) ? " selected" : "");
      btn.textContent = item.label;
      btn.addEventListener("click", () => {
        onPick(item.value, item);
        els.choiceDialog.close();
      });
      els.choiceGrid.appendChild(btn);
    });
    els.choiceDialog.showModal();
  }

  function syncSequencerToSection(sectionIndex) {
    const sec = Arranger.getSection(sectionIndex);
    if (!sec) return;
    selectPattern(sec.patternIndex, { fromArrangeSelection: true });
  }

  function setSelectedArrangeSection(index) {
    selectedArrangeSection = index;
    els.arrangeTimeline
      ?.querySelectorAll(".arrange-slot")
      .forEach((el, i) => {
        el.classList.toggle("active", i === index);
      });
    if (index >= 0) {
      syncSequencerToSection(index);
      const sec = Arranger.getSection(index);
      const pi = sec?.patternIndex ?? 0;
      setStatus(t("status.section_synced", { n: index + 1, pattern: patternLabel(pi) }));
    }
  }

  function openAddSectionDialog() {
    const last = Arranger.getSections();
    const defaultPi = last.length
      ? last[last.length - 1].patternIndex
      : Sequencer.currentPattern();
    openChoiceDialog({
      title: t("status.new_section_pattern"),
      columns: Math.min(4, Sequencer.patternCount),
      currentValue: defaultPi,
      items: Array.from({ length: Sequencer.patternCount }, (_, i) => ({
        value: i,
        label: patternLabel(i),
      })),
      onPick: (value) => {
        runEdit(() => {
          const r = Arranger.addSection(Number(value));
          selectedArrangeSection = r.index;
          renderArrangement();
          syncSequencerToSection(r.index);
        });
        setStatus(t("status.section_added", { n: Arranger.getSectionCount(), pattern: patternLabel(Number(value)) }));
      },
    });
  }

  function openInstrumentPicker(trackId) {
    const track = Sequencer.getTrack(trackId);
    if (!track) return;
    const items = Sequencer.listInstruments().map((inst) => ({
      value: inst.id,
      label: inst.name,
    }));
    openChoiceDialog({
      title: t("status.switch_instrument", { name: track.name }),
      columns: 4,
      currentValue: track.instrumentId,
      items,
      onPick: (value) => {
        runEdit(() => {
          Sequencer.setTrackInstrument(trackId, String(value));
          if (typeof AudioEngine.invalidateTrack === "function") {
            AudioEngine.invalidateTrack(trackId);
          }
          renderSequencer();
          renderMixer();
        });
        const inst = Instruments.get(String(value));
        setStatus(t("status.switched_instrument", { name: inst?.name ?? value }));
      },
    });
  }

  function openAddTrackDialog() {
    if (Sequencer.trackCount >= Sequencer.MAX_TRACKS) {
      setStatus(t("status.max_tracks", { max: Sequencer.MAX_TRACKS }));
      return;
    }
    const items = Sequencer.listInstruments().map((inst) => ({
      value: inst.id,
      label: inst.name,
    }));
    openChoiceDialog({
      title: t("status.add_track"),
      columns: 4,
      currentValue: "kick",
      items,
      onPick: (value) => {
        runEdit(() => {
          const r = Sequencer.addTrack(String(value));
          if (!r.ok) return;
          renderSequencer();
          renderMixer();
          applyVolumesToEngine();
          updateTrackCountUI();
        });
        const inst = Instruments.get(String(value));
        setStatus(t("status.track_added", { name: inst?.name ?? value }));
      },
    });
  }

  function openTrackRatePicker(trackId) {
    const track = Sequencer.TRACKS.find((t) => t.id === trackId);
    const current = Sequencer.getTrackRate(trackId);
    openChoiceDialog({
      title: t("status.step_density", { name: track?.name ?? t("sequencer.track_fallback") }),
      columns: 4,
      currentValue: current,
      items: TrackTiming.RATE_OPTIONS.map((o) => ({
        value: o.value,
        label: o.label,
      })),
      onPick: (value) => {
        runEdit(() => {
          Sequencer.setTrackRate(trackId, Number(value));
          renderSequencer();
        });
        scheduleAutosave();
        setStatus(
          t("status.step_density_set", { name: track?.name ?? t("sequencer.track_fallback"), rate: TrackTiming.rateLabel(Sequencer.getTrackRate(trackId)) })
        );
      },
    });
  }

  function copyArrangeSection() {
    if (selectedArrangeSection < 0) {
      setStatus(t("status.select_section_first"));
      return;
    }
    const sec = Arranger.getSection(selectedArrangeSection);
    if (!sec) return;
    arrangeSectionClipboard = { ...sec };
    arrangeClipboardFromCut = false;
    setStatus(t("status.section_copied", { n: selectedArrangeSection + 1, pattern: patternLabel(sec.patternIndex) }));
  }

  function cutArrangeSection() {
    if (selectedArrangeSection < 0) {
      setStatus(t("status.select_section_first"));
      return;
    }
    const idx = selectedArrangeSection;
    const sec = Arranger.getSection(idx);
    if (!sec) return;
    runEdit(() => {
      arrangeSectionClipboard = { ...sec };
      arrangeClipboardFromCut = true;
      const r = Arranger.removeSectionAt(idx);
      if (!r.ok) {
        arrangeSectionClipboard = null;
        arrangeClipboardFromCut = false;
        setStatus(t("status.section_cut_min"));
        return;
      }
      selectedArrangeSection = Math.min(idx, r.count - 1);
      renderArrangement();
      setStatus(t("status.section_cut", { n: idx + 1, pattern: patternLabel(sec.patternIndex) }));
      scheduleAutosave();
    });
  }

  function insertArrangeSection(before) {
    if (!arrangeSectionClipboard) {
      setStatus(t("status.paste_section_first"));
      return;
    }
    let insertAt = before ? 0 : Arranger.getSectionCount();
    if (selectedArrangeSection >= 0) {
      insertAt = before ? selectedArrangeSection : selectedArrangeSection + 1;
    }
    const fromCut = arrangeClipboardFromCut;
    runEdit(() => {
      const r = Arranger.insertSectionAt(insertAt, arrangeSectionClipboard);
      if (fromCut) {
        arrangeSectionClipboard = null;
        arrangeClipboardFromCut = false;
      }
      selectedArrangeSection = r.index;
      renderArrangement();
      const pos = before ? t("status.insert_pos_before") : t("status.insert_pos_after");
      setStatus(t("status.section_inserted", { n: insertAt + 1, pos }));
    });
    scheduleAutosave();
  }

  function openPatternPickerForSection(sectionIndex) {
    const sections = Arranger.getSections();
    const current = sections[sectionIndex]?.patternIndex ?? 0;
    openChoiceDialog({
      title: t("status.pick_section_pattern", { n: sectionIndex + 1 }),
      columns: Math.min(4, Sequencer.patternCount),
      currentValue: current,
      items: Array.from({ length: Sequencer.patternCount }, (_, i) => ({
        value: i,
        label: patternLabel(i),
      })),
      onPick: (value) => {
        runEdit(() => {
          Arranger.setSectionPattern(sectionIndex, Number(value));
          renderArrangement();
          if (selectedArrangeSection === sectionIndex) {
            syncSequencerToSection(sectionIndex);
          }
        });
        scheduleAutosave();
        setStatus(t("status.section_pattern_set", { n: sectionIndex + 1, pattern: patternLabel(Number(value)) }));
      },
    });
  }

  function refreshAfterHistory() {
    renderPatternTabs();
    renderStepLabels();
    renderSequencer();
    renderArrangement();
    updateStepCountUI();
    updateTrackCountUI();
    updateTypeCountUI();
    syncSequencerLayout();
    syncModuleSpacing();
    renderMixer();
    applyVolumesToEngine();
  }

  function updateHistoryButtons() {
    const canU = typeof EditHistory !== "undefined" && EditHistory.canUndo();
    const canR = typeof EditHistory !== "undefined" && EditHistory.canRedo();
    document.querySelectorAll(".btn-history-undo").forEach((b) => {
      b.disabled = !canU;
    });
    document.querySelectorAll(".btn-history-redo").forEach((b) => {
      b.disabled = !canR;
    });
  }

  function initEditHistory() {
    if (typeof EditHistory === "undefined") return;
    EditHistory.init({
      getState: getProjectData,
      applyState: (data) => {
        applyProjectData(data, true);
        refreshAfterHistory();
      },
      onChange: () => updateHistoryButtons(),
    });
    updateHistoryButtons();
  }

  function recordEdit() {
    if (typeof EditHistory !== "undefined" && !EditHistory.isApplying()) {
      EditHistory.capture();
      updateHistoryButtons();
    }
  }

  function runEdit(action) {
    action();
    recordEdit();
    scheduleAutosave();
  }

  function syncSequencerLayout() {
    const wrap = document.querySelector(".module-sequencer .sequencer-wrap");
    if (wrap) wrap.style.setProperty("--seq-step-count", String(Sequencer.steps));
  }

  let moduleSpacingRaf = null;

  window.syncModuleSpacing = function syncModuleSpacing() {
    const cfg =
      typeof LayoutManager !== "undefined" && LayoutManager.getSpacingConfig
        ? LayoutManager.getSpacingConfig()
        : { autoGap: true, moduleGap: 0, mainGap: 15 };

    const main = document.querySelector(".main");
    const mainGapPx = Math.max(0, Number(cfg.mainGap) || 0);
    const moduleGapPx = Math.max(0, Number(cfg.moduleGap) || 0);

    document.documentElement.style.setProperty("--main-module-gap", `${mainGapPx}px`);
    document.documentElement.style.setProperty("--chrome-module-gap", `${moduleGapPx}px`);

    if (!main) return;

    if (!cfg.autoGap) {
      main.style.removeProperty("padding-bottom");
      document.documentElement.style.setProperty("--layout-main-pad-bottom", "0");
      return;
    }

    if (moduleSpacingRaf) cancelAnimationFrame(moduleSpacingRaf);
    moduleSpacingRaf = requestAnimationFrame(() => {
      moduleSpacingRaf = null;
      const visible = [...main.querySelectorAll("fieldset.module[data-module]:not([hidden])")];
      if (!visible.length) {
        main.style.paddingBottom = "0";
        document.documentElement.style.setProperty("--layout-main-pad-bottom", "0");
        return;
      }
      const mainRect = main.getBoundingClientRect();
      const last = visible[visible.length - 1];
      const lastBottom = last.getBoundingClientRect().bottom;
      const used = lastBottom - mainRect.top;
      const pad = Math.max(0, Math.round(mainRect.height - used));
      main.style.paddingBottom = `${pad}px`;
      document.documentElement.style.setProperty("--layout-main-pad-bottom", `${pad}px`);
    });
  }

  function logModuleShellMetrics() {
    document.querySelectorAll("fieldset.module").forEach((fs) => {
      const body = fs.querySelector(".module-body");
      const chrome = fs.querySelector(".module-chrome");
      const name = fs.querySelector("legend")?.textContent || "?";
      const r = fs.getBoundingClientRect();
      const br = body?.getBoundingClientRect();
      AppLogger.info(
        `外壳[${name}]`,
        `fieldset ${Math.round(r.height)}px · body ${body ? Math.round(br.height) : 0}px` +
          (chrome ? ` · 工具条 ${Math.round(chrome.getBoundingClientRect().height)}px` : "")
      );
    });
  }

  function init() {
    if (typeof Instruments !== "undefined" && Instruments.applyI18nNames) {
      Instruments.applyI18nNames();
    }
    if (typeof Sequencer !== "undefined" && Sequencer.refreshScaleLabels) {
      Sequencer.refreshScaleLabels();
    }
    if (window.HFI18n?.applyDomI18n) window.HFI18n.applyDomI18n();
    if (new URLSearchParams(location.search).get("debug") === "layers") {
      document.documentElement.setAttribute("data-debug-layers", "");
      requestAnimationFrame(() => logModuleShellMetrics());
    }

    AppLogger.info("HarmonyForge 启动", `Card World v${AppVersion.CURRENT}`);
    AppVersion.initUI();
    wireAudioUnlock();
    if (typeof DraftStation !== "undefined") {
      DraftStation.initUI({
        getProjectData,
        setStatus,
        onLoadDraft: (project, meta) => {
          if (!confirm(t("status.load_draft_confirm", { name: meta.name }))) return false;
          return loadExternalProject(project, {
            ...meta,
            fromDraftStation: true,
            skipConfirm: true,
            archiveReason: t("status.load_draft_archive", { name: meta.name }),
          });
        },
      });
    }
    if (typeof BeatBattleCloud !== "undefined") {
      BeatBattleCloud.initUI({
        getProjectData,
        setStatus,
        onLoadPublishedProject: loadExternalProject,
        getEditingWorkId: () => editingPublishedWorkId,
        setEditingWorkId: (id) => {
          editingPublishedWorkId = id;
        },
      });
    }
    if (typeof HelpGuide !== "undefined") HelpGuide.init();
    LayoutManager.init({
      onChange: () => scheduleAutosave(),
    });
    wireSeqFollowLayoutHooks();
    if (!loadDraft()) {
      Sequencer.loadDemoPatterns();
    }
    initEditHistory();
    renderPatternTabs();
    renderStepLabels();
    renderSequencer();
    renderArrangement();
    renderMixer();
    bindEvents();
    applyVolumesToEngine();
    updateStepCountUI();
    updateTrackCountUI();
    updateTypeCountUI();
    syncSequencerLayout();
    syncModuleSpacing();
    window.addEventListener("resize", syncModuleSpacing);
    if (typeof ResizeObserver !== "undefined") {
      const main = document.querySelector(".main");
      if (main) new ResizeObserver(syncModuleSpacing).observe(main);
    }
    setStatus(t("status.ready"));
    scheduleAutosave();
  }

  function renderPatternTabs() {
    els.patternTabs.innerHTML = "";
    for (let i = 0; i < Sequencer.patternCount; i++) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "pattern-tab" + (i === Sequencer.currentPattern() ? " active" : "");
      btn.textContent = patternLabel(i);
      btn.setAttribute("role", "tab");
      btn.setAttribute("aria-selected", i === Sequencer.currentPattern());
      btn.dataset.pattern = i;
      btn.addEventListener("click", () => selectPattern(i, { userInitiated: true }));
      els.patternTabs.appendChild(btn);
    }
    if (els.btnAddPattern) {
      els.btnAddPattern.disabled = Sequencer.patternCount >= Sequencer.MAX_PATTERNS;
    }
    if (els.btnRemovePattern) {
      els.btnRemovePattern.disabled = Sequencer.patternCount <= Sequencer.MIN_PATTERNS;
    }
    updateTypeCountUI();
  }

  function setSeqFollowEnabled(on, reason) {
    seqFollowEnabled = !!on;
    if (els.chkSeqFollow) els.chkSeqFollow.checked = seqFollowEnabled;
    if (!seqFollowEnabled) {
      updatePlayhead(currentStep, currentArrangeSection);
    }
    if (reason && !seqFollowEnabled) {
      setStatus(reason);
    }
  }

  function onLayoutOrViewChanged() {
    if (seqFollowEnabled) {
      setSeqFollowEnabled(false, t("status.seq_follow_off"));
    }
  }

  function wireSeqFollowLayoutHooks() {
    ["arrange", "sequencer", "mixer"].forEach((id) => {
      const cb = document.getElementById(`layoutVis_${id}`);
      if (cb) cb.addEventListener("change", onLayoutOrViewChanged);
    });
  }

  function setLoopStepIndex(step) {
    loopStepIndex = Math.max(0, Math.min(Sequencer.steps - 1, step));
    renderStepLabels();
    if (stepLoopEnabled && playing && playMode === "step") {
      setStatus(stepLoopStatusText());
    } else {
      setStatus(t("status.loop_step", { n: loopStepIndex + 1 }));
    }
  }

  function stepLoopStatusText() {
    const pi = Sequencer.currentPattern();
    const has = Sequencer.stepColumnHasContent(pi, loopStepIndex);
    const hint = has ? "" : t("status.step_loop_empty");
    return t("status.step_loop_col", { pattern: patternLabel(pi), n: loopStepIndex + 1, hint });
  }

  function interruptPlaybackForPreview() {
    if (playing) pause({ keepLoopFlags: false });
    setTypeLoopEnabled(false);
    setStepLoopEnabled(false);
  }

  function wireAudioUnlock() {
    const warm = () => {
      if (unlockWarmTimer) return;
      unlockWarmTimer = window.setTimeout(() => {
        unlockWarmTimer = null;
      }, 250);
      AudioEngine.unlockAudio().catch(() => {});
    };
    document.addEventListener("pointerdown", warm, { capture: true });
    document.addEventListener("keydown", warm, { capture: true });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState !== "visible") return;
      AudioEngine.unlockAudio()
        .then(() => {
          if (playing) realignPlayAnchor();
        })
        .catch(() => {});
    });
    AudioEngine.setOnSuspendWhilePlaying(() => {
      if (!playing) return;
      AudioEngine.unlockAudio()
        .then(() => realignPlayAnchor())
        .catch(() => {});
    });
  }

  function setTypeLoopEnabled(on) {
    typeLoopEnabled = !!on;
    if (els.chkTypeLoop) els.chkTypeLoop.checked = typeLoopEnabled;
  }

  function setStepLoopEnabled(on) {
    stepLoopEnabled = !!on;
    if (els.chkStepLoop) els.chkStepLoop.checked = stepLoopEnabled;
  }

  function clearLoopModes() {
    setTypeLoopEnabled(false);
    setStepLoopEnabled(false);
  }

  function followPlaybackPattern(patternIndex) {
    if (!seqFollowEnabled || playMode !== "arrange" || !playing) return;
    if (Sequencer.currentPattern() !== patternIndex) {
      Sequencer.setCurrentPattern(patternIndex);
      renderPatternTabs();
      renderSequencer();
    }
  }

  function selectPattern(index, options = {}) {
    if (options.userInitiated && seqFollowEnabled) {
      setSeqFollowEnabled(false, t("status.seq_follow_off"));
    }
    Sequencer.setCurrentPattern(index);
    renderPatternTabs();
    renderSequencer();
    if (playing) updatePlayhead(currentStep, currentArrangeSection);
    if (options.fromArrangeSelection) return;
    if (playing && playMode === "pattern" && typeLoopEnabled) {
      setStatus(t("status.type_loop_on", { pattern: patternLabel(index) }));
    } else if (!options.silent) {
      setStatus(t("status.type_label", { pattern: patternLabel(index) }));
    }
    if (!options.silent) scheduleAutosave();
  }

  function updateTypeCountUI() {
    if (els.typeCountInfo) {
      els.typeCountInfo.textContent = t("sequencer.type_count", { n: Sequencer.patternCount });
    }
  }

  function updateTrackCountUI() {
    if (els.trackCountInfo) {
      els.trackCountInfo.textContent = t("sequencer.track_count", { n: Sequencer.trackCount });
    }
    if (els.btnAddTrack) {
      els.btnAddTrack.disabled = Sequencer.trackCount >= Sequencer.MAX_TRACKS;
    }
    if (els.btnRemoveTrack) {
      els.btnRemoveTrack.disabled = Sequencer.trackCount <= Sequencer.MIN_TRACKS;
    }
  }

  function updateStepCountUI() {
    if (loopStepIndex >= Sequencer.steps) {
      loopStepIndex = Math.max(0, Sequencer.steps - 1);
    }
    if (els.stepCountInfo) {
      els.stepCountInfo.textContent = t("sequencer.step_count", { n: Sequencer.steps });
    }
    if (els.btnAddSteps) {
      els.btnAddSteps.disabled = Sequencer.steps >= Sequencer.MAX_STEPS;
    }
    if (els.btnRemoveSteps) {
      els.btnRemoveSteps.disabled = Sequencer.steps <= Sequencer.MIN_STEPS;
    }
  }

  function renderStepLabels() {
    els.stepLabels.innerHTML = '<span class="step-label" aria-hidden="true"></span>';
    for (let s = 0; s < Sequencer.steps; s++) {
      const btn = document.createElement("button");
      btn.type = "button";
      let cls = "step-label";
      if (s % 4 === 0) cls += " beat";
      if (s === loopStepIndex) cls += " loop-step-target";
      btn.className = cls;
      btn.textContent = s + 1;
      btn.title = t("sequencer.step_loop_pick", { n: s + 1 });
      btn.addEventListener("click", () => setLoopStepIndex(s));
      els.stepLabels.appendChild(btn);
    }
    syncSequencerLayout();
  }

  function renderSequencer() {
    const pattern = Sequencer.getPattern(Sequencer.currentPattern());
    els.tracks.innerHTML = "";

    Sequencer.TRACKS.forEach((track) => {
      const row = document.createElement("div");
      row.className = "track-row";

      const labelCol = document.createElement("div");
      labelCol.className = "track-label-col";

      const nameBtn = document.createElement("button");
      nameBtn.type = "button";
      nameBtn.className = `track-name-btn ${track.class}`;
      nameBtn.textContent = track.name;
      nameBtn.title = t("sequencer.track_switch_title", { name: track.name });
      nameBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        openInstrumentPicker(track.id);
      });
      labelCol.appendChild(nameBtn);

      const rateBtn = document.createElement("button");
      rateBtn.type = "button";
      rateBtn.className = "note-btn pitch-pick-btn track-rate-btn";
      rateBtn.title = t("sequencer.step_density_title");
      rateBtn.textContent = TrackTiming.rateLabel(Sequencer.getTrackRate(track.id));
      rateBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        openTrackRatePicker(track.id);
      });
      labelCol.appendChild(rateBtn);
      row.appendChild(labelCol);

      for (let step = 0; step < Sequencer.steps; step++) {
        const cell = pattern[track.id][step];
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = `step-cell ${cell.on ? "on " + track.class : ""}`;
        btn.dataset.track = track.id;
        btn.dataset.step = step;
        btn.setAttribute("aria-label", t("sequencer.step_cell_aria", { track: track.name, step: step + 1 }));

        if (cell.on && track.type === "melodic" && cell.note != null) {
          const lbl = document.createElement("span");
          lbl.className = "note-label";
          lbl.textContent = Sequencer.noteLabel(cell.note);
          btn.appendChild(lbl);
        }

        btn.addEventListener("click", () => onStepClick(track, step));
        row.appendChild(btn);
      }
      els.tracks.appendChild(row);
    });
    syncSequencerLayout();
    syncModuleSpacing();
  }

  function onStepClick(track, step) {
    const pi = Sequencer.currentPattern();
    if (track.type === "melodic") {
      openNoteDialog(track.id, step, pi);
    } else {
      const pattern = Sequencer.getPattern(pi);
      const cell = pattern[track.id][step];
      const wasOn = cell.on;
      runEdit(() => {
        Sequencer.toggleStep(pi, track.id, step);
        renderSequencer();
      });
      if (!wasOn && cell.on) {
        AudioEngine.unlockAudio().then(() => {
          AudioEngine.playTrackSound(track.id, AudioEngine.now() + 0.02, null, getStepDuration());
        });
      }
    }
  }

  function highlightNoteGridSelection() {
    if (!els.noteGrid) return;
    els.noteGrid.querySelectorAll(".note-btn").forEach((btn) => {
      const midi = Number(btn.dataset.midi);
      btn.classList.toggle(
        "selected",
        notePendingMidi != null && midi === notePendingMidi
      );
    });
  }

  function commitNoteSelection(midi) {
    if (!noteEditContext) return;
    const { trackId, step, patternIndex } = noteEditContext;
    runEdit(() => {
      Sequencer.toggleStep(patternIndex, trackId, step, midi);
      els.noteDialog.close();
      renderSequencer();
    });
    scheduleAutosave();
  }


  function rebuildNoteGrid() {
    if (!noteEditContext || !els.noteGrid) return;
    const { trackId, step, patternIndex } = noteEditContext;
    const track = Sequencer.TRACKS.find((t) => t.id === trackId);
    const notes = Sequencer.getPitchChoicesForCell(patternIndex, trackId, step);
    els.noteGrid.innerHTML = "";
    notes.forEach((midi) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className =
        "note-btn" + (notePendingMidi === midi ? " selected" : "");
      btn.dataset.midi = String(midi);
      btn.textContent = Sequencer.noteLabel(midi);
      btn.addEventListener("click", () => {
        if (els.notePreview && els.notePreview.checked) {
          interruptPlaybackForPreview();
          AudioEngine.unlockAudio().then(() => {
            AudioEngine.previewTrackNote(trackId, midi);
          });
          notePendingMidi = midi;
          highlightNoteGridSelection();
          setStatus(t("status.preview_note", { note: Sequencer.noteLabel(midi), track: track?.name ?? "" }));
          return;
        }
        commitNoteSelection(midi);
      });
      els.noteGrid.appendChild(btn);
    });
  }

  function openNoteDialog(trackId, step, patternIndex) {
    noteEditContext = { trackId, step, patternIndex };
    const cell = Sequencer.getPattern(patternIndex)[trackId][step];
    notePendingMidi = cell.on && cell.note != null ? cell.note : null;
    const track = Sequencer.TRACKS.find((t) => t.id === trackId);
    if (els.noteDialogTitle && track) {
      els.noteDialogTitle.textContent = t("status.pick_pitch", { track: track.name, step: step + 1 });
    }
    if (els.notePreview) els.notePreview.checked = true;
    if (els.noteGrid) {
      const tr = Sequencer.TRACKS.find((t) => t.id === trackId);
      const piano = tr && Sequencer.isPianoTrack && Sequencer.isPianoTrack(tr);
      els.noteGrid.classList.toggle("note-grid--piano", !!piano);
    }
    rebuildNoteGrid();
    els.noteDialog.showModal();
  }

  function renderArrangement() {
    const sections = Arranger.getSections();
    if (selectedArrangeSection >= sections.length) {
      selectedArrangeSection = sections.length ? sections.length - 1 : -1;
    }
    els.arrangeTimeline.innerHTML = "";

    sections.forEach((sec, i) => {
      const slot = document.createElement("button");
      slot.type = "button";
      slot.className =
        "arrange-slot" + (i === selectedArrangeSection ? " active" : "");
      slot.title = t("status.arrange_slot_title");
      slot.innerHTML = `
        <span class="arrange-slot-index">§${i + 1}</span>
        <span class="arrange-slot-pattern">${patternLabel(sec.patternIndex)}</span>
      `;
      let clickTimer = null;
      slot.addEventListener("click", () => {
        clearTimeout(clickTimer);
        clickTimer = setTimeout(() => {
          setSelectedArrangeSection(i);
        }, 220);
      });
      slot.addEventListener("dblclick", (e) => {
        e.preventDefault();
        clearTimeout(clickTimer);
        setSelectedArrangeSection(i);
        openPatternPickerForSection(i);
      });
      els.arrangeTimeline.appendChild(slot);
    });

    els.arrangeInfo.textContent = t("sequencer.sections_count", { n: sections.length });
    if (els.btnRemoveSection) {
      els.btnRemoveSection.disabled = sections.length <= Arranger.MIN_SECTIONS;
    }
    syncModuleSpacing();
  }

  function renderMixer() {
    els.mixer.innerHTML = "";
    const vols = Sequencer.volumes();
    Sequencer.TRACKS.forEach((track) => {
      const wrap = document.createElement("div");
      wrap.className = "mixer-track";
      const pct = Math.round((vols[track.id] ?? 0.8) * 100);
      wrap.innerHTML = `
        <label>
          <span>${track.name}</span>
          <span data-vol-display="${track.id}">${pct}%</span>
        </label>
        <input type="range" min="0" max="100" value="${pct}" data-track="${track.id}">
      `;
      const range = wrap.querySelector("input[type=range]");
      range.addEventListener("input", () => {
        const v = range.value / 100;
        Sequencer.setVolume(track.id, v);
        AudioEngine.setTrackVolume(track.id, v);
        wrap.querySelector(`[data-vol-display="${track.id}"]`).textContent = `${range.value}%`;
        scheduleAutosave();
      });
      els.mixer.appendChild(wrap);
    });
  }

  function applyVolumesToEngine() {
    Object.entries(Sequencer.volumes()).forEach(([id, v]) => {
      AudioEngine.setTrackVolume(id, v);
    });
  }

  function bindEvents() {
    els.btnPlay.addEventListener("click", () => {
      togglePlay();
    });
    els.btnStop.addEventListener("click", stop);
    els.bpm.addEventListener("input", () => {
      bpm = Number(els.bpm.value);
      els.bpmValue.textContent = bpm;
      if (typeof AudioEngine.setTransportBpm === "function") {
        AudioEngine.setTransportBpm(bpm);
      }
      resyncSchedulerForBpmChange();
      scheduleAutosave();
    });
    if (els.chkTypeLoop) {
      els.chkTypeLoop.addEventListener("change", () => {
        if (els.chkTypeLoop.checked) {
          setStepLoopEnabled(false);
          if (playing && playMode === "arrange") pause({ keepLoopFlags: true });
          setTypeLoopEnabled(true);
          startPlay("pattern");
          setStatus(t("status.type_loop_on", { pattern: patternLabel(Sequencer.currentPattern()) }));
        } else {
          setTypeLoopEnabled(false);
          if (playing && playMode === "pattern") pause({ keepLoopFlags: true });
          setStatus(t("status.type_loop_off"));
        }
      });
    }


    if (els.chkStepLoop) {
      els.chkStepLoop.addEventListener("change", () => {
        if (els.chkStepLoop.checked) {
          setTypeLoopEnabled(false);
          if (playing) pause({ keepLoopFlags: true });
          setStepLoopEnabled(true);
          startPlay("step");
          setStatus(stepLoopStatusText());
        } else {
          setStepLoopEnabled(false);
          if (playing && playMode === "step") pause({ keepLoopFlags: true });
          setStatus(t("status.step_loop_off"));
        }
      });
    }

    if (els.chkSeqFollow) {
      els.chkSeqFollow.addEventListener("change", () => {
        if (els.chkSeqFollow.checked) {
          setSeqFollowEnabled(true);
          if (playing && playMode === "arrange" && playingPatternIndex >= 0) {
            followPlaybackPattern(playingPatternIndex);
          }
          setStatus(t("status.seq_follow_on"));
        } else {
          setSeqFollowEnabled(false);
          setStatus(t("status.seq_follow_off"));
        }
      });
    }

    if (els.noteApply) {
      els.noteApply.addEventListener("click", () => {
        if (notePendingMidi != null) {
          commitNoteSelection(notePendingMidi);
        } else {
          setStatus(t("status.pick_pitch_first"));
        }
      });
    }

    if (els.btnRemoveSection) {
      els.btnRemoveSection.addEventListener("click", () => {
        runEdit(() => {
          const r = Arranger.removeSection();
          if (!r.ok) {
            setStatus(t("status.section_cut_min"));
            return;
          }
          renderArrangement();
          setStatus(t("status.sections_reduced", { n: r.count }));
        });
        scheduleAutosave();
      });
    }

    const btnAddSection = document.getElementById("btnAddSection");
    if (btnAddSection) {
      btnAddSection.addEventListener("click", () => openAddSectionDialog());
    }

    if (els.btnAddTrack) {
      els.btnAddTrack.addEventListener("click", () => openAddTrackDialog());
    }
    if (els.btnRemoveTrack) {
      els.btnRemoveTrack.addEventListener("click", () => {
        runEdit(() => {
          const r = Sequencer.removeTrack();
          if (!r.ok) {
            setStatus(t("status.min_tracks", { min: Sequencer.MIN_TRACKS }));
            return;
          }
          renderSequencer();
          renderMixer();
          updateTrackCountUI();
          setStatus(t("status.tracks_reduced", { n: r.count }));
        });
      });
    }

    const btnSectionCopy = document.getElementById("btnSectionCopy");
    if (btnSectionCopy) btnSectionCopy.addEventListener("click", copyArrangeSection);
    const btnSectionCut = document.getElementById("btnSectionCut");
    if (btnSectionCut) btnSectionCut.addEventListener("click", cutArrangeSection);
    const btnSectionInsertBefore = document.getElementById("btnSectionInsertBefore");
    if (btnSectionInsertBefore) {
      btnSectionInsertBefore.addEventListener("click", () => insertArrangeSection(true));
    }
    const btnSectionInsertAfter = document.getElementById("btnSectionInsertAfter");
    if (btnSectionInsertAfter) {
      btnSectionInsertAfter.addEventListener("click", () => insertArrangeSection(false));
    }

    document.querySelectorAll(".btn-history-undo").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (typeof EditHistory !== "undefined" && EditHistory.undo()) {
          scheduleAutosave();
          setStatus(t("status.undo"));
        }
      });
    });
    document.querySelectorAll(".btn-history-redo").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (typeof EditHistory !== "undefined" && EditHistory.redo()) {
          scheduleAutosave();
          setStatus(t("status.redo"));
        }
      });
    });

    if (els.btnAddSteps) {
      els.btnAddSteps.addEventListener("click", () => {
        runEdit(() => {
          const r = Sequencer.addSteps(Sequencer.STEP_ADD);
          if (!r.ok) {
            setStatus(t("status.max_steps", { max: Sequencer.MAX_STEPS }));
            return;
          }
          renderStepLabels();
          renderSequencer();
          renderArrangement();
          updateStepCountUI();
          setStatus(t("status.steps_increased", { n: Sequencer.steps }));
        });
      });
    }
    if (els.btnRemoveSteps) {
      els.btnRemoveSteps.addEventListener("click", () => {
        runEdit(() => {
          const r = Sequencer.removeSteps(Sequencer.STEP_ADD);
          if (!r.ok) {
            setStatus(t("status.min_steps", { min: Sequencer.MIN_STEPS }));
            return;
          }
          renderStepLabels();
          renderSequencer();
          renderArrangement();
          updateStepCountUI();
          setStatus(t("status.steps_reduced", { n: Sequencer.steps }));
        });
      });
    }

    if (els.btnAddPattern) {
      els.btnAddPattern.addEventListener("click", () => {
        runEdit(() => {
          const r = Sequencer.addPattern();
          if (!r.ok) {
            setStatus(t("status.max_patterns", { max: Sequencer.MAX_PATTERNS }));
            return;
          }
          renderPatternTabs();
          renderArrangement();
          setStatus(t("status.pattern_added", { n: r.count, label: patternLabel(r.count - 1) }));
        });
      });
    }
    if (els.btnRemovePattern) {
      els.btnRemovePattern.addEventListener("click", () => {
        runEdit(() => {
          const r = Sequencer.removePattern();
          if (!r.ok) {
            setStatus(t("status.min_patterns", { min: Sequencer.MIN_PATTERNS }));
            return;
          }
          Arranger.getSections().forEach((sec) => {
            if (sec.patternIndex >= Sequencer.patternCount) {
              sec.patternIndex = Sequencer.patternCount - 1;
            }
          });
          if (Sequencer.currentPattern() >= Sequencer.patternCount) {
            Sequencer.setCurrentPattern(Sequencer.patternCount - 1);
          }
          renderPatternTabs();
          renderSequencer();
          renderArrangement();
          setStatus(t("status.patterns_reduced", { n: r.count }));
        });
      });
    }



    if (els.btnExport && els.exportDialog) {
      els.btnExport.addEventListener("click", () => {
        if (els.exportFormat) els.exportFormat.value = "json";
        if (els.exportBasename) els.exportBasename.value = "";
        const hint = document.getElementById("exportDownloadHint");
        if (hint) {
          hint.hidden = true;
          hint.innerHTML = "";
        }
        els.exportDialog.showModal();
      });
    }
    if (els.exportForm && els.exportDialog) {
      els.exportForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const submitter = e.submitter;
        if (!submitter || submitter.value !== "ok") {
          els.exportDialog.close();
          return;
        }
        const format = els.exportFormat?.value || "json";
        const name = els.exportBasename?.value?.trim() || undefined;
        const isAudio = format === "wav" || format === "mp3";
        const btnConfirm = document.getElementById("btnExportConfirm");
        const prevLabel = btnConfirm?.textContent;
        if (isAudio && btnConfirm) {
          btnConfirm.disabled = true;
          btnConfirm.textContent = t("status.rendering");
        } else {
          els.exportDialog.close();
        }
        try {
          setStatus(
            format === "json"
              ? t("status.export_project")
              : isAudio
                ? t("status.export_save")
                : t("status.export_rendering")
          );
          const result = await ProjectIO.exportProject(getProjectData(), { format, name });
          AppLogger.info("已导出", result.filename);
          if (result.manualLink) {
            const hint = document.getElementById("exportDownloadHint");
            if (hint) {
              hint.hidden = false;
              hint.textContent = t("export_dialog.manual_save_hint", { default: "If download did not start, use the button below:" });
              hint.appendChild(result.manualLink);
            }
            setStatus(t("status.export_done_dl", { name: result.filename }));
          } else {
            setStatus(t("status.export_done", { name: result.filename }));
            if (isAudio) els.exportDialog.close();
          }
        } catch (err) {
          AppLogger.error("导出失败", err.message);
          setStatus(t("status.export_failed_prefix", { msg: err.message }));
          if (err.message !== t("status.export_cancelled") {
            alert(t("status.export_failed_prefix", { msg: err.message }));
          }
        } finally {
          if (btnConfirm) {
            btnConfirm.disabled = false;
            if (prevLabel) btnConfirm.textContent = prevLabel;
          }
        }
      });
    }

    if (els.btnImport && els.projectFileInput) {
      els.btnImport.addEventListener("click", () => els.projectFileInput.click());
      els.projectFileInput.addEventListener("change", async () => {
        const file = els.projectFileInput.files?.[0];
        els.projectFileInput.value = "";
        if (!file) return;
        try {
          if (!confirm(t("status.import_confirm", { name: file.name }))) return;
          if (typeof DraftStation !== "undefined") {
            DraftStation.archiveBeforeLoad(getProjectData, t("status.import_archive"));
          }
          const project = await ProjectIO.importFromFile(file);
          editingPublishedWorkId = null;
          applyProjectData(project);
          if (typeof EditHistory !== "undefined") {
            EditHistory.reset(getProjectData());
            updateHistoryButtons();
          }
          scheduleAutosave();
          AppLogger.info("项目已导入", file.name);
          setStatus(t("status.import_done", { name: file.name }));
        } catch (err) {
          AppLogger.error("导入失败", err.message);
          setStatus(t("status.import_failed_prefix", { msg: err.message }));
        }
      });
    }

    els.btnSave.addEventListener("click", saveProject);
    els.btnLoad.addEventListener("click", loadProject);
    els.btnClear.addEventListener("click", clearProject);
    els.noteClear.addEventListener("click", () => {
      if (noteEditContext) {
        const { trackId, step, patternIndex } = noteEditContext;
        const cell = Sequencer.getPattern(patternIndex)[trackId][step];
        runEdit(() => {
          cell.on = false;
          cell.note = null;
          els.noteDialog.close();
          renderSequencer();
        });
      }
    });

    const btnHelp = document.getElementById("btnHelp");
    const helpDialog = document.getElementById("helpDialog");
    const btnHelpClose = document.getElementById("btnHelpClose");
    if (btnHelp && helpDialog) {
      btnHelp.addEventListener("click", () => { if (typeof HelpGuide !== "undefined") HelpGuide.init(); helpDialog.showModal(); });
    }
    if (btnHelpClose && helpDialog) {
      btnHelpClose.addEventListener("click", () => helpDialog.close());
    }

    window.addEventListener("beforeunload", saveDraftNow);

    document.addEventListener("keydown", (e) => {
      if (e.target.matches("input, select, textarea")) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        if (typeof EditHistory !== "undefined" && EditHistory.undo()) {
          scheduleAutosave();
          setStatus(t("status.undo"));
        }
        return;
      }
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key.toLowerCase() === "y" || (e.key.toLowerCase() === "z" && e.shiftKey))
      ) {
        e.preventDefault();
        if (typeof EditHistory !== "undefined" && EditHistory.redo()) {
          scheduleAutosave();
          setStatus(t("status.redo"));
        }
        return;
      }
      if (e.code === "Space") {
        e.preventDefault();
        AudioEngine.unlockAudio()
          .catch(() => {})
          .finally(() => togglePlay());
      }
      if (e.key >= "1" && e.key <= "9") {
        const pi = Number(e.key) - 1;
        if (pi < Sequencer.patternCount) selectPattern(pi, { userInitiated: true });
      }
    });
  }

  function getStepDuration() {
    return 60 / bpm / 4;
  }

  function togglePlay() {
    if (playing && playMode === "arrange") {
      pause();
      return;
    }
    clearLoopModes();
    if (playing) pause({ keepLoopFlags: true });
    AppLogger.info("开始播放编曲");
    startPlay("arrange");
  }

  function getStepAudioTime(stepIndex) {
    return playStartAnchor + stepIndex * getStepDuration();
  }

  /** 重算锚点，使「下一待排步」落在当前音频时间附近（BPM 变更 / 挂起恢复） */
  function realignPlayAnchor() {
    if (!playing) return;
    if (!AudioEngine.isRunning()) return;
    const now = AudioEngine.now();
    const dur = getStepDuration();
    const nextIdx = Math.max(0, lastScheduledStepIndex + 1);
    playStartAnchor = now + 0.06 - nextIdx * dur;
  }

  function resyncSchedulerForBpmChange() {
    if (!playing) return;
    realignPlayAnchor();
    if (AudioEngine.isRunning()) schedule();
  }

  async function startPlay(mode) {
    await AudioEngine.unlockAudio().catch((err) => {
      AppLogger.warn("启动音频", err?.message || "unlock 未完成，仍将尝试播放");
    });
    AudioEngine.setPlaybackActive(true);
    playing = true;
    playMode = mode;
    stepCounter = 0;
    lastScheduledStepIndex = -1;
    currentStep = -1;
    currentArrangeSection = -1;
    playingPatternIndex = -1;
    if (mode === "arrange" && seqFollowEnabled) {
      const sections = Arranger.getSections();
      const pi = sections[0]?.patternIndex ?? 0;
      followPlaybackPattern(pi);
    }
    if (mode === "step") {
      loopStepIndex = Math.min(loopStepIndex, Sequencer.steps - 1);
      renderStepLabels();
    }
    playStartAnchor = AudioEngine.now() + 0.08;
    AudioEngine.setTransportBpm(bpm);
    if (mode === "arrange") {
      els.btnPlay.classList.add("playing");
      els.btnPlay.textContent = "⏸";
    } else {
      els.btnPlay.classList.remove("playing");
      els.btnPlay.textContent = "▶";
    }
    schedule();
    if (mode === "arrange") {
      setStatus(t("status.playing_timeline"));
    } else if (mode === "pattern") {
      setStatus(t("status.type_loop_on", { pattern: patternLabel(Sequencer.currentPattern()) }));
    } else if (mode === "step") {
      setStatus(stepLoopStatusText());
    }
  }

  function pause(options = {}) {
    const { keepLoopFlags = false } = options;
    playing = false;
    AudioEngine.setPlaybackActive(false);
    if (schedulerTimer) {
      clearTimeout(schedulerTimer);
      schedulerTimer = null;
    }
    els.btnPlay.classList.remove("playing");
    els.btnPlay.textContent = "▶";
    clearPlayhead();
    playingPatternIndex = -1;
    if (!keepLoopFlags) {
      clearLoopModes();
    }
    if (!playing) {
      setStatus(t("status.paused"));
    }
  }

  function stop() {
    AppLogger.info("停止播放");
    pause({ keepLoopFlags: false });
    currentStep = -1;
    currentArrangeSection = -1;
    playingPatternIndex = -1;
    stepCounter = 0;
    lastScheduledStepIndex = -1;
    setStatus(t("status.stopped"));
  }

  function schedule() {
    if (!playing) return;

    if (!AudioEngine.isRunning()) {
      AudioEngine.unlockAudio()
        .then(() => {
          if (!playing) return;
          realignPlayAnchor();
          schedule();
        })
        .catch(() => {});
      schedulerTimer = setTimeout(schedule, 50);
      return;
    }

    const now = AudioEngine.now();
    const horizon = now + SCHEDULE_LOOKAHEAD;
    let queued = 0;

    while (queued < SCHEDULE_MAX_STEPS_PER_TICK) {
      const stepIndex = lastScheduledStepIndex + 1;
      const t = getStepAudioTime(stepIndex);
      if (t >= horizon) break;

      if (t < now - 0.1) {
        lastScheduledStepIndex = stepIndex;
        stepCounter = stepIndex;
        queued += 1;
        continue;
      }

      const playT = Math.max(t, now + 0.008);
      playStepAt(playT, stepIndex);
      lastScheduledStepIndex = stepIndex;
      stepCounter = stepIndex;
      queued += 1;
    }

    schedulerTimer = setTimeout(schedule, SCHEDULE_TICK_MS);
  }

  function playStepAt(time, stepIndex) {
    let patternIndex;
    let step;
    const sections = Arranger.getSections();

    if (playMode === "arrange") {
      const totalSteps = sections.length * Sequencer.steps;
      const globalStep = stepIndex % totalSteps;
      currentArrangeSection = Math.floor(globalStep / Sequencer.steps);
      step = globalStep % Sequencer.steps;
      patternIndex = sections[currentArrangeSection]?.patternIndex ?? 0;
    } else if (playMode === "step") {
      patternIndex = Sequencer.currentPattern();
      step = loopStepIndex;
    } else {
      patternIndex = Sequencer.currentPattern();
      step = stepIndex % Sequencer.steps;
    }

    currentStep = step;
    playingPatternIndex = patternIndex;
    if (playMode === "arrange") {
      followPlaybackPattern(patternIndex);
    }
    updatePlayhead(step, currentArrangeSection);

    const stepDur = getStepDuration();

    const pattern = Sequencer.getPattern(patternIndex);
    Sequencer.TRACKS.forEach((track) => {
      const cell = pattern[track.id][step];
      playPatternCellForTrack(track.id, time, step, stepDur, cell);
    });

    if (playMode === "arrange" && step === Sequencer.steps - 1) {
      const nextSec = (currentArrangeSection + 1) % sections.length;
      if (nextSec === 0 && stepIndex > 0) {
        setStatus(t("status.arrange_loop"));
      }
    }
  }

  function updatePlayhead(step, sectionIndex) {
    $$(".step-cell.current").forEach((el) => el.classList.remove("current"));
    $$(".arrange-slot.playing").forEach((el) => el.classList.remove("playing"));

    let showSeqPlayhead =
      playing &&
      step >= 0 &&
      (playMode !== "arrange" ||
        (playingPatternIndex >= 0 &&
          Sequencer.currentPattern() === playingPatternIndex));

    if (playMode === "step" && playing) {
      showSeqPlayhead = step === loopStepIndex;
    }

    if (showSeqPlayhead) {
      const rows = els.tracks.querySelectorAll(".track-row");
      rows.forEach((row) => {
        const cells = row.querySelectorAll(".step-cell");
        if (cells[step]) cells[step].classList.add("current");
      });
    }

    if (playMode === "arrange" && sectionIndex >= 0) {
      const slots = els.arrangeTimeline.querySelectorAll(".arrange-slot:not(.arrange-slot-add)");
      if (slots[sectionIndex]) slots[sectionIndex].classList.add("playing");
    }
  }

  function clearPlayhead() {
    $$(".step-cell.current").forEach((el) => el.classList.remove("current"));
    $$(".arrange-slot.playing").forEach((el) => el.classList.remove("playing"));
    playingPatternIndex = -1;
  }

  function getProjectData() {
    return {
      version: 1,
      savedAt: Date.now(),
      sequencer: Sequencer.exportState(),
      arranger: Arranger.exportState(),
      bpm: Number(els.bpm.value),
      layout: typeof LayoutManager !== "undefined" ? LayoutManager.exportState() : undefined,
    };
  }

  function loadExternalProject(project, meta = {}) {
    if (!project) return false;
    if (!meta.skipConfirm) {
      const label = meta.title ? `「${meta.title}」` : meta.name ? `「${meta.name}」` : t("status.work_fallback");
      if (!confirm(t("status.load_work_confirm", { label }))) return false;
    }
    if (typeof DraftStation !== "undefined") {
      DraftStation.archiveBeforeLoad(
        getProjectData,
        meta.archiveReason || t("status.switch_archive")
      );
    }
    applyProjectData(project);
    scheduleAutosave();
    if (meta.workId) editingPublishedWorkId = meta.workId;
    else if (!meta.fromDraftStation) editingPublishedWorkId = null;

    let statusMsg = meta.fromDraftStation
      ? t("status.loaded_draft", { name: meta.name || t("status.draft_fallback") })
      : meta.filename
        ? t("status.loaded_work", { title: meta.title || t("status.work_fallback"), file: meta.filename })
        : t("status.loaded_work_simple", { title: meta.title || t("status.work_fallback") });
    if (meta.workId) statusMsg += t("status.loaded_republish_hint");
    setStatus(statusMsg);
    return true;
  }

  function applyProjectData(data, silent) {
    if (!data) return false;
    if (data.sequencer) Sequencer.importState(data.sequencer);
    if (data.layout && typeof LayoutManager !== "undefined") {
      LayoutManager.importState(data.layout);
    }
    if (data.arranger) Arranger.importState(data.arranger, Sequencer.patternCount);
    if (data.bpm) {
      els.bpm.value = data.bpm;
      bpm = data.bpm;
      els.bpmValue.textContent = bpm;
    }
    renderPatternTabs();
    renderStepLabels();
    renderSequencer();
    renderArrangement();
    updateStepCountUI();
    updateTrackCountUI();
    updateTypeCountUI();
    syncSequencerLayout();
    syncModuleSpacing();
    renderMixer();
    applyVolumesToEngine();
    if (!silent) AppLogger.info("项目数据已应用");
    if (typeof EditHistory !== "undefined" && !EditHistory.isApplying()) {
      EditHistory.reset(getProjectData());
      updateHistoryButtons();
    }
    return true;
  }

  function scheduleAutosave() {
    clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(getProjectData()));
        AppLogger.info("草稿已自动保存");
      } catch (err) {
        AppLogger.error("草稿保存失败", err.message);
      }
    }, 600);
  }

  function saveDraftNow() {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(getProjectData()));
    } catch (err) {
      AppLogger.error("草稿保存失败", err.message);
    }
  }

  function loadDraft() {
    try {
      const raw = localStorage.getItem(DRAFT_KEY) || localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      applyProjectData(data, true);
      AppLogger.info("已恢复草稿");
      return true;
    } catch (err) {
      AppLogger.warn("草稿恢复失败", err.message);
      return false;
    }
  }

  function saveProject() {
    const data = getProjectData();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
    AppLogger.info("项目已保存");
    setStatus(t("status.saved"));
  }

  function loadProject() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setStatus(t("status.no_saved"));
        return;
      }
      applyProjectData(JSON.parse(raw));
      scheduleAutosave();
      AppLogger.info("项目已加载");
      setStatus(t("status.project_loaded"));
    } catch (err) {
      AppLogger.error("加载失败", err.message);
      setStatus(t("status.load_failed_prefix", { msg: err.message }));
    }
  }

  function clearProject() {
    if (!confirm(t("status.clear_confirm"))) return;
    editingPublishedWorkId = null;
    Sequencer.importState({ steps: 16, patterns: Sequencer.createEmptyPatterns(Sequencer.DEFAULT_PATTERN_COUNT) });
    Arranger.init(Sequencer.patternCount);
    Sequencer.loadDemoPatterns();
    if (typeof LayoutManager !== "undefined") LayoutManager.importState(null);
    localStorage.removeItem(DRAFT_KEY);
    renderStepLabels();
    renderSequencer();
    renderArrangement();
    updateStepCountUI();
    if (typeof EditHistory !== "undefined") {
      EditHistory.reset(getProjectData());
      updateHistoryButtons();
    }
    scheduleAutosave();
    setStatus(t("status.reset_demo"));
  }

  function setStatus(msg) {
    els.statusText.textContent = msg;
  }

  async function boot() {
    try {
      if (window.__hfI18nPromise) await window.__hfI18nPromise;
    } catch (_) {}
    init();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => boot());
  } else {
    boot();
  }
})();