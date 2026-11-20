// Bản đồ chuẩn TICKET-02 Phần 2. Góc θ đo từ +X: điểm (r·cosθ, y, r·sinθ) (A2 đầu bảng).
// Mỗi map: groundAt(x, z) -> độ cao mặt đất hoặc null (không có đất = biển mây, rơi).
import { TUNING } from './tuning.js';

const rad = (deg) => (deg * Math.PI) / 180;
export const polar = (r, deg, y = 0) => [r * Math.cos(rad(deg)), y, r * Math.sin(rad(deg))];
const ring = (r, startDeg, stepDeg, n, y = 0) => Array.from({ length: n }, (_, i) => polar(r, startDeg + i * stepDeg, y));

function night1() {
  const R = 40;
  return {
    night: 1,
    name: 'Đảo Bến',
    duration_s: TUNING.night1_duration_s,
    radius: R,
    start: [0, 0, 0],
    startFacing: [0, 1], // +Z
    groundAt: (x, z) => (x * x + z * z <= R * R ? 0 : null),
    solidAt: () => false,
    lanterns: [
      ['L1', [0, 0, 25]], ['L2', [23.8, 0, 7.7]], ['L3', [14.7, 0, -20.2]],
      ['L4', [-14.7, 0, -20.2]], ['L5', [-23.8, 0, 7.7]],
    ],
    moteSpawns: [...ring(12, 0, 45, 8), ...ring(33, 0, 22.5, 16)],
    shadeSpawns: ring(37, 15, 30, 12),
    shade: { interval_ticks: 480, max: 6, speed: TUNING.shade_speed },
    charms: [],
    drifters: false,
    wind: false,
    pads: [],
  };
}

const BUILDERS = { 1: night1 };

export function getMap(night) {
  const b = BUILDERS[night];
  if (!b) throw new Error(`Đêm ${night} chưa được hỗ trợ`);
  return b();
}
export const SUPPORTED_NIGHTS = Object.keys(BUILDERS).map(Number);
