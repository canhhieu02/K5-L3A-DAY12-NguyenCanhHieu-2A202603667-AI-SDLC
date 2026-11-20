#!/usr/bin/env node
// Sinh bằng chứng phase hiện hành (PHASE, mặc định 4) vào evidence/phase-N/ từ lệnh chạy thật (không sửa tay file trong evidence/).
//   node scripts/evidence.mjs [test] [scenarios] [determinism] [perf] [web] [clone] [bench] [soak] [leaderboard]
//   (không tham số = tất cả; bench mở cửa sổ Chrome ~35 s)
//   PHASE=2 node scripts/evidence.mjs scenarios   → chạy lại scenario Phase 2 (để đối chiếu, ghi vào evidence/phase-2/)
// Cần commit trước khi chạy "clone" (clone sạch lấy HEAD).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PHASE = process.env.PHASE || '4';
const OUT = process.env.EVIDENCE_OUT || path.join(ROOT, 'evidence', `phase-${PHASE}`); // EVIDENCE_OUT: thử nghiệm, không ghi đè bằng chứng
const CLI = path.join(ROOT, 'src', 'headless', 'cli.js');
// Phase 4 không thêm scenario mới (TICKET-04 không đổi luật): chạy lại scenario Phase 3 làm hồi quy
const SC = path.join(ROOT, 'scenarios', `phase${PHASE === '4' ? '3' : PHASE}`);
const CONTRACT = JSON.parse(fs.readFileSync(path.join(ROOT, 'game.contract.json'), 'utf8'));
const cmdArgs = (cmd) => cmd.split(' ').slice(1); // "node a b" → [a, b] (chạy bằng process.execPath)
fs.mkdirSync(OUT, { recursive: true });

const sh = (cmd, args, opts = {}) => spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8', shell: process.platform === 'win32', ...opts });
const git = (...a) => spawnSync('git', a, { cwd: ROOT, encoding: 'utf8' }).stdout.trim();
// chỉ xét file đã theo dõi: bằng chứng đang sinh và file cục bộ chưa theo dõi không tính là "thay đổi"
const header = () => `# ${new Date().toISOString()} | node ${process.version} | ${os.type()} ${os.release()} | commit ${git('rev-parse', '--short', 'HEAD')}${git('status', '--porcelain', '--untracked-files=no') ? ' (+ thay đổi chưa commit)' : ''}\n`;
const built = (s) => (s.replace(/\x1b\[[0-9;]*m/g, '').match(/✓ built in .*/) || [''])[0];
const write = (name, text) => { fs.writeFileSync(path.join(OUT, name), text); console.log(`→ evidence/phase-${PHASE}/${name}`); };
const sha = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').slice(0, 16);
const rel = (p) => path.relative(ROOT, p).replaceAll('\\', '/');

function headless(args, out) {
  const t0 = performance.now();
  const r = spawnSync(process.execPath, [CLI, ...args, '--out', out], { cwd: ROOT, encoding: 'utf8' });
  return { code: r.status, stderr: r.stderr, ms: performance.now() - t0 };
}
const readLines = (f) => fs.readFileSync(f, 'utf8').trim().split('\n').map((l) => JSON.parse(l));

// ---------- 1. npm test (gồm hồi quy Phase 1) ----------
function runTests() {
  const r = sh('npm', ['test']);
  const lines = r.stdout.split('\n').filter((l) => /^(ok|not ok) \d+|^# (tests|pass|fail|duration)/.test(l));
  write('test.txt', `${header()}$ npm test\nexit=${r.status}\n${lines.join('\n')}\n`);
  return r.status === 0;
}

// ---------- 2. scenario mẫu: kỳ vọng ghi trước trong *.expect.json, so với output thật ----------
const get = (obj, p) => p.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function runScenarios() {
  let text = header();
  let allOk = true;
  for (const f of fs.readdirSync(SC).filter((x) => x.endsWith('.expect.json')).sort()) {
    const name = f.replace('.expect.json', '');
    const exp = JSON.parse(fs.readFileSync(path.join(SC, f), 'utf8'));
    const out = path.join(OUT, `${name}.jsonl`);
    const args = ['--seed', '1', '--night', String(exp.night), '--ticks', String(exp.ticks), '--snapshot-every', '1',
      '--scenario', path.join(SC, `${name}.scenario.json`), '--inputs', path.join(SC, `${name}.inputs.json`)];
    const r = headless(args, out);
    const lines = readLines(out);
    const events = lines.filter((l) => l.type === 'event');
    const snaps = new Map(lines.filter((l) => l.type === 'snapshot').map((s) => [s.tick, s]));
    const res = [];
    for (const e of exp.events || []) {
      const ok = events.some((x) => x.tick === e.tick && x.name === e.name && same(x.data, e.data));
      res.push([ok, `event ${e.name} @${e.tick} ${JSON.stringify(e.data)}`]);
    }
    for (const n of exp.no_events || []) res.push([!events.some((x) => x.name === n), `không có event ${n}`]);
    for (const c of exp.checks || []) {
      const v = get(snaps.get(c.tick), c.path);
      const ok = 'near' in c ? Array.isArray(v) && v.every((x, i) => Math.abs(x - c.near[i]) <= c.tol) : same(v, c.equals);
      res.push([ok, `tick ${c.tick} ${c.path} = ${JSON.stringify('near' in c ? c.near : c.equals)}${'near' in c ? ` ±${c.tol}` : ''} (thực tế ${JSON.stringify(v)})`]);
    }
    const pass = r.code === 0 && res.every(([ok]) => ok);
    allOk &&= pass;
    // Giữ file jsonl gọn: event + snapshot ở các tick được kiểm + end
    const keep = new Set((exp.checks || []).map((c) => c.tick));
    fs.writeFileSync(out, lines.filter((l) => l.type !== 'snapshot' || keep.has(l.tick) || l.tick === 0).map((l) => JSON.stringify(l)).join('\n') + '\n');
    text += `\n## ${name} — ${pass ? 'ĐẠT' : 'KHÔNG ĐẠT'}\n${exp.about}\n$ node src/headless/cli.js ${args.map((a) => (a.startsWith(ROOT) ? rel(a) : a)).join(' ')} --out evidence/phase-${PHASE}/${name}.jsonl --snapshot-every 1\nexit=${r.code}\n`;
    text += res.map(([ok, s]) => `  [${ok ? 'x' : ' '}] ${s}`).join('\n') + '\n';
  }
  write('scenarios.txt', text);
  return allOk;
}

// ---------- 3. tất định: 3 Đêm, game mặc định, chạy 2 lần cùng seed + 1 lần khác seed ----------
function runDeterminism() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ddl-det-'));
  const inputs = path.join(tmp, 'in.json');
  fs.writeFileSync(inputs, JSON.stringify({ frames: [{ tick: 0, move: [0.4, 1] }, { tick: 240, move: [-1, 0.2], dash: true }, { tick: 241, dash: false },
    { tick: 600, move: [0.3, -1], pulse: true }, { tick: 601, pulse: false }, { tick: 1500, move: [1, 0.5] }] }));
  let text = header();
  let ok = true;
  for (const night of [1, 2, 3]) {
    const ticks = { 1: 14400, 2: 16200, 3: 18000 }[night]; // trọn một Đêm v1.2 (240/270/300 s)
    const runs = [2026, 2026, 2027].map((seed, i) => {
      const f = path.join(tmp, `n${night}-${i}.jsonl`);
      const r = headless(['--seed', String(seed), '--night', String(night), '--ticks', String(ticks), '--inputs', inputs], f);
      return { seed, f, code: r.code, sha: sha(f), lines: fs.readFileSync(f, 'utf8').trim().split('\n').length };
    });
    const det = runs[0].sha === runs[1].sha;
    const diff = runs[0].sha !== runs[2].sha;
    ok &&= det && diff;
    text += `\n## Đêm ${night} (--ticks ${ticks}, inputs cố định)\n`;
    for (const r of runs) text += `seed ${r.seed}: exit=${r.code} sha256=${r.sha} lines=${r.lines}\n`;
    text += `${det ? 'GIỐNG HỆT NHAU' : 'KHÁC NHAU (LỖI)'} giữa 2 lần cùng seed; ${diff ? 'khác' : 'GIỐNG (LỖI)'} khi đổi seed\n`;
    const evs = readLines(runs[0].f).filter((l) => l.type !== 'snapshot');
    const count = {};
    for (const e of evs) count[e.name || e.type] = (count[e.name || e.type] || 0) + 1;
    text += `Sự kiện (seed 2026): ${JSON.stringify(count)}\nDòng cuối: ${JSON.stringify(evs.at(-1))}\n`;
    if (night === 1) fs.copyFileSync(runs[0].f, path.join(OUT, 'default-night1-seed2026.jsonl'));
  }
  write('determinism.txt', text);
  return ok;
}

// ---------- 4. hiệu năng headless: 21 600 tick mỗi Đêm <= 30 s ----------
function runPerf() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ddl-perf-'));
  const sc = path.join(tmp, 'sc.json');
  const inputs = path.join(tmp, 'in.json');
  fs.writeFileSync(sc, JSON.stringify({ time_left_s: 360, player: { flames: 999, carried: 6 } }));
  fs.writeFileSync(inputs, JSON.stringify({ frames: [{ tick: 0, move: [0.3, 0.6] }, { tick: 3000, move: [-0.6, -0.2] }, { tick: 9000, move: [0.5, -0.5] }] }));
  let text = `${header()}Mỗi Đêm: --ticks 21600 --snapshot-every 10, scenario {time_left_s: 360, flames: 999} để chạy đủ 21 600 tick.\n\n`;
  let ok = true;
  for (const night of [1, 2, 3]) {
    const f = path.join(tmp, `n${night}.jsonl`);
    const r = headless(['--seed', '5', '--night', String(night), '--ticks', '21600', '--snapshot-every', '10', '--scenario', sc, '--inputs', inputs], f);
    const end = readLines(f).at(-1);
    const pass = r.code === 0 && end.ticks === 21600 && r.ms <= 30000;
    ok &&= pass;
    text += `Đêm ${night}: exit=${r.code} end.ticks=${end.ticks} thời gian=${(r.ms / 1000).toFixed(2)} s → ${pass ? 'ĐẠT (≤ 30 s)' : 'KHÔNG ĐẠT'}\n`;
  }
  write('perf.txt', text);
  return ok;
}

// ---------- 5. web: build + chụp 3 Đêm bằng Chrome headless, kiểm console không có lỗi ----------
async function runWeb() {
  const b = sh('npm', ['run', 'build']);
  let text = `${header()}$ npm run build\nexit=${b.status}\n${built(b.stdout)}\n`;
  const chrome = [
    'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ].find((p) => fs.existsSync(p));
  if (!chrome) { write('web.txt', `${text}Không tìm thấy Chrome/Edge: bỏ qua ảnh chụp.\n`); return b.status === 0; }
  const port = 5198;
  const lbTmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ddl-lb-')), 'leaderboard.json');
  const server = spawn(process.execPath, [path.join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js'), 'preview', '--port', String(port), '--strictPort'],
    { cwd: ROOT, stdio: 'ignore', env: { ...process.env, DDL_LEADERBOARD: lbTmp } });
  let ok = b.status === 0;
  const shots = PHASE === '4'
    ? [['web-menu', ''], ['web-night1', '?night=1'], ['web-bench-scene', '?bench=1&seed=42&duration=1'], ['web-settings-keys', '?screen=settings'],
      ['web-settings-large', '?screen=settings&large=1'], ['web-leaderboard', '?screen=board'], ['web-a11y-captions', '?night=1&demo=a11y'],
      ['web-a11y-captions-colorblind-large', '?night=1&demo=a11y&cb=1&large=1']]
    : [['web-menu', ''], ['web-night1', '?night=1'], ['web-night2', '?night=2'], ['web-night3', '?night=3'],
      ['web-fuel-demo', '?night=1&demo=fuel'], ['web-fuel-demo-colorblind', '?night=1&demo=fuel&cb=1']];
  try {
    for (let i = 0; i < 40; i++) { try { await fetch(`http://localhost:${port}/`); break; } catch { await new Promise((r) => setTimeout(r, 250)); } }
    text += `Chrome headless (SwiftShader, 1280×720), vite preview bản build:\n`;
    if (PHASE === '4') { // bảng xếp hạng có dữ liệu thật qua API của preview (ghi vào file tạm DDL_LEADERBOARD)
      for (const e of [['Mây', 1580, 3], ['Ông_Đăng', 1580, 3], ['Lantern_99', 820, 2], ['abc', 0, 0]]) {
        await fetch(`http://localhost:${port}/api/leaderboard`, { method: 'POST',
          body: JSON.stringify({ name: e[0], score: e[1], nights_won: e[2], achieved_at: new Date(Date.now() - e[1] * 1000).toISOString().replace(/\.\d+Z$/, 'Z'), seed: 42 }) });
      }
    }
    for (const [name, q] of shots) {
      const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'ddl-chrome-'));
      const png = path.join(OUT, `${name}.png`);
      const r = spawnSync(chrome, ['--headless=new', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--window-size=1280,720',
        '--virtual-time-budget=6000', '--enable-logging=stderr', '--v=0', `--user-data-dir=${prof}`, `--screenshot=${png}`,
        `http://localhost:${port}/${q}`], { encoding: 'utf8', timeout: 60000 });
      const errs = (r.stderr || '').split('\n').filter((l) => /CONSOLE/.test(l) && /(Uncaught|Error|error)/.test(l));
      const pass = fs.existsSync(png) && errs.length === 0;
      ok &&= pass;
      text += `${name}${q ? ` (${q})` : ''}: ảnh ${fs.existsSync(png) ? 'có' : 'KHÔNG CÓ'}, lỗi console: ${errs.length ? errs.join(' | ') : 'không'} → ${pass ? 'ĐẠT' : 'KHÔNG ĐẠT'}\n`;
    }
  } finally { server.kill(); }
  write('web.txt', text);
  return ok;
}

// ---------- 6. clone sạch tại HEAD: npm ci → npm test → headless 3 Đêm → build ----------
async function runClone() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ddl-clone-'));
  let text = `# ${new Date().toISOString()} | clone sạch tại commit ${git('rev-parse', '--short', 'HEAD')}\n`;
  // chỉ npm cần shell trên Windows; git/node gọi trực tiếp để đường dẫn có dấu cách/tiếng Việt không bị tách
  const step = (label, cmd, args, cwd) => {
    const r = spawnSync(cmd, args, { cwd, encoding: 'utf8', shell: cmd === 'npm' && process.platform === 'win32' });
    text += `$ ${label}\nexit=${r.status}${r.error ? ` (${r.error.message})` : ''}\n`;
    return { ...r, stdout: r.stdout || '' };
  };
  step(`git clone <repo> ${path.basename(dir)}/repo`, 'git', ['clone', '-q', ROOT, path.join(dir, 'repo')], dir);
  const repo = path.join(dir, 'repo');
  const ci = step('npm ci', 'npm', ['ci', '--no-audit', '--no-fund'], repo);
  text += (ci.stdout.match(/added .*/) || [''])[0] + '\n';
  const t = step('npm test', 'npm', ['test'], repo);
  text += t.stdout.split('\n').filter((l) => /^# (tests|pass|fail)/.test(l)).join('\n') + '\n';
  let ok = ci.status === 0 && t.status === 0;
  for (const n of [1, 2, 3]) {
    const r = step(`node src/headless/cli.js --seed 7 --night ${n} --ticks 600 --out o${n}.jsonl`, process.execPath,
      ['src/headless/cli.js', '--seed', '7', '--night', String(n), '--ticks', '600', '--out', `o${n}.jsonl`], repo);
    ok &&= r.status === 0;
    const o = path.join(repo, `o${n}.jsonl`);
    text += (fs.existsSync(o) ? fs.readFileSync(o, 'utf8').trim().split('\n').at(-1) : '(không có output)') + '\n';
  }
  if (PHASE !== '4') {
    const b = step('npm run build', 'npm', ['run', 'build'], repo);
    text += built(b.stdout) + '\n';
    ok &&= b.status === 0;
  } else {
    // README: clone → `npm ci` (prepare tự build dist/) → `npm start` (= run_cmd) → chơi ở http://localhost:5173
    text += `dist/index.html sau npm ci (prepare = vite build): ${fs.existsSync(path.join(repo, 'dist', 'index.html')) ? 'có' : 'KHÔNG CÓ'}\n`;
    ok &&= fs.existsSync(path.join(repo, 'dist', 'index.html'));
    const srv = spawn(process.execPath, ['server.mjs', '--no-open', '--port', '5196'], { cwd: repo, stdio: 'ignore' });
    let page = '';
    for (let i = 0; i < 40 && !page; i++) { try { page = await (await fetch('http://localhost:5196/')).text(); } catch { await new Promise((r) => setTimeout(r, 250)); } }
    srv.kill();
    const served = page.includes('<title>Đảo Đèn Lồng</title>') && /assets\/index-.*\.js/.test(page);
    text += `$ npm start (node server.mjs --no-open --port 5196) → GET / ${served ? 'trả về trang game đã build' : 'LỖI'}\n`;
    ok &&= served;
    const sk = step(`${CONTRACT.soak_cmd} --seed 7 --nights 10 --out soak.json`, process.execPath, [...cmdArgs(CONTRACT.soak_cmd), '--seed', '7', '--nights', '10', '--out', 'soak.json'], repo);
    text += sk.stdout;
    ok &&= sk.status === 0;
    const ex = step(`${CONTRACT.run_cmd} --export-leaderboard out.json`, process.execPath, [...cmdArgs(CONTRACT.run_cmd), '--export-leaderboard', 'out.json'], repo);
    text += fs.existsSync(path.join(repo, 'out.json')) ? fs.readFileSync(path.join(repo, 'out.json'), 'utf8') : '(không có out.json)\n';
    ok &&= ex.status === 0;
  }
  write('clean-clone.txt', text);
  return ok;
}

// ---------- 7. bench (TICKET-04 mục 1): đúng lệnh contract, ghi evidence/phase-4/bench.json ----------
function runBench() {
  const args = [...cmdArgs(CONTRACT.bench_cmd), '--seed', '42', '--duration', '30', '--out', path.join(OUT, 'bench.json')];
  const r = spawnSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8', timeout: 180000 });
  const j = fs.existsSync(path.join(OUT, 'bench.json')) ? JSON.parse(fs.readFileSync(path.join(OUT, 'bench.json'), 'utf8')) : null;
  const pass = r.status === 0 && j && j.avg_fps >= 60 && j.p1_low_fps >= 30 && j.load_ms <= 10000;
  write('bench.txt', `${header()}$ ${CONTRACT.bench_cmd} --seed 42 --duration 30 --out evidence/phase-${PHASE}/bench.json\nexit=${r.status}\n` +
    `${r.stdout}${r.stderr}\nNgưỡng (máy chấm): avg_fps ≥ 60 · p1_low_fps ≥ 30 · load_ms ≤ 10000 → trên máy này: ${pass ? 'ĐẠT' : 'KHÔNG ĐẠT'}\n`);
  return pass;
}

// ---------- 8. soak (TICKET-04 mục 2) ----------
function runSoak() {
  const out = path.join(OUT, 'soak.json');
  const args = [...cmdArgs(CONTRACT.soak_cmd), '--seed', '7', '--nights', '10', '--out', out];
  const r = spawnSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8' });
  const j = JSON.parse(fs.readFileSync(out, 'utf8'));
  const pass = r.status === 0 && j.crashes === 0 && j.mem_end_mb <= 1.2 * j.mem_start_mb;
  const won = j.results.filter((x) => x === 'won').length;
  write('soak.txt', `${header()}$ ${CONTRACT.soak_cmd} --seed 7 --nights 10 --out evidence/phase-${PHASE}/soak.json\nexit=${r.status}\n${r.stdout}${r.stderr}` +
    `crashes=${j.crashes}, mem_end/mem_start = ${(j.mem_end_mb / j.mem_start_mb).toFixed(3)} (ngưỡng ≤ 1.2) → ${pass ? 'ĐẠT' : 'KHÔNG ĐẠT'}\n` +
    `Kết quả: ${won} thắng / ${j.results.length - won} thua — input ngẫu nhiên thường rơi khỏi đảo hoặc bị Bóng Mực chạm nên thua là bình thường.\n`);
  return pass;
}

// ---------- 9. bảng xếp hạng: server thật → lưu → tắt → mở lại → xuất bằng run_cmd ----------
async function runLeaderboard() {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ddl-lb-')), 'leaderboard.json');
  const env = { ...process.env, DDL_LEADERBOARD: file };
  const port = 5197;
  let text = `${header()}Bảng xếp hạng ghi vào file tạm (DDL_LEADERBOARD=${path.basename(file)}), qua API của run_cmd \`${CONTRACT.run_cmd}\`.\n`;
  const start = async () => {
    const s = spawn(process.execPath, [...cmdArgs(CONTRACT.run_cmd), '--no-open', '--port', String(port)], { cwd: ROOT, stdio: 'ignore', env });
    for (let i = 0; i < 40; i++) { try { await fetch(`http://localhost:${port}/api/leaderboard`); break; } catch { await new Promise((r) => setTimeout(r, 250)); } }
    return s;
  };
  let s = await start();
  const iso = (h, tz) => `2026-11-21T${h}:00:00${tz}`;
  const entries = [['Mây', 1210, 3, iso('20', '+07:00')], ['Tie_Late', 640, 2, iso('14', 'Z')], ['Tie_Early', 640, 2, iso('20', '+07:00')],
    ['xy', 99, 0, iso('10', 'Z')], ['Bad-Name', 99, 0, iso('10', 'Z')], ['NoTZ', 50, 1, '2026-11-21T10:00:00'],
    ...Array.from({ length: 9 }, (_, i) => [`Player_${i}`, 100 + i * 10, 1, iso(`0${i}`, 'Z')])];
  for (const [name, score, nights_won, achieved_at] of entries) {
    const r = await fetch(`http://localhost:${port}/api/leaderboard`, { method: 'POST', body: JSON.stringify({ name, score, nights_won, achieved_at, seed: 42 }) });
    const j = await r.json();
    text += `POST ${JSON.stringify({ name, score, nights_won, achieved_at })} → ${r.status} ${r.status === 200 ? `hạng ${j.rank + 1 || 'ngoài top 10'}` : j.error}\n`;
  }
  s.kill();
  await new Promise((r) => setTimeout(r, 500));
  text += '\n— tắt server, mở lại —\n';
  s = await start();
  const after = (await (await fetch(`http://localhost:${port}/api/leaderboard`)).json()).entries;
  s.kill();
  const out = path.join(OUT, 'leaderboard-export.json');
  const ex = spawnSync(process.execPath, [...cmdArgs(CONTRACT.run_cmd), '--export-leaderboard', out], { cwd: ROOT, encoding: 'utf8', env });
  const doc = JSON.parse(fs.readFileSync(out, 'utf8'));
  const sorted = doc.entries.every((e, i, a) => i === 0 || a[i - 1].score > e.score || (a[i - 1].score === e.score && Date.parse(a[i - 1].achieved_at) <= Date.parse(e.achieved_at)));
  const pass = ex.status === 0 && doc.entries.length === 10 && sorted && JSON.stringify(doc.entries) === JSON.stringify(after) && doc.entries[0].name === 'Mây';
  text += `GET sau khi mở lại: ${after.length} mục\n$ ${CONTRACT.run_cmd} --export-leaderboard evidence/phase-${PHASE}/leaderboard-export.json\nexit=${ex.status}\n` +
    doc.entries.map((e, i) => `  ${i + 1}. ${e.name} ${e.score} (${e.nights_won} Đêm) ${e.achieved_at} seed ${e.seed}`).join('\n') +
    `\nTop 10, điểm giảm dần, bằng điểm thì đạt trước đứng trên, giống hệt dữ liệu sau khi mở lại → ${pass ? 'ĐẠT' : 'KHÔNG ĐẠT'}\n`;
  write('leaderboard.txt', text);
  return pass;
}

const want = process.argv.slice(2);
const all = want.length === 0;
const results = {};
if (all || want.includes('test')) results.test = runTests();
if (all || want.includes('scenarios')) results.scenarios = runScenarios();
if (all || want.includes('determinism')) results.determinism = runDeterminism();
if (all || want.includes('perf')) results.perf = runPerf();
if (all || want.includes('web')) results.web = await runWeb();
if (all || want.includes('soak')) results.soak = runSoak();
if (all || want.includes('leaderboard')) results.leaderboard = await runLeaderboard();
if (all || want.includes('bench')) results.bench = runBench();
if (all || want.includes('clone')) results.clone = await runClone();
console.log(results);
process.exitCode = Object.values(results).every(Boolean) ? 0 : 1;
