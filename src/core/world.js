// Core logic thuần: KHÔNG import three/DOM, KHÔNG Math.random/Date.now.
// Mô hình tick theo Test Contract v1.1: bước k đọc input tick k, tạo trạng thái k+1,
// sự kiện trong bước đó ghi tick = k+1. Thứ tự 12 bước trong step() theo TICKET-02.
import { createRng } from './rng.js';
import { TUNING, RULES } from './tuning.js';
import { getMap } from './maps.js';

export const TICKS_PER_SECOND = 60;
export const TICK_DT = 1 / TICKS_PER_SECOND;
export const SHADE_STATES = ['spawning', 'wander', 'chase', 'recoil', 'stunned'];
const BUTTONS = ['jump', 'interact', 'pulse', 'dash', 'pause'];

export const r3 = (v) => {
  const x = Math.round(v * 1000) / 1000;
  return x === 0 ? 0 : x; // tránh -0
};
export const distXZ = (a, b) => Math.hypot(a[0] - b[0], a[2] - b[2]);
const dist3 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
// "Trong bán kính r" = khoảng cách <= r, có dung sai cho sai số cộng dồn số thực (A1-15).
const EPS = 1e-9;
export const within = (a, b, r) => distXZ(a, b) <= r + EPS;
const sec2ticks = (s) => Math.round(s * TICKS_PER_SECOND);
const idNum = (id) => { const m = /(\d+)$/.exec(id); return m ? Number(m[1]) : Infinity; };
const idCmp = (a, b) => idNum(a.id) - idNum(b.id) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
// Hướng ngang từ a tới b, chuẩn hóa; trùng vị trí thì +X.
function dirXZ(a, b) {
  const dx = b[0] - a[0];
  const dz = b[2] - a[2];
  const d = Math.hypot(dx, dz);
  return d > 1e-12 ? [dx / d, dz / d] : [1, 0];
}

// ---------- thực thể ----------
function addMote(g, pos, kind) {
  const m = { id: `M${g.nextMoteId++}`, pos: pos.slice(), kind, ttl: kind === 'dropped' ? RULES.drop_ttl_ticks : null };
  g.motes.push(m);
  return m;
}

// Điểm sinh trống: không có đom đóm random nào trong 0.5 m (A2-6).
function freeMoteSpawns(g) {
  return g.map.moteSpawns.filter((pt) => !g.motes.some((m) => m.kind === 'random' && distXZ(m.pos, pt) < 0.5));
}
function spawnRandomMote(g) {
  const free = freeMoteSpawns(g);
  if (free.length === 0) return null; // hết điểm trống: bỏ lượt
  return addMote(g, free[Math.floor(g.rng() * free.length)], 'random');
}

// Đom đóm rơi ra vành 1.5–2.5 m quanh tâm (A2-7).
function dropMotes(g, n, center) {
  if (n <= 0) return;
  const { groundAt } = g.map;
  const [rMin, rMax] = RULES.drop_ring;
  const place = (x, z) => {
    const h = groundAt(x, z);
    if (h == null || h > center[1] + RULES.step_up) return false;
    addMote(g, [x, h, z], 'dropped');
    return true;
  };
  const a0 = g.rng() * 2 * Math.PI;
  for (let i = 0; i < n; i++) {
    const a = a0 + (i * 2 * Math.PI) / n;
    const r = rMin + g.rng() * (rMax - rMin);
    const dx = r * Math.cos(a);
    const dz = r * Math.sin(a);
    if (!place(center[0] + dx, center[2] + dz) && !place(center[0] - dx, center[2] - dz)) place(center[0], center[2]);
  }
}

function makeShade(g, { id, pos, state, ticks }) {
  const ground = g.map.groundAt(pos[0], pos[2]);
  const s = {
    id, pos: pos.slice(), state,
    hover: ground == null ? RULES.shade_hover : pos[1] - ground,
    stunTicks: 0, knockTicks: 0, knockDir: [1, 0],
    recoilTicks: 0, recoilDir: [1, 0], spawnTicks: 0,
    pushTicks: 0, pushDir: [1, 0], pushStep: 0, pushLantern: null,
    wanderDir: [1, 0], wanderTicks: 0,
  };
  if (state === 'stunned') s.stunTicks = ticks ?? sec2ticks(g.t.pulse_stun_s);
  if (state === 'spawning') s.spawnTicks = ticks ?? RULES.shade_spawning_ticks;
  if (state === 'recoil') {
    s.recoilTicks = ticks ?? RULES.shade_recoil_ticks;
    s.recoilDir = dirXZ(g.player.pos, s.pos);
  }
  return s;
}

function shadeSpawnPoints(g) {
  return g.map.shadeSpawns.filter((pt) => distXZ(pt, g.player.pos) >= RULES.shade_spawn_min_dist - EPS && !inLitZone(g, pt));
}
function spawnShade(g) {
  const pts = shadeSpawnPoints(g);
  if (pts.length === 0) return null; // hết điểm hợp lệ: bỏ lượt
  const pt = pts[Math.floor(g.rng() * pts.length)];
  const ground = g.map.groundAt(pt[0], pt[2]) ?? 0;
  const s = makeShade(g, { id: `S${g.nextShadeId++}`, pos: [pt[0], ground + RULES.shade_hover, pt[2]], state: 'spawning' });
  g.shades.push(s);
  return s;
}

function inLitZone(g, pos) {
  return g.lanterns.some((L) => L.lit && distXZ(pos, L.pos) < g.t.safe_radius);
}

/**
 * Tạo game một Đêm. scenario (đã validate) theo contract v1.1 mục D, có thể null.
 */
export function createGame({ seed = 1, night = 1, scenario = null, tuning = TUNING } = {}) {
  const sc = scenario || {};
  const map = getMap(night);
  const g = {
    t: tuning,
    map,
    night,
    rng: createRng(seed),
    tick: 0,
    simTick: 0,
    state: 'playing',
    paused: false,
    started: false,
    score: 0,
    duration: sc.time_left_s ?? map.duration_s,
    player: {
      pos: map.start.slice(), vel: [0, 0, 0], grounded: true, facing: map.startFacing.slice(),
      flames: tuning.flames, carried: 0,
      invulnTicks: 0, pulseCdTicks: 0, dashCdTicks: 0, dashTicks: 0, dashDir: [0, 1], charmTicks: 0,
      waitTicks: 0, launch: null,
    },
    lanterns: map.lanterns.map(([id, pos]) => ({ id, pos: pos.slice(), lit: false, deposited: 0 })),
    shades: [],
    motes: [],
    drifters: [],
    charms: [],
    wind: { active: false, dir_deg: 0 },
    nextMoteId: 1,
    nextShadeId: 1,
    randomMotes: sc.random_motes ?? true,
    randomShades: sc.random_shades ?? true,
    randomDrifters: sc.random_drifters ?? map.drifters,
    windEnabled: sc.wind_enabled ?? map.wind,
    prev: Object.fromEntries(BUTTONS.map((b) => [b, false])),
  };
  const p = g.player;

  if (sc.player) {
    const sp = sc.player;
    if (sp.pos) p.pos = sp.pos.slice();
    if (sp.carried != null) p.carried = sp.carried;
    if (sp.flames != null) p.flames = sp.flames;
    if (sp.invuln_ticks != null) p.invulnTicks = sp.invuln_ticks;
    if (sp.dash_cd_ticks != null) p.dashCdTicks = sp.dash_cd_ticks;
    if (sp.pulse_cd_ticks != null) p.pulseCdTicks = sp.pulse_cd_ticks;
    if (sp.charm_ticks != null) p.charmTicks = sp.charm_ticks;
  }
  const h0 = map.groundAt(p.pos[0], p.pos[2]);
  p.grounded = h0 != null && Math.abs(p.pos[1] - h0) <= 1e-6;

  for (const L of sc.lanterns || []) {
    const target = g.lanterns.find((x) => x.id === L.id);
    if (!target) continue; // id lạ: bỏ qua (CLI cảnh báo ra stderr)
    if (L.pos) target.pos = L.pos.slice();
    if (L.deposited != null) target.deposited = L.deposited;
    if (L.lit != null) target.lit = L.lit;
  }

  if (sc.motes) {
    for (const pos of sc.motes) addMote(g, pos, 'random');
  } else {
    for (let i = 0; i < RULES.mote_initial; i++) spawnRandomMote(g);
  }

  if (sc.shades) {
    for (const s of sc.shades) {
      const id = s.id ?? `S${g.nextShadeId++}`;
      const state = s.state ?? (distXZ(s.pos, p.pos) <= RULES.shade_detect + EPS ? 'chase' : 'wander'); // A2-11
      g.shades.push(makeShade(g, { id, pos: s.pos, state, ticks: s.state_ticks_left }));
    }
    for (const s of g.shades) {
      const m = /^S(\d+)$/.exec(s.id);
      if (m) g.nextShadeId = Math.max(g.nextShadeId, Number(m[1]) + 1); // tránh trùng id tự sinh
    }
  }
  return g;
}

export function timeLeft(g) {
  return g.duration - g.simTick / TICKS_PER_SECOND;
}

// ---------- di chuyển Mây (bước 3) ----------
function movePlayer(g, input, P, emit) {
  const t = g.t;
  const p = g.player;
  const { groundAt, solidAt } = g.map;

  let [mx, mz] = input.move || [0, 0];
  const len = Math.hypot(mx, mz);
  if (len > 1) { mx /= len; mz /= len; }
  const th = ((input.cam_yaw_deg || 0) * Math.PI) / 180;
  const wx = mx * Math.cos(th) + mz * Math.sin(th);
  const wz = -mx * Math.sin(th) + mz * Math.cos(th);
  const wl = Math.hypot(wx, wz);
  if (wl > 1e-9) p.facing = [wx / wl, wz / wl];

  // Lướt: hướng di chuyển, đứng yên thì hướng quay mặt (A2-2). Bùa: bỏ hồi chiêu.
  if (P.dash && p.dashTicks === 0 && (p.dashCdTicks === 0 || p.charmTicks > 0)) {
    p.dashTicks = sec2ticks(t.dash_duration_s);
    p.dashCdTicks = sec2ticks(t.dash_cooldown_s);
    p.dashDir = p.facing.slice();
    emit('dash', {});
  }
  const dashing = p.dashTicks > 0;

  if (P.jump && p.grounded && !dashing) { p.vel[1] = RULES.jump_velocity; p.grounded = false; }

  // Vận tốc ngang đạt ngay giá trị đích (A2-1); trên không điều khiển đầy đủ.
  let vx;
  let vz;
  if (dashing) { vx = p.dashDir[0] * t.dash_speed; vz = p.dashDir[1] * t.dash_speed; }
  else if (p.launch) { [vx, vz] = p.launch; }
  else {
    const sp = p.charmTicks > 0 ? RULES.charm_speed : t.player_speed;
    vx = wx * sp; vz = wz * sp;
  }
  if (g.wind.active) {
    const a = (g.wind.dir_deg * Math.PI) / 180;
    vx += RULES.wind_speed * Math.cos(a);
    vz += RULES.wind_speed * Math.sin(a);
  }

  // Trục Y: lướt giữ nguyên độ cao (A2-3), còn lại trọng lực khi trên không.
  // Gia tốc hằng nên dùng vận tốc trung bình trong tick: đỉnh nhảy đúng v²/2g = 1.225 m, tiếp đất đúng 42 tick.
  let ny = p.pos[1];
  if (dashing) p.vel[1] = 0;
  else if (!p.grounded) {
    const v0 = p.vel[1];
    p.vel[1] -= RULES.gravity * TICK_DT;
    ny += ((v0 + p.vel[1]) / 2) * TICK_DT;
  }

  // Ngang: không vào chỗ đặc hoặc mặt đất cao hơn chân quá step_up (vách, A2-28).
  const canEnter = (x, z) => {
    if (solidAt(x, z)) return false;
    const h = groundAt(x, z);
    return !(h != null && h > ny + RULES.step_up);
  };
  let nx = p.pos[0] + vx * TICK_DT;
  let nz = p.pos[2] + vz * TICK_DT;
  if (!canEnter(nx, nz)) {
    if (canEnter(nx, p.pos[2])) nz = p.pos[2];
    else if (canEnter(p.pos[0], nz)) nx = p.pos[0];
    else { nx = p.pos[0]; nz = p.pos[2]; }
  }

  const h = groundAt(nx, nz);
  if (p.grounded) {
    if (h != null && ny - h <= RULES.step_up) ny = h; // bám dốc
    else { p.grounded = false; p.vel[1] = 0; } // bước ra khỏi mép
  } else if (h != null && p.vel[1] <= 0 && ny <= h + 1e-9) {
    ny = h; p.vel[1] = 0; p.grounded = true; p.launch = null;
  }

  p.pos = [nx, ny, nz];
  p.vel = [vx, p.grounded ? 0 : p.vel[1], vz];
  if (dashing) p.dashTicks--;
}

// ---------- Bóng Mực (bước 8) ----------
// Thử dời Bóng Mực tới (x, z); không có đất / vật đặc thì không đi.
function shadeTry(g, s, x, z) {
  if (g.map.groundAt(x, z) == null || g.map.solidAt(x, z)) return false;
  s.pos[0] = x; s.pos[2] = z;
  return true;
}
// Bị chặn ở mép vùng an toàn của đèn đã sáng.
function keepOutOfLitLanterns(g, s) {
  const R = g.t.safe_radius;
  for (const L of g.lanterns) {
    if (!L.lit) continue;
    const d = distXZ(s.pos, L.pos);
    if (d < R) {
      const [dx, dz] = dirXZ(L.pos, s.pos);
      s.pos[0] = L.pos[0] + dx * (R + 1e-6);
      s.pos[2] = L.pos[2] + dz * (R + 1e-6);
    }
  }
}
// Đẩy lùi/lùi lại: gặp vật cản (không có đất, vật đặc, vùng an toàn) thì dừng (A2-14).
function shadeShove(g, s, dir, len) {
  const x = s.pos[0] + dir[0] * len;
  const z = s.pos[2] + dir[1] * len;
  if (inLitZone(g, [x, 0, z])) return false;
  return shadeTry(g, s, x, z);
}

function moveShades(g) {
  const p = g.player;
  const present = p.waitTicks === 0;
  const speed = g.map.shade.speed;
  for (const s of g.shades) {
    if (s.pushTicks > 0) {
      // bị đẩy ra khỏi vùng đèn vừa thắp (A2-13)
      s.pos[0] += s.pushDir[0] * s.pushStep;
      s.pos[2] += s.pushDir[1] * s.pushStep;
      if (--s.pushTicks === 0) {
        const L = s.pushLantern;
        s.pos[0] = L.pos[0] + s.pushDir[0] * (g.t.safe_radius + 1e-6);
        s.pos[2] = L.pos[2] + s.pushDir[1] * (g.t.safe_radius + 1e-6);
      }
    } else if (s.state === 'stunned') {
      if (s.knockTicks > 0) {
        if (shadeShove(g, s, s.knockDir, g.t.pulse_push_m / RULES.pulse_knock_ticks)) s.knockTicks--;
        else s.knockTicks = 0;
      }
    } else if (s.state === 'recoil') {
      shadeShove(g, s, s.recoilDir, RULES.shade_recoil_m / RULES.shade_recoil_ticks);
      if (--s.recoilTicks === 0) s.state = 'wander';
    } else if (s.state === 'wander' || s.state === 'chase') {
      const d = distXZ(s.pos, p.pos);
      if (s.state === 'wander' && present && d <= RULES.shade_detect + EPS) s.state = 'chase';
      else if (s.state === 'chase' && (!present || d > RULES.shade_lose + EPS)) s.state = 'wander';

      if (s.state === 'chase') {
        const stepLen = speed * TICK_DT;
        if (d <= stepLen) shadeTry(g, s, p.pos[0], p.pos[2]);
        else shadeTry(g, s, s.pos[0] + ((p.pos[0] - s.pos[0]) / d) * stepLen, s.pos[2] + ((p.pos[2] - s.pos[2]) / d) * stepLen);
      } else {
        if (s.wanderTicks <= 0) {
          const a = g.rng() * 2 * Math.PI;
          s.wanderDir = [Math.cos(a), Math.sin(a)];
          s.wanderTicks = RULES.wander_turn_ticks;
        }
        s.wanderTicks--;
        const stepLen = RULES.shade_wander_speed * TICK_DT;
        if (!shadeTry(g, s, s.pos[0] + s.wanderDir[0] * stepLen, s.pos[2] + s.wanderDir[1] * stepLen)) {
          s.wanderDir = [-s.wanderDir[0], -s.wanderDir[1]]; // quay đầu ở mép đảo
        }
      }
      keepOutOfLitLanterns(g, s);
    }
    const ground = g.map.groundAt(s.pos[0], s.pos[2]);
    if (ground != null) s.pos[1] = ground + s.hover;
  }
}

/**
 * Chạy một bước. input: { move:[x,z], cam_yaw_deg, jump, interact, pulse, dash, pause } (giá trị hiện tại).
 * Trả về danh sách event của bước này.
 */
export function step(g, input = {}) {
  if (g.state === 'won' || g.state === 'lost') return [];
  const t = g.t;
  const p = g.player;
  g.tick++;
  const tick = g.tick;
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
  if (!g.started) { g.started = true; emit('night_start', { night: g.night }); } // A2-25

  // 1. Input: kích hoạt khi false -> true; pause xử lý trước (A2-26).
  const P = {};
  for (const b of BUTTONS) { P[b] = !!input[b] && !g.prev[b]; g.prev[b] = !!input[b]; }
  if (P.pause) {
    g.paused = !g.paused;
    if (g.paused) { g.state = 'paused'; emit('paused', {}); return events; }
    g.state = 'playing';
    emit('resumed', {});
  } else if (g.paused) return events;

  // 2. Bộ đếm
  g.simTick++;
  if (p.invulnTicks > 0) p.invulnTicks--;
  if (p.pulseCdTicks > 0) p.pulseCdTicks--;
  if (p.dashCdTicks > 0) p.dashCdTicks--;
  if (p.charmTicks > 0) p.charmTicks--;
  for (const s of g.shades) {
    if (s.stunTicks > 0 && --s.stunTicks === 0 && s.state === 'stunned') { s.state = 'wander'; s.knockTicks = 0; }
    if (s.spawnTicks > 0 && --s.spawnTicks === 0 && s.state === 'spawning') s.state = 'wander';
  }
  g.motes = g.motes.filter((m) => m.ttl == null || --m.ttl > 0);
  let respawned = false;
  if (p.waitTicks > 0 && --p.waitTicks === 0) {
    p.pos = g.map.start.slice();
    p.vel = [0, 0, 0];
    p.grounded = true;
    p.facing = g.map.startFacing.slice();
    p.invulnTicks = sec2ticks(t.invuln_s);
    respawned = true;
  }
  const active = p.waitTicks === 0; // không đang chờ hồi sinh

  // 3. Di chuyển Mây rồi kiểm tra rơi khỏi đảo
  if (active && !respawned) movePlayer(g, input, P, emit);
  if (t.fall_enabled && active && p.pos[1] < RULES.fall_y) {
    p.flames = Math.max(0, p.flames - 1);
    const lost = p.carried;
    p.carried = 0;
    p.waitTicks = RULES.respawn_wait_ticks;
    p.vel = [0, 0, 0];
    p.dashTicks = 0;
    p.launch = null;
    emit('player_hit', { by: 'fall', flames: p.flames, dropped: 0, lost });
  }
  const present = p.waitTicks === 0;

  // 4. Nhặt đom đóm (theo thứ tự id, không vượt sức chứa)
  if (present) {
    for (let i = 0; i < g.motes.length && p.carried < t.carry_capacity; ) {
      const m = g.motes[i];
      if (within(p.pos, m.pos, t.pickup_radius) && Math.abs(p.pos[1] - m.pos[1]) <= RULES.pickup_height + EPS) {
        g.motes.splice(i, 1);
        p.carried++;
        emit('mote_picked', { carried: p.carried });
      } else i++;
    }
  }

  // 5. Nạp đèn: đèn chưa sáng gần nhất trong interact_radius, bằng nhau thì id nhỏ hơn
  if (present && P.interact && p.carried > 0) {
    let best = null;
    let bd = Infinity;
    for (const L of [...g.lanterns].sort(idCmp)) {
      if (L.lit) continue;
      const d = distXZ(p.pos, L.pos);
      if (d <= t.interact_radius + EPS && d < bd - EPS) { bd = d; best = L; }
    }
    if (best) {
      const amount = Math.max(0, Math.min(p.carried, t.lantern_cost - best.deposited));
      if (amount > 0) {
        p.carried -= amount;
        best.deposited += amount;
        g.score += amount * t.score.per_mote;
        emit('deposit', { lantern_id: best.id, amount, deposited: best.deposited });
      }
      if (best.deposited >= t.lantern_cost) {
        best.lit = true;
        g.score += t.score.per_lantern;
        emit('lantern_lit', { lantern_id: best.id });
      }
    }
  }

  // 6. Vùng an toàn: Bóng Mực đang ở trong vùng đèn đã sáng bị đẩy ra trong 30 tick
  for (const s of g.shades) {
    if (s.pushTicks > 0) continue;
    for (const L of g.lanterns) {
      if (!L.lit) continue;
      const d = distXZ(s.pos, L.pos);
      if (d < t.safe_radius) {
        s.pushTicks = RULES.safe_push_ticks;
        s.pushDir = dirXZ(L.pos, s.pos);
        s.pushStep = (t.safe_radius - d) / RULES.safe_push_ticks;
        s.pushLantern = L;
        s.knockTicks = 0; // đẩy ra khỏi vùng thay cho đẩy lùi còn dở
        break;
      }
    }
  }

  // 7. Tỏa Sáng: tâm = chân Mây + 0.8 m, mục tiêu chốt ngay tick này (3D ≤ pulse_radius)
  if (present && P.pulse && p.pulseCdTicks === 0 && p.carried >= t.pulse_cost) {
    p.carried -= t.pulse_cost;
    p.pulseCdTicks = sec2ticks(t.pulse_cooldown_s);
    const c = [p.pos[0], p.pos[1] + RULES.pulse_center_h, p.pos[2]];
    const ids = [];
    for (const s of g.shades) {
      if (dist3(c, s.pos) > t.pulse_radius + EPS) continue;
      s.state = 'stunned';
      s.stunTicks = sec2ticks(t.pulse_stun_s);
      s.knockTicks = RULES.pulse_knock_ticks;
      s.knockDir = dirXZ(c, s.pos);
      s.recoilTicks = 0;
      s.spawnTicks = 0;
      g.score += t.score.per_stun;
      ids.push(s.id);
    }
    emit('pulse', { stunned_ids: ids });
  }

  // 8. Di chuyển Bóng Mực (Gió Lạc: bước 5)
  moveShades(g);

  // 9. Chạm: tối đa 1 lần mất Ngọn Lửa mỗi tick, xét theo id tăng dần
  if (present && p.invulnTicks === 0) {
    const hitter = [...g.shades].sort(idCmp).find((s) =>
      (s.state === 'chase' || s.state === 'wander') && s.pushTicks === 0 &&
      within(s.pos, p.pos, t.shade_hit_radius) && Math.abs(s.pos[1] - p.pos[1]) <= RULES.shade_hit_height + EPS);
    if (hitter) {
      p.flames = Math.max(0, p.flames - 1);
      const dropped = Math.floor(p.carried * t.hit_drop_ratio);
      p.carried -= dropped;
      dropMotes(g, dropped, p.pos);
      p.invulnTicks = sec2ticks(t.invuln_s);
      hitter.state = 'recoil';
      hitter.recoilTicks = RULES.shade_recoil_ticks;
      hitter.recoilDir = dirXZ(p.pos, hitter.pos);
      emit('player_hit', { by: 'shade', flames: p.flames, dropped });
    }
  }

  // 10. Sinh theo lịch (thực thể mới chỉ tương tác từ tick sau)
  const st = g.simTick;
  if (g.randomMotes && st % RULES.mote_spawn_ticks === 0 && g.motes.length < RULES.mote_cap) spawnRandomMote(g);
  if (g.randomShades) {
    const first = RULES.shade_first_spawn_tick;
    const iv = g.map.shade.interval_ticks;
    const n = st === first ? RULES.shade_first_count : st > first && (st - first) % iv === 0 ? 1 : 0;
    for (let i = 0; i < n && g.shades.length < g.map.shade.max; i++) {
      const s = spawnShade(g);
      if (s) emit('shade_spawned', { id: s.id });
    }
  }

  // 11. Thắng/thua: hết Ngọn Lửa luôn thua; còn sống + đủ đèn thì thắng; hết giờ thì thua
  if (p.flames <= 0) return finish('lost', 'no_flames');
  if (g.lanterns.every((L) => L.lit)) return finish('won', 'all_lit');
  if (timeLeft(g) <= 1e-9) return finish('lost', 'dawn');
  return events;
}

export function snapshot(g) {
  const p = g.player;
  const sec = (ticks) => r3(ticks / TICKS_PER_SECOND);
  return {
    type: 'snapshot',
    tick: g.tick,
    sim_tick: g.simTick,
    night: g.night,
    state: g.state,
    time_left_s: r3(Math.max(0, timeLeft(g))),
    score: g.score,
    wind: { active: g.wind.active, dir_deg: g.wind.dir_deg },
    player: {
      pos: p.pos.map(r3), vel: p.vel.map(r3), grounded: p.grounded,
      flames: p.flames, carried: p.carried, invuln: p.invulnTicks > 0,
      dash_cd_s: sec(p.dashCdTicks), pulse_cd_s: sec(p.pulseCdTicks), charm_s: sec(p.charmTicks),
    },
    lanterns: g.lanterns.map((L) => ({ id: L.id, pos: L.pos.map(r3), lit: L.lit, deposited: L.deposited })),
    shades: g.shades.map((s) => ({ id: s.id, pos: s.pos.map(r3), state: s.state })),
    motes_active: g.motes.length,
    motes: g.motes.map((m) => ({ id: m.id, pos: m.pos.map(r3), kind: m.kind, ttl_s: m.ttl == null ? null : sec(m.ttl) })),
    drifters: g.drifters.map((d) => ({ id: d.id, pos: d.pos.map(r3), state: d.state, stolen: d.stolen })),
    charms: g.charms.map((c) => ({ id: c.id, available: c.available, respawn_s: sec(c.respawnTicks) })),
  };
}
