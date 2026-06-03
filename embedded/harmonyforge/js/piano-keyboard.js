/**
 * 88 键钢琴键盘 UI（MIDI 21–108，A0–C8）
 */
const PianoKeyboard = (() => {
  const BLACK_SEMIS = new Set([1, 3, 6, 8, 10]);

  function isBlackKey(midi) {
    return BLACK_SEMIS.has(midi % 12);
  }

  function whiteMidisInRange(minMidi, maxMidi) {
    const keys = [];
    for (let m = minMidi; m <= maxMidi; m++) {
      if (!isBlackKey(m)) keys.push(m);
    }
    return keys;
  }

  function blackAnchorIndex(blackMidi, whiteMidis) {
    let anchor = blackMidi - 1;
    while (anchor >= whiteMidis[0] && isBlackKey(anchor)) anchor -= 1;
    const idx = whiteMidis.indexOf(anchor);
    return idx >= 0 ? idx : 0;
  }

  /**
   * @param {HTMLElement} container
   * @param {{ minMidi?: number, maxMidi?: number, selectedMidi?: number|null, labelFor?: (m:number)=>string, onPick?: (midi:number)=>void }} opts
   */
  function render(container, opts = {}) {
    if (!container) return;
    const {
      minMidi = 21,
      maxMidi = 108,
      selectedMidi = null,
      labelFor = (m) => String(m),
      onPick = () => {},
    } = opts;

    container.innerHTML = "";
    container.className = "piano-keyboard-host";

    const scroll = document.createElement("div");
    scroll.className = "piano-keyboard-scroll";

    const board = document.createElement("div");
    board.className = "piano-keyboard";
    board.setAttribute("role", "listbox");
    board.setAttribute(
      "aria-label",
      typeof window.HF_T === "function"
        ? window.HF_T("note_dialog.piano_keyboard")
        : "钢琴键盘"
    );

    const whiteMidis = whiteMidisInRange(minMidi, maxMidi);
    board.style.setProperty("--piano-white-count", String(whiteMidis.length));

    const whitesRow = document.createElement("div");
    whitesRow.className = "piano-whites";

    whiteMidis.forEach((midi) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className =
        "piano-key piano-key-white" +
        (selectedMidi != null && midi === selectedMidi ? " selected" : "");
      btn.dataset.midi = String(midi);
      btn.title = labelFor(midi);
      btn.setAttribute("aria-label", labelFor(midi));
      if (midi % 12 === 0) {
        const oct = document.createElement("span");
        oct.className = "piano-key-oct";
        oct.textContent = String(Math.floor(midi / 12) - 1);
        btn.appendChild(oct);
      }
      btn.addEventListener("click", () => onPick(midi));
      whitesRow.appendChild(btn);
    });
    board.appendChild(whitesRow);

    for (let midi = minMidi; midi <= maxMidi; midi++) {
      if (!isBlackKey(midi)) continue;
      const idx = blackAnchorIndex(midi, whiteMidis);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className =
        "piano-key piano-key-black" +
        (selectedMidi != null && midi === selectedMidi ? " selected" : "");
      btn.dataset.midi = String(midi);
      btn.style.setProperty("--piano-black-at", String(idx + 0.68));
      btn.title = labelFor(midi);
      btn.setAttribute("aria-label", labelFor(midi));
      btn.addEventListener("click", () => onPick(midi));
      board.appendChild(btn);
    }

    scroll.appendChild(board);
    container.appendChild(scroll);
  }

  function updateSelection(container, midi) {
    if (!container) return;
    container.querySelectorAll(".piano-key").forEach((el) => {
      const m = Number(el.dataset.midi);
      el.classList.toggle("selected", midi != null && m === midi);
    });
  }

  return { render, updateSelection, isBlackKey, whiteMidisInRange };
})();
