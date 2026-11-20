// Chế độ thử của web: debugWinNight thắp mọi đèn đầy dầu và tua tới bình minh; thắng do step() xét như thường.
// Cập nhật Phase 3: debugLightAll (thắp hết → thắng all_lit) bỏ vì TICKET-03 không còn thắng sớm.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createGame, step, debugWinNight } from '../src/core/world.js';
import { TUNING as T } from '../src/core/tuning.js';

test('debugWinNight: tick kế tiếp là bình minh, thắng dawn_survived, chỉ có thưởng bình minh (không điểm thắp đèn)', () => {
  for (const night of [1, 2, 3]) {
    const g = createGame({ seed: 1, night });
    for (let i = 0; i < 59; i++) step(g, {});
    debugWinNight(g);
    assert.equal(g.score, 0);
    const ev = step(g, {}); // tick 60
    assert.deepEqual(ev.at(-1).data, { result: 'won', reason: 'dawn_survived' });
    // mỗi đèn hao 1/60 trong tick bình minh → floor(fuel) = 99
    assert.equal(g.score, g.lanterns.length * (T.score.per_lantern_dawn + 99) + T.flames * T.score.per_flame_left);
  }
});

test('debugWinNight khi đang tạm dừng: thắng ở tick tiếp tục, không phải lúc đang dừng', () => {
  const g = createGame({ seed: 1, night: 2 });
  step(g, { pause: true });
  debugWinNight(g);
  assert.deepEqual(step(g, { pause: false }), []); // vẫn dừng
  assert.equal(g.state, 'paused');
  const ev = step(g, { pause: true }); // tiếp tục → bước 11 xét bình minh
  assert.deepEqual(ev.map((e) => e.name), ['resumed', 'game_over']);
  assert.equal(g.state, 'won');
});

test('headless không gọi hàm chế độ thử', () => {
  const src = fs.readFileSync('src/headless/cli.js', 'utf8');
  assert.ok(!src.includes('debugWinNight') && !src.includes('debugLightAll'));
});
