// Test tính năng mới Phase 2: Gió Lạc (E1) và Bùa Gió (E2) trong docs/phases/phase-2.md.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runHeadless, empty, snapAt, ev } from './helpers.js';
import { TUNING as T } from '../src/core/tuning.js';

const dr = (r, tick, id = 'D1') => snapAt(r, tick).drifters.find((d) => d.id === id);
const calm = (extra = {}) => empty({ random_drifters: false, wind_enabled: false, charms: [], ...extra });

test('P2-60 Gió Lạc: Đêm 2/3 sinh D1 ở tick 1200, D2 ở 2400, tối đa 2; Đêm 1 không có', () => {
  for (const night of [2, 3]) {
    const r = runHeadless({ night, seed: 3, ticks: 3600, every: 1200, scenario: { player: { flames: 99 }, wind_enabled: false } });
    assert.deepEqual(snapAt(r, 1199 - 1199 % 1200).drifters, []);
    assert.deepEqual(snapAt(r, 1200).drifters.map((d) => [d.id, d.state, d.stolen]), [['D1', 'idle', 0]]);
    assert.deepEqual(snapAt(r, 2400).drifters.map((d) => d.id), ['D1', 'D2']);
    assert.deepEqual(snapAt(r, 3600).drifters.map((d) => d.id), ['D1', 'D2']); // đã đủ 2 con
  }
  const n1 = runHeadless({ night: 1, ticks: 2400, every: 1200, scenario: { player: { flames: 99 } } });
  assert.ok(n1.snaps.every((s) => s.drifters.length === 0));
});

test('P2-61 idle → chase khi Mây mang >= 5 và cách <= 15 m (7 m/s); thiếu điều kiện thì idle', () => {
  const sc = (carried, x) => calm({ player: { carried }, drifters: [{ id: 'D1', pos: [x, 1.5, 0] }] });
  const yes = runHeadless({ ticks: 30, scenario: sc(5, 10) });
  assert.equal(dr(yes, 1).state, 'chase');
  assert.ok(Math.abs(dr(yes, 30).pos[0] - (10 - 7 * 0.5)) < 0.002);
  assert.equal(dr(runHeadless({ ticks: 1, scenario: sc(4, 10) }), 1).state, 'idle');
  assert.equal(dr(runHeadless({ ticks: 1, scenario: sc(5, 15.5) }), 1).state, 'idle');
  // đang chase mà Mây nạp hết (còn < 5) thì về idle
  const lose = runHeadless({ ticks: 3, scenario: calm({ player: { carried: 5 }, lanterns: [{ id: 'L1', pos: [0, 0, 1] }], drifters: [{ id: 'D1', pos: [10, 1.5, 0] }] }),
    inputs: { frames: [{ tick: 1, interact: true }] } });
  assert.deepEqual([dr(lose, 1).state, dr(lose, 2).state], ['chase', 'idle']);
});

test('P2-62 Gió Lạc chạm (XZ <= 1.2 m): cướp min(3, carried) kể cả khi Mây bất tử, flee 240 tick rồi removed, mỗi con cướp 1 lần', () => {
  const r = runHeadless({ ticks: 400, scenario: calm({ player: { carried: 5, invuln_ticks: 300 }, drifters: [{ id: 'D1', pos: [10, 1.5, 0] }] }) });
  const st = ev(r, 'drifter_steal');
  assert.equal(st.length, 1);
  assert.equal(st[0].tick, Math.ceil(((10 - 1.2) / 7) * 60)); // 76
  assert.deepEqual(st[0].data, { drifter_id: 'D1', amount: 3, carried: 2 });
  const k = st[0].tick;
  assert.deepEqual([dr(r, k).state, dr(r, k).stolen], ['flee', 3]);
  assert.equal(snapAt(r, k).player.flames, T.flames);
  assert.equal(dr(r, k + 239).state, 'flee');
  assert.equal(dr(r, k + 240).state, 'removed');
  assert.equal(snapAt(r, 400).player.carried, 2);
  const little = runHeadless({ ticks: 100, scenario: calm({ player: { carried: 5 }, drifters: [{ id: 'D1', pos: [0.5, 1.5, 0] }] }) });
  assert.deepEqual(ev(little, 'drifter_steal')[0].data, { drifter_id: 'D1', amount: 3, carried: 2 });
});

test('P2-63 Tỏa Sáng trúng Gió Lạc đang chase: chuyển flee, không cướp, không cộng điểm', () => {
  const r = runHeadless({ ticks: 120, scenario: calm({ player: { carried: 8 }, drifters: [{ id: 'D1', pos: [4, 1.5, 0], state: 'chase' }] }),
    inputs: { frames: [{ tick: 0, pulse: true }] } });
  assert.deepEqual(ev(r, 'pulse')[0].data, { stunned_ids: [] });
  assert.deepEqual([dr(r, 1).state, dr(r, 1).stolen], ['flee', 0]);
  assert.equal(ev(r, 'drifter_steal').length, 0);
  assert.equal(snapAt(r, 1).score, 0);
});

test('P2-64 Tỏa Sáng trúng Gió Lạc flee đang mang: drifter_drop, đom đóm rơi tại chỗ, biến mất sau 120 tick', () => {
  const r = runHeadless({ ticks: 130, scenario: calm({ player: { carried: T.pulse_cost }, drifters: [{ id: 'D1', pos: [3, 1.5, 0], state: 'flee', stolen: 3 }] }),
    inputs: { frames: [{ tick: 0, pulse: true }] } });
  assert.deepEqual(ev(r, 'drifter_drop').map((e) => [e.tick, e.data]), [[1, { drifter_id: 'D1', amount: 3 }]]);
  const drops = snapAt(r, 1).motes.filter((m) => m.kind === 'dropped');
  assert.deepEqual(drops.map((m) => m.pos), [[3, 0, 0], [3, 0, 0], [3, 0, 0]]);
  assert.equal(dr(r, 1).stolen, 0);
  assert.equal(dr(r, 120).state, 'flee');
  assert.equal(dr(r, 121).state, 'removed');
});

test('P2-65 vùng an toàn của đèn không chặn Gió Lạc', () => {
  const r = runHeadless({ ticks: 100, scenario: calm({ player: { carried: 5 }, lanterns: [{ id: 'L1', pos: [5, 0, 0], lit: true }], drifters: [{ id: 'D1', pos: [10, 1.5, 0] }] }) });
  assert.equal(ev(r, 'drifter_steal').length, 1);
});

test('P2-70 Bùa Gió mặc định: Đêm 2 C1 (35,0,0); Đêm 3 C1 (30,0,25), C2 (−30,0,25); Đêm 1 không có', () => {
  const ids = (night) => runHeadless({ night, ticks: 1 }).snaps[0].charms;
  assert.deepEqual(ids(1), []);
  assert.deepEqual(ids(2), [{ id: 'C1', available: true, respawn_s: 0 }]);
  assert.deepEqual(ids(3).map((c) => c.id), ['C1', 'C2']);
  // vị trí: đứng ngay đó thì nhặt được ở tick 1
  for (const [night, pos, id] of [[2, [35, 0, 0], 'C1'], [3, [30, 0, 25], 'C1'], [3, [-30, 0, 25], 'C2']]) {
    const r = runHeadless({ night, ticks: 1, scenario: { player: { pos }, random_drifters: false, wind_enabled: false } });
    assert.equal(ev(r, 'charm_picked')[0].data.charm_id, id);
  }
});

test('P2-71 nhặt bùa: charm_picked {charm_id, charm_ticks: 600}; charm_s 10, respawn_s 45', () => {
  const r = runHeadless({ night: 2, ticks: 1, scenario: calm({ charms: [{ id: 'C1' }], player: { pos: [34.5, 0, 0] } }) });
  assert.deepEqual(ev(r, 'charm_picked')[0], { type: 'event', tick: 1, name: 'charm_picked', data: { charm_id: 'C1', charm_ticks: 600 } });
  assert.equal(snapAt(r, 1).player.charm_s, 10);
  assert.deepEqual(snapAt(r, 1).charms, [{ id: 'C1', available: false, respawn_s: 45 }]);
});

test('P2-72 trong hiệu lực: chạy 7.2 m/s; lướt không hồi chiêu nhưng phải nhấn lại; nhấn khi đang lướt bị bỏ qua; lướt vẫn 14 m/s x 12 tick', () => {
  const run = runHeadless({ ticks: 60, scenario: calm({ player: { charm_ticks: 600 } }), inputs: { frames: [{ tick: 0, move: [0, 1] }] } });
  assert.deepEqual(snapAt(run, 60).player.pos, [0, 0, 7.2]);
  const d = runHeadless({ ticks: 40, scenario: calm({ player: { charm_ticks: 600 } }), inputs: { frames: [
    { tick: 0, dash: true }, { tick: 1, dash: false }, { tick: 5, dash: true }, { tick: 6, dash: false }, // tick 6: đang lướt → bỏ qua
    { tick: 12, dash: true }, { tick: 13, dash: false }, // tick 13: lướt 1 vừa xong (1..12), không chờ hồi chiêu
    { tick: 20, dash: true }, { tick: 21, dash: false }, // tick 21: lướt 2 còn tới tick 24 → bỏ qua
    { tick: 24, dash: true }, // tick 25: được
  ] } });
  assert.deepEqual(ev(d, 'dash').map((e) => e.tick), [1, 13, 25]);
  assert.deepEqual(snapAt(d, 12).player.pos, [0, 0, 2.8]);
  const held = runHeadless({ ticks: 60, scenario: calm({ player: { charm_ticks: 600 } }), inputs: { frames: [{ tick: 0, dash: true }] } });
  assert.equal(ev(held, 'dash').length, 1);
});

test('P2-73 nhặt bùa khác khi đang hiệu lực: làm mới 600 tick', () => {
  const r = runHeadless({ ticks: 40, scenario: calm({ charms: [{ id: 'C1', pos: [0, 0, 0] }, { id: 'C2', pos: [0, 0, 3] }] }), inputs: { frames: [{ tick: 0, move: [0, 1] }] } });
  const picks = ev(r, 'charm_picked');
  assert.deepEqual(picks.map((e) => e.data.charm_id), ['C1', 'C2']);
  assert.equal(snapAt(r, picks[1].tick).player.charm_s, 10);
  assert.ok(snapAt(r, picks[1].tick - 1).player.charm_s < 10);
});

test('P2-74 bùa xuất hiện lại sau 2700 tick', () => {
  const r = runHeadless({ night: 2, ticks: 2702, every: 1, scenario: calm({ charms: [{ id: 'C1' }], player: { pos: [35, 0, 0] } }),
    inputs: { frames: [{ tick: 1, move: [-1, 0] }, { tick: 120, move: [0, 0] }] } });
  assert.equal(ev(r, 'charm_picked').length, 1);
  assert.equal(snapAt(r, 2700).charms[0].available, false);
  assert.equal(snapAt(r, 2701).charms[0].available, true);
});

test('P2-41 scenario drifters/charms thay thế mặc định; sai định dạng → mã 2', () => {
  const r = runHeadless({ night: 3, ticks: 1, scenario: { charms: [], drifters: [{ id: 'D7', pos: [5, 1.5, 5], state: 'flee', stolen: 2 }] } });
  assert.deepEqual(r.snaps[0].charms, []);
  assert.deepEqual(r.snaps[0].drifters, [{ id: 'D7', pos: [5, 1.5, 5], state: 'flee', stolen: 2 }]);
  for (const bad of [{ drifters: [{ pos: [0, 0] }] }, { drifters: [{ pos: [0, 0, 0], state: 'angry' }] }, { charms: [{ pos: [0, 0, 0] }] }, { charms: [{ id: 'C9' }] }]) {
    assert.equal(runHeadless({ night: 2, ticks: 1, scenario: bad }).code, 2, JSON.stringify(bad));
  }
});
