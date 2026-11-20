// Kiểm tra định dạng file inputs/scenario (Test Contract v1.0 mục C, D + v1.1 + v1.2).
// Trả về chuỗi lỗi, hoặc null nếu hợp lệ.
import { SHADE_STATES, DRIFTER_STATES } from './world.js';

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const isInt = (v) => Number.isInteger(v);
const isNat = (v) => isInt(v) && v >= 0;
const isVec3 = (v) => Array.isArray(v) && v.length === 3 && v.every(isNum);

export function validateInputs(doc) {
  if (!isObj(doc) || !Array.isArray(doc.frames)) return 'inputs: cần object có mảng "frames"';
  let last = -1;
  for (let i = 0; i < doc.frames.length; i++) {
    const f = doc.frames[i];
    const at = `inputs.frames[${i}]`;
    if (!isObj(f)) return `${at}: phải là object`;
    if (!isNat(f.tick)) return `${at}.tick: phải là số nguyên >= 0`;
    if (f.tick <= last) return `${at}.tick: phải tăng nghiêm ngặt (${f.tick} <= ${last})`;
    last = f.tick;
    if ('move' in f) {
      if (!Array.isArray(f.move) || f.move.length !== 2 || !f.move.every((x) => isNum(x) && x >= -1 && x <= 1))
        return `${at}.move: phải là [x, z] trong [-1, 1]`;
    }
    if ('cam_yaw_deg' in f && !isNum(f.cam_yaw_deg)) return `${at}.cam_yaw_deg: phải là số`;
    for (const b of ['jump', 'interact', 'pulse', 'dash', 'pause']) {
      if (b in f && typeof f[b] !== 'boolean') return `${at}.${b}: phải là boolean`;
    }
  }
  return null;
}

export function validateScenario(doc) {
  if (!isObj(doc)) return 'scenario: phải là object';
  if ('player' in doc) {
    const p = doc.player;
    if (!isObj(p)) return 'scenario.player: phải là object';
    if ('pos' in p && !isVec3(p.pos)) return 'scenario.player.pos: phải là [x, y, z]';
    for (const k of ['carried', 'flames', 'invuln_ticks', 'dash_cd_ticks', 'pulse_cd_ticks', 'charm_ticks', 'successful_lights']) {
      if (k in p && !isNat(p[k])) return `scenario.player.${k}: số nguyên >= 0`;
    }
  }
  for (const b of ['random_motes', 'random_shades', 'random_drifters', 'wind_enabled']) {
    if (b in doc && typeof doc[b] !== 'boolean') return `scenario.${b}: phải là boolean`;
  }
  if ('motes' in doc) {
    if (!Array.isArray(doc.motes) || !doc.motes.every(isVec3)) return 'scenario.motes: phải là mảng [x, y, z]';
  }
  if ('shades' in doc) {
    if (!Array.isArray(doc.shades)) return 'scenario.shades: phải là mảng';
    const ids = new Set();
    for (const [i, s] of doc.shades.entries()) {
      const at = `scenario.shades[${i}]`;
      if (!isObj(s) || !isVec3(s.pos)) return `${at}.pos: phải là [x, y, z]`;
      if ('id' in s) {
        if (typeof s.id !== 'string' || ids.has(s.id)) return `${at}.id: chuỗi, không trùng`;
        ids.add(s.id);
      }
      if ('state' in s && !SHADE_STATES.includes(s.state)) return `${at}.state: một trong ${SHADE_STATES.join(', ')}`;
      if ('state_ticks_left' in s && !isNat(s.state_ticks_left)) return `${at}.state_ticks_left: số nguyên >= 0`;
      if ('target_lantern_id' in s && typeof s.target_lantern_id !== 'string') return `${at}.target_lantern_id: phải là chuỗi`;
    }
  }
  for (const k of ['drifters', 'charms']) {
    if (k in doc && (!Array.isArray(doc[k]) || !doc[k].every(isObj))) return `scenario.${k}: phải là mảng object`;
  }
  const ids = new Set();
  for (const [i, d] of (doc.drifters || []).entries()) {
    const at = `scenario.drifters[${i}]`;
    if (!isVec3(d.pos)) return `${at}.pos: phải là [x, y, z]`;
    if ('id' in d && (typeof d.id !== 'string' || ids.has(d.id))) return `${at}.id: chuỗi, không trùng`;
    ids.add(d.id);
    if ('state' in d && !DRIFTER_STATES.includes(d.state)) return `${at}.state: một trong ${DRIFTER_STATES.join(', ')}`;
    if ('stolen' in d && !isNat(d.stolen)) return `${at}.stolen: số nguyên >= 0`;
    if ('state_ticks_left' in d && !isNat(d.state_ticks_left)) return `${at}.state_ticks_left: số nguyên >= 0`;
  }
  ids.clear();
  for (const [i, c] of (doc.charms || []).entries()) {
    const at = `scenario.charms[${i}]`;
    if (typeof c.id !== 'string' || ids.has(c.id)) return `${at}.id: bắt buộc, chuỗi, không trùng`;
    ids.add(c.id);
    if ('pos' in c && !isVec3(c.pos)) return `${at}.pos: phải là [x, y, z]`;
    if ('available' in c && typeof c.available !== 'boolean') return `${at}.available: phải là boolean`;
    if ('respawn_ticks' in c && !isNat(c.respawn_ticks)) return `${at}.respawn_ticks: số nguyên >= 0`;
  }
  if ('lanterns' in doc) {
    if (!Array.isArray(doc.lanterns)) return 'scenario.lanterns: phải là mảng';
    for (const [i, L] of doc.lanterns.entries()) {
      const at = `scenario.lanterns[${i}]`;
      if (!isObj(L) || typeof L.id !== 'string') return `${at}.id: bắt buộc, là chuỗi`;
      if ('pos' in L && !isVec3(L.pos)) return `${at}.pos: phải là [x, y, z]`;
      if ('deposited' in L && !isNat(L.deposited)) return `${at}.deposited: số nguyên >= 0`;
      if ('lit' in L && typeof L.lit !== 'boolean') return `${at}.lit: phải là boolean`;
      // v1.2 (A3-7): fuel trong [0, 100], ever_lit boolean, relit_count số nguyên >= 0
      if ('fuel' in L && !(isNum(L.fuel) && L.fuel >= 0 && L.fuel <= 100)) return `${at}.fuel: số trong [0, 100]`;
      if ('ever_lit' in L && typeof L.ever_lit !== 'boolean') return `${at}.ever_lit: phải là boolean`;
      if ('relit_count' in L && !isNat(L.relit_count)) return `${at}.relit_count: số nguyên >= 0`;
    }
  }
  if ('time_left_s' in doc && !(isNum(doc.time_left_s) && doc.time_left_s >= 0)) return 'scenario.time_left_s: số >= 0';
  return null;
}
