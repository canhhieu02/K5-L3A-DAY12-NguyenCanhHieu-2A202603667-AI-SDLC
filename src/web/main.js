// Lớp hiển thị: chỉ đọc state từ core và vẽ. Không đặt luật game ở đây.
import * as THREE from 'three';
import { createWorld, step, TICK_DT } from '../core/world.js';

const world = createWorld(1);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x05060a, 0.06);
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);

scene.add(new THREE.HemisphereLight(0x8899ff, 0x111122, 0.6));
const lanternLight = new THREE.PointLight(0xffc066, 2, 12);
scene.add(lanternLight);

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(60, 60),
  new THREE.MeshStandardMaterial({ color: 0x1b2433 })
);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);
// Lưới làm mốc để thấy chuyển động (camera bám theo nhân vật)
const grid = new THREE.GridHelper(60, 30, 0x3a4a66, 0x26324a);
grid.position.y = 0.01;
scene.add(grid);
const hud = document.getElementById('hud');

// Mây (placeholder)
const player = new THREE.Mesh(
  new THREE.CapsuleGeometry(0.35, 0.8, 4, 12),
  new THREE.MeshStandardMaterial({ color: 0x9fd3ff })
);
scene.add(player);

const keys = new Set();
addEventListener('keydown', (e) => keys.add(e.code));
addEventListener('keyup', (e) => keys.delete(e.code));
addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function readInput() {
  const dx = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
  const dz = (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0);
  return { dx, dz };
}

// Fixed-timestep: core luôn chạy bước TICK_DT giống headless.
let acc = 0;
let last = performance.now();
function frame(now) {
  acc += Math.min(0.25, (now - last) / 1000);
  last = now;
  while (acc >= TICK_DT) {
    step(world, readInput());
    acc -= TICK_DT;
  }
  const { x, z } = world.player;
  player.position.set(x, 0.75, z);
  lanternLight.position.set(x, 1.6, z);
  camera.position.set(x, 4, z + 7); // góc nhìn thứ ba phía sau
  camera.lookAt(x, 1, z);
  hud.textContent = `WASD / mũi tên: di chuyển | tick ${world.tick} | x ${x.toFixed(2)} z ${z.toFixed(2)}`;
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
