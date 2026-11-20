import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createWorld, step, snapshot } from '../src/core/world.js';

test('đứng yên khi không có input', () => {
  const w = createWorld(1);
  for (let i = 0; i < 10; i++) step(w);
  assert.deepEqual(snapshot(w), { tick: 10, player: { x: 0, z: 0 } });
});

test('di chuyển 1 giây sang phải = PLAYER_SPEED đơn vị', () => {
  const w = createWorld(1);
  for (let i = 0; i < 60; i++) step(w, { dx: 1, dz: 0 });
  assert.equal(snapshot(w).player.x, 4);
});

test('headless tất định: cùng tham số chạy 2 lần ra cùng output', () => {
  const args = ['src/headless/cli.js', '--seed', '7', '--ticks', '120', '--dx', '1', '--dz', '-1'];
  const a = execFileSync(process.execPath, args, { encoding: 'utf8' });
  const b = execFileSync(process.execPath, args, { encoding: 'utf8' });
  assert.equal(a, b);
  assert.doesNotThrow(() => JSON.parse(a));
});
