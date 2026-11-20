// run_cmd (contract v1.3): phục vụ bản web đã build (dist/) + lưu bảng xếp hạng ra đĩa. Chỉ dùng module có sẵn của Node.
//   node server.mjs [--port 5173] [--no-open]          chơi: mở http://localhost:5173 (tự build nếu chưa có dist/)
//   node server.mjs --export-leaderboard out.json      xuất {"entries": [...]} đúng thứ tự rồi thoát
// Bảng xếp hạng lưu ở save/leaderboard.json (đổi bằng biến môi trường DDL_LEADERBOARD).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { insertEntry, sanitizeBoard } from './src/shared/leaderboard.js';

export const ROOT = path.dirname(fileURLToPath(import.meta.url));
export const DIST = path.join(ROOT, 'dist');
export const leaderboardFile = () => process.env.DDL_LEADERBOARD || path.join(ROOT, 'save', 'leaderboard.json');

export function readBoard(file = leaderboardFile()) {
  try { return sanitizeBoard(JSON.parse(fs.readFileSync(file, 'utf8'))); } catch { return []; }
}
export function writeBoard(entries, file = leaderboardFile()) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify({ entries }, null, 2) + '\n');
  fs.renameSync(tmp, file); // ghi nguyên tử: tắt ngang không làm hỏng file
}

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wasm': 'application/wasm' };

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => { size += c.length; if (size > 4e6) { reject(new Error('body quá lớn')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}
const sendJson = (res, code, obj) => { res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }); res.end(JSON.stringify(obj)); };

/** Middleware API bảng xếp hạng (dùng chung cho server này và vite dev). Trả true nếu đã xử lý. */
export async function handleApi(req, res, file = leaderboardFile()) {
  const url = new URL(req.url, 'http://x');
  if (url.pathname !== '/api/leaderboard') return false;
  if (req.method === 'GET') { sendJson(res, 200, { entries: readBoard(file) }); return true; }
  if (req.method === 'POST') {
    try {
      const entry = JSON.parse(await readBody(req));
      const { entries, rank } = insertEntry(readBoard(file), entry);
      writeBoard(entries, file);
      sendJson(res, 200, { entries, rank });
    } catch (e) { sendJson(res, 400, { error: e.message }); }
    return true;
  }
  sendJson(res, 405, { error: 'method' });
  return true;
}

/** Server tĩnh cho dist/ + API. onPost(pathname, body) nhận POST khác (bench dùng /__bench/*). */
export function createServer({ dist = DIST, file = leaderboardFile(), onPost } = {}) {
  return http.createServer(async (req, res) => {
    try {
      if (await handleApi(req, res, file)) return;
      const { pathname } = new URL(req.url, 'http://x');
      if (req.method === 'POST' && onPost) { onPost(pathname, await readBody(req)); sendJson(res, 200, { ok: true }); return; }
      let f = path.normalize(path.join(dist, decodeURIComponent(pathname)));
      if (!f.startsWith(dist)) { res.writeHead(403).end(); return; }
      if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(dist, 'index.html');
      res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-cache' });
      fs.createReadStream(f).pipe(res);
    } catch (e) { if (!res.headersSent) res.writeHead(500); res.end(String(e.message)); }
  });
}

/** Build bản web nếu chưa có dist/ (cần đã `npm ci`). */
export function ensureBuilt() {
  if (fs.existsSync(path.join(DIST, 'index.html'))) return true;
  const vite = path.join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js');
  if (!fs.existsSync(vite)) { console.error('Chưa có dist/ và chưa cài vite: chạy `npm ci` trước.'); return false; }
  console.log('Chưa có dist/: đang build bản web (một lần)…');
  return spawnSync(process.execPath, [vite, 'build'], { cwd: ROOT, stdio: 'inherit' }).status === 0;
}

function openBrowser(url) {
  const cmd = process.platform === 'win32' ? ['cmd', ['/c', 'start', '', url]] : process.platform === 'darwin' ? ['open', [url]] : ['xdg-open', [url]];
  try { spawn(cmd[0], cmd[1], { stdio: 'ignore', detached: true }).on('error', () => {}).unref(); } catch { /* không mở được: người dùng tự mở */ }
}

function main(argv) {
  const at = (flag) => { const i = argv.indexOf(flag); return i >= 0 ? argv[i + 1] : undefined; };
  if (argv.includes('--export-leaderboard')) {
    const out = at('--export-leaderboard');
    if (!out) { console.error('thiếu đường dẫn cho --export-leaderboard'); process.exitCode = 1; return; }
    fs.writeFileSync(out, JSON.stringify({ entries: readBoard() }, null, 2) + '\n');
    console.log(`Đã xuất ${readBoard().length} mục → ${out}`);
    return;
  }
  if (!ensureBuilt()) { process.exitCode = 1; return; }
  const port = Number(at('--port') ?? process.env.PORT ?? 5173);
  createServer().listen(port, () => {
    const url = `http://localhost:${port}/`;
    console.log(`Đảo Đèn Lồng đang chạy: ${url}  (Ctrl+C để thoát)\nBảng xếp hạng: ${leaderboardFile()}`);
    if (!argv.includes('--no-open')) openBrowser(url);
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2));
