#!/usr/bin/env node
// Headless runner — CP0 placeholder.
// Định dạng input/output THẬT phải theo Test Contract của PRD-0; file này sẽ được viết lại.
// Tạm thời: node src/headless/cli.js [--seed N] [--ticks N] [--dx N] [--dz N]
import { createWorld, step, snapshot } from '../core/world.js';

function parseArgs(argv) {
  const opts = { seed: 1, ticks: 60, dx: 0, dz: 0 };
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i]?.replace(/^--/, '');
    if (key in opts) opts[key] = Number(argv[i + 1]);
  }
  return opts;
}

const opts = parseArgs(process.argv.slice(2));
const world = createWorld(opts.seed);
for (let i = 0; i < opts.ticks; i++) step(world, { dx: opts.dx, dz: opts.dz });
process.stdout.write(JSON.stringify(snapshot(world)) + '\n');
