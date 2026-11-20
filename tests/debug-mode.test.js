// Chế độ thử của web: debugLightAll chỉ thắp đèn; thắng do step() xét như thường. Headless không dùng hàm này.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createGame, step, debugLightAll } from '../src/core/world.js';
import { TUNING as T } from '../src/core/tuning.js';

test('debugLightAll: tick kế tiếp thắng all_lit, chỉ có thưởng thời gian + Ngọn Lửa (không điểm thắp đèn)', () => {
  for (const night of [1, 2, 3]) {
    const g = createGame({ seed: 1, night });
    for (let i = 0; i < 59; i++) step(g, {});
    debugLightAll(g);
    assert.equal(g.score, 0);
    const ev = step(g, {}); // tick 60
    assert.deepEqual(ev.at(-1).data, { result: 'won', reason: 'all_lit' });
    const left = g.duration - 1; // còn (thời lượng − 60/60) giây
    assert.equal(g.score, left * T.score.per_second_left + T.flames * T.score.per_flame_left);
  }
});

test('debugLightAll khi đang tạm dừng: thắng ở tick tiếp tục, không phải lúc đang dừng', () => {
  const g = createGame({ seed: 1, night: 2 });
  step(g, { pause: true });
  debugLightAll(g);
  assert.deepEqual(step(g, { pause: false }), []); // vẫn dừng
  assert.equal(g.state, 'paused');
  const ev = step(g, { pause: true }); // tiếp tục → bước 11 xét thắng
  assert.deepEqual(ev.map((e) => e.name), ['resumed', 'game_over']);
  assert.equal(g.state, 'won');
});

test('headless không gọi debugLightAll', () => {
  assert.ok(!fs.readFileSync('src/headless/cli.js', 'utf8').includes('debugLightAll'));
});
