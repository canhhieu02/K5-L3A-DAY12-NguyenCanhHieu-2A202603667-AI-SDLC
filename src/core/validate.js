// Kiểm tra định dạng file inputs/scenario (Test Contract v1.0 mục C, D).
// Trả về chuỗi lỗi, hoặc null nếu hợp lệ.
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const isInt = (v) => Number.isInteger(v);
const isVec3 = (v) => Array.isArray(v) && v.length === 3 && v.every(isNum);

export function validateInputs(doc) {
  if (!isObj(doc) || !Array.isArray(doc.frames)) return 'inputs: cần object có mảng "frames"';
  let last = -1;
  for (let i = 0; i < doc.frames.length; i++) {
    const f = doc.frames[i];
    const at = `inputs.frames[${i}]`;
    if (!isObj(f)) return `${at}: phải là object`;
    if (!isInt(f.tick) || f.tick < 0) return `${at}.tick: phải là số nguyên >= 0`;
    if (f.tick <= last) return `${at}.tick: phải tăng nghiêm ngặt (${f.tick} <= ${last})`;
    last = f.tick;
    if ('move' in f) {
      if (!Array.isArray(f.move) || f.move.length !== 2 || !f.move.every((x) => isNum(x) && x >= -1 && x <= 1))
        return `${at}.move: phải là [x, z] trong [-1, 1]`;
    }
    if ('cam_yaw_deg' in f && !isNum(f.cam_yaw_deg)) return `${at}.cam_yaw_deg: phải là số`;
    for (const b of ['jump', 'interact', 'pulse', 'dash']) {
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
    if ('carried' in p && !(isInt(p.carried) && p.carried >= 0)) return 'scenario.player.carried: số nguyên >= 0';
    if ('flames' in p && !(isInt(p.flames) && p.flames >= 0)) return 'scenario.player.flames: số nguyên >= 0';
  }
  for (const b of ['random_motes', 'random_shades']) {
    if (b in doc && typeof doc[b] !== 'boolean') return `scenario.${b}: phải là boolean`;
  }
  if ('motes' in doc) {
    if (!Array.isArray(doc.motes) || !doc.motes.every(isVec3)) return 'scenario.motes: phải là mảng [x, y, z]';
  }
  if ('shades' in doc) {
    if (!Array.isArray(doc.shades)) return 'scenario.shades: phải là mảng';
    const ids = new Set();
    for (const [i, s] of doc.shades.entries()) {
      if (!isObj(s) || !isVec3(s.pos)) return `scenario.shades[${i}].pos: phải là [x, y, z]`;
      if ('id' in s) {
        if (typeof s.id !== 'string' || ids.has(s.id)) return `scenario.shades[${i}].id: chuỗi, không trùng`;
        ids.add(s.id);
      }
    }
  }
  if ('lanterns' in doc) {
    if (!Array.isArray(doc.lanterns)) return 'scenario.lanterns: phải là mảng';
    for (const [i, L] of doc.lanterns.entries()) {
      const at = `scenario.lanterns[${i}]`;
      if (!isObj(L) || typeof L.id !== 'string') return `${at}.id: bắt buộc, là chuỗi`;
      if ('pos' in L && !isVec3(L.pos)) return `${at}.pos: phải là [x, y, z]`;
      if ('deposited' in L && !(isInt(L.deposited) && L.deposited >= 0)) return `${at}.deposited: số nguyên >= 0`;
      if ('lit' in L && typeof L.lit !== 'boolean') return `${at}.lit: phải là boolean`;
    }
  }
  if ('time_left_s' in doc && !(isNum(doc.time_left_s) && doc.time_left_s >= 0)) return 'scenario.time_left_s: số >= 0';
  return null;
}
