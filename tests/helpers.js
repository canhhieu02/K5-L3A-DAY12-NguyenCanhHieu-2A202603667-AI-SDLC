import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const CLI = path.resolve('src/headless/cli.js');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ddl-'));
let n = 0;

// Chạy CLI headless thật (đúng như máy chấm), trả về { code, stderr, lines, events, snaps, end }.
export function runHeadless({ seed = 1, ticks = 60, scenario, inputs, every = 1, extra = [], rawArgs } = {}) {
  const id = n++;
  const out = path.join(tmp, `out${id}.jsonl`);
  let args = rawArgs;
  if (!args) {
    args = ['--seed', String(seed), '--night', '1', '--ticks', String(ticks), '--out', out, '--snapshot-every', String(every)];
    if (scenario !== undefined) {
      const f = path.join(tmp, `sc${id}.json`);
      fs.writeFileSync(f, typeof scenario === 'string' ? scenario : JSON.stringify(scenario));
      args.push('--scenario', f);
    }
    if (inputs !== undefined) {
      const f = path.join(tmp, `in${id}.json`);
      fs.writeFileSync(f, typeof inputs === 'string' ? inputs : JSON.stringify(inputs));
      args.push('--inputs', f);
    }
    args.push(...extra);
  }
  const r = spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8' });
  const text = fs.existsSync(out) ? fs.readFileSync(out, 'utf8') : '';
  const lines = text.trim() ? text.trim().split('\n').map((l) => JSON.parse(l)) : [];
  return {
    code: r.status,
    stderr: r.stderr,
    text,
    lines,
    events: lines.filter((l) => l.type === 'event'),
    snaps: lines.filter((l) => l.type === 'snapshot'),
    end: lines[lines.length - 1],
  };
}

// Scenario "sạch": không sinh ngẫu nhiên, không địch, không đom đóm.
export const empty = (extra = {}) => ({ random_motes: false, random_shades: false, motes: [], shades: [], ...extra });
export const snapAt = (r, tick) => r.snaps.find((s) => s.tick === tick);
export const ev = (r, name) => r.events.filter((e) => e.name === name);
