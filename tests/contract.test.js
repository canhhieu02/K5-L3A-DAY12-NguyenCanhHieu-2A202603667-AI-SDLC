// Test theo tiêu chí nghiệm thu Phase 1 (docs/phases/phase-1.md). Mã AC-xx khớp bảng tiêu chí.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { runHeadless, empty, snapAt, ev } from './helpers.js';
import { TUNING } from '../src/core/tuning.js';

const T = TUNING;
const hyp = (p, q) => Math.hypot(p[0] - q[0], p[2] - q[2]);

test('AC-01 game.contract.json khớp tuning game đang dùng', () => {
  const c = JSON.parse(fs.readFileSync('game.contract.json', 'utf8'));
  assert.equal(c.contract_version, '1.0');
  assert.deepEqual(c.tuning, T);
  for (const k of ['team', 'build_cmd', 'run_cmd', 'headless_cmd']) assert.ok(c[k]);
});

test('AC-02 output: snapshot tick 0 + mỗi N tick, dòng cuối là end', () => {
  const r = runHeadless({ ticks: 25, every: 10, scenario: empty() });
  assert.equal(r.code, 0);
  assert.deepEqual(r.snaps.map((s) => s.tick), [0, 10, 20]);
  assert.equal(r.lines[0].type, 'snapshot');
  assert.deepEqual(r.end, { type: 'end', ticks: 25, state: 'playing', score: 0 });
  const s0 = r.snaps[0];
  assert.equal(s0.time_left_s, T.night1_duration_s);
  assert.deepEqual(s0.player, { pos: [0, 0, 0], flames: T.flames, carried: 0 });
  assert.equal(s0.lanterns.length, 5);
  assert.equal(s0.sim_tick, 0);
});

test('AC-03 mặc định --snapshot-every = 10 và time_left_s = duration - steps/60', () => {
  const r = runHeadless({ ticks: 120, scenario: empty(), every: 10 });
  assert.equal(snapAt(r, 120).time_left_s, 298);
});

test('AC-04 di chuyển: move [0,1] trong 60 tick = player_speed mét theo +Z', () => {
  const r = runHeadless({ ticks: 60, scenario: empty(), inputs: { frames: [{ tick: 0, move: [0, 1] }] } });
  assert.deepEqual(snapAt(r, 60).player.pos, [0, 0, T.player_speed]);
});

test('AC-05 cam_yaw_deg 90: move [0,1] đi theo +X', () => {
  const r = runHeadless({ ticks: 60, scenario: empty(), inputs: { frames: [{ tick: 0, move: [0, 1], cam_yaw_deg: 90 }] } });
  assert.deepEqual(snapAt(r, 60).player.pos, [T.player_speed, 0, 0]);
});

test('AC-06 move dài hơn 1 được chuẩn hóa', () => {
  const r = runHeadless({ ticks: 60, scenario: empty(), inputs: { frames: [{ tick: 0, move: [1, 1] }] } });
  const p = snapAt(r, 60).player.pos;
  assert.ok(Math.abs(Math.hypot(p[0], p[2]) - T.player_speed) < 0.002);
});

test('AC-07 frame chỉ đổi trường có mặt; move giữ nguyên khi frame sau không có move', () => {
  const r = runHeadless({ ticks: 60, scenario: empty(), inputs: { frames: [{ tick: 0, move: [0, 1] }, { tick: 30, jump: true }] } });
  assert.equal(snapAt(r, 60).player.pos[2], T.player_speed);
});

test('AC-08 nhặt đom đóm khi khoảng cách XZ <= pickup_radius, đúng tick', () => {
  const r = runHeadless({ ticks: 80, scenario: empty({ motes: [[0, 0, 5]] }), inputs: { frames: [{ tick: 0, move: [0, 1] }] } });
  const picks = ev(r, 'mote_picked');
  assert.equal(picks.length, 1);
  assert.deepEqual(picks[0].data, { carried: 1 });
  const t = picks[0].tick;
  // 6 m/s = 0.1 m/tick: tới z = 4 (cách mote 1 m) cần đúng 40 tick
  assert.equal(t, Math.round(((5 - T.pickup_radius) / T.player_speed) * 60));
  assert.ok(hyp(snapAt(r, t).player.pos, [0, 0, 5]) <= T.pickup_radius);
  assert.ok(hyp(snapAt(r, t - 1).player.pos, [0, 0, 5]) > T.pickup_radius);
  assert.equal(snapAt(r, t).motes_active, 0);
  assert.equal(snapAt(r, t).score, T.score.per_mote);
});

test('AC-09 không nhặt quá carry_capacity', () => {
  const motes = Array.from({ length: 7 }, () => [0, 0, 0]);
  const r = runHeadless({ ticks: 1, scenario: empty({ motes }) });
  assert.equal(snapAt(r, 1).player.carried, T.carry_capacity);
  assert.equal(snapAt(r, 1).motes_active, 7 - T.carry_capacity);
});

test('AC-10 nạp đủ lantern_cost thì thắp đèn, cộng per_lantern', () => {
  const r = runHeadless({
    ticks: 2,
    scenario: empty({ player: { carried: T.lantern_cost }, lanterns: [{ id: 'L1', pos: [0, 0, 2] }] }),
    inputs: { frames: [{ tick: 0, interact: true }] },
  });
  assert.deepEqual(ev(r, 'deposit')[0], { type: 'event', tick: 1, name: 'deposit', data: { lantern_id: 'L1', amount: T.lantern_cost, deposited: T.lantern_cost } });
  assert.deepEqual(ev(r, 'lantern_lit')[0].data, { lantern_id: 'L1' });
  const s = snapAt(r, 1);
  assert.equal(s.lanterns.find((l) => l.id === 'L1').lit, true);
  assert.equal(s.player.carried, 0);
  assert.equal(s.score, T.score.per_lantern);
});

test('AC-11 nạp một phần; ngoài interact_radius thì không nạp; giữ nút không nạp lặp', () => {
  const r = runHeadless({
    ticks: 5,
    scenario: empty({ player: { carried: 3 }, lanterns: [{ id: 'L1', pos: [0, 0, 2] }, { id: 'L2', pos: [0, 0, -2.6] }] }),
    inputs: { frames: [{ tick: 0, interact: true }] },
  });
  assert.equal(ev(r, 'deposit').length, 1);
  assert.deepEqual(ev(r, 'deposit')[0].data, { lantern_id: 'L1', amount: 3, deposited: 3 });
  assert.equal(ev(r, 'lantern_lit').length, 0);

  const far = runHeadless({
    ticks: 2,
    scenario: empty({ player: { carried: 3 }, lanterns: [{ id: 'L1', pos: [0, 0, T.interact_radius + 0.01] }] }),
    inputs: { frames: [{ tick: 0, interact: true }] },
  });
  assert.equal(ev(far, 'deposit').length, 0);
});

test('AC-12 thắp đèn cuối cùng thì thắng (all_lit); đèn đặt sẵn lit không cộng điểm', () => {
  const lit = ['L2', 'L3', 'L4', 'L5'].map((id) => ({ id, lit: true }));
  const r = runHeadless({
    ticks: 100,
    scenario: empty({ player: { carried: T.lantern_cost }, lanterns: [{ id: 'L1', pos: [0, 0, 2] }, ...lit] }),
    inputs: { frames: [{ tick: 0, interact: true }] },
  });
  assert.deepEqual(ev(r, 'game_over')[0], { type: 'event', tick: 1, name: 'game_over', data: { result: 'won', reason: 'all_lit' } });
  const bonus = Math.floor(T.night1_duration_s - 1 / 60) * T.score.per_second_left + T.flames * T.score.per_flame_left;
  assert.deepEqual(r.end, { type: 'end', ticks: 1, state: 'won', score: T.score.per_lantern + bonus });
  assert.equal(r.code, 0);
});

test('AC-13 Bóng Mực đuổi theo và chạm thì mất 1 flame, rơi floor(carried*ratio); bất tử invuln_s', () => {
  const r = runHeadless({ ticks: 200, scenario: empty({ player: { carried: 4 }, shades: [{ id: 'S1', pos: [3, 0, 0] }] }) });
  const hits = ev(r, 'player_hit');
  assert.ok(hits.length >= 2);
  assert.deepEqual(hits[0].data, { by: 'shade', flames: T.flames - 1, dropped: Math.floor(4 * T.hit_drop_ratio) });
  // shade_speed 3 m/s = 0.05 m/tick: từ 3 m tới 1 m cần đúng 40 tick
  assert.equal(hits[0].tick, Math.round(((3 - T.shade_hit_radius) / T.shade_speed) * 60));
  assert.equal(hits[1].tick - hits[0].tick, Math.round(T.invuln_s * 60));
});

test('AC-14 hết flames thì thua (no_flames)', () => {
  const r = runHeadless({ ticks: 100, scenario: empty({ player: { flames: 1 }, shades: [{ pos: [0.5, 0, 0] }] }) });
  assert.deepEqual(ev(r, 'game_over')[0].data, { result: 'lost', reason: 'no_flames' });
  assert.equal(r.end.state, 'lost');
  assert.equal(r.end.ticks, 1);
});

test('AC-15 hết giờ thì thua (dawn)', () => {
  const r = runHeadless({ ticks: 500, scenario: empty({ time_left_s: 1 }) });
  assert.deepEqual(ev(r, 'game_over')[0], { type: 'event', tick: 60, name: 'game_over', data: { result: 'lost', reason: 'dawn' } });
  assert.deepEqual(r.end, { type: 'end', ticks: 60, state: 'lost', score: 0 });
});

test('AC-16 tỏa sáng: tốn pulse_cost, choáng + đẩy Bóng Mực trong pulse_radius, cộng per_stun', () => {
  const r = runHeadless({
    ticks: 200,
    scenario: empty({ player: { carried: 2 }, shades: [{ id: 'S1', pos: [3, 1, 0] }, { id: 'S2', pos: [T.pulse_radius + 0.5, 1, 0] }] }),
    inputs: { frames: [{ tick: 0, pulse: true }] },
  });
  assert.deepEqual(ev(r, 'pulse')[0], { type: 'event', tick: 1, name: 'pulse', data: { stunned_ids: ['S1'] } });
  const s1 = snapAt(r, 1);
  assert.equal(s1.player.carried, 2 - T.pulse_cost);
  assert.equal(s1.score, T.score.per_stun);
  const sh = s1.shades.find((s) => s.id === 'S1');
  assert.equal(sh.state, 'stunned');
  assert.deepEqual(sh.pos, [3 + T.pulse_push_m, 1, 0]);
  const stunTicks = Math.round(T.pulse_stun_s * 60);
  assert.equal(snapAt(r, stunTicks).shades.find((s) => s.id === 'S1').state, 'stunned');
  assert.deepEqual(snapAt(r, stunTicks).shades.find((s) => s.id === 'S1').pos, [3 + T.pulse_push_m, 1, 0]);
  assert.notEqual(snapAt(r, stunTicks + 1).shades.find((s) => s.id === 'S1').state, 'stunned');
});

test('AC-17 tỏa sáng cần đủ ánh sáng và có hồi chiêu', () => {
  const none = runHeadless({ ticks: 5, scenario: empty({ player: { carried: 0 } }), inputs: { frames: [{ tick: 0, pulse: true }] } });
  assert.equal(ev(none, 'pulse').length, 0);
  const cd = runHeadless({
    ticks: 100,
    scenario: empty({ player: { carried: 5 } }),
    inputs: { frames: [{ tick: 0, pulse: true }, { tick: 1, pulse: false }, { tick: 2, pulse: true }, { tick: 3, pulse: false }, { tick: 60, pulse: true }] },
  });
  assert.deepEqual(ev(cd, 'pulse').map((e) => e.tick), [1, 1 + Math.round(T.pulse_cooldown_s * 60)]);
});

test('AC-18 Bóng Mực không vào safe_radius của đèn đã thắp', () => {
  const r = runHeadless({ ticks: 600, scenario: empty({ lanterns: [{ id: 'L1', pos: [0, 0, 0], lit: true }], shades: [{ id: 'S1', pos: [10, 0, 0] }] }) });
  for (const s of r.snaps) assert.ok(hyp(s.shades[0].pos, [0, 0, 0]) >= T.safe_radius - 0.001, `tick ${s.tick}`);
  assert.equal(ev(r, 'player_hit').length, 0);
});

test('AC-19 tất định: cùng seed/scenario/inputs -> output giống hệt; khác seed -> khác', () => {
  const inputs = { frames: [{ tick: 0, move: [0.3, 1] }, { tick: 200, move: [-1, 0], pulse: true }, { tick: 201, pulse: false }] };
  const a = runHeadless({ seed: 42, ticks: 3000, every: 10, inputs });
  const b = runHeadless({ seed: 42, ticks: 3000, every: 10, inputs });
  const c = runHeadless({ seed: 43, ticks: 3000, every: 10, inputs });
  assert.equal(a.code, 0);
  assert.equal(a.text, b.text);
  assert.notEqual(a.text, c.text);
  assert.equal(a.snaps[0].shades.length, 2);
  assert.ok(a.snaps[0].motes_active > 0);
});

test('AC-20 game mặc định sinh thêm Bóng Mực theo thời gian (shade_spawned)', () => {
  const r = runHeadless({ seed: 5, ticks: 1800, every: 100, scenario: { player: { flames: 99 } } });
  const sp = ev(r, 'shade_spawned');
  assert.equal(sp.length, 1);
  assert.equal(sp[0].data.id, 'S3');
});

test('AC-21 lỗi định dạng inputs/scenario -> mã thoát 2; thiếu tham số -> khác 0', () => {
  const bad = [
    { inputs: { frames: [{ tick: 5 }, { tick: 5 }] } },
    { inputs: { frames: [{ tick: 0, move: [2, 0] }] } },
    { inputs: { frames: [{ tick: 0, pulse: 'yes' }] } },
    { inputs: '{not json' },
    { scenario: { motes: [[0, 0]] } },
    { scenario: { player: { carried: -1 } } },
  ];
  for (const b of bad) {
    const r = runHeadless({ ticks: 5, ...b });
    assert.equal(r.code, 2, JSON.stringify(b));
    assert.ok(r.stderr.length > 0);
  }
  const miss = runHeadless({ rawArgs: ['--seed', '1', '--night', '1', '--ticks', '5'] });
  assert.notEqual(miss.code, 0);
});
