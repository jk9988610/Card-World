#!/usr/bin/env python3
"""Patch HarmonyForge JS to use HF_T() and extend locale JSON."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HF = ROOT / "embedded/harmonyforge"

LOCALE_EXTRA = {
    "status": {
        "pos_before": {"en": "before", "zh": "前"},
        "pos_after": {"en": "after", "zh": "后"},
        "sections_reduced": {"en": "Now {n} sections", "zh": "已减少至 {n} 段"},
        "type_loop_off": {"en": "Pattern loop off", "zh": "类型循环已关闭"},
        "step_loop_off": {"en": "Step loop off", "zh": "单步循环已关闭"},
        "seq_follow_on": {"en": "Seq follow on", "zh": "音序跟随已开启"},
        "seq_follow_off_toggle": {"en": "Seq follow off", "zh": "音序跟随已关闭"},
        "pick_pitch_first": {"en": "Pick a pitch first", "zh": "请先点击一个音高"},
        "loop_step_simple": {"en": "Loop step: {n}", "zh": "循环步进：第 {n} 步"},
        "pattern_changed_follow_off": {
            "en": "Pattern changed — seq follow off",
            "zh": "已切换类型，音序跟随已关闭",
        },
        "export_manual_dl": {
            "en": "If download did not start, use the button below:",
            "zh": "若未自动下载，请点击下方按钮保存：",
        },
        "export_alert_failed": {"en": "Export failed:\n{msg}", "zh": "导出失败：\n{msg}"},
        "saved_with_draft": {"en": "Saved (with draft)", "zh": "已保存（含草稿）"},
        "no_saved_project": {"en": "No saved project", "zh": "没有已保存的项目"},
        "project_loaded_ok": {"en": "Project loaded", "zh": "项目已加载"},
        "key_set_zh": {"en": "Key: {key}", "zh": "本格调：{key}"},
        "scale_set_zh": {"en": "Scale: {scale}", "zh": "本格音阶：{scale}"},
        "section_synced_zh": {
            "en": "§{n} · pattern {pattern} (sequencer synced)",
            "zh": "§{n} · 类型 {pattern}（音序已同步）",
        },
        "new_section_pattern_zh": {"en": "Pattern for new section", "zh": "新段落使用类型"},
        "section_added_zh": {
            "en": "Added §{n} (pattern {pattern})",
            "zh": "已添加 §{n}（类型 {pattern}）",
        },
        "switch_instrument_zh": {
            "en": "Switch sound · current {name}",
            "zh": "切换音色 · 当前 {name}",
        },
        "switched_instrument_zh": {"en": "Switched to {name}", "zh": "已切换为 {name}"},
        "add_track_zh": {"en": "Add track · pick sound", "zh": "添加轨道 · 选择音色"},
        "track_added_zh": {"en": "Added track: {name}", "zh": "已添加轨：{name}"},
        "step_density_title_zh": {"en": "{name} · step density", "zh": "{name} · 步进密度"},
        "step_density_set_zh": {
            "en": "{name} density {rate}",
            "zh": "{name} 步进密度 {rate}",
        },
        "section_copied_zh": {
            "en": "Copied §{n} (pattern {pattern})",
            "zh": "已复制 §{n}（类型 {pattern}）",
        },
        "section_cut_zh": {
            "en": "Cut §{n} (pattern {pattern})",
            "zh": "已剪切 §{n}（类型 {pattern}）",
        },
        "section_inserted_zh": {
            "en": "Inserted section at §{n} {pos}",
            "zh": "已在 §{n} {pos}插入段落",
        },
        "pick_section_pattern_zh": {"en": "§{n} pick pattern", "zh": "§{n} 选择类型"},
        "section_pattern_set_zh": {
            "en": "§{n} → pattern {pattern}",
            "zh": "§{n} → 类型 {pattern}",
        },
        "preview_note_zh": {"en": "Preview {note} ({track})", "zh": "试听 {note}（{track}）"},
        "pick_pitch_title": {
            "en": "Pick pitch · {track} · step {step}",
            "zh": "选择音高 · {track} · 第 {step} 步",
        },
        "pattern_added_zh": {
            "en": "Now {n} patterns ({label})",
            "zh": "已增加至 {n} 个类型（{label}）",
        },
        "patterns_reduced_zh": {"en": "Now {n} patterns", "zh": "已减少至 {n} 个类型"},
        "export_done_dl_zh": {
            "en": "Render done — tried download {name}",
            "zh": "渲染完成 — 已尝试下载 {name}",
        },
        "export_done_zh": {"en": "Exported {name}", "zh": "已导出 {name}"},
        "import_done_zh": {"en": "Imported {name}", "zh": "已导入 {name}"},
        "undo_zh": {"en": "Undone", "zh": "已撤销"},
        "redo_zh": {"en": "Redone", "zh": "已重做"},
        "steps_increased_zh": {"en": "Now {n} steps", "zh": "已增加至 {n} 步"},
        "steps_reduced_zh": {"en": "Now {n} steps", "zh": "已减少至 {n} 步"},
        "tracks_reduced_zh": {"en": "Now {n} tracks", "zh": "已减少至 {n} 轨"},
        "paused_zh": {"en": "Paused", "zh": "已暂停"},
        "stopped_zh": {"en": "Stopped", "zh": "已停止"},
        "playing_timeline_zh": {"en": "Playing arrangement…", "zh": "播放编曲时间轴…"},
        "arrange_loop_zh": {"en": "Arrangement looping…", "zh": "编曲循环播放中…"},
    },
    "ui": {
        "step_loop_pick": {
            "en": "Set loop step column (step {n})",
            "zh": "选择为单步循环列（第 {n} 步）",
        },
        "track_instrument": {
            "en": "Click to change sound (current: {name})",
            "zh": "点击切换音色（当前：{name}）",
        },
        "track_rate": {"en": "Step density (relative to master BPM)", "zh": "步进密度（相对主 BPM）"},
        "track_fallback": {"en": "Track", "zh": "轨"},
        "arrange_slot": {
            "en": "Click to select; double-click to pick pattern",
            "zh": "单击选中；双击选择类型",
        },
    },
    "logger": {
        "no_entries": {"en": "(no log entries yet)", "zh": "（暂无日志）"},
        "copied": {"en": "Log copied to clipboard", "zh": "日志已复制到剪贴板"},
        "copy_failed": {"en": "Copy log failed", "zh": "复制日志失败"},
        "cleared": {"en": "Log cleared", "zh": "日志已清空"},
    },
    "draft": {
        "empty": {
            "en": "No drafts yet. Loading another work auto-archives the current project.",
            "zh": "草稿站为空。加载他人作品时会自动保存当前编曲。",
        },
        "auto_tag": {"en": "Auto archive", "zh": "自动归档"},
        "manual_tag": {"en": "Manual save", "zh": "手动保存"},
        "load": {"en": "Load", "zh": "加载"},
        "delete": {"en": "Delete", "zh": "删除"},
        "delete_confirm": {"en": "Delete draft “{name}”?", "zh": "删除草稿「{name}」？"},
        "deleted": {"en": "Draft deleted", "zh": "已删除草稿"},
        "name_prompt": {"en": "Draft name", "zh": "草稿名称"},
        "saved": {"en": "Saved to drafts: {name}", "zh": "已存入草稿站：{name}"},
        "empty_project": {"en": "Cannot save empty project", "zh": "无法保存空工程"},
        "load_confirm": {
            "en": "Load draft “{name}” replaces current project. Continue?",
            "zh": "加载草稿「{name}」将替换当前编曲，是否继续？",
        },
    },
    "cloud": {
        "no_project_json_edit": {
            "en": "This work has no arrangement JSON and cannot be edited",
            "zh": "该作品没有编曲 JSON，无法编辑",
        },
        "cannot_read_project": {"en": "Cannot read current project", "zh": "无法读取当前工程"},
        "republish_failed_alert": {"en": "Republish failed:\n{msg}", "zh": "重新发布失败：\n{msg}"},
        "load_store_failed_alert": {"en": "Load failed:\n{msg}", "zh": "加载失败：\n{msg}"},
        "cannot_load_store": {"en": "Cannot load publish store:\n{msg}", "zh": "无法加载发布商店：\n{msg}"},
        "configure_cloud_long": {
            "en": "Enable cloud sync in Card World Settings first (same Supabase as publish).",
            "zh": "请先在评阅站打开「设置」完成云同步，与发布功能使用同一 Supabase 项目。",
        },
        "need_season_nickname": {
            "en": "Join a season with a nickname on the review site first",
            "zh": "请先在评阅站加入赛季并登录昵称",
        },
        "loading_works": {"en": "Loading…", "zh": "正在加载…"},
        "no_works_repo": {
            "en": "No published works yet. Tap Publish.",
            "zh": "你还没有发布作品，请先点「发布」",
        },
        "works_repo_count": {"en": "{n} works", "zh": "共 {n} 个作品"},
        "load_failed_repo": {"en": "Load failed", "zh": "加载失败"},
        "no_public_json": {
            "en": "No public works with arrangement JSON yet",
            "zh": "暂无含编曲 JSON 的公开作品",
        },
        "downloaded_name": {"en": "Downloaded {name}", "zh": "已下载 {name}"},
        "rename_prompt": {"en": "Work title", "zh": "作品名称"},
        "published_note": {
            "en": " — submit via review site library",
            "zh": " — 请到评阅站制作库提交参赛",
        },
        "publish_failed_status": {"en": "Publish failed: {msg}", "zh": "发布失败：{msg}"},
        "invalid_project_format": {"en": "Invalid arrangement project format", "zh": "编曲工程格式无效"},
        "no_project_json": {"en": "This work has no arrangement JSON", "zh": "该作品没有编曲 JSON"},
        "json_too_large_mb": {
            "en": "Project JSON too large (max {mb}MB)",
            "zh": "编曲 JSON 过大（上限 {mb}MB）",
        },
    },
    "units": {
        "patterns_zh": {"en": "{n} pat", "zh": "{n}型"},
        "tracks_zh": {"en": "{n} trk", "zh": "{n}轨"},
        "steps_zh": {"en": "{n} stp", "zh": "{n}步"},
        "sections_zh": {"en": "{n} sec", "zh": "{n}段"},
    },
}


def merge_locales():
    for lang, code in [("en", "en"), ("zh", "zh-Hans")]:
        path = HF / "locales" / f"{code}.json"
        data = json.loads(path.read_text(encoding="utf-8"))
        for section, keys in LOCALE_EXTRA.items():
            data.setdefault(section, {})
            for key, texts in keys.items():
                data[section][key] = texts[lang]
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def patch_file(path: Path, replacements: list[tuple[str, str]]):
    text = path.read_text(encoding="utf-8")
    for old, new in replacements:
        if old not in text:
            print(f"SKIP missing in {path.name}: {old[:60]}...")
            continue
        text = text.replace(old, new, 1)
    path.write_text(text, encoding="utf-8")


APP_REPLACEMENTS = [
    (
        'setStatus(`§${index + 1} · 类型 ${patternLabel(pi)}（音序已同步）`);',
        'setStatus(t("status.section_synced_zh", { n: index + 1, pattern: patternLabel(pi) }));',
    ),
    ('title: "新段落使用类型",', 'title: t("status.new_section_pattern_zh"),'),
    (
        'setStatus(`已添加 §${Arranger.getSectionCount()}（类型 ${patternLabel(Number(value))}）`);',
        'setStatus(t("status.section_added_zh", { n: Arranger.getSectionCount(), pattern: patternLabel(Number(value)) }));',
    ),
    (
        'title: `切换音色 · 当前 ${track.name}`,',
        'title: t("status.switch_instrument_zh", { name: track.name }),',
    ),
    (
        'setStatus(`已切换为 ${inst?.name ?? value}`);',
        'setStatus(t("status.switched_instrument_zh", { name: inst?.name ?? value }));',
    ),
    (
        'setStatus(`已达最大 ${Sequencer.MAX_TRACKS} 轨`);',
        'setStatus(t("status.max_tracks", { max: Sequencer.MAX_TRACKS }));',
    ),
    ('title: "添加轨道 · 选择音色",', 'title: t("status.add_track_zh"),'),
    (
        'setStatus(`已添加轨：${inst?.name ?? value}`);',
        'setStatus(t("status.track_added_zh", { name: inst?.name ?? value }));',
    ),
    (
        'title: `${track?.name ?? "轨"} · 步进密度`,',
        'title: t("status.step_density_title_zh", { name: track?.name ?? t("ui.track_fallback") }),',
    ),
    (
        '`${track?.name ?? "轨"} 步进密度 ${TrackTiming.rateLabel(Sequencer.getTrackRate(trackId))}`',
        't("status.step_density_set_zh", { name: track?.name ?? t("ui.track_fallback"), rate: TrackTiming.rateLabel(Sequencer.getTrackRate(trackId)) })',
    ),
    ('setStatus("请先单击选中一个段落");', 'setStatus(t("status.select_section_first"));'),
    (
        'setStatus(`已复制 §${selectedArrangeSection + 1}（类型 ${patternLabel(sec.patternIndex)}）`);',
        'setStatus(t("status.section_copied_zh", { n: selectedArrangeSection + 1, pattern: patternLabel(sec.patternIndex) }));',
    ),
    ('setStatus("至少保留 1 个编曲段");', 'setStatus(t("status.section_cut_min"));'),
    (
        'setStatus(`已剪切 §${idx + 1}（类型 ${patternLabel(sec.patternIndex)}）`);',
        'setStatus(t("status.section_cut_zh", { n: idx + 1, pattern: patternLabel(sec.patternIndex) }));',
    ),
    ('setStatus("请先复制或剪切段落");', 'setStatus(t("status.paste_section_first"));'),
    ('const pos = before ? "前" : "后";', 'const pos = before ? t("status.pos_before") : t("status.pos_after");'),
    (
        'setStatus(`已在 §${insertAt + 1} ${pos}插入段落`);',
        'setStatus(t("status.section_inserted_zh", { n: insertAt + 1, pos }));',
    ),
    (
        'title: `§${sectionIndex + 1} 选择类型`,',
        'title: t("status.pick_section_pattern_zh", { n: sectionIndex + 1 }),',
    ),
    (
        'setStatus(`§${sectionIndex + 1} → 类型 ${patternLabel(Number(value))}`);',
        'setStatus(t("status.section_pattern_set_zh", { n: sectionIndex + 1, pattern: patternLabel(Number(value)) }));',
    ),
    (
        'setSeqFollowEnabled(false, "已切换类型，音序跟随已关闭");',
        'setSeqFollowEnabled(false, t("status.pattern_changed_follow_off"));',
    ),
    ('setStatus(`循环步进：第 ${loopStepIndex + 1} 步`);', 'setStatus(t("status.loop_step_simple", { n: loopStepIndex + 1 }));'),
    (
        'setStatus(`类型循环：${patternLabel(index)}`);',
        'setStatus(t("status.type_loop_on", { pattern: patternLabel(index) }));',
    ),
    ('setStatus(`类型 ${patternLabel(index)}`);', 'setStatus(t("status.type_label", { pattern: patternLabel(index) }));'),
    (
        'els.typeCountInfo.textContent = `${Sequencer.patternCount}型`;',
        'els.typeCountInfo.textContent = t("units.patterns_zh", { n: Sequencer.patternCount });',
    ),
    (
        'els.trackCountInfo.textContent = `${Sequencer.trackCount}轨`;',
        'els.trackCountInfo.textContent = t("units.tracks_zh", { n: Sequencer.trackCount });',
    ),
    (
        'els.stepCountInfo.textContent = `${Sequencer.steps}步`;',
        'els.stepCountInfo.textContent = t("units.steps_zh", { n: Sequencer.steps });',
    ),
    (
        'btn.title = `选择为单步循环列（第 ${s + 1} 步）`;',
        'btn.title = t("ui.step_loop_pick", { n: s + 1 });',
    ),
    (
        'nameBtn.title = `点击切换音色（当前：${track.name}）`;',
        'nameBtn.title = t("ui.track_instrument", { name: track.name });',
    ),
    ('rateBtn.title = "步进密度（相对主 BPM）";', 'rateBtn.title = t("ui.track_rate");'),
    (
        'setStatus(`试听 ${Sequencer.noteLabel(midi)}（${track?.name ?? ""}）`);',
        'setStatus(t("status.preview_note_zh", { note: Sequencer.noteLabel(midi), track: track?.name ?? "" }));',
    ),
    ('title: "选择本格调性（默认 C）",', 'title: t("note_dialog.key_pick_title"),'),
    (
        'setStatus(`本格调：${Sequencer.KEYS[Number(value)]}`);',
        'setStatus(t("status.key_set_zh", { key: Sequencer.KEYS[Number(value)] }));',
    ),
    ('title: "选择本格音阶（默认大调）",', 'title: t("note_dialog.scale_pick_title"),'),
    (
        'setStatus(`本格音阶：${scaleLabel(value)}`);',
        'setStatus(t("status.scale_set_zh", { scale: scaleLabel(value) }));',
    ),
    (
        'els.noteDialogTitle.textContent = `选择音高 · ${track.name} · 第 ${step + 1} 步`;',
        'els.noteDialogTitle.textContent = t("status.pick_pitch_title", { track: track.name, step: step + 1 });',
    ),
    (
        'slot.title = "单击选中；双击选择类型";',
        'slot.title = t("ui.arrange_slot");',
    ),
    (
        'els.arrangeInfo.textContent = `${sections.length}段`;',
        'els.arrangeInfo.textContent = t("units.sections_zh", { n: sections.length });',
    ),
    (
        'setStatus(`类型循环：${patternLabel(Sequencer.currentPattern())}`);',
        'setStatus(t("status.type_loop_on", { pattern: patternLabel(Sequencer.currentPattern()) }));',
    ),
    ('setStatus("类型循环已关闭");', 'setStatus(t("status.type_loop_off"));'),
    ('setStatus("单步循环已关闭");', 'setStatus(t("status.step_loop_off"));'),
    ('setStatus("音序跟随已开启");', 'setStatus(t("status.seq_follow_on"));'),
    ('setStatus("音序跟随已关闭");', 'setStatus(t("status.seq_follow_off_toggle"));'),
    ('setStatus("请先点击一个音高");', 'setStatus(t("status.pick_pitch_first"));'),
    (
        'setStatus(`已减少至 ${r.count} 段`);',
        'setStatus(t("status.sections_reduced", { n: r.count }));',
    ),
    (
        'setStatus(`至少保留 ${Sequencer.MIN_TRACKS} 轨`);',
        'setStatus(t("status.min_tracks", { min: Sequencer.MIN_TRACKS }));',
    ),
    (
        'setStatus(`已减少至 ${r.count} 轨`);',
        'setStatus(t("status.tracks_reduced_zh", { n: r.count }));',
    ),
    ('setStatus("已撤销");', 'setStatus(t("status.undo_zh"));'),
    ('setStatus("已重做");', 'setStatus(t("status.redo_zh"));'),
    (
        'setStatus(`已达最大 ${Sequencer.MAX_STEPS} 步`);',
        'setStatus(t("status.max_steps", { max: Sequencer.MAX_STEPS }));',
    ),
    (
        'setStatus(`已增加至 ${Sequencer.steps} 步`);',
        'setStatus(t("status.steps_increased_zh", { n: Sequencer.steps }));',
    ),
    (
        'setStatus(`最少保留 ${Sequencer.MIN_STEPS} 步`);',
        'setStatus(t("status.min_steps", { min: Sequencer.MIN_STEPS }));',
    ),
    (
        'setStatus(`已减少至 ${Sequencer.steps} 步`);',
        'setStatus(t("status.steps_reduced_zh", { n: Sequencer.steps }));',
    ),
    (
        'setStatus(`已达最大 ${Sequencer.MAX_PATTERNS} 个类型`);',
        'setStatus(t("status.max_patterns", { max: Sequencer.MAX_PATTERNS }));',
    ),
    (
        'setStatus(`已增加至 ${r.count} 个类型（${patternLabel(r.count - 1)}）`);',
        'setStatus(t("status.pattern_added_zh", { n: r.count, label: patternLabel(r.count - 1) }));',
    ),
    (
        'setStatus(`至少保留 ${Sequencer.MIN_PATTERNS} 个类型`);',
        'setStatus(t("status.min_patterns", { min: Sequencer.MIN_PATTERNS }));',
    ),
    (
        'setStatus(`已减少至 ${r.count} 个类型`);',
        'setStatus(t("status.patterns_reduced_zh", { n: r.count }));',
    ),
    ('btnConfirm.textContent = "渲染中…";', 'btnConfirm.textContent = t("status.rendering");'),
    (
        """setStatus(
            format === "json"
              ? "正在导出项目…"
              : isAudio
                ? "请选择保存位置，随后将渲染音频（约数秒）…"
                : "正在渲染并导出音频，请稍候…"
          );""",
        """setStatus(
            format === "json"
              ? t("status.export_project")
              : isAudio
                ? t("status.export_save")
                : t("status.export_rendering")
          );""",
    ),
    (
        'hint.textContent = "若未自动下载，请点击下方按钮保存：";',
        'hint.textContent = t("status.export_manual_dl");',
    ),
    (
        'setStatus(`渲染完成 — 已尝试下载 ${result.filename}`);',
        'setStatus(t("status.export_done_dl_zh", { name: result.filename }));',
    ),
    (
        'setStatus(`已导出 ${result.filename}`);',
        'setStatus(t("status.export_done_zh", { name: result.filename }));',
    ),
    (
        'setStatus("导出失败：" + err.message);',
        'setStatus(t("status.export_failed", { msg: err.message }));',
    ),
    (
        'if (err.message !== "已取消保存") {',
        'if (err.message !== t("status.export_cancelled")) {',
    ),
    (
        'alert("导出失败：\\n" + err.message);',
        'alert(t("status.export_alert_failed", { msg: err.message }));',
    ),
    (
        'if (!confirm(`导入「${file.name}」将覆盖当前编曲与布局，是否继续？`)) return;',
        'if (!confirm(t("status.import_confirm", { name: file.name }))) return;',
    ),
    (
        'setStatus(`已导入 ${file.name}`);',
        'setStatus(t("status.import_done_zh", { name: file.name }));',
    ),
    (
        'setStatus("导入失败：" + err.message);',
        'setStatus(t("status.import_failed", { msg: err.message }));',
    ),
    (
        'if (!confirm(`加载草稿「${meta.name}」将替换当前编曲，是否继续？`)) return false;',
        'if (!confirm(t("draft.load_confirm", { name: meta.name }))) return false;',
    ),
    ('setStatus("播放编曲时间轴…");', 'setStatus(t("status.playing_timeline_zh"));'),
    ('setStatus(keepLoopFlags ? "已暂停" : "已暂停");', 'setStatus(t("status.paused_zh"));'),
    ('setStatus("已停止");', 'setStatus(t("status.stopped_zh"));'),
    ('setStatus("编曲循环播放中…");', 'setStatus(t("status.arrange_loop_zh"));'),
    ('setStatus("已保存（含草稿）");', 'setStatus(t("status.saved_with_draft"));'),
    ('setStatus("没有已保存的项目");', 'setStatus(t("status.no_saved_project"));'),
    ('setStatus("项目已加载");', 'setStatus(t("status.project_loaded_ok"));'),
    (
        'setStatus("加载失败：" + err.message);',
        'setStatus(t("status.load_failed", { msg: err.message }));',
    ),
]

BBC_REPLACEMENTS = [
    ('throw new Error("作品不存在或无权访问");', 'throw new Error(t("cloud.work_missing"));'),
    ('throw new Error("作品不存在或无权删除");', 'throw new Error(t("cloud.delete_missing"));'),
    (
        'throw new Error(`编曲 JSON 过大（上限 ${MAX_PROJECT_JSON_BYTES / 1024 / 1024}MB）`);',
        'throw new Error(t("cloud.json_too_large_mb", { mb: MAX_PROJECT_JSON_BYTES / 1024 / 1024 }));',
    ),
    ('throw new Error("编曲工程格式无效");', 'throw new Error(t("cloud.invalid_project_format"));'),
    ('throw new Error("该作品没有编曲 JSON");', 'throw new Error(t("cloud.no_project_json"));'),
    (
        'if (!full.projectJson) throw new Error("该作品没有编曲 JSON，无法编辑");',
        'if (!full.projectJson) throw new Error(t("cloud.no_project_json_edit"));',
    ),
    (
        'if (typeof getProjectData !== "function") throw new Error("无法读取当前工程");',
        'if (typeof getProjectData !== "function") throw new Error(t("cloud.cannot_read_project"));',
    ),
    (
        'titleEl.textContent = work.title || "未命名";',
        'titleEl.textContent = work.title || t("cloud.unnamed");',
    ),
    (
        'sub.textContent = work.hasProjectJson ? "含编曲 JSON" : "仅音频";',
        'sub.textContent = work.hasProjectJson ? t("cloud.has_json") : t("cloud.audio_only");',
    ),
    ('btnEdit.textContent = "编辑编曲";', 'btnEdit.textContent = t("cloud.edit");'),
    ('setStatus?.("正在获取工程…");', 'setStatus?.(t("cloud.fetching"));'),
    (
        'setStatus?.(`正在编辑「${full.title}」— 修改后可点「重新发布」`);',
        'setStatus?.(t("cloud.editing", { title: full.title }));',
    ),
    ('btnRepublish.textContent = "重新发布";', 'btnRepublish.textContent = t("cloud.republish");'),
    (
        'if (!confirm(`当前编辑器不是「${work.title}」。是否先从云端加载该作品再发布？`)) return;',
        'if (!confirm(t("cloud.wrong_project", { title: work.title }))) return;',
    ),
    (
        'if (!confirm(`用当前编曲覆盖云端作品「${work.title}」？`)) return;',
        'if (!confirm(t("cloud.overwrite_confirm", { title: work.title }))) return;',
    ),
    ('setStatus?.("正在重新发布…");', 'setStatus?.(t("cloud.republishing"));'),
    (
        'setStatus?.(`已更新「${work.title}」`);',
        'setStatus?.(t("cloud.republished", { title: work.title }));',
    ),
    (
        'alert("重新发布失败：\\n" + err.message);',
        'alert(t("cloud.republish_failed_alert", { msg: err.message }));',
    ),
    ('btnRename.textContent = "改名";', 'btnRename.textContent = t("cloud.rename");'),
    ('const next = prompt("作品名称", work.title || "");', 'const next = prompt(t("cloud.rename_prompt"), work.title || "");'),
    ('setStatus?.("已改名");', 'setStatus?.(t("cloud.renamed"));'),
    ('btnDel.textContent = "删除";', 'btnDel.textContent = t("cloud.delete");'),
    (
        'if (!confirm(`确定删除「${work.title}」？不可恢复。`)) return;',
        'if (!confirm(t("cloud.delete_confirm", { title: work.title }))) return;',
    ),
    ('setStatus?.("已删除作品");', 'setStatus?.(t("cloud.deleted"));'),
    ('btnDown.textContent = "下载 JSON";', 'btnDown.textContent = t("cloud.download_json");'),
    ('link.textContent = "试听";', 'link.textContent = t("cloud.preview");'),
    (
        'renderEmpty("请先在评阅站加入赛季并登录昵称");',
        'renderEmpty(t("cloud.need_season_nickname"));',
    ),
    ('setRepoStatus("加载中…");', 'setRepoStatus(t("cloud.loading_works"));'),
    ('renderEmpty("正在加载…");', 'renderEmpty(t("cloud.loading"));'),
    (
        'renderEmpty("你还没有发布作品，请先点「发布」");',
        'renderEmpty(t("cloud.no_works_repo"));',
    ),
    ('setRepoStatus("0 个作品");', 'setRepoStatus(t("cloud.works_repo_count", { n: 0 }));'),
    (
        'setRepoStatus(`共 ${works.length} 个作品`);',
        'setRepoStatus(t("cloud.works_repo_count", { n: works.length }));',
    ),
    ('renderEmpty("加载失败");', 'renderEmpty(t("cloud.load_failed_repo"));'),
    ('alert("请先在评阅站配置云同步");', 'alert(t("cloud.configure_cloud"));'),
    ('alert("请先在评阅站用昵称加入赛季");', 'alert(t("cloud.need_season"));'),
    (
        'title.textContent = work.title || "未命名";',
        'title.textContent = work.title || t("cloud.unnamed");',
    ),
    (
        'author.textContent = `作者：${work.userName || "—"}`;',
        'author.textContent = t("cloud.author", { name: work.userName || "—" });',
    ),
    (
        'setStatus?.(`已下载 ${name}`);',
        'setStatus?.(t("cloud.downloaded_name", { name }));',
    ),
    ('btnLoad.textContent = "下载并加载";', 'btnLoad.textContent = t("cloud.download_and_load");'),
    (
        'throw new Error("加载接口未就绪");',
        'throw new Error(t("cloud.load_interface_missing"));',
    ),
    (
        'setStatus?.(`已加载「${work.title}」`);',
        'setStatus?.(t("cloud.loaded_store", { title: work.title }));',
    ),
    (
        'alert("加载失败：\\n" + err.message);',
        'alert(t("cloud.load_store_failed_alert", { msg: err.message }));',
    ),
    ('link.textContent = "试听 MP3";', 'link.textContent = t("cloud.preview_mp3");'),
    (
        'renderEmpty("暂无含编曲 JSON 的公开作品");',
        'renderEmpty(t("cloud.no_public_json"));',
    ),
    (
        'alert("无法加载发布商店：\\n" + err.message);',
        'alert(t("cloud.cannot_load_store", { msg: err.message }));',
    ),
    (
        'alert("请先在评阅站打开「设置」完成云同步，与发布功能使用同一 Supabase 项目。");',
        'alert(t("cloud.configure_cloud_long"));',
    ),
    (
        'throw new Error("云同步未配置，请先在评阅站打开「设置」完成云同步");',
        'throw new Error(t("cloud.configure_cloud"));',
    ),
    (
        'throw new Error("无法读取当前工程");',
        'throw new Error(t("cloud.cannot_read_project"));',
    ),
    (
        'setStatus?.("正在渲染音频与工程 JSON，并发布到制作库…");',
        'setStatus?.(t("cloud.publish_rendering"));',
    ),
    (
        'setStatus?.(`已发布「${work.title}」${jsonNote} — 请到评阅站制作库提交参赛`);',
        'setStatus?.(t("cloud.published", { title: work.title, note: jsonNote + t("cloud.published_note") }));',
    ),
    (
        'setStatus?.("发布失败：" + err.message);',
        'setStatus?.(t("cloud.publish_failed_status", { msg: err.message }));',
    ),
    (
        'alert("发布失败：\\n" + err.message);',
        'alert(t("cloud.publish_failed", { msg: err.message }));',
    ),
]

LOGGER_REPLACEMENTS = [
    ('return header + "\\n（暂无日志）";', 'return header + "\\n" + (typeof window.HF_T === "function" ? window.HF_T("logger.no_entries") : "(no log entries)");'),
    ('push("info", "日志已复制到剪贴板", header);', 'push("info", typeof window.HF_T === "function" ? window.HF_T("logger.copied") : "Log copied", header);'),
    ('push("error", "复制日志失败", err.message);', 'push("error", typeof window.HF_T === "function" ? window.HF_T("logger.copy_failed") : "Copy failed", err.message);'),
    ('push("info", "日志已清空");', 'push("info", typeof window.HF_T === "function" ? window.HF_T("logger.cleared") : "Log cleared");'),
]

DRAFT_REPLACEMENTS = [
    (
        'const DraftStation = (() => {',
        'const DraftStation = (() => {\n  const t = (key, params) =>\n    typeof window.HF_T === "function" ? window.HF_T(key, params) : key;',
    ),
    ('throw new Error("无法保存空工程");', 'throw new Error(t("draft.empty_project"));'),
    (
        'li.textContent = "草稿站为空。加载他人作品时会自动保存当前编曲。";',
        'li.textContent = t("draft.empty");',
    ),
    (
        'tag.textContent = draft.meta?.auto ? "自动归档" : "手动保存";',
        'tag.textContent = draft.meta?.auto ? t("draft.auto_tag") : t("draft.manual_tag");',
    ),
    ('btnLoad.textContent = "加载";', 'btnLoad.textContent = t("draft.load");'),
    ('btnDel.textContent = "删除";', 'btnDel.textContent = t("draft.delete");'),
    (
        'if (!confirm(`删除草稿「${draft.name}」？`)) return;',
        'if (!confirm(t("draft.delete_confirm", { name: draft.name }))) return;',
    ),
    ('setStatus?.("已删除草稿");', 'setStatus?.(t("draft.deleted"));'),
    (
        'const name = prompt("草稿名称", `草稿 ${formatNow()}`);',
        'const name = prompt(t("draft.name_prompt"), `${t("draft.name_prompt")} ${formatNow()}`);',
    ),
    (
        'setStatus?.(`已存入草稿站：${entry.name}`);',
        'setStatus?.(t("draft.saved", { name: entry.name }));',
    ),
]


def main():
    merge_locales()
    patch_file(HF / "js/app.js", APP_REPLACEMENTS)
    patch_file(HF / "js/beat-battle-cloud.js", BBC_REPLACEMENTS)
    patch_file(HF / "js/app-logger.js", LOGGER_REPLACEMENTS)
    patch_file(HF / "js/draft-station.js", DRAFT_REPLACEMENTS)
    print("done")


if __name__ == "__main__":
    main()
