// P2-130 / P2-131: bảng màu chuẩn và công thức ánh sáng môi trường (TICKET-02 Phần 3 mục 8).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PALETTE, ambientIntensity } from '../src/web/palette.js';

// Bảng màu ticket, chép tay từ docs/phases/ticket-02.md
const TICKET = {
  sky: '#0E1430', fog: '#1B2350', grass: '#2F5D50', sand: '#C9B48A', wood: '#6B4A2F', cloudSea: '#12384A',
  lanternLit: '#FFB347', lanternCore: '#FFE9B0', lanternOff: '#5B5F6E', moteCore: '#FFF6C2', moteHalo: '#FFE58A',
  shadeBody: '#120A1A', shadeRim: '#7A3CFF', shadeStunned: '#3A3450', mayShirt: '#E8E2D0', mayScarf: '#C8102E', charm: '#C8102E',
  gold: '#F2C14E', drifter: '#8FA3B8', uiDanger: '#FF5A5F', uiText: '#F5F1E6',
};
const rgb = (hex) => [16, 8, 0].map((s) => (hex >> s) & 255);

test('P2-130 bảng màu web trùng bảng ticket (lệch <= 10% mỗi kênh)', () => {
  for (const [k, hex] of Object.entries(TICKET)) {
    const want = rgb(parseInt(hex.slice(1), 16));
    const got = rgb(PALETTE[k]);
    want.forEach((w, i) => assert.ok(Math.abs(w - got[i]) <= 25.5, `${k}: ${got} vs ${want}`));
  }
  // ticket-02.md có đúng các mã này
  const doc = fs.readFileSync('docs/phases/ticket-02.md', 'utf8').toUpperCase();
  for (const hex of Object.values(TICKET)) assert.ok(doc.includes(hex), hex);
});

test('P2-131 ánh sáng môi trường = 0.15 + 0.55 × (đèn sáng / tổng đèn)', () => {
  assert.equal(ambientIntensity(0, 5), 0.15);
  assert.ok(Math.abs(ambientIntensity(5, 5) - 0.7) < 1e-12);
  assert.ok(Math.abs(ambientIntensity(3, 7) - (0.15 + 0.55 * 3 / 7)) < 1e-12);
});

test('Kiến trúc: src/core không import three/DOM/Math.random/Date.now; web dùng palette và ambientIntensity', () => {
  for (const f of fs.readdirSync('src/core')) {
    const src = fs.readFileSync(`src/core/${f}`, 'utf8').replace(/\/\/.*$/gm, '');
    for (const bad of [/from 'three'/, /\bdocument\./, /\bwindow\./, /Math\.random/, /Date\.now/]) assert.ok(!bad.test(src), `${f}: ${bad}`);
  }
  const scene = fs.readFileSync('src/web/scene.js', 'utf8');
  assert.ok(scene.includes('ambientIntensity(lit, game.lanterns.length)'));
});
