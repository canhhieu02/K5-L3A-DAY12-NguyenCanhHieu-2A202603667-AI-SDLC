// Test bản đồ chuẩn 3 Đêm (docs/phases/phase-2.md mục D). Mã P2-xx khớp bảng tiêu chí.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runHeadless, empty, snapAt, ev } from './helpers.js';
import { TUNING as T } from '../src/core/tuning.js';

const hyp = (p, q) => Math.hypot(p[0] - q[0], p[2] - q[2]);
const deg = (d) => (d * Math.PI) / 180;
const quiet = (extra = {}) => empty({ wind_enabled: false, random_drifters: false, drifters: [], charms: [], ...extra });
const lanternsOf = (r) => r.snaps[0].lanterns.map((L) => [L.id, L.pos]);
const landing = (r, after = 1) => r.snaps.find((s) => s.tick > after && s.player.grounded);

test('P2-50 Đêm 1: đèn chuẩn, Mây ở (0,0,0), không gió/bục', () => {
  const r = runHeadless({ night: 1, ticks: 1 });
  assert.deepEqual(lanternsOf(r), [['L1', [0, 0, 25]], ['L2', [23.8, 0, 7.7]], ['L3', [14.7, 0, -20.2]], ['L4', [-14.7, 0, -20.2]], ['L5', [-23.8, 0, 7.7]]]);
  assert.deepEqual(r.snaps[0].player.pos, [0, 0, 0]);
  assert.equal(r.snaps[0].night, 1);
});

test('P2-03 --night 2 / 3: đúng thời lượng, night_start', () => {
  for (const [n, dur] of [[2, T.night2_duration_s], [3, T.night3_duration_s]]) {
    const r = runHeadless({ night: n, ticks: 1 });
    assert.equal(r.code, 0, r.stderr);
    assert.equal(r.snaps[0].time_left_s, dur);
    assert.equal(r.snaps[0].night, n);
    assert.deepEqual(r.events[0].data, { night: n });
  }
});

test('P2-52 Đêm 2: 6 đèn chuẩn, 2 đảo + cầu; bước khỏi cầu thì rơi', () => {
  const r = runHeadless({ night: 2, ticks: 1 });
  assert.deepEqual(lanternsOf(r), [['L1', [0, 0, 20]], ['L2', [17, 0, -10]], ['L3', [-17, 0, -10]], ['L4', [70, 0, 20]], ['L5', [87, 0, -10]], ['L6', [53, 0, -10]]]);
  assert.equal(r.snaps[0].motes_active, 20);
  // đi từ đảo A qua cầu sang đảo B không rơi
  const cross = runHeadless({ night: 2, ticks: 500, scenario: quiet({ player: { pos: [10, 0, 0] } }), inputs: { frames: [{ tick: 0, move: [1, 0] }] } });
  assert.equal(ev(cross, 'player_hit').length, 0);
  assert.ok(snapAt(cross, 500).player.pos[0] > 55 && snapAt(cross, 500).player.grounded);
  // đứng giữa cầu đi sang +Z: rơi ngay sau mép z = 2
  const off = runHeadless({ night: 2, ticks: 120, scenario: quiet({ player: { pos: [35, 0, 0] } }), inputs: { frames: [{ tick: 0, move: [0, 1] }] } });
  assert.equal(snapAt(off, 20).player.grounded, true);
  assert.equal(snapAt(off, 21).player.grounded, false);
  assert.equal(ev(off, 'player_hit')[0].data.by, 'fall');
});

test('P2-53 Đêm 2 bục nhảy: phóng vy 14 + 24 m/s về tâm đảo kia, phím không ghi đè, đáp trong đảo đích sau ~1.4 s', () => {
  const still = runHeadless({ night: 2, ticks: 120, scenario: quiet({ player: { pos: [20, 0, 18] } }) });
  const s1 = snapAt(still, 1).player;
  assert.equal(s1.grounded, false);
  assert.ok(Math.abs(Math.hypot(s1.vel[0], s1.vel[2]) - 24) < 0.001);
  assert.ok(s1.vel[0] > 0); // hướng về đảo B
  const land = landing(still);
  assert.ok(land.tick >= 83 && land.tick <= 85, String(land.tick));
  assert.ok(hyp(land.player.pos, [70, 0, 0]) < 28);
  assert.equal(ev(still, 'player_hit').length, 0);
  const steer = runHeadless({ night: 2, ticks: 120, scenario: quiet({ player: { pos: [20, 0, 18] } }), inputs: { frames: [{ tick: 0, move: [-1, 0] }] } });
  assert.deepEqual(landing(steer).player.pos, land.player.pos);
  // bục bên đảo B đưa về đảo A
  const back = runHeadless({ night: 2, ticks: 120, scenario: quiet({ player: { pos: [50, 0, -18] } }) });
  assert.ok(hyp(landing(back).player.pos, [0, 0, 0]) < 28);
});

test('P2-53 vẫn lướt được khi đang bay từ bục', () => {
  const r = runHeadless({ night: 2, ticks: 120, scenario: quiet({ player: { pos: [20, 0, 18] } }), inputs: { frames: [{ tick: 10, dash: true }] } });
  assert.deepEqual(ev(r, 'dash').map((e) => e.tick), [11]);
  assert.equal(snapAt(r, 15).player.pos[1], snapAt(r, 10).player.pos[1]);
});

test('P2-54 Đêm 3: 7 đèn chuẩn, xuất phát (0,0,-12)', () => {
  const r = runHeadless({ night: 3, ticks: 1 });
  assert.deepEqual(lanternsOf(r), [['L1', [0, 6, 6]], ['L2', [18, 3, 10]], ['L3', [-18, 3, 10]], ['L4', [35, 0, -10]], ['L5', [-35, 0, -10]], ['L6', [20, 0, -35]], ['L7', [-20, 0, -35]]]);
  assert.deepEqual(r.snaps[0].player.pos, [0, 0, -12]);
  for (const m of r.snaps[0].motes) {
    const rr = Math.hypot(m.pos[0], m.pos[2]);
    const y = { 34: 0, 18: 3, 5: 6 }[Math.round(rr)];
    assert.equal(m.pos[1], y, JSON.stringify(m.pos));
  }
});

test('P2-54 Đêm 3: vách tầng 1 chặn đi lên; dốc 30° đưa lên tầng 1; bước khỏi mép trong rơi xuống tầng 0', () => {
  const wall = runHeadless({ night: 3, ticks: 60, scenario: quiet({ player: { pos: [0, 0, 27] } }), inputs: { frames: [{ tick: 0, move: [0, -1] }] } });
  const pw = snapAt(wall, 60).player;
  assert.ok(Math.hypot(pw.pos[0], pw.pos[2]) > 24 && pw.pos[1] === 0, JSON.stringify(pw.pos));

  const [c, s] = [Math.cos(deg(30)), Math.sin(deg(30))];
  const ramp = runHeadless({ night: 3, ticks: 240, scenario: quiet({ player: { pos: [31 * c, 0, 31 * s] } }), inputs: { frames: [{ tick: 0, move: [-c, -s] }] } });
  const r = (tick) => Math.hypot(snapAt(ramp, tick).player.pos[0], snapAt(ramp, tick).player.pos[2]);
  const mid = ramp.snaps.find((x) => Math.abs(r(x.tick) - 27) < 0.06);
  assert.ok(Math.abs(mid.player.pos[1] - 1.5) < 0.06, JSON.stringify(mid.player.pos)); // giữa dốc
  const top = ramp.snaps.find((x) => r(x.tick) < 20);
  assert.equal(top.player.pos[1], 3);
  assert.equal(top.player.grounded, true);
  // tiếp tục vào trong: qua mép r = 12 thì rơi xuống tầng 0 (không phải rơi khỏi đảo)
  const end = snapAt(ramp, 240).player;
  assert.ok(Math.hypot(end.pos[0], end.pos[2]) < 12 && end.pos[1] === 0 && end.grounded);
  assert.equal(ev(ramp, 'player_hit').length, 0);
});

test('P2-54 Đêm 3: tháp chuông chặn; bước khỏi tầng 2 rơi xuống', () => {
  const tower = runHeadless({ night: 3, ticks: 60, scenario: quiet({ player: { pos: [0, 6, 5] } }), inputs: { frames: [{ tick: 0, move: [0, -1] }] } });
  const pt = snapAt(tower, 60).player.pos;
  assert.ok(pt[2] >= 2 && pt[1] === 6, JSON.stringify(pt));
  const drop = runHeadless({ night: 3, ticks: 120, scenario: quiet({ player: { pos: [0, 6, -5] } }), inputs: { frames: [{ tick: 0, move: [0, -1] }] } });
  const pd = snapAt(drop, 120).player;
  assert.ok(pd.pos[2] < -8 && pd.pos[1] === 0 && pd.grounded, JSON.stringify(pd));
  assert.equal(ev(drop, 'player_hit').length, 0);
});

test('P2-55 Đêm 3 bục (0,3,13): vy 12 + 8 m/s hướng −Z, đáp lên tầng 2', () => {
  const r = runHeadless({ night: 3, ticks: 120, scenario: quiet({ player: { pos: [0, 3, 13] } }) });
  assert.deepEqual(snapAt(r, 1).player.vel.map((v) => Math.round(v)), [0, 12, -8].map((v, i) => (i === 1 ? Math.round(12 - 20 / 60) : v)));
  const land = landing(r);
  assert.equal(land.player.pos[1], 6);
  assert.ok(Math.hypot(land.player.pos[0], land.player.pos[2]) <= 8);
});

test('P2-56 Đêm 3 gió: mỗi 30 s một cơn 5 s, đẩy Mây 2 m/s; wind_enabled:false thì không có', () => {
  const sc = empty({ player: { flames: 9 } });
  const r = runHeadless({ night: 3, seed: 4, ticks: 3700, every: 1, scenario: sc });
  const act = (k) => snapAt(r, k).wind.active;
  assert.deepEqual([act(1799), act(1800), act(2099), act(2100), act(3600)], [false, true, true, false, true]);
  const dir = snapAt(r, 1800).wind.dir_deg;
  assert.ok(Number.isInteger(dir) && dir >= 0 && dir < 360);
  const [a, b] = [snapAt(r, 1800).player.pos, snapAt(r, 1801).player.pos];
  const v = [(b[0] - a[0]) * 60, (b[2] - a[2]) * 60];
  assert.ok(Math.abs(v[0] - 2 * Math.cos(deg(dir))) < 0.1 && Math.abs(v[1] - 2 * Math.sin(deg(dir))) < 0.1, JSON.stringify(v));
  const off = runHeadless({ night: 3, ticks: 1900, every: 100, scenario: { ...sc, wind_enabled: false } });
  assert.ok(off.snaps.every((s) => !s.wind.active));
  const n1 = runHeadless({ night: 1, ticks: 1900, every: 100, scenario: empty({ player: { flames: 9 } }) });
  assert.ok(n1.snaps.every((s) => !s.wind.active));
});

test('P2-23 / P2-30 Đêm 3: Bóng Mực 4.5 m/s; lịch sinh Đêm 2 mỗi 420 tick, Đêm 3 mỗi 360 tick', () => {
  const sp = runHeadless({ night: 3, ticks: 60, scenario: quiet({ shades: [{ id: 'S1', pos: [0, 1, -2] }] , player: { pos: [0, 0, -12] } }) });
  assert.ok(Math.abs(hyp(snapAt(sp, 60).shades[0].pos, [0, 0, -12]) - (10 - 4.5)) < 0.002);
  for (const [n, iv] of [[2, 420], [3, 360]]) {
    const r = runHeadless({ night: n, seed: 2, ticks: 300 + iv, every: 50, scenario: { player: { flames: 99 }, wind_enabled: false } });
    assert.deepEqual(ev(r, 'shade_spawned').map((e) => e.tick), [300, 300, 300 + iv]);
  }
});
