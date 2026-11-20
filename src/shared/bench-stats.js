// Thống kê khung hình theo định nghĩa TICKET-04 mục 1. dts = thời gian từng khung (ms) trong khoảng đo.
const r1 = (v) => Math.round(v * 10) / 10;

export function frameStats(dts) {
  const N = dts.length;
  if (N === 0) return { frames: 0, avg_fps: 0, p1_low_fps: 0, frame_ms_p95: 0 };
  const sum = dts.reduce((a, b) => a + b, 0);
  const sorted = [...dts].sort((a, b) => a - b);
  const k = Math.max(1, Math.ceil(0.01 * N));
  const worst = sorted.slice(N - k);
  const worstAvg = worst.reduce((a, b) => a + b, 0) / k;
  return {
    frames: N,
    avg_fps: r1((1000 * N) / sum),
    p1_low_fps: r1(1000 / worstAvg),
    frame_ms_p95: Math.round(percentile(sorted, 95) * 100) / 100,
  };
}

/** Phân vị p (0–100) của mảng đã sắp tăng, nội suy tuyến tính giữa hai hạng gần nhất (A4-5). */
export function percentile(sorted, p) {
  if (sorted.length === 1) return sorted[0];
  const pos = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

/** Vị trí camera bench ở giây t: tròn tâm O, R 30 m, Y 15 m, 15 s/vòng, bắt đầu (30,15,0), ngược chiều kim đồng hồ nhìn từ trên (A4-4). */
export const BENCH_CAMERA = { radius: 30, height: 15, period_s: 15, warmup_s: 3 };
export function benchCamera(t) {
  const a = (2 * Math.PI * t) / BENCH_CAMERA.period_s;
  return [BENCH_CAMERA.radius * Math.cos(a), BENCH_CAMERA.height, -BENCH_CAMERA.radius * Math.sin(a)];
}
