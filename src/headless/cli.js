#!/usr/bin/env node
// Headless runner theo Test Contract v1.2 (mục B, E của v1.0 + TICKET-02 Phần 4 + TICKET-03 mục 7).
// node src/headless/cli.js --seed <int> --night <1|2|3> [--scenario f.json] [--inputs f.json]
//                          --ticks <int> --out <file.jsonl> [--snapshot-every <int>]
import fs from 'node:fs';
import { createGame, step, snapshot } from '../core/world.js';
import { SUPPORTED_NIGHTS } from '../core/maps.js';
import { validateInputs, validateScenario } from '../core/validate.js';

class CliError extends Error {
  constructor(msg, code) { super(msg); this.code = code; }
}

function parseArgs(argv) {
  const o = { snapshotEvery: 10 };
  const map = { '--seed': 'seed', '--night': 'night', '--scenario': 'scenario', '--inputs': 'inputs',
    '--ticks': 'ticks', '--out': 'out', '--snapshot-every': 'snapshotEvery' };
  for (let i = 0; i < argv.length; i++) {
    const key = map[argv[i]];
    if (!key) throw new CliError(`tham số không hợp lệ: ${argv[i]}`, 1);
    if (i + 1 >= argv.length) throw new CliError(`thiếu giá trị cho ${argv[i]}`, 1);
    o[key] = argv[++i];
  }
  const int = (name, v, min) => {
    if (!/^-?\d+$/.test(String(v))) throw new CliError(`${name} phải là số nguyên`, 1);
    const n = Number(v);
    if (n < min) throw new CliError(`${name} phải >= ${min}`, 1);
    return n;
  };
  for (const req of ['seed', 'night', 'ticks', 'out']) if (o[req] == null) throw new CliError(`thiếu --${req}`, 1);
  o.seed = int('--seed', o.seed, -Infinity);
  o.night = int('--night', o.night, 1);
  if (o.night > 3) throw new CliError('--night phải là 1, 2 hoặc 3', 1);
  if (!SUPPORTED_NIGHTS.includes(o.night)) throw new CliError(`Đêm ${o.night} chưa được hỗ trợ`, 1);
  o.ticks = int('--ticks', o.ticks, 0);
  o.snapshotEvery = int('--snapshot-every', o.snapshotEvery, 1);
  return o;
}

function readJson(file, validate) {
  let text;
  try { text = fs.readFileSync(file, 'utf8'); } catch (e) { throw new CliError(`không đọc được ${file}: ${e.message}`, 1); }
  let doc;
  try { doc = JSON.parse(text); } catch (e) { throw new CliError(`${file}: JSON sai định dạng: ${e.message}`, 2); }
  const err = validate(doc);
  if (err) throw new CliError(`${file}: ${err}`, 2);
  return doc;
}

export function run(argv) {
  const o = parseArgs(argv);
  const scenario = o.scenario ? readJson(o.scenario, validateScenario) : null;
  const inputs = o.inputs ? readJson(o.inputs, validateInputs) : { frames: [] };
  let g;
  try { g = createGame({ seed: o.seed, night: o.night, scenario }); } catch (e) {
    if (e.scenario) throw new CliError(`${o.scenario}: ${e.message}`, 2);
    throw e;
  }
  for (const L of scenario?.lanterns || []) {
    if (!g.lanterns.some((x) => x.id === L.id)) process.stderr.write(`cảnh báo: bỏ qua đèn không tồn tại ${L.id}\n`);
  }

  const lines = [JSON.stringify(snapshot(g))];
  const cur = { move: [0, 0], cam_yaw_deg: 0, jump: false, interact: false, pulse: false, dash: false, pause: false };
  const frames = inputs.frames;
  let fi = 0;
  const running = () => g.state === 'playing' || g.state === 'paused';
  for (let k = 0; k < o.ticks && running(); k++) {
    while (fi < frames.length && frames[fi].tick === k) Object.assign(cur, frames[fi++]);
    while (fi < frames.length && frames[fi].tick < k) fi++;
    for (const ev of step(g, cur)) lines.push(JSON.stringify(ev));
    if (g.tick % o.snapshotEvery === 0) lines.push(JSON.stringify(snapshot(g)));
  }
  // Dòng end chỉ có playing/won/lost (contract v1.0); đang tạm dừng ghi playing (A2-30).
  const endState = g.state === 'paused' ? 'playing' : g.state;
  lines.push(JSON.stringify({ type: 'end', ticks: g.tick, state: endState, score: g.score }));
  fs.writeFileSync(o.out, lines.join('\n') + '\n');
}

try {
  run(process.argv.slice(2));
  process.exitCode = 0;
} catch (e) {
  process.stderr.write(`lỗi: ${e.message}\n`);
  process.exitCode = e instanceof CliError ? e.code : 1;
}
