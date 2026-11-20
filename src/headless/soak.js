#!/usr/bin/env node
// soak_cmd (contract v1.3, TICKET-04 mục 2): nhiều Đêm liên tiếp trong cùng một tiến trình, input ngẫu nhiên theo seed.
//   node --expose-gc src/headless/soak.js --seed 7 --nights 10 --out soak.json
// Đêm thứ i (i = 0, 1, …; A4-2) = Đêm (i mod 3) + 1 với seed = seed + i; chạy tới game_over hoặc hết thời lượng chuẩn.
// Input: mỗi 30 tick chọn lại hướng; mỗi tick 5% nhảy, 3% lướt, 2% tỏa sáng, 10% tương tác (luồng rng riêng, A4-3).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createGame, step, snapshot, TICKS_PER_SECOND } from '../core/world.js';
import { createRng } from '../core/rng.js';

export const SOAK_INPUT = { turn_ticks: 30, p_jump: 0.05, p_dash: 0.03, p_pulse: 0.02, p_interact: 0.1 };
const MB = 1024 * 1024;
const rssMb = () => Math.round((process.memoryUsage().rss / MB) * 10) / 10;
const gc = () => { if (global.gc) { global.gc(); global.gc(); } };

/** Bộ sinh input ngẫu nhiên tất định cho một Đêm (không dùng chung rng với game). */
export function createSoakInput(seed) {
  const rng = createRng((seed ^ 0x5eed1234) >>> 0);
  let move = [0, 0];
  return (k) => {
    if (k % SOAK_INPUT.turn_ticks === 0) { const a = rng() * 2 * Math.PI; move = [Math.cos(a), Math.sin(a)]; }
    return {
      move, cam_yaw_deg: 0,
      jump: rng() < SOAK_INPUT.p_jump, dash: rng() < SOAK_INPUT.p_dash, pulse: rng() < SOAK_INPUT.p_pulse,
      interact: rng() < SOAK_INPUT.p_interact, pause: false,
    };
  };
}

/** Chạy một Đêm như headless thật (kể cả tạo snapshot/JSON mỗi 10 tick rồi bỏ). Trả về 'won' | 'lost'. */
export function runNight({ seed, night, onLoaded }) {
  let g = createGame({ seed, night });
  onLoaded?.();
  const input = createSoakInput(seed);
  const maxTicks = Math.round(g.duration * TICKS_PER_SECOND);
  let bytes = 0;
  for (let k = 0; k < maxTicks && (g.state === 'playing' || g.state === 'paused'); k++) {
    for (const ev of step(g, input(k))) bytes += JSON.stringify(ev).length;
    if (g.tick % 10 === 0) bytes += JSON.stringify(snapshot(g)).length;
  }
  const result = g.state === 'won' ? 'won' : 'lost'; // hết thời lượng chuẩn luôn có game_over ở bình minh
  g = null; // reset: bỏ mọi tham chiếu tới Đêm vừa chạy
  return { result, bytes };
}

export function soak({ seed, nights }) {
  const t0 = performance.now();
  const results = [];
  let crashes = 0;
  let memStart = null;
  for (let i = 0; i < nights; i++) {
    const night = (i % 3) + 1;
    try {
      const r = runNight({ seed: seed + i, night, onLoaded: i === 0 ? () => { gc(); memStart = rssMb(); } : null });
      results.push(r.result);
    } catch (e) {
      crashes++;
      results.push('crash');
      process.stderr.write(`Đêm thứ ${i} (Đêm ${night}, seed ${seed + i}) lỗi: ${e.stack || e}\n`);
    }
  }
  gc();
  const memEnd = rssMb();
  return { nights, crashes, results, mem_start_mb: memStart ?? memEnd, mem_end_mb: memEnd, duration_s: Math.round((performance.now() - t0) / 100) / 10 };
}

function parseArgs(argv) {
  const o = {};
  const map = { '--seed': 'seed', '--nights': 'nights', '--out': 'out' };
  for (let i = 0; i < argv.length; i++) {
    const k = map[argv[i]];
    if (!k || i + 1 >= argv.length) throw new Error(`tham số không hợp lệ: ${argv[i]}`);
    o[k] = argv[++i];
  }
  for (const req of ['seed', 'nights', 'out']) if (o[req] == null) throw new Error(`thiếu --${req}`);
  if (!/^-?\d+$/.test(o.seed)) throw new Error('--seed phải là số nguyên');
  if (!/^\d+$/.test(o.nights) || Number(o.nights) < 1) throw new Error('--nights phải là số nguyên ≥ 1');
  return { seed: Number(o.seed), nights: Number(o.nights), out: o.out };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const o = parseArgs(process.argv.slice(2));
    if (!global.gc) process.stderr.write('ghi chú: chạy với `node --expose-gc` để đo RSS sau khi dọn rác\n');
    const res = soak(o);
    fs.writeFileSync(o.out, JSON.stringify(res) + '\n');
    console.log(JSON.stringify(res));
    process.exitCode = res.crashes === 0 ? 0 : 1;
  } catch (e) {
    process.stderr.write(`lỗi: ${e.message}\n`);
    process.exitCode = 1;
  }
}
