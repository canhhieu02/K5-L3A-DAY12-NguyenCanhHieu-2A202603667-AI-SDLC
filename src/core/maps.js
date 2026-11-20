// Bản đồ chuẩn TICKET-02 Phần 2. Góc θ đo từ +X: điểm (r·cosθ, y, r·sinθ) (A2 đầu bảng).
// Mỗi map: groundAt(x, z) -> độ cao mặt đất hoặc null (không có đất = biển mây, rơi).
import { TUNING } from './tuning.js';

const rad = (deg) => (deg * Math.PI) / 180;
const E = 1e-9; // mép đất tính "≤" có dung sai sai số cộng dồn (A1-15)
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
    groundAt: (x, z) => (Math.hypot(x, z) <= R + E ? 0 : null),
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

// Bục nhảy hình tròn bán kính 1 m: vận tốc Y và vận tốc ngang (giữ tới khi chạm đất).
function pad(pos, vy, speed, toward) {
  const dx = toward[0] - pos[0];
  const dz = toward[1] - pos[2];
  const d = Math.hypot(dx, dz);
  return { pos, r: 1, vy, h: [(dx / d) * speed, (dz / d) * speed] };
}
const around = (c, pts) => pts.map(([x, y, z]) => [x + c[0], y, z + c[1]]);

function night2() {
  const R = 28;
  const A = [0, 0];
  const B = [70, 0];
  const onIsland = (x, z, c) => Math.hypot(x - c[0], z - c[1]) <= R + E;
  const onBridge = (x, z) => x >= 26 - E && x <= 44 + E && z >= -2 - E && z <= 2 + E;
  const motes = (c) => around(c, [...ring(10, 0, 90, 4), ...ring(22, 0, 45, 8)]);
  return {
    night: 2,
    name: 'Đảo Cau',
    duration_s: TUNING.night2_duration_s,
    radius: R,
    start: [0, 0, 0],
    startFacing: [0, 1],
    groundAt: (x, z) => (onIsland(x, z, A) || onIsland(x, z, B) || onBridge(x, z) ? 0 : null),
    solidAt: () => false,
    lanterns: [
      ['L1', [0, 0, 20]], ['L2', [17, 0, -10]], ['L3', [-17, 0, -10]],
      ['L4', [70, 0, 20]], ['L5', [87, 0, -10]], ['L6', [53, 0, -10]],
    ],
    moteSpawns: [...motes(A), ...motes(B)],
    shadeSpawns: [...around(A, ring(26, 22.5, 45, 8)), ...around(B, ring(26, 22.5, 45, 8))],
    shade: { interval_ticks: 420, max: 8, speed: TUNING.shade_speed },
    charms: [['C1', [35, 0, 0]]],
    drifters: true,
    wind: false,
    pads: [pad([20, 0, 18], 14, 24, B), pad([50, 0, -18], 14, 24, A)],
  };
}

function night3() {
  const R = 45;
  const RAMPS = [30, 150].map((deg) => [Math.cos(rad(deg)), Math.sin(rad(deg))]);
  const groundAt = (x, z) => {
    const r = Math.hypot(x, z);
    if (r > R + E) return null;
    let h = 0;
    if (r >= 12 && r <= 24 && z > 0) h = 3; // tầng 1: nửa vành khăn z > 0
    for (const [c, s] of RAMPS) {
      const along = x * c + z * s;
      const side = -x * s + z * c;
      if (along >= 24 && along <= 30 && Math.abs(side) <= 1.5) h = Math.max(h, (30 - along) / 2); // dốc 3 m / 6 m
    }
    if (r <= 8) h = 6; // tầng 2
    return h;
  };
  return {
    night: 3,
    name: 'Đảo Chuông',
    duration_s: TUNING.night3_duration_s,
    radius: R,
    start: [0, 0, -12], // A2-16
    startFacing: [0, 1],
    groundAt,
    solidAt: (x, z) => x * x + z * z < 4, // tháp chuông r 2 m, cao 8 m
    lanterns: [
      ['L1', [0, 6, 6]], ['L2', [18, 3, 10]], ['L3', [-18, 3, 10]], ['L4', [35, 0, -10]],
      ['L5', [-35, 0, -10]], ['L6', [20, 0, -35]], ['L7', [-20, 0, -35]],
    ],
    moteSpawns: [...ring(34, 0, 20, 18, 0), ...ring(18, 20, 20, 8, 3), ...ring(5, 45, 90, 4, 6)],
    shadeSpawns: ring(43, 0, 22.5, 16),
    shade: { interval_ticks: 360, max: 10, speed: 4.5 },
    charms: [['C1', [30, 0, 25]], ['C2', [-30, 0, 25]]],
    drifters: true,
    wind: true,
    pads: [pad([0, 3, 13], 12, 8, [0, -1e9])], // hướng −Z
  };
}

const BUILDERS = { 1: night1, 2: night2, 3: night3 };

export function getMap(night) {
  const b = BUILDERS[night];
  if (!b) throw new Error(`Đêm ${night} chưa được hỗ trợ`);
  return b();
}
export const SUPPORTED_NIGHTS = Object.keys(BUILDERS).map(Number);
