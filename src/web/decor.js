// Trang trí chỉ để nhìn (không va chạm, không ảnh hưởng luật/headless): vách đá dưới đảo, núi xa, mây bồng bềnh,
// cỏ nhiều sắc, cây, bụi, hoa, đá. Đặt theo seed cố định mỗi Đêm, tránh đèn/điểm sinh/bục nhảy/bùa.
// Mặt đất chơi được vẫn đúng map.groundAt (bản đồ chuẩn TICKET-02): mọi thứ ở đây chỉ đặt LÊN mặt đất đó.
// Cảnh bench (TICKET-04) không gọi module này.
import * as THREE from 'three';
import { createRng } from '../core/rng.js';
import { PALETTE as C } from './palette.js';

const tmp = new THREE.Object3D();
const col = new THREE.Color();

/** Màu lệch ngẫu nhiên quanh màu gốc, mỗi kênh tối đa ±amt (tỉ lệ). */
function jitter(hex, rng, amt) {
  col.setHex(hex);
  const k = 1 + (rng() * 2 - 1) * amt;
  return col.setRGB(Math.min(1, col.r * k), Math.min(1, col.g * k), Math.min(1, col.b * k)).clone();
}

function instanced(geo, mat, list, rng, colorOf) {
  const m = new THREE.InstancedMesh(geo, mat, Math.max(1, list.length));
  m.count = list.length;
  list.forEach((t, i) => {
    tmp.position.set(t.x, t.y, t.z);
    tmp.rotation.set(t.rx || 0, t.ry || 0, t.rz || 0);
    tmp.scale.set(t.sx ?? t.s, t.sy ?? t.s, t.sz ?? t.s);
    tmp.updateMatrix();
    m.setMatrixAt(i, tmp.matrix);
    if (colorOf) m.setColorAt(i, colorOf(t, rng));
  });
  m.instanceMatrix.needsUpdate = true;
  if (m.instanceColor) m.instanceColor.needsUpdate = true;
  return m;
}

// ---------- vách đá gồ ghề dưới một đảo tròn (mép trên giữ đúng bán kính chơi) ----------
export function rockyIsland(x, z, r, rng, depth = 11) {
  const g = new THREE.Group();
  const geo = new THREE.CylinderGeometry(r, r * 0.45, depth, 56, 7, true);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    if (y > depth / 2 - 1e-6) continue; // vòng mép trên: giữ nguyên để khớp mép đảo
    const a = Math.atan2(pos.getZ(i), pos.getX(i));
    const t = (depth / 2 - y) / depth; // 0 ở trên → 1 ở đáy
    const n = Math.sin(a * 7 + y) * 0.5 + Math.sin(a * 13 - y * 2) * 0.35 + (rng() - 0.5) * 0.9;
    const k = 1 + n * 0.09 * Math.min(1, t * 4);
    pos.setX(i, pos.getX(i) * k);
    pos.setZ(i, pos.getZ(i) * k);
    pos.setY(i, y + (rng() - 0.5) * 0.8 * t);
  }
  geo.computeVertexNormals();
  const cliff = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: 0x7d6a4f, flatShading: true }));
  cliff.position.set(x, -depth / 2 - 0.02, z);
  // chóp đá treo bên dưới
  const tip = new THREE.Mesh(new THREE.ConeGeometry(r * 0.45, r * 0.5, 9), new THREE.MeshLambertMaterial({ color: 0x5f5140, flatShading: true }));
  tip.rotation.x = Math.PI;
  tip.position.set(x, -depth - r * 0.25, z);
  // dải cát mép đảo + thảm cỏ nhiều sắc (vertex color quanh màu cỏ chuẩn, lệch < 10%)
  const sand = new THREE.Mesh(new THREE.RingGeometry(r - 1.4, r, 64, 1), new THREE.MeshLambertMaterial({ color: C.sand }));
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(x, 0.002, z);
  const grassGeo = new THREE.RingGeometry(0.001, r - 1.2, 64, 10); // nhiều vòng để tô màu loang
  const gp = grassGeo.attributes.position;
  const colors = new Float32Array(gp.count * 3);
  for (let i = 0; i < gp.count; i++) {
    const c = jitter(C.grass, rng, 0.08);
    const px = gp.getX(i) + x;
    const py = gp.getY(i) - z;
    const patch = 0.06 * Math.sin(px * 0.21) * Math.cos(py * 0.17); // mảng cỏ đậm/nhạt
    colors.set([c.r * (1 + patch), c.g * (1 + patch), c.b * (1 + patch)], i * 3);
  }
  grassGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const grass = new THREE.Mesh(grassGeo, new THREE.MeshLambertMaterial({ vertexColors: true }));
  grass.rotation.x = -Math.PI / 2;
  grass.position.set(x, 0.005, z);
  g.add(cliff, tip, sand, grass);
  return g;
}

// ---------- núi xa nhô lên khỏi biển mây (bóng núi, không bị sương che) ----------
function mountains(rng, center, minR) {
  const g = new THREE.Group();
  const n = 13;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rng() * 0.35;
    const d = minR + 130 + rng() * 90;
    const h = 22 + rng() * 38;
    const geo = new THREE.ConeGeometry(22 + rng() * 26, h, 10, 6);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    for (let v = 0; v < pos.count; v++) {
      const y = pos.getY(v);
      if (y < h / 2 - 1e-6) {
        pos.setX(v, pos.getX(v) * (0.8 + rng() * 0.4));
        pos.setZ(v, pos.getZ(v) * (0.8 + rng() * 0.4));
        pos.setY(v, y + (rng() - 0.5) * 3);
      }
      const t = (pos.getY(v) + h / 2) / h; // chân tối, đỉnh sáng ánh trăng
      col.setHex(0x141a36).lerp(new THREE.Color(0x3c4a7a), t * t);
      colors.set([col.r, col.g, col.b], v * 3);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, fog: false }));
    m.position.set(center[0] + Math.cos(a) * d, -8 + h / 2 - 6, center[1] + Math.sin(a) * d);
    m.rotation.y = rng() * Math.PI;
    g.add(m);
  }
  return g;
}

// ---------- mây bồng bềnh quanh đảo ----------
function clouds(rng, center, R) {
  const puffs = [];
  for (let i = 0; i < 90; i++) {
    const a = rng() * Math.PI * 2;
    const d = R + 4 + rng() * 60;
    const s = 3 + rng() * 6;
    puffs.push({ x: center[0] + Math.cos(a) * d, y: -7 + rng() * 2.5, z: center[1] + Math.sin(a) * d, s, sy: s * 0.45, ry: rng() * 6 });
  }
  const mat = new THREE.MeshLambertMaterial({ color: 0x5a7a9a, transparent: true, opacity: 0.55, depthWrite: false, flatShading: true });
  return instanced(new THREE.IcosahedronGeometry(1, 1), mat, puffs, rng);
}

// ---------- chọn chỗ đặt trang trí ----------
function placer(map) {
  const avoid = [
    ...map.lanterns.map(([, p]) => [p, 4.2]), ...map.pads.map((p) => [p.pos, 3]), ...map.charms.map(([, p]) => [p, 2.5]),
    [map.start, 5], ...map.moteSpawns.map((p) => [p, 1.6]), ...map.shadeSpawns.map((p) => [p, 1.4]),
  ];
  return (x, z, clearance = 1.2) => {
    const h = map.groundAt(x, z);
    if (h == null || map.solidAt(x, z)) return null;
    // không đặt sát mép đảo, mép tầng, dốc (đất quanh phải cùng độ cao)
    for (const [dx, dz] of [[clearance, 0], [-clearance, 0], [0, clearance], [0, -clearance]]) {
      const hh = map.groundAt(x + dx, z + dz);
      if (hh == null || Math.abs(hh - h) > 1e-6 || map.solidAt(x + dx, z + dz)) return null;
    }
    for (const [p, r] of avoid) if (Math.hypot(x - p[0], z - p[2]) < r) return null;
    return h;
  };
}
const islandsOf = (map) => (map.night === 2 ? [[0, 0], [70, 0]] : [[0, 0]]);

function scatter(map, rng, n, rMin, rMax, clearance, tries = 40) {
  const free = placer(map);
  const out = [];
  const isl = islandsOf(map);
  const R = map.radius;
  for (let i = 0; i < n; i++) {
    for (let k = 0; k < tries; k++) {
      const c = isl[Math.floor(rng() * isl.length)];
      const a = rng() * Math.PI * 2;
      const d = R * (rMin + (rMax - rMin) * Math.sqrt(rng()));
      const x = c[0] + Math.cos(a) * d;
      const z = c[1] + Math.sin(a) * d;
      const y = free(x, z, clearance);
      if (y == null || out.some((o) => Math.hypot(o.x - x, o.z - z) < clearance * 1.6)) continue;
      out.push({ x, y, z, ry: rng() * Math.PI * 2, s: 1 });
      break;
    }
  }
  return out;
}

// ---------- cây ----------
function roundTrees(spots, rng) {
  const trunks = spots.map((t) => ({ ...t, y: t.y + 1.1 * t.s, sx: t.s, sy: t.s, sz: t.s }));
  const crowns = spots.flatMap((t) => [
    { x: t.x, y: t.y + 2.9 * t.s, z: t.z, s: 1.5 * t.s, ry: t.ry },
    { x: t.x + 0.6 * t.s, y: t.y + 2.4 * t.s, z: t.z + 0.3 * t.s, s: 1.0 * t.s, ry: t.ry + 1 },
    { x: t.x - 0.5 * t.s, y: t.y + 2.5 * t.s, z: t.z - 0.4 * t.s, s: 1.1 * t.s, ry: t.ry + 2 },
  ]);
  return [
    instanced(new THREE.CylinderGeometry(0.16, 0.26, 2.2, 7), new THREE.MeshLambertMaterial({ color: 0x5a3d26 }), trunks, rng),
    instanced(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }), crowns, rng,
      (t, r) => jitter(0x2f6b45, r, 0.18)),
  ];
}
function pineTrees(spots, rng) {
  const trunks = spots.map((t) => ({ ...t, y: t.y + 0.7 * t.s }));
  const layers = spots.flatMap((t) => [0, 1, 2].map((i) => ({ x: t.x, y: t.y + (1.6 + i * 1.0) * t.s, z: t.z, s: t.s * (1.5 - i * 0.38), sy: t.s * 1.4, ry: t.ry + i })));
  return [
    instanced(new THREE.CylinderGeometry(0.14, 0.22, 1.4, 6), new THREE.MeshLambertMaterial({ color: 0x4e3522 }), trunks, rng),
    instanced(new THREE.ConeGeometry(1, 1.5, 8), new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }), layers, rng,
      (t, r) => jitter(0x24543c, r, 0.15)),
  ];
}
// cây cau (Đảo Cau): thân mảnh cao hơi nghiêng, tán lá xòe
function arecaPalms(spots, rng) {
  const trunks = spots.map((t) => ({ ...t, y: t.y + 2.4 * t.s, rz: (rng() - 0.5) * 0.12, sx: t.s, sy: t.s, sz: t.s }));
  const leaves = spots.flatMap((t) => Array.from({ length: 7 }, (_, i) => {
    const a = t.ry + (i / 7) * Math.PI * 2;
    return { x: t.x + Math.cos(a) * 0.9 * t.s, y: t.y + 4.7 * t.s, z: t.z + Math.sin(a) * 0.9 * t.s, ry: -a, rz: -0.55, sx: 1.9 * t.s, sy: 0.12 * t.s, sz: 0.5 * t.s };
  }));
  const nuts = spots.map((t) => ({ x: t.x, y: t.y + 4.5 * t.s, z: t.z, s: 0.32 * t.s }));
  return [
    instanced(new THREE.CylinderGeometry(0.1, 0.15, 4.8, 6), new THREE.MeshLambertMaterial({ color: 0x8a7a5a }), trunks, rng),
    instanced(new THREE.SphereGeometry(1, 6, 3), new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }), leaves, rng,
      (t, r) => jitter(0x3f7d3a, r, 0.15)),
    instanced(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshLambertMaterial({ color: 0x6f8f2f, flatShading: true }), nuts, rng),
  ];
}

/** Toàn bộ trang trí cho một Đêm. */
export function buildDecor(map) {
  const rng = createRng(4242 + map.night);
  const g = new THREE.Group();
  g.add(mountains(rng, map.night === 2 ? [35, 0] : [0, 0], map.night === 2 ? 70 : map.radius));
  g.add(clouds(rng, map.night === 2 ? [35, 0] : [0, 0], map.night === 2 ? 70 : map.radius));

  // cây: mép ngoài đảo nhiều, thưa dần vào trong; mỗi Đêm một loài
  const trees = [...scatter(map, rng, 34, 0.78, 0.96, 1.6), ...scatter(map, rng, 10, 0.35, 0.75, 1.8)];
  trees.forEach((t) => { t.s = 0.85 + rng() * 0.5; });
  const kind = map.night === 1 ? roundTrees : map.night === 2 ? arecaPalms : pineTrees;
  for (const m of kind(trees, rng)) g.add(m);

  // bụi cây, đá, cỏ, hoa
  const bushes = scatter(map, rng, 40, 0.2, 0.95, 1.0).map((t) => ({ ...t, y: t.y + 0.25, s: 0.45 + rng() * 0.4, sy: 0.35 + rng() * 0.2 }));
  g.add(instanced(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }), bushes, rng,
    (t, r) => jitter(0x356b40, r, 0.2)));
  const rocks = scatter(map, rng, 26, 0.3, 0.97, 0.8).map((t) => ({ ...t, y: t.y + 0.1, s: 0.3 + rng() * 0.5, sy: 0.25 + rng() * 0.3, rx: rng(), rz: rng() }));
  g.add(instanced(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }), rocks, rng,
    (t, r) => jitter(0x7b7a76, r, 0.15)));
  // khóm cỏ: nửa cầu dẹt sáng màu (không nhọn) để nhìn như cỏ chứ không như gai trong đêm
  const tufts = scatter(map, rng, 380, 0.05, 0.97, 0.3, 8).map((t) => ({ ...t, s: 0.28 + rng() * 0.22, sy: 0.16 + rng() * 0.12 }));
  g.add(instanced(new THREE.SphereGeometry(1, 7, 3, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true, emissive: 0x0c1a10 }),
    tufts, rng, (t, r) => jitter(0x5a9a62, r, 0.18)));
  const flowerColors = [0xf2e6a0, 0xe8a0c8, 0xb8c8ff, 0xffffff];
  const flowers = scatter(map, rng, 140, 0.1, 0.95, 0.4, 8).map((t) => ({ ...t, y: t.y + 0.12, s: 0.07 + rng() * 0.04, c: flowerColors[Math.floor(rng() * 4)] }));
  g.add(instanced(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshBasicMaterial({ color: 0xffffff }), flowers, rng, (t) => col.setHex(t.c).clone()));
  return g;
}
