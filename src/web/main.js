// Lớp hiển thị: chỉ đọc state từ core và vẽ. Mọi luật game nằm trong src/core (chung với headless).
import * as THREE from 'three';
import { createGame, step, timeLeft, TICK_DT } from '../core/world.js';
import { TUNING } from '../core/tuning.js';
import { getMap } from '../core/maps.js';

const WORLD = { island_radius: getMap(1).radius }; // bước 6: dựng cảnh theo map của từng Đêm

// ---------- renderer / scene ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const NIGHT = new THREE.Color(0x07040f);
const DAWNISH = new THREE.Color(0x2a1d3a);
scene.background = NIGHT.clone();
scene.fog = new THREE.FogExp2(0x07040f, 0.035);
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 300);

const hemi = new THREE.HemisphereLight(0x6a5acd, 0x0b0814, 0.35);
scene.add(hemi);

// Đảo tròn + biển mây
const island = new THREE.Mesh(
  new THREE.CylinderGeometry(WORLD.island_radius, WORLD.island_radius - 3, 4, 64),
  new THREE.MeshStandardMaterial({ color: 0x2b2f3f, roughness: 1 })
);
island.position.y = -2;
scene.add(island);
const sea = new THREE.Mesh(new THREE.CircleGeometry(200, 48), new THREE.MeshBasicMaterial({ color: 0x140d26 }));
sea.rotation.x = -Math.PI / 2;
sea.position.y = -3;
scene.add(sea);
const grid = new THREE.PolarGridHelper(WORLD.island_radius, 12, 8, 64, 0x3b3358, 0x2a2440);
grid.position.y = 0.01;
scene.add(grid);

// ---------- Mây: thân + nón lá + đèn lồng nhỏ ----------
const may = new THREE.Group();
const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 0.7, 4, 12), new THREE.MeshStandardMaterial({ color: 0x5aa0d8 }));
body.position.y = 0.7;
const hat = new THREE.Mesh(new THREE.ConeGeometry(0.75, 0.4, 24), new THREE.MeshStandardMaterial({ color: 0xe8d39a }));
hat.position.y = 1.55;
const miniLantern = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffb347 }));
miniLantern.position.set(0.7, 1.25, 0);
const mayLight = new THREE.PointLight(0xffb347, 6, 10, 1.6);
mayLight.position.set(0.7, 1.3, 0);
may.add(body, hat, miniLantern, mayLight);
scene.add(may);

// Vòng tỏa sáng
const pulseRing = new THREE.Mesh(
  new THREE.RingGeometry(0.9, 1, 48),
  new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0, side: THREE.DoubleSide })
);
pulseRing.rotation.x = -Math.PI / 2;
pulseRing.position.y = 0.05;
scene.add(pulseRing);
let pulseAnim = 0;

// ---------- thực thể theo id ----------
const moteGeo = new THREE.SphereGeometry(0.15, 10, 8);
const moteMat = new THREE.MeshBasicMaterial({ color: 0xfff1a0 });
const shadeGeo = new THREE.SphereGeometry(0.7, 20, 14);
const meshes = { motes: new Map(), shades: new Map(), lanterns: new Map() };

function makeLantern(L) {
  const g = new THREE.Group();
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 2.6, 8), new THREE.MeshStandardMaterial({ color: 0x4a3426 }));
  post.position.y = 1.3;
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 12), new THREE.MeshStandardMaterial({ color: 0x553322, emissive: 0x000000 }));
  lamp.position.y = 2.9;
  const light = new THREE.PointLight(0xff9a3c, 0, 18, 1.4);
  light.position.y = 3;
  const safe = new THREE.Mesh(
    new THREE.RingGeometry(TUNING.safe_radius - 0.08, TUNING.safe_radius, 48),
    new THREE.MeshBasicMaterial({ color: 0xffb04a, transparent: true, opacity: 0, side: THREE.DoubleSide })
  );
  safe.rotation.x = -Math.PI / 2;
  safe.position.y = 0.03;
  g.add(post, lamp, light, safe);
  g.userData = { lamp, light, safe };
  g.position.set(L.pos[0], 0, L.pos[2]);
  scene.add(g);
  return g;
}

function sync(map, list, make, update) {
  const seen = new Set();
  for (const e of list) {
    seen.add(e.id);
    let m = map.get(e.id);
    if (!m) { m = make(e); map.set(e.id, m); }
    update(m, e);
  }
  for (const [id, m] of map) if (!seen.has(id)) { scene.remove(m); map.delete(id); }
}

// ---------- input ----------
const keys = new Set();
let camYaw = 0; // độ; 0 = camera nhìn theo -Z (phía sau Mây là +Z)
addEventListener('keydown', (e) => { keys.add(e.code); if (e.code === 'Space') e.preventDefault(); if (e.code === 'KeyR') restart(); });
addEventListener('keyup', (e) => keys.delete(e.code));
let dragging = false;
addEventListener('mousedown', () => (dragging = true));
addEventListener('mouseup', () => (dragging = false));
addEventListener('mousemove', (e) => { if (dragging) camYaw -= e.movementX * 0.3; });
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

function readInput() {
  const k = (...c) => c.some((x) => keys.has(x));
  if (k('KeyQ')) camYaw += 1.5;
  if (k('KeyE')) camYaw -= 1.5;
  // Contract: move [x, z], z dương = +Z khi yaw 0. Camera đứng phía +Z nên "W" (đi ra xa camera) = z âm.
  const x = (k('KeyD', 'ArrowRight') ? 1 : 0) - (k('KeyA', 'ArrowLeft') ? 1 : 0);
  const z = (k('KeyS', 'ArrowDown') ? 1 : 0) - (k('KeyW', 'ArrowUp') ? 1 : 0);
  return {
    move: [x, z],
    cam_yaw_deg: camYaw,
    jump: k('Space'),
    interact: k('KeyF'),
    pulse: k('ShiftLeft', 'ShiftRight', 'KeyJ'),
    dash: k('KeyC', 'KeyL'),
    pause: k('KeyP', 'Escape'),
  };
}

// ---------- game loop ----------
let game;
function restart() {
  for (const map of Object.values(meshes)) { for (const m of map.values()) scene.remove(m); map.clear(); }
  game = createGame({ seed: (Date.now() & 0x7fffffff) >>> 0 });
}
restart();

const hud = document.getElementById('hud');
const banner = document.getElementById('banner');
let acc = 0;
let facing = 0;
let last = performance.now();
const clock = new THREE.Clock();

function frame(now) {
  acc += Math.min(0.25, (now - last) / 1000);
  last = now;
  while (acc >= TICK_DT) {
    const input = readInput();
    const [x, z] = input.move;
    if (x || z) {
      const th = (input.cam_yaw_deg * Math.PI) / 180;
      facing = Math.atan2(x * Math.cos(th) + z * Math.sin(th), -x * Math.sin(th) + z * Math.cos(th));
    }
    const events = step(game, input);
    for (const e of events) if (e.name === 'pulse') pulseAnim = 1;
    acc -= TICK_DT;
  }
  render(clock.getElapsedTime());
  requestAnimationFrame(frame);
}

function render(time) {
  const p = game.player;
  may.position.set(p.pos[0], p.pos[1], p.pos[2]);
  may.rotation.y = facing;
  // nhấp nháy khi đang bất tử
  may.visible = p.invulnTicks === 0 || Math.floor(time * 12) % 2 === 0;
  miniLantern.material.color.setHex(p.carried > 0 ? 0xffd27a : 0x8a6a40);
  mayLight.intensity = 3 + p.carried * 1.2;

  sync(meshes.motes, game.motes, () => {
    const m = new THREE.Mesh(moteGeo, moteMat);
    scene.add(m);
    return m;
  }, (m, e) => m.position.set(e.pos[0], 0.8 + Math.sin(time * 3 + e.pos[0]) * 0.2, e.pos[2]));

  sync(meshes.shades, game.shades, () => {
    const m = new THREE.Mesh(shadeGeo, new THREE.MeshStandardMaterial({ color: 0x2a0f3d, emissive: 0x3a0a5a, transparent: true, opacity: 0.9 }));
    scene.add(m);
    return m;
  }, (m, e) => {
    m.position.set(e.pos[0], 1 + Math.sin(time * 2 + e.pos[2]) * 0.15, e.pos[2]);
    const stunned = e.state === 'stunned';
    m.material.opacity = stunned ? 0.35 : 0.9;
    m.scale.setScalar(stunned ? 0.75 : 1);
  });

  let lit = 0;
  sync(meshes.lanterns, game.lanterns, makeLantern, (g, L) => {
    const { lamp, light, safe } = g.userData;
    const fill = L.deposited / TUNING.lantern_cost;
    if (L.lit) lit++;
    lamp.material.emissive.setHex(L.lit ? 0xff8a1e : 0x000000);
    lamp.material.emissiveIntensity = L.lit ? 1.2 : 0;
    lamp.material.color.setHex(L.lit ? 0xffb347 : fill > 0 ? 0x8a5a2a : 0x553322);
    light.intensity = L.lit ? 40 : fill * 6;
    safe.material.opacity = L.lit ? 0.35 : 0;
  });

  // Đảo sáng dần khi thắp đèn
  const k = lit / TUNING.lantern_count_night1;
  scene.background.copy(NIGHT).lerp(DAWNISH, k);
  scene.fog.color.copy(scene.background);
  scene.fog.density = 0.035 - 0.02 * k;
  hemi.intensity = 0.35 + 0.6 * k;

  if (pulseAnim > 0) {
    pulseAnim = Math.max(0, pulseAnim - 0.04);
    const r = TUNING.pulse_radius * (1 - pulseAnim);
    pulseRing.scale.setScalar(Math.max(0.01, r));
    pulseRing.position.set(p.pos[0], 0.05, p.pos[2]);
    pulseRing.material.opacity = pulseAnim;
  }

  // Camera góc nhìn thứ ba, xoay theo camYaw
  const th = (camYaw * Math.PI) / 180;
  const back = [Math.sin(th), Math.cos(th)];
  camera.position.set(p.pos[0] + back[0] * 8, p.pos[1] + 5, p.pos[2] + back[1] * 8);
  camera.lookAt(p.pos[0], p.pos[1] + 1, p.pos[2]);

  const tl = Math.max(0, timeLeft(game));
  const mm = String(Math.floor(tl / 60)).padStart(2, '0');
  const ss = String(Math.floor(tl % 60)).padStart(2, '0');
  hud.innerHTML =
    `Đêm 1 – Đảo Bến<br>` +
    `Ngọn lửa: ${'♥'.repeat(p.flames)}${'·'.repeat(Math.max(0, TUNING.flames - p.flames))}<br>` +
    `Đom đóm: ${p.carried}/${TUNING.carry_capacity}<br>` +
    `Đèn đã thắp: ${lit}/${TUNING.lantern_count_night1}<br>` +
    `Thời gian: ${mm}:${ss}<br>` +
    `Điểm: ${game.score}` +
    (p.pulseCdTicks > 0 ? `<br>Tỏa sáng: hồi ${(p.pulseCdTicks / 60).toFixed(1)}s` : '') +
    (p.dashCdTicks > 0 ? `<br>Lướt: hồi ${(p.dashCdTicks / 60).toFixed(1)}s` : '') +
    (game.state === 'paused' ? '<br><b>TẠM DỪNG</b> (P / Esc để tiếp tục)' : '');

  if (game.state === 'won' || game.state === 'lost') {
    banner.style.display = 'flex';
    document.getElementById('banner-title').textContent = game.state === 'won' ? 'Đảo đã sáng lại!' : 'Ánh sáng đã tắt…';
    document.getElementById('banner-sub').textContent = `Điểm: ${game.score}`;
  } else banner.style.display = 'none';

  renderer.render(scene, camera);
}

requestAnimationFrame(frame);
