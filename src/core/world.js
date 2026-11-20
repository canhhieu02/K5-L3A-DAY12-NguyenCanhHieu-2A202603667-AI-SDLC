// Core logic thuần: KHÔNG import three/DOM. Dùng chung cho web và headless.
// CP0: đây chỉ là khung smoke test (di chuyển theo input, bước thời gian cố định).
// Luật game thật sẽ được viết theo PRD-0 + Test Contract ở Phase 1.
import { createRng } from './rng.js';

export const TICK_DT = 1 / 60; // bước thời gian cố định (giả định CP0, chờ contract)
export const PLAYER_SPEED = 4; // đơn vị/giây (giả định CP0)

export function createWorld(seed = 1) {
  return {
    seed,
    tick: 0,
    rng: createRng(seed),
    player: { x: 0, z: 0 },
  };
}

// input: { dx: -1..1, dz: -1..1 }
export function step(world, input = { dx: 0, dz: 0 }) {
  const len = Math.hypot(input.dx, input.dz);
  if (len > 0) {
    const s = (PLAYER_SPEED * TICK_DT) / Math.max(1, len);
    world.player.x += input.dx * s;
    world.player.z += input.dz * s;
  }
  world.tick += 1;
  return world;
}

// Snapshot thuần dữ liệu (không chứa hàm) để in ra / so sánh.
export function snapshot(world) {
  return {
    tick: world.tick,
    player: {
      x: Number(world.player.x.toFixed(4)),
      z: Number(world.player.z.toFixed(4)),
    },
  };
}
