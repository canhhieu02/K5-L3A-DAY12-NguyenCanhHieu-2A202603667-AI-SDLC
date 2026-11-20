// Dựng cảnh 3D cho một Đêm từ map của core và đồng bộ thực thể theo state. Chỉ hiển thị, không có luật game.
import * as THREE from 'three';
import { TUNING } from '../core/tuning.js';
import { FUEL_UNIT, hasSafeZone } from '../core/world.js';
import { PALETTE as C, ambientIntensity, paletteFor, blinkOn } from './palette.js';

const lambert = (color, extra = {}) => new THREE.MeshLambertMaterial({ color, ...extra });

export class WorldView {
  constructor(renderer) {
    this.renderer = renderer;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(C.sky);
    this.scene.fog = new THREE.Fog(C.fog, 25, 110);
    this.camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 400);
    // ánh sáng môi trường: cường độ theo tiến độ (palette.ambientIntensity)
    this.hemi = new THREE.HemisphereLight(0x8fa3d8, C.sky, ambientIntensity(0, 1));
    // ánh trăng cố định (ngoài công thức ánh sáng môi trường) để đêm tối vẫn nhìn rõ địa hình
    this.moon = new THREE.DirectionalLight(0xb8c4ff, 1.1);
    this.moon.position.set(-30, 60, 20);
    this.scene.add(this.hemi, this.moon);
    this.level = null;
    this.meshes = { motes: new Map(), shades: new Map(), drifters: new Map(), charms: new Map() };
    this.lanterns = new Map();
    this.shared = {
      moteGeo: new THREE.SphereGeometry(0.14, 10, 8),
      moteHaloGeo: new THREE.SphereGeometry(0.32, 10, 8),
      moteMat: new THREE.MeshBasicMaterial({ color: C.moteCore }),
      dropMat: new THREE.MeshBasicMaterial({ color: C.moteCore, transparent: true, opacity: 0.8 }),
      moteHaloMat: new THREE.MeshBasicMaterial({ color: C.moteHalo, transparent: true, opacity: 0.35, depthWrite: false }),
      shadeGeo: new THREE.SphereGeometry(0.7, 18, 12),
      shadeRimGeo: new THREE.SphereGeometry(0.78, 18, 12),
      shadeRimMat: new THREE.MeshBasicMaterial({ color: C.shadeRim, side: THREE.BackSide }),
      eyeGeo: new THREE.SphereGeometry(0.09, 6, 6),
      eyeMat: new THREE.MeshBasicMaterial({ color: C.shadeRim }),
    };
    this.buildMay();
    this.buildPulseRing();
    this.buildLeaves();
    // vết rách giấy đèn tắt (TICKET-03 mục 6): mảnh tối hình răng cưa, dùng chung
    const tear = new THREE.Shape();
    [[0, 0.22], [0.07, 0.06], [0.16, 0.1], [0.06, -0.04], [0.12, -0.2], [-0.02, -0.08], [-0.13, -0.16], [-0.06, 0.02], [-0.15, 0.12]]
      .forEach(([x, y], i) => (i ? tear.lineTo(x, y) : tear.moveTo(x, y)));
    this.shared.tearGeo = new THREE.ShapeGeometry(tear);
    this.shared.tearMat = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide });
    this.shared.barGeo = new THREE.PlaneGeometry(1.4, 0.16);
    this.setColorblind(false);
  }

  /** Bảng màu dễ phân biệt: chỉ viền + mắt Bóng Mực đổi màu (#00B3FF). */
  setColorblind(on) {
    const P = paletteFor(on);
    this.shared.shadeRimMat.color.setHex(P.shadeRim);
    this.shared.eyeMat.color.setHex(P.shadeRim);
    this.dangerColor = P.uiDanger;
  }

  // ---------- Mây: áo #E8E2D0, khăn đỏ, nón lá, đèn lồng nhỏ ----------
  buildMay() {
    const may = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.33, 0.65, 4, 12), lambert(C.mayShirt));
    body.position.y = 0.68;
    const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.08, 8, 20), lambert(C.mayScarf));
    scarf.rotation.x = Math.PI / 2;
    scarf.position.y = 1.1;
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.4, 0.05), lambert(C.mayScarf));
    tail.position.set(0, 0.9, -0.3);
    const hat = new THREE.Mesh(new THREE.ConeGeometry(0.75, 0.38, 24), lambert(0xd9c27a));
    hat.position.y = 1.52;
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8), new THREE.MeshBasicMaterial({ color: C.lanternLit }));
    lamp.position.set(0.65, 1.2, 0);
    const light = new THREE.PointLight(C.lanternLit, 6, 12, 1.6);
    light.position.set(0.65, 1.3, 0);
    may.add(body, scarf, tail, hat, lamp, light);
    this.may = may;
    this.mayParts = { lamp, light, scarf };
    this.scene.add(may);
    // vòng hiệu lực Bùa Gió
    this.charmAura = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.04, 6, 32), new THREE.MeshBasicMaterial({ color: C.charm }));
    this.charmAura.rotation.x = Math.PI / 2;
    this.scene.add(this.charmAura);
  }

  buildPulseRing() {
    this.pulseRing = new THREE.Mesh(
      new THREE.RingGeometry(0.92, 1, 48),
      new THREE.MeshBasicMaterial({ color: C.lanternCore, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false })
    );
    this.pulseRing.rotation.x = -Math.PI / 2;
    this.scene.add(this.pulseRing);
    this.pulseAnim = 0;
  }

  // Lá bay báo gió (Đêm 3)
  buildLeaves() {
    const n = 160;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    this.leaves = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0x9fd18b, size: 0.25, transparent: true, opacity: 0 }));
    this.leafSeeds = Array.from({ length: n }, (_, i) => [((i * 37) % 100) / 100, ((i * 61) % 100) / 100, ((i * 17) % 100) / 100]);
    this.scene.add(this.leaves);
  }

  // ---------- địa hình theo map ----------
  build(map) {
    if (this.level) {
      this.scene.remove(this.level);
      this.level.traverse((o) => { o.geometry?.dispose(); });
    }
    for (const kind of Object.keys(this.meshes)) { for (const m of this.meshes[kind].values()) this.scene.remove(m); this.meshes[kind].clear(); }
    for (const g of this.lanterns.values()) this.scene.remove(g);
    this.lanterns.clear();

    const L = new THREE.Group();
    const sea = new THREE.Mesh(new THREE.CircleGeometry(400, 48), new THREE.MeshBasicMaterial({ color: C.cloudSea }));
    sea.rotation.x = -Math.PI / 2;
    sea.position.y = -8;
    L.add(sea);
    const island = (x, z, r, h = 6) => {
      const base = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.75, h, 64), lambert(C.sand));
      base.position.set(x, -h / 2 - 0.02, z);
      const top = new THREE.Mesh(new THREE.CircleGeometry(r - 1.2, 64), lambert(C.grass));
      top.rotation.x = -Math.PI / 2;
      top.position.set(x, 0.005, z);
      L.add(base, top);
    };
    const padMesh = (p) => {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(p.r, p.r, 0.12, 24), lambert(C.gold, { emissive: 0x4a3510 }));
      m.position.set(p.pos[0], p.pos[1] + 0.06, p.pos[2]);
      L.add(m);
    };

    if (map.night === 1) island(0, 0, map.radius);
    if (map.night === 2) {
      island(0, 0, 28);
      island(70, 0, 28);
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(18, 0.3, 4), lambert(C.wood));
      bridge.position.set(35, -0.15, 0);
      L.add(bridge);
      for (let x = 26.5; x < 44; x += 1.5) {
        const plank = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.32, 4.05), lambert(0x4e3522));
        plank.position.set(x, -0.14, 0);
        L.add(plank);
      }
    }
    if (map.night === 3) {
      island(0, 0, 45);
      // tầng 1: nửa vành khăn r 12–24 ở z > 0, cao 3 m
      const shape = new THREE.Shape();
      shape.absarc(0, 0, 24, Math.PI, 2 * Math.PI, false);
      shape.lineTo(12, 0);
      shape.absarc(0, 0, 12, 2 * Math.PI, Math.PI, true);
      shape.lineTo(-24, 0);
      const t1 = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 3, bevelEnabled: false, curveSegments: 48 }),
        [lambert(C.grass), lambert(C.sand)]);
      t1.rotation.x = -Math.PI / 2; // (x, y, z) → (x, z, −y): độ cao = depth, z thế giới = −y của shape
      L.add(t1);
      // tầng 2: đĩa r 8 cao 6 m + tháp chuông r 2 m cao 8 m
      const t2 = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, 6, 48), [lambert(C.sand), lambert(C.grass), lambert(C.grass)]);
      t2.position.y = 3;
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(2, 2.2, 8, 24), lambert(C.wood));
      tower.position.y = 10;
      const roof = new THREE.Mesh(new THREE.ConeGeometry(3, 2.5, 24), lambert(0x7a2e22));
      roof.position.y = 15.25;
      const bell = new THREE.Mesh(new THREE.SphereGeometry(0.9, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), lambert(C.gold, { emissive: 0x3a2a08 }));
      bell.position.y = 13;
      L.add(t2, tower, roof, bell);
      // dốc 3 m rộng ở 30° và 150°: r 30 (Y 0) → r 24 (Y 3)
      for (const deg of [30, 150]) {
        const th = (deg * Math.PI) / 180;
        const len = Math.hypot(6, 3);
        const ramp = new THREE.Mesh(new THREE.BoxGeometry(len, 0.3, 3), lambert(C.wood));
        ramp.position.set(27 * Math.cos(th), 1.5 - 0.15, 27 * Math.sin(th));
        ramp.rotation.set(0, -th, -Math.atan2(3, 6));
        L.add(ramp);
      }
    }
    for (const p of map.pads) padMesh(p);
    this.scene.add(L);
    this.level = L;
    this.mapRadius = map.radius;
    this.windOn = map.wind;
  }

  makeLantern(L) {
    const g = new THREE.Group();
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 2.6, 8), lambert(C.wood));
    post.position.y = 1.3;
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 12), lambert(C.lanternOff, { emissive: 0x000000 }));
    lamp.position.y = 2.9;
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.25, 10, 8), new THREE.MeshBasicMaterial({ color: C.lanternCore, transparent: true, opacity: 0 }));
    core.position.y = 2.9;
    const light = new THREE.PointLight(C.lanternLit, 0, 22, 1.3);
    light.position.y = 3;
    const safe = new THREE.Mesh(
      new THREE.RingGeometry(TUNING.safe_radius - 0.1, TUNING.safe_radius, 64),
      new THREE.MeshBasicMaterial({ color: C.lanternLit, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false })
    );
    safe.rotation.x = -Math.PI / 2;
    safe.position.y = 0.04;
    // 3 vết rách quanh thân đèn: thấy từ mọi hướng khi đèn tắt
    const tears = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const t = new THREE.Mesh(this.shared.tearGeo, this.shared.tearMat);
      const a = (i * 2 * Math.PI) / 3 + 0.4;
      t.position.set(Math.sin(a) * 0.56, (i - 1) * 0.12, Math.cos(a) * 0.56);
      t.rotation.y = a;
      t.scale.setScalar(1.7);
      tears.add(t);
    }
    tears.position.y = 2.9;
    // thanh dầu trên đèn đang sáng (quay về phía camera)
    const bar = new THREE.Group();
    bar.add(new THREE.Mesh(this.shared.barGeo, new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.6, depthWrite: false })));
    const fillMat = new THREE.MeshBasicMaterial({ color: C.lanternLit });
    const fill = new THREE.Mesh(this.shared.barGeo, fillMat);
    fill.position.z = 0.01;
    bar.add(fill);
    bar.position.y = 3.85;
    g.add(post, lamp, core, light, safe, tears, bar);
    g.userData = { lamp, core, light, safe, tears, bar, fill };
    g.position.set(L.pos[0], L.pos[1], L.pos[2]);
    this.scene.add(g);
    return g;
  }

  sync(map, list, make, update) {
    const seen = new Set();
    for (const e of list) {
      seen.add(e.id);
      let m = map.get(e.id);
      if (!m) { m = make(e); map.set(e.id, m); this.scene.add(m); }
      update(m, e);
    }
    for (const [id, m] of map) if (!seen.has(id)) { this.scene.remove(m); map.delete(id); }
  }

  /** Vẽ một khung hình từ state game. view = { camYaw, facing, time, windWarn } */
  render(game, view) {
    const { time } = view;
    const p = game.player;
    const S = this.shared;

    this.may.position.set(p.pos[0], p.pos[1], p.pos[2]);
    this.may.rotation.y = Math.atan2(p.facing[0], p.facing[1]);
    this.may.visible = p.waitTicks === 0 && (p.invulnTicks === 0 || Math.floor(time * 12) % 2 === 0);
    this.mayParts.light.intensity = 3 + p.carried * 0.9;
    this.mayParts.lamp.material.color.setHex(p.carried > 0 ? C.lanternLit : C.lanternOff);
    this.charmAura.visible = p.charmTicks > 0;
    this.charmAura.position.set(p.pos[0], p.pos[1] + 0.1, p.pos[2]);
    this.charmAura.rotation.z = time * 3;

    this.sync(this.meshes.motes, game.motes, (e) => {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(S.moteGeo, e.kind === 'dropped' ? S.dropMat : S.moteMat), new THREE.Mesh(S.moteHaloGeo, S.moteHaloMat));
      return g;
    }, (m, e) => {
      m.position.set(e.pos[0], e.pos[1] + 0.8 + Math.sin(time * 3 + e.pos[0]) * 0.15, e.pos[2]);
      m.visible = e.ttl == null || e.ttl > 120 || Math.floor(time * 8) % 2 === 0; // sắp tắt thì nhấp nháy
    });

    this.sync(this.meshes.shades, game.shades, () => {
      const g = new THREE.Group();
      const body = new THREE.Mesh(S.shadeGeo, new THREE.MeshLambertMaterial({ color: C.shadeBody, transparent: true, opacity: 0.95 }));
      const rim = new THREE.Mesh(S.shadeRimGeo, S.shadeRimMat);
      const e1 = new THREE.Mesh(S.eyeGeo, S.eyeMat);
      const e2 = new THREE.Mesh(S.eyeGeo, S.eyeMat);
      e1.position.set(-0.22, 0.15, 0.62);
      e2.position.set(0.22, 0.15, 0.62);
      g.add(body, rim, e1, e2);
      g.userData = { body, rim };
      return g;
    }, (m, e) => {
      m.position.set(e.pos[0], e.pos[1] + Math.sin(time * 2 + e.pos[2]) * 0.12, e.pos[2]);
      m.lookAt(p.pos[0], e.pos[1], p.pos[2]);
      const stunned = e.state === 'stunned';
      m.userData.body.material.color.setHex(stunned ? C.shadeStunned : C.shadeBody);
      m.userData.rim.visible = !stunned;
      const k = e.state === 'spawning' ? Math.min(1, 1 - e.spawnTicks / 60) : stunned ? 0.8 : 1;
      m.scale.setScalar(Math.max(0.15, k));
      if (e.state === 'drain') { // đang hút dầu: thân phập phồng, nghiêng về phía đèn
        m.scale.setScalar(1 + Math.sin(time * 10) * 0.12);
        m.lookAt(e.drainLantern.pos[0], e.pos[1], e.drainLantern.pos[2]);
      }
    });

    this.sync(this.meshes.drifters, game.drifters.filter((d) => d.state !== 'removed'), () => {
      const g = new THREE.Group();
      const mat = new THREE.MeshLambertMaterial({ color: C.drifter, side: THREE.DoubleSide, transparent: true, opacity: 0.85 });
      for (let i = 0; i < 3; i++) {
        const strip = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.18, 8, 1), mat);
        strip.position.y = i * 0.22;
        g.add(strip);
      }
      return g;
    }, (m, e) => {
      m.position.set(e.pos[0], e.pos[1], e.pos[2]);
      m.rotation.y = time * (e.state === 'idle' ? 1 : 4);
      m.children.forEach((s, i) => { s.rotation.x = Math.sin(time * 6 + i) * 0.6; });
      m.scale.setScalar(e.stolen > 0 ? 1.3 : 1);
    });

    this.sync(this.meshes.charms, game.charms, () => {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.75, 0.06), lambert(C.charm, { emissive: 0x400008 })));
      const edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(0.54, 0.79, 0.08)), new THREE.LineBasicMaterial({ color: C.gold }));
      g.add(edge);
      return g;
    }, (m, e) => {
      m.visible = e.available;
      m.position.set(e.pos[0], e.pos[1] + 1 + Math.sin(time * 2) * 0.15, e.pos[2]);
      m.rotation.y = time * 1.5;
    });

    let lit = 0;
    for (const L of game.lanterns) {
      let g = this.lanterns.get(L.id);
      if (!g) { g = this.makeLantern(L); this.lanterns.set(L.id, g); }
      const { lamp, core, light, safe, tears, bar, fill: fuelFill } = g.userData;
      const fill = L.deposited / (L.everLit ? TUNING.relight_cost : TUNING.lantern_cost);
      const fuel = L.fuelU / FUEL_UNIT;
      const low = L.lit && fuel < TUNING.low_fuel_threshold;
      const on = !low || blinkOn(time); // sắp hết dầu: đèn + thanh dầu nhấp nháy 1 Hz
      if (L.lit) lit++;
      lamp.material.color.setHex(L.lit ? C.lanternLit : C.lanternOff);
      lamp.material.emissive.setHex(L.lit ? C.lanternLit : 0x000000);
      lamp.material.emissiveIntensity = L.lit ? (on ? 0.9 : 0.15) : 0;
      lamp.scale.set(1, L.lit ? 1 : 0.8, 1); // đèn tắt xẹp 20% + giấy rách: phân biệt không cần màu
      tears.visible = !L.lit;
      core.material.opacity = L.lit ? (on ? 1 : 0.2) : fill * 0.7;
      light.intensity = L.lit ? (on ? 40 * (0.4 + 0.6 * fuel / TUNING.fuel_max) : 6) : fill * 5;
      safe.material.opacity = hasSafeZone(game, L) ? 0.3 : 0; // đèn yếu mất vùng an toàn
      bar.visible = L.lit && on;
      bar.quaternion.copy(this.camera.quaternion);
      fuelFill.scale.x = Math.max(0.001, fuel / TUNING.fuel_max);
      fuelFill.position.x = -0.7 * (1 - fuelFill.scale.x);
      fuelFill.material.color.setHex(low ? this.dangerColor : C.lanternLit);
    }
    // Đảo sáng dần: ánh sáng môi trường theo công thức chuẩn
    this.hemi.intensity = ambientIntensity(lit, game.lanterns.length);
    this.scene.fog.far = 90 + 60 * (lit / game.lanterns.length);

    if (this.pulseAnim > 0) {
      this.pulseAnim = Math.max(0, this.pulseAnim - 0.035);
      this.pulseRing.scale.setScalar(Math.max(0.01, TUNING.pulse_radius * (1 - this.pulseAnim)));
      this.pulseRing.position.set(p.pos[0], p.pos[1] + 0.1, p.pos[2]);
      this.pulseRing.material.opacity = this.pulseAnim;
    }

    // Lá bay: báo trước 2 s và trong lúc gió (hướng gió từ core, lúc báo trước thì xoáy tại chỗ)
    const windy = game.wind.active || view.windWarn;
    this.leaves.material.opacity += ((windy ? 0.9 : 0) - this.leaves.material.opacity) * 0.05;
    if (this.leaves.material.opacity > 0.01) {
      const a = (game.wind.dir_deg * Math.PI) / 180;
      const pos = this.leaves.geometry.attributes.position;
      this.leafSeeds.forEach(([u, v, w], i) => {
        const s = ((time * (game.wind.active ? 0.25 : 0.06) + u) % 1) * 40 - 20;
        const side = (v - 0.5) * 30;
        const dx = game.wind.active ? Math.cos(a) : Math.cos(time + i);
        const dz = game.wind.active ? Math.sin(a) : Math.sin(time + i);
        pos.setXYZ(i, p.pos[0] + dx * s - dz * side, p.pos[1] + 0.5 + w * 4 + Math.sin(time * 4 + i) * 0.3, p.pos[2] + dz * s + dx * side);
      });
      pos.needsUpdate = true;
    }

    if (view.cam) {
      // bench (TICKET-04): camera bay vòng, luôn nhìn vào (0,0,0)
      this.camera.position.set(view.cam[0], view.cam[1], view.cam[2]);
      this.camera.lookAt(0, 0, 0);
    } else {
      // Camera góc nhìn thứ ba (+ rung nhẹ khi bị đánh, tắt khi bật "Giảm chuyển động")
      const th = (view.camYaw * Math.PI) / 180;
      const [sx, sy] = view.shake || [0, 0];
      this.camera.position.set(p.pos[0] + Math.sin(th) * 8.5 + sx, p.pos[1] + 5.2 + sy, p.pos[2] + Math.cos(th) * 8.5);
      this.camera.lookAt(p.pos[0], p.pos[1] + 1, p.pos[2]);
    }
    this.renderer.render(this.scene, this.camera);
    return lit;
  }

  resize() {
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
  }
}
