// Test TICKET-03 "Đèn cạn dầu" (docs/phases/phase-3.md). Mã P3-xx khớp bảng tiêu chí.
// Kỳ vọng tính tay từ số chuẩn: dầu hao 1/60 mỗi tick, Bóng Mực hút 5/60 mỗi tick, Bóng Mực wander 2 m/s = 1/30 m/tick.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runHeadless, empty, snapAt, ev } from './helpers.js';
import { TUNING as T } from '../src/core/tuning.js';

const hyp = (p, q) => Math.hypot(p[0] - q[0], p[2] - q[2]);
const lan = (r, tick, id = 'L1') => snapAt(r, tick).lanterns.find((L) => L.id === id);
const sh = (r, tick, id = 'S1') => snapAt(r, tick).shades.find((s) => s.id === id);
const E = (tick = 0) => ({ frames: [{ tick, interact: true }] });
const S = T.score;

test('P3-10 thắp lần đầu: fuel 100, ever_lit, hao 1/giây; đèn tắt fuel 0; snapshot đèn đủ trường v1.2', () => {
  const r = runHeadless({ ticks: 61, scenario: empty({ player: { carried: T.lantern_cost }, lanterns: [{ id: 'L1', pos: [0, 0, 1] }] }), inputs: E() });
  assert.deepEqual(ev(r, 'lantern_lit')[0], { type: 'event', tick: 1, name: 'lantern_lit', data: { lantern_id: 'L1', relight: false } });
  assert.deepEqual(lan(r, 1), { id: 'L1', pos: [0, 0, 1], lit: true, deposited: T.lantern_cost, fuel: 100, ever_lit: true, relit_count: 0 });
  assert.equal(lan(r, 31).fuel, 99.5);
  assert.equal(lan(r, 61).fuel, 99);
  assert.deepEqual(lan(r, 61, 'L2'), { id: 'L2', pos: [23.8, 0, 7.7], lit: false, deposited: 0, fuel: 0, ever_lit: false, relit_count: 0 });
});

test('P3-10 dầu tính theo đơn vị nguyên: 3600 tick từ 100 còn đúng 40', () => {
  const r = runHeadless({ ticks: 3600, every: 600, scenario: empty({ lanterns: [{ id: 'L1', lit: true }] }) });
  assert.deepEqual(r.snaps.map((s) => s.lanterns[0].fuel), [100, 90, 80, 70, 60, 50, 40]);
});

test('P3-11 hết dầu: lantern_out, tắt, deposited 0, fuel 0, nhớ ever_lit; fuel 0 đặt sẵn thì tắt ngay tick 1', () => {
  const r = runHeadless({ ticks: 70, scenario: empty({ lanterns: [{ id: 'L1', lit: true, fuel: 1, deposited: 10 }] }) });
  assert.deepEqual(ev(r, 'lantern_out'), [{ type: 'event', tick: 60, name: 'lantern_out', data: { lantern_id: 'L1' } }]);
  assert.equal(lan(r, 54).fuel, 0.1);
  assert.equal(lan(r, 59).lit, true);
  assert.deepEqual(lan(r, 60), { id: 'L1', pos: [0, 0, 25], lit: false, deposited: 0, fuel: 0, ever_lit: true, relit_count: 0 });
  const z = runHeadless({ ticks: 2, scenario: empty({ lanterns: [{ id: 'L1', lit: true, fuel: 0 }] }) });
  assert.equal(ev(z, 'lantern_out')[0].tick, 1);
});

test('P3-12 châm dầu: used = min(mang, ceil((100 − fuel)/10)), fuel + 10×used (tối đa 100), +5 mỗi đom đóm, event refuel', () => {
  // fuel 45 → tick 1 sau khi hao còn 45 − 1/60 → cần ceil(5.50) = 6
  const sc = (carried) => empty({ player: { carried }, lanterns: [{ id: 'L1', pos: [0, 0, 1], lit: true, fuel: 45 }] });
  const few = runHeadless({ ticks: 1, scenario: sc(4), inputs: E() });
  assert.deepEqual(ev(few, 'refuel')[0], { type: 'event', tick: 1, name: 'refuel', data: { lantern_id: 'L1', amount: 4, fuel: 85 } });
  assert.deepEqual([snapAt(few, 1).player.carried, snapAt(few, 1).score], [0, 4 * S.per_mote]);
  const many = runHeadless({ ticks: 1, scenario: sc(10), inputs: E() });
  assert.deepEqual(ev(many, 'refuel')[0].data, { lantern_id: 'L1', amount: 6, fuel: 100 });
  assert.equal(snapAt(many, 1).player.carried, 4);
  assert.equal(ev(many, 'lantern_lit').length, 0);
  assert.equal(ev(many, 'deposit').length, 0);
});

test('P3-12 hệ quả thứ tự tick (A3-5): đèn vừa châm đầy, lần bấm sau đã hao 1/60 nên vẫn được chọn trước đèn tắt ở xa hơn', () => {
  // L1 châm đầy ở tick 1; tick 3 bấm lại: L1 còn 99.967 (chưa đầy) và gần hơn L2 → châm tiếp 1 đom đóm
  const r = runHeadless({ ticks: 3, scenario: empty({ player: { carried: 12 }, lanterns: [{ id: 'L1', pos: [0, 0, 1], lit: true, fuel: 95 }, { id: 'L2', pos: [0, 0, -1.5] }] }),
    inputs: { frames: [{ tick: 0, interact: true }, { tick: 1, interact: false }, { tick: 2, interact: true }] } });
  assert.deepEqual(ev(r, 'refuel').map((e) => [e.tick, e.data]), [[1, { lantern_id: 'L1', amount: 1, fuel: 100 }], [3, { lantern_id: 'L1', amount: 1, fuel: 100 }]]);
});

test('P3-13 thắp lại: đèn ever_lit cần 5 (relight true, +40, relit_count +1); đèn chưa từng sáng vẫn cần 10', () => {
  const re = runHeadless({ ticks: 1, scenario: empty({ player: { carried: 7 }, lanterns: [{ id: 'L1', pos: [0, 0, 1], ever_lit: true }] }), inputs: E() });
  assert.deepEqual(ev(re, 'deposit')[0].data, { lantern_id: 'L1', amount: T.relight_cost, deposited: T.relight_cost });
  assert.deepEqual(ev(re, 'lantern_lit')[0].data, { lantern_id: 'L1', relight: true });
  assert.deepEqual(lan(re, 1), { id: 'L1', pos: [0, 0, 1], lit: true, deposited: 5, fuel: 100, ever_lit: true, relit_count: 1 });
  assert.equal(snapAt(re, 1).score, T.relight_cost * S.per_mote + S.per_relight);
  assert.equal(snapAt(re, 1).player.carried, 2);
  const fresh = runHeadless({ ticks: 1, scenario: empty({ player: { carried: 7 }, lanterns: [{ id: 'L1', pos: [0, 0, 1] }] }), inputs: E() });
  assert.deepEqual(ev(fresh, 'deposit')[0].data, { lantern_id: 'L1', amount: 7, deposited: 7 });
  assert.equal(ev(fresh, 'lantern_lit').length, 0);
});

test('P3-13 tắt rồi thắp lại trong cùng Đêm: lantern_out tick 60, thắp lại bằng 5 đom đóm ở tick 61', () => {
  const r = runHeadless({ ticks: 61, scenario: empty({ player: { carried: 5 }, lanterns: [{ id: 'L1', pos: [0, 0, 1], lit: true, fuel: 1 }] }),
    inputs: { frames: [{ tick: 60, interact: true }] } });
  assert.deepEqual(r.events.slice(1).map((e) => [e.tick, e.name]), [[60, 'lantern_out'], [61, 'deposit'], [61, 'lantern_lit']]);
  assert.deepEqual(ev(r, 'lantern_lit')[0].data, { lantern_id: 'L1', relight: true });
  assert.equal(lan(r, 61).relit_count, 1);
});

test('P3-14 sức chứa = 10 + 2 × successful_lights, tối đa 20; thắp/thắp lại tăng sức chứa; nhặt không vượt', () => {
  const cap = (n) => runHeadless({ ticks: 0, scenario: empty({ player: { successful_lights: n } }) }).snaps[0].player.capacity;
  assert.deepEqual([0, 3, 5, 9].map(cap), [10, 16, 20, 20]);
  const motes = Array.from({ length: 25 }, () => [0, 0, 0]);
  const r = runHeadless({ ticks: 1, scenario: empty({ motes, player: { successful_lights: 4 } }) });
  assert.equal(snapAt(r, 1).player.carried, 18);
  // thắp L1 (lần 1), đi 1 m về −Z cho L2 gần hơn L1, rồi thắp lại L2 (ever_lit) → sức chứa 14
  const two = runHeadless({ ticks: 13, scenario: empty({ player: { carried: 15 }, lanterns: [{ id: 'L1', pos: [0, 0, 1] }, { id: 'L2', pos: [0, 0, -1.5], ever_lit: true }] }),
    inputs: { frames: [{ tick: 0, interact: true }, { tick: 1, interact: false, move: [0, -1] }, { tick: 11, move: [0, 0] }, { tick: 12, interact: true }] } });
  assert.deepEqual(ev(two, 'lantern_lit').map((e) => [e.tick, e.data]), [[1, { lantern_id: 'L1', relight: false }], [13, { lantern_id: 'L2', relight: true }]]);
  assert.deepEqual([snapAt(two, 1).player.capacity, snapAt(two, 13).player.capacity], [12, 14]);
});

test('P3-20 vùng an toàn: fuel đúng 30 vẫn chặn/đẩy Bóng Mực; < 30 thì mất vùng, Bóng Mực wander đi tới và hút', () => {
  const L = [20, 0, 0];
  const sc = (fuel) => empty({ lanterns: [{ id: 'L1', pos: L, lit: true, fuel }], shades: [{ id: 'S1', pos: [20, 1, 5], state: 'wander' }] });
  // fuel 30 + 1/60: tick 1 sau khi hao còn đúng 30 → có vùng → bị đẩy ra mép 6 m trong 30 tick
  const keep = runHeadless({ ticks: 30, scenario: sc(30 + 1 / 60) });
  assert.ok(hyp(sh(keep, 29).pos, L) < T.safe_radius);
  assert.ok(hyp(sh(keep, 30).pos, L) >= T.safe_radius - 0.001);
  // fuel 30: tick 1 còn 29.983 → không vùng; đi 1/30 m/tick từ 5 m tới 2 m mất 90 tick → drain ở tick 90
  const lose = runHeadless({ ticks: 91, scenario: sc(30) });
  assert.ok(hyp(sh(lose, 1).pos, L) < 5);
  assert.equal(sh(lose, 89).state, 'wander');
  assert.equal(sh(lose, 90).state, 'drain');
  assert.deepEqual(sh(lose, 91).pos, sh(lose, 90).pos); // đứng yên khi hút
});

test('P3-21 drain: hút 5/s cộng dồn với hao 1/s; fuel_drain mỗi 60 tick; nhiều con cộng dồn; đèn tắt → wander', () => {
  const one = runHeadless({ ticks: 200, scenario: empty({ lanterns: [{ id: 'L1', pos: [20, 0, 0], lit: true, fuel: 20 }],
    shades: [{ id: 'S1', pos: [21, 1, 0], state: 'drain', target_lantern_id: 'L1' }] }) });
  // 20 fuel = 1200 đơn vị, mất 6 đơn vị/tick → tick 60 còn 840 (14.0), tắt ở tick 200
  assert.deepEqual(ev(one, 'fuel_drain').map((e) => [e.tick, e.data]), [
    [60, { lantern_id: 'L1', shade_id: 'S1', fuel: 14 }], [120, { lantern_id: 'L1', shade_id: 'S1', fuel: 8 }], [180, { lantern_id: 'L1', shade_id: 'S1', fuel: 2 }]]);
  assert.deepEqual(ev(one, 'lantern_out').map((e) => e.tick), [200]);
  assert.equal(sh(one, 199).state, 'drain');
  assert.equal(sh(one, 200).state, 'wander');
  const two = runHeadless({ ticks: 60, scenario: empty({ lanterns: [{ id: 'L1', pos: [20, 0, 0], lit: true, fuel: 20 }],
    shades: [{ id: 'S2', pos: [19, 1, 0], state: 'drain', target_lantern_id: 'L1' }, { id: 'S1', pos: [21, 1, 0], state: 'drain', target_lantern_id: 'L1' }] }) });
  // 11 đơn vị/tick → tick 60 còn 540 (9.0); event theo id tăng dần
  assert.deepEqual(ev(two, 'fuel_drain').map((e) => e.data), [{ lantern_id: 'L1', shade_id: 'S1', fuel: 9 }, { lantern_id: 'L1', shade_id: 'S2', fuel: 9 }]);
});

test('P3-22 drain → chase khi Mây vào trong 6 m (không phải 12 m); drain không gây hit', () => {
  const sc = (z) => empty({ player: { pos: [21, 0, z] }, lanterns: [{ id: 'L1', pos: [20, 0, 0], lit: true, fuel: 25 }],
    shades: [{ id: 'S1', pos: [21, 1, 0], state: 'drain', target_lantern_id: 'L1' }] });
  const stay = runHeadless({ ticks: 30, scenario: sc(8) });
  assert.equal(sh(stay, 30).state, 'drain');
  const come = runHeadless({ ticks: 12, scenario: sc(7), inputs: { frames: [{ tick: 0, move: [0, -1] }] } });
  assert.equal(sh(come, 9).state, 'drain');
  assert.equal(sh(come, 10).state, 'chase'); // Mây đi 0.1 m/tick, tới 6 m ở tick 10
});

test('P3-23 Tỏa Sáng trúng Bóng Mực đang drain: stunned, tổng +15; hết choáng về wander', () => {
  const r = runHeadless({ ticks: 121, scenario: empty({ player: { pos: [20, 0, 3], carried: T.pulse_cost }, lanterns: [{ id: 'L1', pos: [20, 0, 0], lit: true, fuel: 25 }],
    shades: [{ id: 'S1', pos: [21, 1, 0], state: 'drain', target_lantern_id: 'L1' }] }), inputs: { frames: [{ tick: 0, pulse: true }] } });
  assert.deepEqual(ev(r, 'pulse')[0].data, { stunned_ids: ['S1'] });
  assert.equal(snapAt(r, 1).score, S.per_stun_drain);
  assert.equal(sh(r, 120).state, 'stunned');
  assert.notEqual(sh(r, 121).state, 'stunned');
  assert.notEqual(sh(r, 121).state, 'drain');
});

test('P3-24 châm lên ≥ 30 khi có Bóng Mực đang hút: về wander, bị đẩy ra mép 6 m trong 30 tick, không gây hit; châm < 30 thì không đẩy', () => {
  const L = [20, 0, 0];
  const sc = (carried, fuel) => empty({ player: { pos: [20, 0, 1.5], carried }, lanterns: [{ id: 'L1', pos: L, lit: true, fuel }],
    shades: [{ id: 'S1', pos: [21, 1, 0], state: 'drain', target_lantern_id: 'L1' }] });
  // fuel 20 → tick 1 sau hao + hút còn 1194 đơn vị; châm 2 → 2394 (39.9)
  const up = runHeadless({ ticks: 90, scenario: sc(2, 20), inputs: E() });
  assert.deepEqual(ev(up, 'refuel')[0].data, { lantern_id: 'L1', amount: 2, fuel: 39.9 });
  assert.equal(sh(up, 1).state, 'wander');
  assert.ok(hyp(sh(up, 29).pos, L) < T.safe_radius);
  assert.ok(hyp(sh(up, 30).pos, L) >= T.safe_radius - 0.001);
  assert.equal(ev(up, 'player_hit').length, 0);
  // fuel 10 → 594 + 600 = 1194 (19.9) < 30: không có vùng, không bị đẩy; Mây trong 6 m nên chuyển chase
  const low = runHeadless({ ticks: 1, scenario: sc(1, 10), inputs: E() });
  assert.deepEqual(ev(low, 'refuel')[0].data, { lantern_id: 'L1', amount: 1, fuel: 19.9 });
  assert.equal(sh(low, 1).state, 'chase');
});

test('P3-25 wander chọn đèn yếu gần nhất (bằng nhau → id nhỏ); không có đèn yếu thì về đèn tắt gần nhất', () => {
  const r = runHeadless({ ticks: 150, scenario: empty({ lanterns: [{ id: 'L2', pos: [20, 0, 10], lit: true, fuel: 20 }, { id: 'L1', pos: [20, 0, 0], lit: true, fuel: 20 }],
    shades: [{ id: 'S1', pos: [20, 1, 5], state: 'wander' }] }) });
  assert.ok(sh(r, 1).pos[2] < 5); // đi về L1 (id nhỏ hơn)
  assert.equal(sh(r, 90).state, 'drain');
  // bắt đầu hút ở bước 2 của tick 91 → 60 tick hút ở tick 150; L1: 1200 − 150 − 60 × 5 = 750 (12.5)
  assert.deepEqual(ev(r, 'fuel_drain')[0], { type: 'event', tick: 150, name: 'fuel_drain', data: { lantern_id: 'L1', shade_id: 'S1', fuel: 12.5 } });
  // không có đèn yếu: từ (0,−30) đi về L3/L4 (cách đều 17.7 m) → chọn L3 (14.7, 0, −20.2)
  const u = runHeadless({ ticks: 60, scenario: empty({ shades: [{ id: 'S1', pos: [0, 1, -30], state: 'wander' }] }) });
  const d = Math.hypot(14.7, 9.8);
  const want = [2 * 14.7 / d, -30 + 2 * 9.8 / d];
  const got = sh(u, 60).pos;
  assert.ok(Math.abs(got[0] - want[0]) < 0.002 && Math.abs(got[2] - want[1]) < 0.002, JSON.stringify(got));
});

test('P3-26 Bóng Mực đang chase không đổi mục tiêu sang đèn yếu', () => {
  const r = runHeadless({ ticks: 30, scenario: empty({ player: { pos: [0, 0, 0], flames: 99 }, lanterns: [{ id: 'L1', pos: [5, 0, 5], lit: true, fuel: 10 }],
    shades: [{ id: 'S1', pos: [6, 1, 6], state: 'chase' }] }) });
  assert.ok(r.snaps.every((s) => s.shades[0].state !== 'drain'));
  assert.ok(hyp(sh(r, 10).pos, [0, 0, 0]) < hyp([6, 0, 6], [0, 0, 0]) - 0.5);
});

test('P3-30 bình minh: đủ ceil(0.6 × tổng) đèn sáng → won dawn_survived; thiếu → lost dawn (Đêm 1/2/3: 3/5, 4/6, 5/7)', () => {
  for (const [night, n, need] of [[1, 5, 3], [2, 6, 4], [3, 7, 5]]) {
    const run = (k) => runHeadless({ night, ticks: 5, scenario: { ...empty({ time_left_s: 1 / 60, lanterns: Array.from({ length: k }, (_, i) => ({ id: `L${i + 1}`, lit: true })) }),
      random_drifters: false, wind_enabled: false, charms: [] } });
    const ok = run(need);
    assert.deepEqual(ev(ok, 'game_over')[0], { type: 'event', tick: 1, name: 'game_over', data: { result: 'won', reason: 'dawn_survived' } }, `Đêm ${night}`);
    const bad = run(need - 1);
    assert.deepEqual(ev(bad, 'game_over')[0].data, { result: 'lost', reason: 'dawn' }, `Đêm ${night}`);
    assert.equal(bad.end.score, 0);
    assert.ok(n > need);
  }
});

test('P3-31 không thắng sớm: thắp đủ 5/5 đèn, Đêm chạy tiếp tới bình minh (240 s)', () => {
  const lit = ['L2', 'L3', 'L4', 'L5'].map((id) => ({ id, lit: true }));
  const r = runHeadless({ ticks: 600, every: 100, scenario: empty({ player: { carried: T.lantern_cost }, lanterns: [{ id: 'L1', pos: [0, 0, 1] }, ...lit] }), inputs: E() });
  assert.equal(ev(r, 'game_over').length, 0);
  assert.deepEqual(r.end, { type: 'end', ticks: 600, state: 'playing', score: T.lantern_cost * S.per_mote + S.per_lantern });
  for (const [n, dur] of [[1, 240], [2, 270], [3, 300]]) assert.equal(runHeadless({ night: n, ticks: 0 }).snaps[0].time_left_s, dur);
});

test('P3-32 điểm bình minh: mỗi đèn sáng +50 + floor(fuel), mỗi Ngọn Lửa +50; không thưởng thời gian', () => {
  const r = runHeadless({ ticks: 5, scenario: empty({ time_left_s: 1 / 60, player: { flames: 2 },
    lanterns: [{ id: 'L1', lit: true, fuel: 50.5 }, { id: 'L2', lit: true, fuel: 30 }, { id: 'L3', lit: true }] }) });
  // sau 1 tick: 50.483 → 50, 29.983 → 29, 99.983 → 99
  assert.equal(r.end.score, 3 * S.per_lantern_dawn + 50 + 29 + 99 + 2 * S.per_flame_left);
  assert.equal(r.end.state, 'won');
});

test('P3-42 scenario v1.2: lit không fuel → 100; đèn tắt có fuel → 0; sai kiểu → mã 2', () => {
  const r = runHeadless({ ticks: 0, scenario: empty({ lanterns: [{ id: 'L1', lit: true }, { id: 'L2', fuel: 50 }, { id: 'L3', lit: true, fuel: 12.34, ever_lit: true, relit_count: 2 }] }) });
  assert.deepEqual(r.snaps[0].lanterns.slice(0, 3).map((L) => [L.lit, L.fuel, L.ever_lit, L.relit_count]), [[true, 100, true, 0], [false, 0, false, 0], [true, 12.3, true, 2]]);
  for (const bad of [{ lanterns: [{ id: 'L1', fuel: 101 }] }, { lanterns: [{ id: 'L1', fuel: -1 }] }, { lanterns: [{ id: 'L1', ever_lit: 'yes' }] },
    { lanterns: [{ id: 'L1', relit_count: 1.5 }] }, { player: { successful_lights: -1 } }, { shades: [{ pos: [0, 1, 0], state: 'drain', target_lantern_id: 1 }] }]) {
    assert.equal(runHeadless({ ticks: 1, scenario: bad }).code, 2, JSON.stringify(bad));
  }
});
