// Cài đặt người chơi, lưu giữa các lần mở game (localStorage). Mọi truy cập bọc try/catch:
// trình duyệt chặn bộ nhớ thì vẫn chơi được với giá trị mặc định.
import { DEFAULT_KEYS, sanitizeKeys } from './keybinds.js';

const KEY = 'dao-den-long.settings.v1';
// reducedMotion mặc định theo cài đặt hệ điều hành (prefers-reduced-motion) nếu đọc được
const prefersReduced = () => { try { return !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches; } catch { return false; } };
export const DEFAULTS = { volume: 0.7, sensitivity: 1, showFps: true, devMode: false, colorblind: false,
  reducedMotion: false, largeText: false, captions: true, keys: { ...DEFAULT_KEYS } };

export function loadSettings() {
  const base = { ...DEFAULTS, reducedMotion: prefersReduced(), keys: { ...DEFAULT_KEYS } };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return base;
    const s = JSON.parse(raw);
    const num = (v, lo, hi, d) => (typeof v === 'number' && v >= lo && v <= hi ? v : d);
    const bool = (v, d) => (typeof v === 'boolean' ? v : d);
    return {
      volume: num(s.volume, 0, 1, DEFAULTS.volume),
      sensitivity: num(s.sensitivity, 0.2, 3, DEFAULTS.sensitivity),
      showFps: bool(s.showFps, DEFAULTS.showFps),
      devMode: bool(s.devMode, DEFAULTS.devMode),
      colorblind: bool(s.colorblind, DEFAULTS.colorblind),
      reducedMotion: bool(s.reducedMotion, base.reducedMotion),
      largeText: bool(s.largeText, DEFAULTS.largeText),
      captions: bool(s.captions, DEFAULTS.captions),
      keys: sanitizeKeys(s.keys),
    };
  } catch {
    return base;
  }
}

export function saveSettings(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* không lưu được: bỏ qua */ }
}
