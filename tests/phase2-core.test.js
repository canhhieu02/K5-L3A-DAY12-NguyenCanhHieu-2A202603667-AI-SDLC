// Test luật lõi Phase 2 (docs/phases/phase-2.md mục B, C, E4). Mã P2-xx khớp bảng tiêu chí.
// Test bị TICKET-03 thay luật đã cập nhật, lý do ghi trong docs/phases/phase-3.md mục "Test cũ thay đổi".
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runHeadless, empty, snapAt, ev } from './helpers.js';
import { TUNING as T } from '../src/core/tuning.js';

const hyp = (p, q) => Math.hypot(p[0] - q[0], p[2] - q[2]);
const near = (a, b, tol = 0.002) => Math.abs(a - b) <= tol;
const sh = (r, tick, id = 'S1') => snapAt(r, tick).shades.find((s) => s.id === id);

test('P2-11 nhảy: v0 7, g 20, đỉnh ~1.225 m, tiếp đất ~42 tick; nhấn lại trên không vô tác dụng', () => {
  const r = runHeadless({ ticks: 60, scenario: empty(), inputs: { frames: [{ tick: 0, jump: true }, { tick: 1, jump: false }, { tick: 10, jump: true }] } });
  const ys = r.snaps.map((s) => s.player.pos[1]);
  assert.equal(Math.max(...ys), 1.225);
  assert.equal(snapAt(r, 21).player.pos[1], 1.225);
  const land = r.snaps.find((s) => s.tick > 1 && s.player.grounded).tick;
  assert.equal(land, 42);
  assert.equal(snapAt(r, 5).player.grounded, false);
  assert.ok(snapAt(r, 5).player.vel[1] > 0);
  // lần nhấn ở tick 10 (đang bay) không tạo cú nhảy thứ hai
  assert.ok(r.snaps.filter((s) => s.tick > land).every((s) => s.player.pos[1] === 0));
});

test('P2-12 lướt: event dash, 12 tick x 14 m/s theo hướng đang chạy, sau đó chạy thường', () => {
  const r = runHeadless({ ticks: 20, scenario: empty(), inputs: { frames: [{ tick: 0, move: [0, 1], dash: true }] } });
  assert.deepEqual(ev(r, 'dash').map((e) => [e.tick, e.data]), [[1, {}]]);
  assert.deepEqual(snapAt(r, 12).player.pos, [0, 0, 2.8]);
  assert.deepEqual(snapAt(r, 12).player.vel, [0, 0, 14]);
  assert.deepEqual(snapAt(r, 13).player.pos, [0, 0, 2.9]);
  assert.equal(snapAt(r, 1).player.dash_cd_s, T.dash_cooldown_s);
});

test('P2-12 lướt trên không giữ nguyên độ cao', () => {
  const r = runHeadless({ ticks: 30, scenario: empty(), inputs: { frames: [{ tick: 0, jump: true }, { tick: 9, dash: true }] } });
  const y = snapAt(r, 9).player.pos[1];
  assert.ok(y > 0.5);
  for (let k = 10; k <= 21; k++) assert.equal(snapAt(r, k).player.pos[1], y, `tick ${k}`);
  // hết lướt: vận tốc dọc lúc bắt đầu lướt (đang lên 4 m/s) được trả lại (A2-3)
  assert.ok(snapAt(r, 22).player.pos[1] > y);
  assert.ok(snapAt(r, 22).player.vel[1] > 3.5);
});

test('P2-13 lướt khi đứng yên theo hướng đang quay mặt (đầu Đêm +Z; sau khi đi -X thì -X)', () => {
  const a = runHeadless({ ticks: 12, scenario: empty(), inputs: { frames: [{ tick: 0, dash: true }] } });
  assert.deepEqual(snapAt(a, 12).player.pos, [0, 0, 2.8]);
  const b = runHeadless({ ticks: 22, scenario: empty(), inputs: { frames: [{ tick: 0, move: [-1, 0] }, { tick: 10, move: [0, 0], dash: true }] } });
  assert.deepEqual(snapAt(b, 22).player.pos, [-1 - 2.8, 0, 0]);
});

test('P2-14 / P2-43 hồi chiêu lướt 90 tick tính từ lúc bắt đầu; giữ nút không lướt lại', () => {
  const r = runHeadless({ ticks: 120, scenario: empty(), inputs: { frames: [
    { tick: 0, dash: true }, { tick: 1, dash: false }, { tick: 88, dash: true }, { tick: 89, dash: false }, { tick: 90, dash: true },
  ] } });
  assert.deepEqual(ev(r, 'dash').map((e) => e.tick), [1, 91]);
  const held = runHeadless({ ticks: 300, scenario: empty(), inputs: { frames: [{ tick: 0, dash: true }] } });
  assert.equal(ev(held, 'dash').length, 1);
});

test('P2-15 nhặt cần chênh cao chân Mây – mặt đất đặt đom đóm <= 1.5 m', () => {
  const r = runHeadless({ ticks: 1, scenario: empty({ motes: [[0, 1.6, 0], [0, 1.4, 0.5]] }) });
  assert.equal(ev(r, 'mote_picked').length, 1);
  assert.deepEqual(snapAt(r, 1).motes.map((m) => m.pos), [[0, 1.6, 0]]);
});

test('P2-16 mặc định 20 đom đóm trên 20 điểm sinh khác nhau; tick 240 sinh thêm 1', () => {
  const r = runHeadless({ seed: 7, ticks: 240, every: 240, scenario: { random_shades: false } });
  const m0 = r.snaps[0].motes;
  assert.equal(m0.length, 20);
  assert.equal(new Set(m0.map((m) => m.pos.join())).size, 20);
  for (const m of m0) {
    const rr = Math.hypot(m.pos[0], m.pos[2]);
    assert.ok(near(rr, 12) || near(rr, 33), String(rr));
    assert.equal(m.kind, 'random');
    assert.equal(m.ttl_s, null);
  }
  assert.equal(snapAt(r, 240).motes_active, 21);
});

// P2-17 cập nhật (TICKET-03 mục 1 [THAY THẾ] "đèn đã sáng không nhận thêm"): đèn sáng chưa đầy dầu vẫn được chọn để châm.
// Dầu hao ở bước 2 trước tương tác ở bước 5, nên đèn đặt sẵn fuel 100 còn 99.983 lúc bấm E → châm 1 đom đóm (A3-5).
test('P2-17 / P3-12 tương tác: hai đèn cách đều chọn id nhỏ hơn; đèn sáng chưa đầy dầu được châm', () => {
  const sc = (lit) => empty({ player: { carried: 3 }, lanterns: [{ id: 'L3', pos: [1, 0, 0] }, { id: 'L2', pos: [-1, 0, 0], lit }] });
  const a = runHeadless({ ticks: 1, scenario: sc(false), inputs: { frames: [{ tick: 0, interact: true }] } });
  assert.equal(ev(a, 'deposit')[0].data.lantern_id, 'L2');
  const b = runHeadless({ ticks: 1, scenario: sc(true), inputs: { frames: [{ tick: 0, interact: true }] } });
  assert.deepEqual(ev(b, 'refuel')[0].data, { lantern_id: 'L2', amount: 1, fuel: 100 });
  assert.equal(ev(b, 'deposit').length, 0);
});

test('P2-19 đèn vừa thắp: Bóng Mực trong vùng bị đẩy ra trong 30 tick, không gây hit lúc đó', () => {
  const L = [0, 0, 1.5];
  const r = runHeadless({
    ticks: 120,
    scenario: empty({ player: { carried: T.lantern_cost }, lanterns: [{ id: 'L1', pos: L }], shades: [{ id: 'S1', pos: [0.9, 1, 0], state: 'chase' }] }),
    inputs: { frames: [{ tick: 0, interact: true }] },
  });
  assert.equal(ev(r, 'lantern_lit')[0].tick, 1);
  assert.equal(ev(r, 'player_hit').length, 0);
  assert.ok(hyp(sh(r, 30).pos, L) >= T.safe_radius - 0.001);
  assert.ok(hyp(sh(r, 29).pos, L) < T.safe_radius);
});

test('P2-20 Tỏa Sáng: khoảng cách 3D tới tâm (chân + 0.8 m) <= 5 m; choáng 120 tick; không chết', () => {
  const r = runHeadless({
    ticks: 130,
    scenario: empty({ player: { carried: T.pulse_cost }, shades: [{ id: 'S1', pos: [4, 3.5, 0] }, { id: 'S2', pos: [0, 3.8, 4.5] }] }),
    inputs: { frames: [{ tick: 0, pulse: true }] },
  });
  // S1: hypot(4, 2.7) = 4.83 <= 5; S2: hypot(4.5, 3.0) = 5.41 > 5 (cùng XZ < 5)
  assert.deepEqual(ev(r, 'pulse')[0].data, { stunned_ids: ['S1'] });
  assert.equal(sh(r, 120).state, 'stunned');
  assert.notEqual(sh(r, 121).state, 'stunned');
  assert.equal(snapAt(r, 130).shades.length, 2);
  assert.deepEqual(snapAt(r, 1).player.pulse_cd_s, T.pulse_cooldown_s);
});

test('P2-21 Tỏa Sáng trúng Bóng Mực đang choáng: làm mới 120 tick, vẫn +per_stun', () => {
  const r = runHeadless({
    ticks: 125,
    scenario: empty({ player: { carried: T.pulse_cost }, shades: [{ id: 'S1', pos: [3, 1, 0], state: 'stunned', state_ticks_left: 10 }] }),
    inputs: { frames: [{ tick: 0, pulse: true }] },
  });
  assert.equal(snapAt(r, 1).score, T.score.per_stun);
  assert.equal(sh(r, 120).state, 'stunned');
  assert.notEqual(sh(r, 121).state, 'stunned');
});

test('P2-23 phát hiện 12 m / bỏ đuổi 18 m; tốc độ 4 m/s', () => {
  const r = runHeadless({
    ticks: 60,
    scenario: empty({ shades: [
      { id: 'S1', pos: [0, 1, 11], state: 'wander' }, { id: 'S2', pos: [0, 1, -17], state: 'chase' },
      { id: 'S3', pos: [19, 1, 0], state: 'chase' }, { id: 'S4', pos: [-13, 1, 0], state: 'wander' },
    ] }),
  });
  assert.deepEqual(snapAt(r, 1).shades.map((s) => s.state), ['chase', 'chase', 'wander', 'wander']);
  assert.ok(near(hyp(sh(r, 60, 'S2').pos, [0, 0, 0]), 17 - T.shade_speed));
});

test('P2-24 bị chạm: −1 lửa, rơi floor(carried/2) thành đom đóm dropped (TTL 480), bất tử 90, Bóng Mực recoil 2 m / 60 tick', () => {
  const r = runHeadless({ ticks: 520, every: 1, scenario: empty({ player: { carried: 5, flames: 99 }, shades: [{ id: 'S1', pos: [3, 1, 0] }] }) });
  const hit = ev(r, 'player_hit')[0];
  assert.equal(hit.tick, Math.round(((3 - T.shade_hit_radius) / T.shade_speed) * 60)); // 30
  assert.deepEqual(hit.data, { by: 'shade', flames: 98, dropped: 2 });
  const s = snapAt(r, 30);
  assert.equal(s.player.carried, 3);
  assert.equal(s.player.invuln, true);
  assert.equal(s.shades[0].state, 'recoil');
  const drops = s.motes.filter((m) => m.kind === 'dropped');
  assert.equal(drops.length, 2);
  for (const m of drops) {
    const d = hyp(m.pos, [0, 0, 0]);
    assert.ok(d >= 1.5 - 0.001 && d <= 2.5 + 0.001, String(d));
    assert.equal(m.ttl_s, 8);
  }
  // lùi ở các tick 31..90 (60 tick), xong lùi thì đuổi lại
  assert.equal(sh(r, 89).state, 'recoil');
  assert.ok(near(hyp(sh(r, 90).pos, [0, 0, 0]), 3));
  assert.equal(sh(r, 91).state, 'chase');
  assert.equal(snapAt(r, 30 + 89).player.invuln, true);
  // hit thứ hai đúng lúc hết bất tử (Bóng Mực lùi 2 m rồi đuổi lại 30 tick)
  assert.equal(ev(r, 'player_hit')[1].tick - hit.tick, Math.round(T.invuln_s * 60));
  // đom đóm rơi biến mất sau 480 tick
  const firstDrops = (tick) => snapAt(r, tick).motes.filter((m) => m.id === 'M1' || m.id === 'M2').length;
  assert.equal(firstDrops(30 + 479), 2);
  assert.equal(firstDrops(30 + 480), 0);
});

test('P2-25 hai Bóng Mực chạm cùng tick: chỉ 1 hit, con id nhỏ nhất', () => {
  const r = runHeadless({ ticks: 2, scenario: empty({ shades: [{ id: 'S2', pos: [-0.5, 1, 0] }, { id: 'S1', pos: [0.5, 1, 0] }] }) });
  assert.equal(ev(r, 'player_hit').length, 1);
  assert.equal(sh(r, 1, 'S1').state, 'recoil');
  assert.equal(sh(r, 1, 'S2').state, 'chase');
});

test('P2-26 rơi khỏi đảo: 1 player_hit fall (lost), mất hết đom đóm, chờ 60 tick rồi hồi sinh ở điểm xuất phát, bất tử 90', () => {
  const r = runHeadless({ ticks: 300, scenario: empty({ player: { pos: [39.5, 0, 0], carried: 5 } }), inputs: { frames: [{ tick: 0, move: [1, 0] }] } });
  const falls = ev(r, 'player_hit');
  assert.equal(falls.length, 1);
  assert.deepEqual(falls[0].data, { by: 'fall', flames: T.flames - 1, dropped: 0, lost: 5 });
  const f = falls[0].tick;
  assert.ok(snapAt(r, f).player.pos[1] < -10 && snapAt(r, f - 1).player.pos[1] >= -10); // Y < −10 (A1-15)
  assert.equal(snapAt(r, f).player.carried, 0);
  assert.notDeepEqual(snapAt(r, f + 59).player.pos, [0, 0, 0]);
  const s = snapAt(r, f + 60).player;
  assert.deepEqual([s.pos, s.vel, s.invuln, s.grounded], [[0, 0, 0], [0, 0, 0], true, true]);
  assert.equal(snapAt(r, f + 60 + 89).player.invuln, true);
  assert.equal(snapAt(r, f + 60 + 90).player.invuln, false);
});

test('P2-27 rơi khi còn 1 Ngọn Lửa: thua no_flames ngay tick đó', () => {
  const r = runHeadless({ ticks: 300, scenario: empty({ player: { pos: [39.9, 0, 0], flames: 1 } }), inputs: { frames: [{ tick: 0, move: [1, 0] }] } });
  const hit = ev(r, 'player_hit')[0];
  assert.deepEqual(ev(r, 'game_over')[0], { type: 'event', tick: hit.tick, name: 'game_over', data: { result: 'lost', reason: 'no_flames' } });
  assert.equal(r.end.ticks, hit.tick);
});

// P2-28 cập nhật (TICKET-03 mục 3): bỏ thắng all_lit; ưu tiên no_flames giữ nguyên, kể cả ở tick bình minh.
test('P2-28 / P3-33 hết Ngọn Lửa luôn thua trước (kể cả tick bình minh, đủ đèn); thắp đèn thứ 3 đúng tick bình minh vẫn thắng', () => {
  const lit = ['L2', 'L3'].map((id) => ({ id, lit: true }));
  const a = runHeadless({ ticks: 5, scenario: empty({ player: { flames: 0 }, lanterns: [{ id: 'L1', lit: true }, ...lit] }) });
  assert.deepEqual(ev(a, 'game_over')[0], { type: 'event', tick: 1, name: 'game_over', data: { result: 'lost', reason: 'no_flames' } });
  // bị Bóng Mực đánh mất Ngọn Lửa cuối đúng tick bình minh, dù đủ 3 đèn sáng → no_flames
  const b = runHeadless({ ticks: 100, scenario: empty({ time_left_s: 1, player: { flames: 1, invuln_ticks: 60 }, lanterns: [{ id: 'L1', lit: true }, ...lit], shades: [{ id: 'S1', pos: [0.5, 1, 0] }] }) });
  assert.deepEqual(ev(b, 'game_over'), [{ type: 'event', tick: 60, name: 'game_over', data: { result: 'lost', reason: 'no_flames' } }]);
  const c = runHeadless({
    ticks: 100,
    scenario: empty({ time_left_s: 1, player: { carried: T.lantern_cost }, lanterns: [{ id: 'L1', pos: [0, 0, 1] }, ...lit] }),
    inputs: { frames: [{ tick: 59, interact: true }] },
  });
  assert.deepEqual(ev(c, 'game_over')[0], { type: 'event', tick: 60, name: 'game_over', data: { result: 'won', reason: 'dawn_survived' } });
  // L1 vừa thắp còn 100; L2, L3 đặt sẵn còn 99
  assert.equal(c.end.score, T.lantern_cost * T.score.per_mote + T.score.per_lantern + 3 * T.score.per_lantern_dawn + 100 + 99 + 99 + T.flames * T.score.per_flame_left);
});

test('P2-31 thứ tự trong tick: nhặt (bước 4) trước nạp (bước 5)', () => {
  const r = runHeadless({
    ticks: 1,
    scenario: empty({ player: { carried: T.lantern_cost - 1 }, motes: [[0, 0, 0]], lanterns: [{ id: 'L1', pos: [0, 0, 1] }] }),
    inputs: { frames: [{ tick: 0, interact: true }] },
  });
  assert.deepEqual(r.events.map((e) => e.name), ['night_start', 'mote_picked', 'deposit', 'lantern_lit']);
});

test('P2-40 snapshot v1.1 có đủ trường', () => {
  const r = runHeadless({ ticks: 1, every: 1 });
  const s = r.snaps[0];
  for (const k of ['night', 'wind', 'motes', 'drifters', 'charms']) assert.ok(k in s, k);
  assert.equal(s.night, 1);
  assert.deepEqual(s.wind, { active: false, dir_deg: 0 });
  for (const k of ['vel', 'grounded', 'invuln', 'dash_cd_s', 'pulse_cd_s', 'charm_s']) assert.ok(k in s.player, k);
  for (const k of ['id', 'pos', 'kind', 'ttl_s']) assert.ok(k in s.motes[0], k);
  assert.deepEqual(s.drifters, []);
  assert.deepEqual(s.charms, []);
});

test('P2-41 scenario v1.1: invuln_ticks, pulse_cd_ticks, dash_cd_ticks, charm_ticks, shades[].state; sai kiểu → mã 2', () => {
  const inv = runHeadless({ ticks: 40, scenario: empty({ player: { invuln_ticks: 30 }, shades: [{ id: 'S1', pos: [0, 1, 0] }] }) });
  assert.equal(ev(inv, 'player_hit')[0].tick, 30);
  const cd = runHeadless({ ticks: 5, scenario: empty({ player: { carried: 5, pulse_cd_ticks: 3, dash_cd_ticks: 3 } }),
    inputs: { frames: [{ tick: 0, pulse: true, dash: true }, { tick: 1, pulse: false, dash: false }, { tick: 2, pulse: true, dash: true }] } });
  assert.deepEqual(ev(cd, 'pulse').map((e) => e.tick), [3]);
  assert.deepEqual(ev(cd, 'dash').map((e) => e.tick), [3]);
  const ch = runHeadless({ ticks: 10, scenario: empty({ player: { charm_ticks: 600 } }), inputs: { frames: [{ tick: 0, move: [0, 1] }] } });
  assert.deepEqual(snapAt(ch, 10).player.pos, [0, 0, 1.2]);
  assert.equal(snapAt(ch, 10).player.charm_s, 9.833);
  for (const bad of [{ shades: [{ pos: [1, 1, 1], state: 'angry' }] }, { player: { invuln_ticks: -1 } }, { wind_enabled: 'yes' }, { drifters: 3 }]) {
    const r = runHeadless({ ticks: 1, scenario: bad });
    assert.equal(r.code, 2, JSON.stringify(bad));
  }
});

// P2-42 cập nhật (contract v1.2): thêm trạng thái drain.
test('P2-42 / P3-41 trạng thái Bóng Mực chỉ thuộc spawning/wander/chase/recoil/stunned/drain', () => {
  const r = runHeadless({ seed: 3, ticks: 3000, every: 10, scenario: { player: { flames: 99, carried: 10 } },
    inputs: { frames: [{ tick: 0, move: [0.4, 0.2] }, { tick: 400, pulse: true }, { tick: 401, pulse: false }, { tick: 900, move: [-0.5, 0] }] } });
  const states = new Set(r.snaps.flatMap((s) => s.shades.map((x) => x.state)));
  for (const st of states) assert.ok(['spawning', 'wander', 'chase', 'recoil', 'stunned', 'drain'].includes(st), st);
  assert.ok(states.has('spawning') && states.has('chase'));
});

test('P2-84 night_start {night} ở tick 1', () => {
  const r = runHeadless({ ticks: 2, scenario: empty() });
  assert.deepEqual(r.events[0], { type: 'event', tick: 1, name: 'night_start', data: { night: 1 } });
});

test('P2-90 / P2-91 tạm dừng: tick tăng, sim_tick và thời gian đứng yên, state paused; tiếp tục chạy đúng', () => {
  const r = runHeadless({ ticks: 40, every: 1, scenario: empty(), inputs: { frames: [
    { tick: 0, move: [0, 1] }, { tick: 10, pause: true }, { tick: 11, pause: false }, { tick: 20, pause: true },
  ] } });
  assert.deepEqual(ev(r, 'paused').map((e) => e.tick), [11]);
  assert.deepEqual(ev(r, 'resumed').map((e) => e.tick), [21]);
  const s15 = snapAt(r, 15);
  // v1.2: Đêm 1 = 240 s (trước đây 299.833 với 300 s)
  assert.deepEqual([s15.state, s15.sim_tick, s15.time_left_s, s15.player.pos], ['paused', 10, Math.round((T.night1_duration_s - 10 / 60) * 1000) / 1000, [0, 0, 1]]);
  assert.deepEqual([snapAt(r, 21).state, snapAt(r, 21).sim_tick, snapAt(r, 21).player.pos], ['playing', 11, [0, 0, 1.1]]);
  const stay = runHeadless({ ticks: 20, scenario: empty(), inputs: { frames: [{ tick: 5, pause: true }] } });
  assert.deepEqual(stay.end, { type: 'end', ticks: 20, state: 'playing', score: 0 });
  assert.equal(stay.snaps.at(-1).state, 'paused');
});

test('P2-03 --night ngoài 1..3 → mã khác 0', () => {
  const r = runHeadless({ night: 4, ticks: 1 });
  assert.notEqual(r.code, 0);
  assert.ok(r.stderr.length > 0);
});

test('P2-04 chạy một Đêm 21 600 tick trong <= 30 s', () => {
  const t0 = performance.now();
  const r = runHeadless({ seed: 9, ticks: 21600, every: 10, scenario: { time_left_s: 360, player: { flames: 999 } },
    inputs: { frames: [{ tick: 0, move: [0.3, 0.6] }, { tick: 3000, move: [-0.6, -0.2] }] } });
  const ms = performance.now() - t0;
  assert.equal(r.code, 0);
  assert.equal(r.end.ticks, 21600);
  assert.ok(ms <= 30000, `${ms} ms`);
});
