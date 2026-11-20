// Phase 4 — TICKET-04 "Bình minh: phát hành v1.0.0" (contract v1.3). AC: docs/phases/phase-4.md (P4-xx).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createBenchGame, createGame, step, snapshot, BENCH, fuelOut, distXZ } from '../src/core/world.js';
import { TUNING } from '../src/core/tuning.js';
import { frameStats, benchCamera, percentile } from '../src/shared/bench-stats.js';
import { createSoakInput, SOAK_INPUT } from '../src/headless/soak.js';
import { nameError, insertEntry, sortEntries, entryError, isoWithOffset, LEADERBOARD_MAX } from '../src/shared/leaderboard.js';
import { ACTIONS, DEFAULT_KEYS, rebind, findConflicts, sanitizeKeys, keyLabel } from '../src/web/keybinds.js';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ddl-p4-'));
const node = (args, env = {}) => spawnSync(process.execPath, args, { encoding: 'utf8', env: { ...process.env, ...env } });

// ---------- A. Contract v1.3 ----------
test('P4-01 contract v1.3: bench_cmd, soak_cmd khai báo và trỏ tới file có thật; run_cmd có --export-leaderboard', () => {
  const c = JSON.parse(fs.readFileSync('game.contract.json', 'utf8'));
  assert.equal(c.contract_version, '1.3');
  for (const k of ['bench_cmd', 'soak_cmd', 'run_cmd', 'headless_cmd']) {
    assert.equal(typeof c[k], 'string', k);
    const file = c[k].split(' ').find((w) => /\.(m?js)$/.test(w));
    assert.ok(file && fs.existsSync(file), `${k}: ${c[k]}`);
  }
});

// ---------- B. Cảnh benchmark (core) ----------
test('P4-10 cảnh bench: Đêm 1, đúng 200 Bóng Mực wander + 100 đom đóm rải trên đảo, L1–L3 sáng fuel 100, Mây ở (0,0,0)', () => {
  const g = createBenchGame(42);
  assert.equal(g.night, 1);
  assert.equal(g.shades.length, BENCH.shades);
  assert.equal(g.motes.length, BENCH.motes);
  assert.ok(g.shades.every((s) => s.state === 'wander'));
  assert.deepEqual(g.player.pos, [0, 0, 0]);
  assert.deepEqual(g.lanterns.map((L) => [L.id, L.lit, L.lit ? fuelOut(L.fuelU) : 0]),
    [['L1', true, 100], ['L2', true, 100], ['L3', true, 100], ['L4', false, 0], ['L5', false, 0]]);
  const R = g.map.radius;
  for (const e of [...g.shades, ...g.motes]) assert.ok(Math.hypot(e.pos[0], e.pos[2]) <= R + 1e-9);
  // "rải đều": mỗi góc phần tư của đảo có Bóng Mực, không con nào trong vùng an toàn của đèn sáng
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    assert.ok(g.shades.filter((s) => Math.sign(s.pos[0]) === sx && Math.sign(s.pos[2]) === sz).length >= 25);
  }
  for (const s of g.shades) for (const L of g.lanterns.filter((x) => x.lit)) assert.ok(distXZ(s.pos, L.pos) >= TUNING.safe_radius);
  // tất định theo seed, khác seed thì khác
  assert.deepEqual(snapshot(createBenchGame(42)), snapshot(g));
  assert.notDeepEqual(snapshot(createBenchGame(43)).shades, snapshot(g).shades);
});

test('P4-11 cảnh bench tắt sinh thêm, sát thương, nhặt, hao dầu, kết thúc Đêm; Bóng Mực vẫn di chuyển', () => {
  const g = createBenchGame(42);
  const before = g.shades.map((s) => s.pos.slice());
  const events = [];
  for (let k = 0; k < 600; k++) events.push(...step(g, {}));
  assert.deepEqual(events.map((e) => e.name), ['night_start']); // không spawn, hit, nhặt, hao dầu, tắt đèn
  assert.equal(g.shades.length, 200);
  assert.equal(g.motes.length, 100);
  assert.equal(g.player.flames, TUNING.flames);
  assert.ok(g.lanterns.slice(0, 3).every((L) => L.lit && fuelOut(L.fuelU) === 100));
  assert.ok(g.shades.every((s) => ['wander', 'chase'].includes(s.state)));
  const moved = g.shades.filter((s, i) => Math.hypot(s.pos[0] - before[i][0], s.pos[2] - before[i][2]) > 1).length;
  assert.ok(moved >= 190, `chỉ ${moved} con di chuyển`);
  // quá thời lượng Đêm vẫn chạy
  g.simTick = Math.round(g.duration * 60) + 5;
  for (let k = 0; k < 10; k++) step(g, {});
  assert.equal(g.state, 'playing');
});

test('P4-12 game thường không bị cờ bench ảnh hưởng (headless giữ nguyên)', () => {
  const g = createGame({ seed: 42, night: 1 });
  assert.equal(g.bench, undefined);
  const r = node(['src/headless/cli.js', '--seed', '3', '--night', '1', '--ticks', '400', '--out', path.join(tmp, 'h.jsonl')]);
  assert.equal(r.status, 0);
  const lines = fs.readFileSync(path.join(tmp, 'h.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  assert.ok(lines.some((l) => l.name === 'shade_spawned')); // sinh theo lịch vẫn chạy
});

test('P4-13 số đo khung hình đúng định nghĩa ticket (avg, 1% low với k = max(1, ceil(0.01N)), p95)', () => {
  const dts = [...Array(99).fill(10), 50];
  const s = frameStats(dts);
  assert.equal(s.frames, 100);
  assert.equal(s.avg_fps, Math.round((1000 * 100 / 1040) * 10) / 10);
  assert.equal(s.p1_low_fps, 20); // k = 1: 1000 / 50
  assert.equal(frameStats(Array.from({ length: 250 }, (_, i) => (i < 3 ? 40 : 10))).p1_low_fps, 25); // k = 3: trung bình 40
  assert.equal(frameStats([5, 7, 30]).p1_low_fps, Math.round(10000 / 30) / 10); // N nhỏ: k = 1
  assert.equal(percentile([1, 2, 3, 4, 5], 95), 4.8);
  assert.equal(frameStats(Array.from({ length: 101 }, (_, i) => i)).frame_ms_p95, 95);
});

test('P4-14 camera bench: (30,15,0) lúc 0 s, ngược chiều kim đồng hồ nhìn từ trên (+X → −Z), 15 s một vòng', () => {
  const close = (a, b) => a.every((v, i) => Math.abs(v - b[i]) < 1e-9);
  assert.ok(close(benchCamera(0), [30, 15, 0]));
  assert.ok(close(benchCamera(3.75), [0, 15, -30]));
  assert.ok(close(benchCamera(7.5), [-30, 15, 0]));
  assert.ok(close(benchCamera(15), [30, 15, 0]));
  for (const t of [1, 4.2, 9.9]) { const [x, y, z] = benchCamera(t); assert.ok(Math.abs(Math.hypot(x, z) - 30) < 1e-9 && y === 15); }
});

// ---------- C. Soak ----------
test('P4-20 soak_cmd: 10 Đêm, 0 crash, kết quả tất định, RSS cuối ≤ 1.2 × đầu, đúng khóa output', () => {
  const c = JSON.parse(fs.readFileSync('game.contract.json', 'utf8'));
  const [exe, ...pre] = c.soak_cmd.split(' ');
  assert.equal(exe, 'node');
  const run = (f) => { const r = node([...pre, '--seed', '7', '--nights', '10', '--out', f]); assert.equal(r.status, 0, r.stderr); return JSON.parse(fs.readFileSync(f, 'utf8')); };
  const a = run(path.join(tmp, 's1.json'));
  const b = run(path.join(tmp, 's2.json'));
  assert.deepEqual(Object.keys(a), ['nights', 'crashes', 'results', 'mem_start_mb', 'mem_end_mb', 'duration_s']);
  assert.equal(a.nights, 10);
  assert.equal(a.crashes, 0);
  assert.equal(a.results.length, 10);
  assert.ok(a.results.every((x) => x === 'won' || x === 'lost'));
  assert.deepEqual(a.results, b.results);
  assert.ok(a.mem_end_mb <= 1.2 * a.mem_start_mb, `${a.mem_end_mb} > 1.2 × ${a.mem_start_mb}`);
  assert.ok(a.duration_s > 0);
  assert.equal(node([...pre, '--seed', '7', '--out', path.join(tmp, 's3.json')]).status, 1); // thiếu --nights
});

test('P4-21 input soak: đổi hướng đúng mỗi 30 tick; tỉ lệ nhảy/lướt/tỏa sáng/tương tác ≈ 5/3/2/10%', () => {
  const input = createSoakInput(8);
  const N = 60000;
  const cnt = { jump: 0, dash: 0, pulse: 0, interact: 0 };
  let prev = null;
  for (let k = 0; k < N; k++) {
    const i = input(k);
    if (prev) assert.equal(i.move === prev, k % 30 !== 0);
    prev = i.move;
    assert.ok(Math.abs(Math.hypot(...i.move) - 1) < 1e-9);
    for (const b of Object.keys(cnt)) if (i[b]) cnt[b]++;
  }
  const want = { jump: SOAK_INPUT.p_jump, dash: SOAK_INPUT.p_dash, pulse: SOAK_INPUT.p_pulse, interact: SOAK_INPUT.p_interact };
  assert.deepEqual(want, { jump: 0.05, dash: 0.03, pulse: 0.02, interact: 0.1 });
  for (const b of Object.keys(cnt)) assert.ok(Math.abs(cnt[b] / N - want[b]) < 0.006, `${b}: ${cnt[b] / N}`);
});

// ---------- D. Bảng xếp hạng ----------
const E = (name, score, at, extra = {}) => ({ name, score, nights_won: 1, achieved_at: at, seed: 7, ...extra });

test('P4-30 tên 3–12 ký tự [A-Za-z0-9_] (+ chữ tiếng Việt có dấu); mục cần ISO 8601 có múi giờ, nights_won 0–3', () => {
  for (const ok of ['abc', 'A_1', 'Player_12345', 'Mây', 'Nguyễn_Văn', 'Đăng']) assert.equal(nameError(ok), null, ok);
  for (const bad of ['ab', 'a b', 'x-y', 'abcdefghijklm', '', '名前名前', 'tên!', 12345]) assert.ok(nameError(bad), String(bad));
  assert.equal(nameError('Mây'), null); // "Mây" gõ dạng tổ hợp vẫn là 3 ký tự
  assert.equal(entryError(E('abc', 10, '2026-11-21T10:00:00+07:00')), null);
  assert.equal(entryError(E('abc', 10, '2026-11-21T03:00:00Z')), null);
  assert.ok(entryError(E('abc', 10, '2026-11-21T10:00:00'))); // thiếu múi giờ
  assert.ok(entryError(E('abc', 10, '2026-11-21T10:00:00+07:00', { nights_won: 4 })));
  assert.ok(entryError(E('abc', -1, '2026-11-21T10:00:00+07:00')));
  assert.match(isoWithOffset(new Date()), /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/);
});

test('P4-31 sắp xếp: điểm giảm dần, bằng điểm thì ai đạt trước đứng trên; giữ top 10', () => {
  let board = [];
  // cùng 300 điểm: B (09:00+07:00 = 02:00Z) đạt trước A (03:00Z) dù được thêm sau
  board = insertEntry(board, E('AAA', 300, '2026-11-21T03:00:00Z')).entries;
  const r = insertEntry(board, E('BBB', 300, '2026-11-21T09:00:00+07:00'));
  assert.deepEqual(r.entries.map((e) => e.name), ['BBB', 'AAA']);
  assert.equal(r.rank, 0);
  board = r.entries;
  for (let i = 0; i < 12; i++) board = insertEntry(board, E(`P_${i}`, 100 + i * 50, `2026-11-21T1${i % 10}:00:00+07:00`)).entries;
  assert.equal(board.length, LEADERBOARD_MAX);
  assert.deepEqual(board.map((e) => e.score), [650, 600, 550, 500, 450, 400, 350, 300, 300, 300]);
  // ba mục 300 điểm: BBB 02:00Z, AAA 03:00Z, P_4 14:00+07:00 = 07:00Z
  assert.deepEqual(board.slice(7).map((e) => e.name), ['BBB', 'AAA', 'P_4']);
  const low = insertEntry(board, E('LOW', 5, '2026-11-21T10:00:00+07:00'));
  assert.equal(low.rank, -1);
  assert.deepEqual(low.entries, board);
  assert.deepEqual(sortEntries([...board].reverse()), board);
});

test('P4-32 lưu ra đĩa qua server, còn sau khi khởi động lại; run_cmd --export-leaderboard xuất {"entries"} đúng thứ tự', async () => {
  const file = path.join(tmp, 'lb', 'leaderboard.json');
  const { createServer } = await import('../server.mjs');
  const post = async (port, body) => fetch(`http://127.0.0.1:${port}/api/leaderboard`, { method: 'POST', body: JSON.stringify(body) });
  const s1 = createServer({ file, dist: tmp });
  await new Promise((r) => s1.listen(0, '127.0.0.1', r));
  const p1 = s1.address().port;
  assert.equal((await post(p1, E('Mây', 120, '2026-11-21T10:00:00+07:00', { nights_won: 0 }))).status, 200);
  assert.equal((await post(p1, E('Top_1', 900, '2026-11-21T11:00:00+07:00', { nights_won: 3 }))).status, 200);
  const bad = await post(p1, E('x', 1, '2026-11-21T11:00:00+07:00'));
  assert.equal(bad.status, 400);
  await new Promise((r) => s1.close(r));
  // "tắt và mở lại game": server mới đọc lại file
  const s2 = createServer({ file, dist: tmp });
  await new Promise((r) => s2.listen(0, '127.0.0.1', r));
  const got = await (await fetch(`http://127.0.0.1:${s2.address().port}/api/leaderboard`)).json();
  await new Promise((r) => s2.close(r));
  assert.deepEqual(got.entries.map((e) => [e.name, e.score, e.nights_won]), [['Top_1', 900, 3], ['Mây', 120, 0]]);
  // xuất bằng run_cmd
  const c = JSON.parse(fs.readFileSync('game.contract.json', 'utf8'));
  const [exe, ...pre] = c.run_cmd.split(' ');
  assert.equal(exe, 'node');
  const out = path.join(tmp, 'export.json');
  const r = node([...pre, '--export-leaderboard', out], { DDL_LEADERBOARD: file });
  assert.equal(r.status, 0, r.stderr);
  const doc = JSON.parse(fs.readFileSync(out, 'utf8'));
  assert.deepEqual(Object.keys(doc), ['entries']);
  assert.deepEqual(doc.entries, got.entries);
  assert.deepEqual(Object.keys(doc.entries[0]), ['name', 'score', 'nights_won', 'achieved_at', 'seed']);
  // chưa có file → entries rỗng
  const r2 = node([...pre, '--export-leaderboard', out], { DDL_LEADERBOARD: path.join(tmp, 'none.json') });
  assert.equal(r2.status, 0);
  assert.deepEqual(JSON.parse(fs.readFileSync(out, 'utf8')), { entries: [] });
});

// ---------- E. Dễ tiếp cận ----------
test('P4-40 đổi phím: đủ 9 hành động bắt buộc, phát hiện trùng phím, Esc không gán được, khôi phục mặc định, được lưu', async () => {
  const actions = ACTIONS.map(([a]) => a);
  for (const a of ['up', 'down', 'left', 'right', 'jump', 'dash', 'interact', 'pulse', 'pause']) assert.ok(actions.includes(a), a);
  assert.deepEqual(findConflicts(DEFAULT_KEYS), []);
  const r = rebind(DEFAULT_KEYS, 'jump', 'KeyE');
  assert.equal(r.error, null);
  assert.deepEqual(r.conflicts, [{ code: 'KeyE', actions: ['jump', 'interact'] }]);
  assert.equal(rebind(DEFAULT_KEYS, 'dash', 'ShiftRight').keys.dash, 'ShiftLeft'); // Shift trái/phải là một
  assert.ok(rebind(DEFAULT_KEYS, 'pause', 'Escape').error);
  assert.equal(keyLabel('KeyQ'), 'Q');
  assert.deepEqual(sanitizeKeys({ jump: 'KeyJ', pulse: 7, pause: 'Escape' }), { ...DEFAULT_KEYS, jump: 'KeyJ' });
  // lưu giữa các lần mở (localStorage giả lập), cùng giảm chuyển động + chữ lớn
  const store = new Map();
  globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) };
  const { loadSettings, saveSettings } = await import('../src/web/settings.js');
  const s = loadSettings();
  assert.deepEqual(s.keys, DEFAULT_KEYS);
  saveSettings({ ...s, keys: r.keys, reducedMotion: true, largeText: true });
  const s2 = loadSettings();
  assert.equal(s2.keys.jump, 'KeyE');
  assert.equal(s2.reducedMotion, true);
  assert.equal(s2.largeText, true);
  delete globalThis.localStorage;
});

test('P4-41 cỡ chữ UI: mọi font-size ≥ 18px (× --fs), "Chữ lớn" = ×1.25', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  const css = html.slice(html.indexOf('<style>'), html.indexOf('</style>'));
  const sizes = [...css.matchAll(/font-size:\s*([^;}]+)/g)].map((m) => m[1].trim());
  assert.ok(sizes.length >= 20);
  for (const v of sizes) {
    const m = /^calc\((\d+(?:\.\d+)?)px \* var\(--fs\)\)$/.exec(v);
    assert.ok(m, `font-size không theo --fs: ${v}`);
    assert.ok(Number(m[1]) >= 18, `font-size < 18px: ${v}`);
  }
  assert.ok(!/font:\s*[^;]*\d+px/.test(css), 'không dùng font shorthand có px');
  assert.match(css, /body\.large\s*\{\s*--fs:\s*1\.25;/);
  assert.match(css, /:root\s*\{[^}]*--fs:\s*1;/);
  assert.ok(!/style="[^"]*font-size/.test(html), 'không có font-size inline');
});

test('P4-42 phụ đề/chỉ báo + giảm chuyển động có trong lớp web (kiểm tĩnh; ảnh trong evidence/phase-4)', () => {
  const main = fs.readFileSync('src/web/main.js', 'utf8');
  for (const s of ["e.name === 'shade_spawned'", 'Gió sắp thổi', '10 giây cuối', 'sắp cạn dầu', 'hud-shade-arrow']) assert.ok(main.includes(s), s);
  assert.match(main, /if \(!settings\.reducedMotion\) \{ shakeT = [\d.]+; flashT = [\d.]+; \}/);
  assert.ok(fs.readFileSync('index.html', 'utf8').includes('body.rm #hud-timer.danger { animation: none; }'));
});
