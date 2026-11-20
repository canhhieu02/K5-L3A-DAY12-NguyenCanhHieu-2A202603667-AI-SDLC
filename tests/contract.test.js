// Test theo tiêu chí nghiệm thu Phase 1 (docs/phases/phase-1.md). Mã AC-xx khớp bảng tiêu chí.
// Test bị TICKET-03 thay luật đã cập nhật, lý do ghi trong docs/phases/phase-3.md mục "Test cũ thay đổi".
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { runHeadless, empty, snapAt, ev } from './helpers.js';
import { TUNING } from '../src/core/tuning.js';

const T = TUNING;
const hyp = (p, q) => Math.hypot(p[0] - q[0], p[2] - q[2]);

test('AC-01 game.contract.json khớp tuning game đang dùng', () => {
  const c = JSON.parse(fs.readFileSync('game.contract.json', 'utf8'));
  // TICKET-04 (contract v1.3) đổi phiên bản + thêm bench_cmd/soak_cmd; tuning giữ nguyên v1.2 (phase-4.md "Test cũ thay đổi")
  assert.equal(c.contract_version, '1.3');
  assert.deepEqual(c.tuning, T);
  for (const k of ['team', 'build_cmd', 'run_cmd', 'headless_cmd', 'bench_cmd', 'soak_cmd']) assert.ok(c[k]);
});

// P2-01 cập nhật thành P3-01: TICKET-03 đổi thời lượng 3 Đêm, thêm 8 khóa dầu/thắng/sức chứa, thay bảng điểm.
test('P3-01 tuning = số chuẩn TICKET-02 + TICKET-03 (contract v1.2)', () => {
  assert.deepEqual(T, {
    player_speed: 6, carry_capacity: 10, lantern_cost: 10, lantern_count_night1: 5,
    pickup_radius: 1.0, interact_radius: 2.0, pulse_cost: 3, pulse_radius: 5,
    night1_duration_s: 240, flames: 3, invuln_s: 1.5, hit_drop_ratio: 0.5,
    pulse_stun_s: 2, pulse_push_m: 4, pulse_cooldown_s: 3, safe_radius: 6,
    shade_speed: 4, shade_hit_radius: 1.0, fall_enabled: true,
    dash_speed: 14, dash_duration_s: 0.2, dash_cooldown_s: 1.5,
    night2_duration_s: 270, night3_duration_s: 300,
    fuel_max: 100, fuel_decay_per_s: 1.0, fuel_per_mote: 10, relight_cost: 5,
    win_ratio: 0.6, drain_per_s: 5, low_fuel_threshold: 30, capacity_max: 20,
    score: { per_mote: 5, per_lantern: 100, per_relight: 40, per_stun: 5, per_stun_drain: 15, per_lantern_dawn: 50, per_flame_left: 50 },
  });
});

test('AC-02 output: snapshot tick 0 + mỗi N tick, dòng cuối là end', () => {
  const r = runHeadless({ ticks: 25, every: 10, scenario: empty() });
  assert.equal(r.code, 0);
  assert.deepEqual(r.snaps.map((s) => s.tick), [0, 10, 20]);
  assert.equal(r.lines[0].type, 'snapshot');
  assert.deepEqual(r.end, { type: 'end', ticks: 25, state: 'playing', score: 0 });
  const s0 = r.snaps[0];
  assert.equal(s0.time_left_s, T.night1_duration_s);
  // v1.1: player có thêm vel, grounded, invuln, dash_cd_s, pulse_cd_s, charm_s (P2-40); v1.2 thêm capacity (P3-40)
  assert.deepEqual(s0.player, { pos: [0, 0, 0], vel: [0, 0, 0], grounded: true, flames: T.flames, carried: 0, capacity: T.carry_capacity,
    invuln: false, dash_cd_s: 0, pulse_cd_s: 0, charm_s: 0 });
  assert.equal(s0.lanterns.length, 5);
  assert.equal(s0.sim_tick, 0);
});

test('AC-03 mặc định --snapshot-every = 10 và time_left_s = duration - steps/60', () => {
  const r = runHeadless({ ticks: 120, scenario: empty(), every: 10 });
  assert.equal(snapAt(r, 120).time_left_s, T.night1_duration_s - 2); // v1.2: Đêm 1 = 240 s
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
  assert.equal(snapAt(r, t).score, 0); // v1.1: per_mote tính khi nạp, không tính khi nhặt (P2-29)
});

test('AC-09 không nhặt quá carry_capacity', () => {
  const n = T.carry_capacity + 2;
  const motes = Array.from({ length: n }, () => [0, 0, 0]);
  const r = runHeadless({ ticks: 1, scenario: empty({ motes }) });
  assert.equal(snapAt(r, 1).player.carried, T.carry_capacity);
  assert.equal(snapAt(r, 1).motes_active, n - T.carry_capacity);
});

test('AC-10 nạp đủ lantern_cost thì thắp đèn, cộng per_lantern', () => {
  const r = runHeadless({
    ticks: 2,
    scenario: empty({ player: { carried: T.lantern_cost }, lanterns: [{ id: 'L1', pos: [0, 0, 2] }] }),
    inputs: { frames: [{ tick: 0, interact: true }] },
  });
  assert.deepEqual(ev(r, 'deposit')[0], { type: 'event', tick: 1, name: 'deposit', data: { lantern_id: 'L1', amount: T.lantern_cost, deposited: T.lantern_cost } });
  assert.deepEqual(ev(r, 'lantern_lit')[0].data, { lantern_id: 'L1', relight: false }); // v1.2: thêm relight
  const s = snapAt(r, 1);
  assert.equal(s.lanterns.find((l) => l.id === 'L1').lit, true);
  assert.equal(s.player.carried, 0);
  assert.equal(s.score, T.lantern_cost * T.score.per_mote + T.score.per_lantern);
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

// AC-12 cập nhật (TICKET-03 mục 3 [THAY THẾ]): thắp đèn cuối không còn thắng sớm (all_lit bỏ); thắng ở bình minh.
test('AC-12 / P3-30 thắp đèn cuối KHÔNG kết thúc Đêm; bình minh đủ đèn thì thắng dawn_survived; đèn đặt sẵn lit không cộng điểm thắp', () => {
  const lit = ['L2', 'L3', 'L4', 'L5'].map((id) => ({ id, lit: true }));
  const r = runHeadless({
    ticks: 100,
    scenario: empty({ time_left_s: 1, player: { carried: T.lantern_cost }, lanterns: [{ id: 'L1', pos: [0, 0, 2] }, ...lit] }),
    inputs: { frames: [{ tick: 0, interact: true }] },
  });
  assert.equal(ev(r, 'lantern_lit')[0].tick, 1);
  assert.deepEqual(ev(r, 'game_over'), [{ type: 'event', tick: 60, name: 'game_over', data: { result: 'won', reason: 'dawn_survived' } }]);
  // bình minh: 5 đèn × (50 + floor(fuel)) + 50 × Ngọn Lửa; L1 thắp ở tick 1 còn 100 − 59/60, đèn đặt sẵn còn 100 − 1
  const dawn = 5 * T.score.per_lantern_dawn + 99 * 4 + Math.floor(100 - 59 / 60) + T.flames * T.score.per_flame_left;
  assert.deepEqual(r.end, { type: 'end', ticks: 60, state: 'won', score: T.lantern_cost * T.score.per_mote + T.score.per_lantern + dawn });
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
    scenario: empty({ player: { carried: T.pulse_cost + 1 }, shades: [{ id: 'S1', pos: [3, 1, 0] }, { id: 'S2', pos: [T.pulse_radius + 0.5, 1, 0] }] }),
    inputs: { frames: [{ tick: 0, pulse: true }] },
  });
  assert.deepEqual(ev(r, 'pulse')[0], { type: 'event', tick: 1, name: 'pulse', data: { stunned_ids: ['S1'] } });
  const s1 = snapAt(r, 1);
  assert.equal(s1.player.carried, 1);
  assert.equal(s1.score, T.score.per_stun);
  const S1 = (tick) => snapAt(r, tick).shades.find((s) => s.id === 'S1');
  assert.equal(S1(1).state, 'stunned');
  // v1.1: đẩy lùi tổng pulse_push_m trong 15 tick đầu (P2-20)
  assert.deepEqual(S1(1).pos, [3 + T.pulse_push_m / 15, 1, 0].map((v) => Math.round(v * 1000) / 1000));
  assert.deepEqual(S1(15).pos, [3 + T.pulse_push_m, 1, 0]);
  const stunTicks = Math.round(T.pulse_stun_s * 60);
  assert.equal(S1(stunTicks).state, 'stunned');
  assert.deepEqual(S1(stunTicks).pos, [3 + T.pulse_push_m, 1, 0]);
  assert.notEqual(S1(stunTicks + 1).state, 'stunned');
});

test('AC-17 tỏa sáng cần đủ ánh sáng và có hồi chiêu', () => {
  const none = runHeadless({ ticks: 5, scenario: empty({ player: { carried: T.pulse_cost - 1 } }), inputs: { frames: [{ tick: 0, pulse: true }] } });
  assert.equal(ev(none, 'pulse').length, 0);
  const cdT = Math.round(T.pulse_cooldown_s * 60);
  const cd = runHeadless({
    ticks: cdT + 20,
    scenario: empty({ player: { carried: 2 * T.pulse_cost } }),
    inputs: { frames: [{ tick: 0, pulse: true }, { tick: 1, pulse: false }, { tick: 2, pulse: true }, { tick: 3, pulse: false },
      { tick: cdT - 1, pulse: true }, { tick: cdT, pulse: false }, { tick: cdT + 1, pulse: true }] },
  });
  // nhấn ở tick cdT-1 (event tick cdT) còn hồi chiêu; nhấn ở tick cdT+1 thì được
  assert.deepEqual(ev(cd, 'pulse').map((e) => e.tick), [1, cdT + 2]);
});

test('AC-18 Bóng Mực không vào safe_radius của đèn đã thắp', () => {
  const r = runHeadless({ ticks: 600, scenario: empty({ lanterns: [{ id: 'L1', pos: [0, 0, 0], lit: true }], shades: [{ id: 'S1', pos: [10, 0, 0] }] }) });
  for (const s of r.snaps) assert.ok(hyp(s.shades[0].pos, [0, 0, 0]) >= T.safe_radius - 0.001, `tick ${s.tick}`);
  assert.equal(ev(r, 'player_hit').length, 0);
});

test('AC-23 đèn vừa thắp: Bóng Mực (kể cả đang choáng) trong safe_radius bị đẩy ra trong 30 tick (v1.1, P2-19)', () => {
  // Choáng S1 ở tick 1 (đẩy lùi về +X), rồi thắp L1 ở phía -X của Mây ở tick 3.
  const L = [-2, 0, 0];
  const r = runHeadless({
    ticks: 40,
    scenario: empty({ player: { carried: T.pulse_cost + 3 }, lanterns: [{ id: 'L1', pos: L, deposited: T.lantern_cost - 3 }], shades: [{ id: 'S1', pos: [1, 0, 0] }] }),
    inputs: { frames: [{ tick: 0, pulse: true }, { tick: 2, interact: true }] },
  });
  assert.deepEqual(ev(r, 'lantern_lit')[0].tick, 3);
  assert.ok(hyp(snapAt(r, 3).shades[0].pos, L) < T.safe_radius); // đẩy dần, chưa ra ngay
  const s = snapAt(r, 3 + 29).shades[0];
  assert.equal(s.state, 'stunned');
  assert.ok(hyp(s.pos, L) >= T.safe_radius - 0.001, JSON.stringify(s.pos));
  for (const sn of r.snaps.filter((x) => x.tick >= 32)) assert.ok(hyp(sn.shades[0].pos, L) >= T.safe_radius - 0.001);
});

test('AC-24 nạp: deposited không vượt lantern_cost, phần dư giữ lại; đầy thì không nhặt thêm', () => {
  const r = runHeadless({
    ticks: 2,
    scenario: empty({ player: { carried: 5 }, motes: [[5, 0, 5]], lanterns: [{ id: 'L1', pos: [0, 0, 1], deposited: T.lantern_cost - 2 }] }),
    inputs: { frames: [{ tick: 0, interact: true }] },
  });
  assert.deepEqual(ev(r, 'deposit')[0].data, { lantern_id: 'L1', amount: 2, deposited: T.lantern_cost });
  assert.equal(snapAt(r, 1).player.carried, 3);
  const full = runHeadless({ ticks: 1, scenario: empty({ player: { carried: T.carry_capacity }, motes: [[0, 0, 0]] }) });
  assert.equal(ev(full, 'mote_picked').length, 0);
  assert.equal(snapAt(full, 1).motes_active, 1);
});

// AC-25 cập nhật (TICKET-03 mục 3): thắng chỉ xảy ra ở bình minh, nên dựng tick bình minh = 10 thay cho thắp đèn cuối.
test('AC-25 cùng tick: event đứng trước snapshot; end là dòng cuối; thưởng bình minh nằm trong snapshot + end', () => {
  const lit = ['L1', 'L2', 'L3'].map((id) => ({ id, lit: true }));
  const r = runHeadless({ ticks: 30, every: 10, scenario: empty({ time_left_s: 10 / 60, lanterns: lit }) });
  const types = r.lines.map((l) => `${l.type}:${l.tick ?? ''}`);
  assert.deepEqual(types.slice(-3), ['event:10', 'snapshot:10', 'end:']);
  assert.equal(snapAt(r, 10).score, r.end.score);
  assert.equal(snapAt(r, 10).state, 'won');
  assert.equal(r.end.score, 3 * (T.score.per_lantern_dawn + 99) + T.flames * T.score.per_flame_left);
});

test('AC-19 tất định: cùng seed/scenario/inputs -> output giống hệt; khác seed -> khác', () => {
  const inputs = { frames: [{ tick: 0, move: [0.3, 1] }, { tick: 200, move: [-1, 0], pulse: true }, { tick: 201, pulse: false }] };
  const a = runHeadless({ seed: 42, ticks: 3000, every: 10, inputs });
  const b = runHeadless({ seed: 42, ticks: 3000, every: 10, inputs });
  const c = runHeadless({ seed: 43, ticks: 3000, every: 10, inputs });
  assert.equal(a.code, 0);
  assert.equal(a.text, b.text);
  assert.notEqual(a.text, c.text);
  assert.equal(a.snaps[0].shades.length, 0); // v1.1: Bóng Mực sinh từ tick 300 (P2-30)
  assert.equal(a.snaps[0].motes_active, 20);
});

test('AC-20 game mặc định sinh thêm Bóng Mực theo lịch v1.1 (P2-30)', () => {
  const r = runHeadless({ seed: 5, ticks: 1800, every: 10, scenario: { player: { flames: 99 } } });
  const sp = ev(r, 'shade_spawned').map((e) => [e.tick, e.data.id]);
  assert.deepEqual(sp, [[300, 'S1'], [300, 'S2'], [780, 'S3'], [1260, 'S4'], [1740, 'S5']]);
  assert.equal(snapAt(r, 300).shades[0].state, 'spawning');
  assert.notEqual(snapAt(r, 360).shades[0].state, 'spawning');
  for (const s of snapAt(r, 300).shades) assert.ok(hyp(s.pos, [0, 0, 0]) >= 15);
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
