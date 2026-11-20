// Core logic thuần: KHÔNG import three/DOM, KHÔNG Math.random/Date.now.
// Mô hình tick theo Test Contract v1.0: bước k đọc input tick k, tạo trạng thái k+1,
// sự kiện trong bước đó ghi tick = k+1.
import { createRng } from './rng.js';
import { TUNING, WORLD } from './tuning.js';

export const TICKS_PER_SECOND = 60;
export const TICK_DT = 1 / TICKS_PER_SECOND;

export const r3 = (v) => {
  const x = Math.round(v * 1000) / 1000;
  return x === 0 ? 0 : x; // tránh -0
};
export const distXZ = (a, b) => Math.hypot(a[0] - b[0], a[2] - b[2]);
// "Trong bán kính r" = khoảng cách <= r, có dung sai cho sai số cộng dồn số thực.
const EPS = 1e-9;
export const within = (a, b, r) => distXZ(a, b) <= r + EPS;
const sec2ticks = (s) => Math.round(s * TICKS_PER_SECOND);

export function defaultLanterns(n = TUNING.lantern_count_night1) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = (i * 2 * Math.PI) / n;
    const R = WORLD.lantern_ring_radius;
    out.push({ id: `L${i + 1}`, pos: [r3(R * Math.sin(a)), 0, r3(R * Math.cos(a))], lit: false, deposited: 0 });
  }
  return out;
}

function randomIslandPoint(rng, rMin, rMax, y = 0) {
  const a = rng() * 2 * Math.PI;
  const r = rMin + rng() * (rMax - rMin);
  return [r3(r * Math.sin(a)), y, r3(r * Math.cos(a))];
}

function spawnMote(g) {
  g.motes.push({ id: `M${g.nextMoteId++}`, pos: randomIslandPoint(g.rng, 3, WORLD.island_radius - 4) });
}

function spawnShade(g) {
  let pos = randomIslandPoint(g.rng, 28, WORLD.island_radius - 4, WORLD.shade_spawn_y);
  if (distXZ(pos, g.player.pos) < 10) pos = [-pos[0], pos[1], -pos[2]]; // không sinh sát người chơi
  const s = { id: `S${g.nextShadeId++}`, pos, state: 'chase', stunTicks: 0 };
  g.shades.push(s);
  return s;
}

/**
 * Tạo game. scenario (đã validate) theo mục D của contract, có thể null.
 */
export function createGame({ seed = 1, scenario = null, tuning = TUNING } = {}) {
  const sc = scenario || {};
  const g = {
    t: tuning,
    rng: createRng(seed),
    steps: 0,
    state: 'playing',
    score: 0,
    duration: sc.time_left_s ?? tuning.night1_duration_s,
    player: { pos: [0, 0, 0], vy: 0, flames: tuning.flames, carried: 0, invulnTicks: 0, pulseCdTicks: 0 },
    lanterns: defaultLanterns(tuning.lantern_count_night1),
    shades: [],
    motes: [],
    nextMoteId: 1,
    nextShadeId: 1,
    randomMotes: sc.random_motes ?? true,
    randomShades: sc.random_shades ?? true,
    prev: { jump: false, interact: false, pulse: false },
  };

  if (sc.player) {
    if (sc.player.pos) g.player.pos = sc.player.pos.slice();
    if (sc.player.carried != null) g.player.carried = sc.player.carried;
    if (sc.player.flames != null) g.player.flames = sc.player.flames;
  }

  for (const L of sc.lanterns || []) {
    const target = g.lanterns.find((x) => x.id === L.id);
    if (!target) continue; // id lạ: bỏ qua (CLI cảnh báo ra stderr)
    if (L.pos) target.pos = L.pos.slice();
    if (L.deposited != null) target.deposited = L.deposited;
    if (L.lit != null) target.lit = L.lit;
  }

  if (sc.motes) {
    g.motes = sc.motes.map((pos) => ({ id: `M${g.nextMoteId++}`, pos: pos.slice() }));
  } else {
    for (let i = 0; i < WORLD.initial_motes; i++) spawnMote(g);
  }

  if (sc.shades) {
    g.shades = sc.shades.map((s) => ({ id: s.id ?? `S${g.nextShadeId++}`, pos: s.pos.slice(), state: 'chase', stunTicks: 0 }));
    // tránh trùng id tự sinh với id người dùng đặt
    for (const s of g.shades) {
      const m = /^S(\d+)$/.exec(s.id);
      if (m) g.nextShadeId = Math.max(g.nextShadeId, Number(m[1]) + 1);
    }
  } else {
    for (let i = 0; i < WORLD.initial_shades; i++) spawnShade(g);
  }
  return g;
}

export function timeLeft(g) {
  return g.duration - g.steps / TICKS_PER_SECOND;
}

function keepOutOfLitLanterns(g, s) {
  const R = g.t.safe_radius;
  for (const L of g.lanterns) {
    if (!L.lit) continue;
    const d = distXZ(s.pos, L.pos);
    if (d <= R) {
      let dx = s.pos[0] - L.pos[0];
      let dz = s.pos[2] - L.pos[2];
      if (d === 0) { dx = 1; dz = 0; }
      const k = (R + 1e-6) / (d === 0 ? 1 : d);
      s.pos[0] = L.pos[0] + dx * k;
      s.pos[2] = L.pos[2] + dz * k;
    }
  }
}

/**
 * Chạy một bước. input: { move:[x,z], cam_yaw_deg, jump, interact, pulse } (giá trị hiện tại).
 * Trả về danh sách event của bước này.
 */
export function step(g, input = {}) {
  if (g.state !== 'playing') return [];
  const t = g.t;
  const p = g.player;
  const tick = g.steps + 1;
  g.steps = tick;
  const events = [];
  const emit = (name, data) => events.push({ type: 'event', tick, name, data });
  const finish = (result, reason) => {
    g.state = result;
    if (result === 'won') {
      g.score += Math.floor(Math.max(0, timeLeft(g))) * t.score.per_second_left + p.flames * t.score.per_flame_left;
    }
    emit('game_over', { result, reason });
    return events;
  };

  // 1. Bộ đếm thời gian
  if (p.invulnTicks > 0) p.invulnTicks--;
  if (p.pulseCdTicks > 0) p.pulseCdTicks--;
  for (const s of g.shades) if (s.stunTicks > 0 && --s.stunTicks === 0) s.state = 'chase';

  // 2. Nút: kích hoạt khi false -> true
  const pressed = (k) => !!input[k] && !g.prev[k];
  const jumpP = pressed('jump');
  const interactP = pressed('interact');
  const pulseP = pressed('pulse');
  g.prev = { jump: !!input.jump, interact: !!input.interact, pulse: !!input.pulse };

  // 3. Di chuyển (xoay theo cam_yaw_deg, chuẩn hóa nếu dài hơn 1)
  let [mx, mz] = input.move || [0, 0];
  const len = Math.hypot(mx, mz);
  if (len > 1) { mx /= len; mz /= len; }
  const th = ((input.cam_yaw_deg || 0) * Math.PI) / 180;
  const wx = mx * Math.cos(th) + mz * Math.sin(th);
  const wz = -mx * Math.sin(th) + mz * Math.cos(th);
  p.pos[0] += wx * t.player_speed * TICK_DT;
  p.pos[2] += wz * t.player_speed * TICK_DT;
  const rp = Math.hypot(p.pos[0], p.pos[2]);
  if (rp > WORLD.island_radius) {
    p.pos[0] *= WORLD.island_radius / rp;
    p.pos[2] *= WORLD.island_radius / rp;
  }

  // 4. Nhảy (chỉ hiển thị/di chuyển dọc; khoảng cách gameplay đo theo XZ)
  if (jumpP && p.pos[1] <= 0) p.vy = WORLD.jump_velocity;
  if (p.pos[1] > 0 || p.vy > 0) {
    p.vy -= WORLD.gravity * TICK_DT;
    p.pos[1] += p.vy * TICK_DT;
    if (p.pos[1] <= 0) { p.pos[1] = 0; p.vy = 0; }
  }

  // 5. Nhặt đom đóm (theo thứ tự id, không vượt sức chứa)
  for (let i = 0; i < g.motes.length && p.carried < t.carry_capacity; ) {
    if (within(p.pos, g.motes[i].pos, t.pickup_radius)) {
      g.motes.splice(i, 1);
      p.carried++;
      g.score += t.score.per_mote;
      emit('mote_picked', { carried: p.carried });
    } else i++;
  }

  // 6. Nạp đèn: đèn chưa thắp gần nhất trong interact_radius
  if (interactP && p.carried > 0) {
    let best = null;
    let bd = Infinity;
    for (const L of g.lanterns) {
      if (L.lit) continue;
      const d = distXZ(p.pos, L.pos);
      if (d <= t.interact_radius + EPS && d < bd) { bd = d; best = L; }
    }
    if (best) {
      const amount = Math.max(0, Math.min(p.carried, t.lantern_cost - best.deposited));
      if (amount > 0) {
        p.carried -= amount;
        best.deposited += amount;
        emit('deposit', { lantern_id: best.id, amount, deposited: best.deposited });
      }
      if (best.deposited >= t.lantern_cost) {
        best.lit = true;
        g.score += t.score.per_lantern;
        emit('lantern_lit', { lantern_id: best.id });
      }
    }
  }
  if (g.lanterns.every((L) => L.lit)) return finish('won', 'all_lit');

  // 7. Tỏa sáng: tốn pulse_cost đom đóm đang mang, có hồi chiêu
  if (pulseP && p.pulseCdTicks === 0 && p.carried >= t.pulse_cost) {
    p.carried -= t.pulse_cost;
    p.pulseCdTicks = sec2ticks(t.pulse_cooldown_s);
    const ids = [];
    for (const s of g.shades) {
      const d = distXZ(p.pos, s.pos);
      if (d > t.pulse_radius + EPS) continue;
      s.state = 'stunned';
      s.stunTicks = sec2ticks(t.pulse_stun_s);
      let dx = s.pos[0] - p.pos[0];
      let dz = s.pos[2] - p.pos[2];
      if (d === 0) { dx = 1; dz = 0; }
      const k = t.pulse_push_m / (d === 0 ? 1 : d);
      s.pos[0] += dx * k;
      s.pos[2] += dz * k;
      keepOutOfLitLanterns(g, s);
      g.score += t.score.per_stun;
      ids.push(s.id);
    }
    emit('pulse', { stunned_ids: ids });
  }

  // 8. Bóng Mực đuổi theo, không vào safe_radius của đèn đã thắp
  for (const s of g.shades) {
    if (s.state === 'stunned') continue;
    const d = distXZ(s.pos, p.pos);
    const stepLen = t.shade_speed * TICK_DT;
    if (d <= stepLen) { s.pos[0] = p.pos[0]; s.pos[2] = p.pos[2]; }
    else if (d > 0) {
      s.pos[0] += ((p.pos[0] - s.pos[0]) / d) * stepLen;
      s.pos[2] += ((p.pos[2] - s.pos[2]) / d) * stepLen;
    }
    keepOutOfLitLanterns(g, s);
  }

  // 9. Va chạm: mất 1 ngọn lửa, rơi một phần đom đóm (mất hẳn), bất tử ngắn
  if (p.invulnTicks === 0) {
    const hitter = g.shades.find((s) => s.state !== 'stunned' && within(s.pos, p.pos, t.shade_hit_radius));
    if (hitter) {
      p.flames = Math.max(0, p.flames - 1);
      const dropped = Math.floor(p.carried * t.hit_drop_ratio);
      p.carried -= dropped;
      p.invulnTicks = sec2ticks(t.invuln_s);
      emit('player_hit', { by: 'shade', flames: p.flames, dropped });
      if (p.flames <= 0) return finish('lost', 'no_flames');
    }
  }

  // 10. Sinh thêm (chỉ khi random_*)
  if (g.randomShades && tick % WORLD.shade_spawn_ticks === 0 && g.shades.length < WORLD.shade_max) {
    emit('shade_spawned', { id: spawnShade(g).id });
  }
  if (g.randomMotes && tick % WORLD.mote_respawn_ticks === 0 && g.motes.length < WORLD.mote_min_active) {
    spawnMote(g);
  }

  // 11. Bình minh
  if (timeLeft(g) <= 1e-9) return finish('lost', 'dawn');
  return events;
}

export function snapshot(g) {
  const p = g.player;
  return {
    type: 'snapshot',
    tick: g.steps,
    sim_tick: g.steps,
    state: g.state,
    time_left_s: r3(Math.max(0, timeLeft(g))),
    score: g.score,
    player: { pos: p.pos.map(r3), flames: p.flames, carried: p.carried },
    lanterns: g.lanterns.map((L) => ({ id: L.id, pos: L.pos.map(r3), lit: L.lit, deposited: L.deposited })),
    shades: g.shades.map((s) => ({ id: s.id, pos: s.pos.map(r3), state: s.state })),
    motes_active: g.motes.length,
    motes: g.motes.map((m) => ({ id: m.id, pos: m.pos.map(r3) })),
  };
}
