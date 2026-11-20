// Cài đặt người chơi, lưu giữa các lần mở game (localStorage). Mọi truy cập bọc try/catch:
// trình duyệt chặn bộ nhớ thì vẫn chơi được với giá trị mặc định.
const KEY = 'dao-den-long.settings.v1';
export const DEFAULTS = { volume: 0.7, sensitivity: 1, showFps: true, devMode: false };

export function loadSettings() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const s = JSON.parse(raw);
    const num = (v, lo, hi, d) => (typeof v === 'number' && v >= lo && v <= hi ? v : d);
    return {
      volume: num(s.volume, 0, 1, DEFAULTS.volume),
      sensitivity: num(s.sensitivity, 0.2, 3, DEFAULTS.sensitivity),
      showFps: typeof s.showFps === 'boolean' ? s.showFps : DEFAULTS.showFps,
      devMode: typeof s.devMode === 'boolean' ? s.devMode : DEFAULTS.devMode,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* không lưu được: bỏ qua */ }
}
