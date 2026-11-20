#!/usr/bin/env node
// bench_cmd (contract v1.3, TICKET-04 mục 1):
//   node scripts/bench.mjs --seed 42 --duration 30 --out bench.json [--browser <đường dẫn chrome/edge>]
// Phục vụ bản build dist/ bằng server.mjs, mở Chrome/Edge (cửa sổ, không toàn màn hình) với vùng vẽ đúng 1280×720,
// tắt vsync (--disable-gpu-vsync --disable-frame-rate-limit), chạy trang ?bench=1 (cảnh chuẩn: src/core createBenchGame),
// nhận thời gian từng khung từ trang, tính số liệu (src/shared/bench-stats.js), ghi bench.json, thoát mã 0.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { createServer, ensureBuilt } from '../server.mjs';
import { frameStats, BENCH_CAMERA } from '../src/shared/bench-stats.js';

const PROCESS_START = performance.timeOrigin; // mốc "tiến trình bắt đầu" cho load_ms
const W = 1280;
const H = 720;

function parseArgs(argv) {
  const o = { seed: 42, duration: 30, out: 'bench.json', browser: process.env.CHROME_PATH };
  for (let i = 0; i < argv.length; i += 2) {
    const k = argv[i].replace(/^--/, '');
    if (!(k in o) || argv[i + 1] == null) throw new Error(`tham số không hợp lệ: ${argv[i]}`);
    o[k] = argv[i + 1];
  }
  o.seed = Number(o.seed);
  o.duration = Number(o.duration);
  if (!Number.isInteger(o.seed)) throw new Error('--seed phải là số nguyên');
  if (!(o.duration > 0)) throw new Error('--duration phải > 0');
  return o;
}

function findBrowser(given) {
  const cands = [given,
    'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    path.join(os.homedir(), 'AppData/Local/Google/Chrome/Application/chrome.exe'),
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/microsoft-edge'];
  return cands.find((p) => p && fs.existsSync(p));
}

// ---------- CDP tối thiểu (WebSocket có sẵn từ Node 22) ----------
function cdpConnect(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    let id = 0;
    const pending = new Map();
    ws.onmessage = (m) => {
      const d = JSON.parse(m.data);
      if (d.id && pending.has(d.id)) { const p = pending.get(d.id); pending.delete(d.id); d.error ? p.reject(new Error(d.error.message)) : p.resolve(d.result); }
    };
    ws.onerror = () => reject(new Error('không kết nối được DevTools'));
    ws.onopen = () => resolve({
      send: (method, params = {}, sessionId) => new Promise((res, rej) => { const i = ++id; pending.set(i, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id: i, method, params, sessionId })); }),
      close: () => ws.close(),
    });
  });
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- RSS cây tiến trình trình duyệt (lấy mẫu mỗi 500 ms) ----------
// Windows: chọn tiến trình theo thư mục profile riêng của lần bench trong command line (cây theo PID cha dễ dính PID tái sử dụng).
function startMemSampler(rootPid, profileTag) {
  const samples = []; // [epoch_ms, bytes]
  if (process.platform === 'win32') {
    const ps = `$tag='${profileTag.replace(/'/g, "''")}'
function Ids { @(Get-CimInstance Win32_Process -Property ProcessId,CommandLine | Where-Object { $_.CommandLine -and $_.CommandLine.Contains($tag) } | ForEach-Object { $_.ProcessId }) }
$i=0; while($true){ if($i % 6 -eq 0){ $ids = Ids }
  $s=(Get-Process -Id $ids -ErrorAction SilentlyContinue | Measure-Object WorkingSet64 -Sum).Sum
  [Console]::Out.WriteLine("$([DateTimeOffset]::Now.ToUnixTimeMilliseconds()) $s"); [Console]::Out.Flush(); Start-Sleep -Milliseconds 500; $i++ }`;
    const child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', ps], { stdio: ['ignore', 'pipe', 'ignore'] });
    child.stdout.setEncoding('utf8');
    let buf = '';
    child.stdout.on('data', (d) => {
      buf += d;
      const lines = buf.split(/\r?\n/);
      buf = lines.pop();
      for (const l of lines) { const [t, b] = l.trim().split(' ').map(Number); if (b > 0) samples.push([t, b]); }
    });
    child.on('error', () => {});
    return { samples, stop: () => child.kill() };
  }
  const timer = setInterval(() => {
    const r = spawnSync('ps', ['-A', '-o', 'pid=,ppid=,rss='], { encoding: 'utf8' });
    if (r.status !== 0) return;
    const rows = r.stdout.trim().split('\n').map((l) => l.trim().split(/\s+/).map(Number));
    const ids = new Set([rootPid]);
    for (let more = true; more;) { more = false; for (const [pid, ppid] of rows) if (ids.has(ppid) && !ids.has(pid)) { ids.add(pid); more = true; } }
    const kb = rows.filter(([pid]) => ids.has(pid)).reduce((a, [, , rss]) => a + rss, 0);
    samples.push([Date.now(), kb * 1024]);
  }, 500);
  return { samples, stop: () => clearInterval(timer) };
}

function killTree(child) {
  if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
  else try { child.kill('SIGKILL'); } catch { /* đã thoát */ }
}

async function main() {
  const o = parseArgs(process.argv.slice(2));
  if (!ensureBuilt()) throw new Error('không build được bản web (chạy `npm ci` trước)');
  const browser = findBrowser(o.browser);
  if (!browser) throw new Error('không tìm thấy Chrome/Edge; đặt CHROME_PATH hoặc --browser <đường dẫn>');

  let onResult;
  const resultP = new Promise((r) => { onResult = r; });
  const server = createServer({ onPost: (p, body) => { if (p === '/__bench/result') onResult(JSON.parse(body)); } });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const url = `http://127.0.0.1:${server.address().port}/?bench=1&seed=${o.seed}&duration=${o.duration}`;

  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'ddl-bench-'));
  const flags = [`--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--disable-sync',
    '--remote-debugging-port=0', `--window-size=${W},${H}`, '--window-position=40,40', '--force-device-scale-factor=1',
    '--disable-gpu-vsync', '--disable-frame-rate-limit', // tắt vsync + bỏ giới hạn khung hình
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows',
    '--app=about:blank'];
  const chrome = spawn(browser, flags, { stdio: 'ignore' });
  let mem = null;
  try {
    // DevTools: chỉnh cửa sổ để vùng vẽ (innerWidth × innerHeight) đúng 1280×720 rồi mới mở trang bench
    const portFile = path.join(profile, 'DevToolsActivePort');
    for (let i = 0; i < 100 && !fs.existsSync(portFile); i++) await sleep(100);
    let viewport = null;
    if (typeof WebSocket === 'function' && fs.existsSync(portFile)) {
      await sleep(100);
      const [port, wsPath] = fs.readFileSync(portFile, 'utf8').trim().split('\n');
      const c = await cdpConnect(`ws://127.0.0.1:${port}${wsPath}`);
      let page = null;
      for (let i = 0; i < 50 && !page; i++) { page = (await c.send('Target.getTargets')).targetInfos.find((t) => t.type === 'page'); if (!page) await sleep(100); }
      const { sessionId } = await c.send('Target.attachToTarget', { targetId: page.targetId, flatten: true });
      const inner = async () => (await c.send('Runtime.evaluate', { expression: '[innerWidth, innerHeight]', returnByValue: true }, sessionId)).result.value;
      const { windowId, bounds } = await c.send('Browser.getWindowForTarget', { targetId: page.targetId });
      for (let i = 0; i < 3; i++) {
        const [iw, ih] = await inner();
        if (iw === W && ih === H) break;
        const b = (await c.send('Browser.getWindowBounds', { windowId })).bounds;
        await c.send('Browser.setWindowBounds', { windowId, bounds: { width: b.width + W - iw, height: b.height + H - ih } });
        await sleep(150);
      }
      viewport = await inner();
      void bounds;
      await c.send('Page.navigate', { url }, sessionId);
      c.close();
    } else {
      spawn(browser, [`--user-data-dir=${profile}`, `--app=${url}`], { stdio: 'ignore' }); // Node < 22: không chỉnh được vùng vẽ
    }
    mem = process.env.DDL_BENCH_NOMEM ? { samples: [], stop() {} } : startMemSampler(chrome.pid, path.basename(profile)); // DDL_BENCH_NOMEM=1: bỏ đo RAM
    const res = await Promise.race([resultP, sleep((o.duration + BENCH_CAMERA.warmup_s + 90) * 1000).then(() => null)]);
    if (!res) throw new Error('quá thời gian chờ kết quả bench từ trình duyệt');

    const stats = frameStats(res.dts);
    const t0 = res.first_frame_epoch_ms + BENCH_CAMERA.warmup_s * 1000;
    const inWindow = mem.samples.filter(([t]) => t >= t0 && t <= t0 + o.duration * 1000 + 500);
    const peak = inWindow.length ? Math.max(...inWindow.map(([, b]) => b)) : null;
    const chromeVer = (res.ua.match(/(Edg|Chrome)\/([\d.]+)/) || []).slice(1).join(' ');
    const cpu = os.cpus()[0]?.model?.trim() ?? '?';
    const out = {
      contract_version: '1.3',
      avg_fps: stats.avg_fps,
      p1_low_fps: stats.p1_low_fps,
      frame_ms_p95: stats.frame_ms_p95,
      frames: stats.frames,
      load_ms: Math.round(res.first_frame_epoch_ms - PROCESS_START),
      peak_mem_mb: peak == null ? null : Math.round(peak / (1024 * 1024)),
      vsync_off: true,
      renderer: `three.js r${res.three} WebGL2 · ${chromeVer.replace('Edg', 'Edge')} · GPU: ${res.gpu}`,
      os: `${os.type()} ${os.release()} ${os.arch()} · CPU ${cpu} ×${os.cpus().length} · RAM ${Math.round(os.totalmem() / 2 ** 30)} GB`,
    };
    fs.writeFileSync(o.out, JSON.stringify(out, null, 2) + '\n');
    console.log(JSON.stringify(out, null, 2));
    console.log(`vùng vẽ ${(viewport || res.viewport).join('×')} · dpr ${res.dpr} · ${res.shades} Bóng Mực · ${res.motes} đom đóm · đèn sáng ${res.lit.join(',')}` +
      ` · mẫu RAM trong khoảng đo: ${inWindow.length} (tổng working set/RSS mọi tiến trình của trình duyệt)`);
  } finally {
    mem?.stop();
    killTree(chrome);
    server.close();
    await sleep(300);
    try { fs.rmSync(profile, { recursive: true, force: true }); } catch { /* Chrome còn giữ file: bỏ qua */ }
  }
}

main().then(() => { process.exit(0); }, (e) => { console.error(`lỗi bench: ${e.message}`); process.exit(1); });
