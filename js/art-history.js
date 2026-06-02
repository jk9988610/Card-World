/** 绘画撤回 / 重做栈 */

export function createArtHistory(max = 80) {
  return { stack: [], index: -1, max };
}

export function pushArtHistory(hist, grid) {
  const snap = grid.slice();
  if (hist.index < hist.stack.length - 1) {
    hist.stack = hist.stack.slice(0, hist.index + 1);
  }
  hist.stack.push(snap);
  if (hist.stack.length > hist.max) hist.stack.shift();
  hist.index = hist.stack.length - 1;
}

export function canUndo(hist) {
  return hist.index > 0;
}

export function canRedo(hist) {
  return hist.index >= 0 && hist.index < hist.stack.length - 1;
}

export function undoArtHistory(hist) {
  if (!canUndo(hist)) return null;
  hist.index -= 1;
  return hist.stack[hist.index].slice();
}

export function redoArtHistory(hist) {
  if (!canRedo(hist)) return null;
  hist.index += 1;
  return hist.stack[hist.index].slice();
}

export function resetArtHistory(hist, grid) {
  hist.stack = [grid.slice()];
  hist.index = 0;
}
