// Đổi phím (TICKET-04 mục 4). Thuần (không DOM) để test được bằng node.
// Mỗi hành động có đúng một phím (mã KeyboardEvent.code). Esc luôn mở menu tạm dừng, không gán cho hành động khác.
export const ACTIONS = [
  ['up', 'Đi tới'], ['down', 'Đi lùi'], ['left', 'Sang trái'], ['right', 'Sang phải'],
  ['jump', 'Nhảy'], ['dash', 'Lướt'], ['interact', 'Tương tác (thắp / châm dầu)'], ['pulse', 'Tỏa Sáng'], ['pause', 'Tạm dừng'],
  ['camLeft', 'Xoay camera trái'], ['camRight', 'Xoay camera phải'],
];
export const DEFAULT_KEYS = Object.freeze({
  up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD', jump: 'Space', dash: 'ShiftLeft', interact: 'KeyE',
  pulse: 'KeyF', pause: 'KeyP', camLeft: 'ArrowLeft', camRight: 'ArrowRight',
});
export const RESERVED = ['Escape'];

/** Phím trái/phải cùng loại coi là một (Shift phải = Shift trái…). */
export function normalizeCode(code) {
  return String(code || '').replace(/^(Shift|Control|Alt|Meta)Right$/, '$1Left');
}

/** Các phím đang gán cho ≥ 2 hành động: [{ code, actions: [...] }]. */
export function findConflicts(keys) {
  const by = new Map();
  for (const [a] of ACTIONS) {
    const c = normalizeCode(keys[a]);
    if (!by.has(c)) by.set(c, []);
    by.get(c).push(a);
  }
  return [...by].filter(([, list]) => list.length > 1).map(([code, actions]) => ({ code, actions }));
}

/** Gán phím mới; trả về { keys, error, conflicts }. Esc bị từ chối; trùng phím vẫn gán nhưng báo trong conflicts. */
export function rebind(keys, action, code) {
  if (!ACTIONS.some(([a]) => a === action)) return { keys, error: `Hành động lạ: ${action}`, conflicts: findConflicts(keys) };
  const c = normalizeCode(code);
  if (!c || RESERVED.includes(c)) return { keys, error: 'Esc dành riêng để mở menu tạm dừng', conflicts: findConflicts(keys) };
  const next = { ...keys, [action]: c };
  return { keys: next, error: null, conflicts: findConflicts(next) };
}

/** Đọc từ bộ nhớ: giữ phím hợp lệ, thiếu/sai thì dùng mặc định. */
export function sanitizeKeys(obj) {
  const out = { ...DEFAULT_KEYS };
  if (obj && typeof obj === 'object') {
    for (const [a] of ACTIONS) {
      const c = obj[a];
      if (typeof c === 'string' && c.length > 0 && c.length < 32 && !RESERVED.includes(c)) out[a] = normalizeCode(c);
    }
  }
  return out;
}

const NAMES = { Space: 'Space', ShiftLeft: 'Shift', ControlLeft: 'Ctrl', AltLeft: 'Alt', MetaLeft: 'Meta', Enter: 'Enter', Tab: 'Tab',
  Backspace: 'Backspace', ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓', CapsLock: 'Caps' };
/** Nhãn ngắn để hiện trên HUD/menu. */
export function keyLabel(code) {
  if (NAMES[code]) return NAMES[code];
  let m = /^Key([A-Z])$/.exec(code);
  if (m) return m[1];
  m = /^(Digit|Numpad)(\d)$/.exec(code);
  if (m) return m[1] === 'Numpad' ? `Num${m[2]}` : m[2];
  return code;
}
