#!/usr/bin/env node
// Đóng gói bản chạy được cho GitHub Release v1.0.0: release/dao-den-long-v<version>-web.zip
//   dist/ (web tĩnh đã build) + server.mjs (phục vụ + bảng xếp hạng ra đĩa, không cần npm install) + hướng dẫn.
// Cần Node ≥ 22 trên máy chơi. Bản web tĩnh trong dist/ cũng mở được bằng bất kỳ static server nào (điểm khi đó lưu trong trình duyệt).
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { version } = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const name = `dao-den-long-v${version}-web`;
const outDir = path.join(ROOT, 'release', name);
const zip = path.join(ROOT, 'release', `${name}.zip`);

const b = spawnSync(process.execPath, [path.join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js'), 'build'], { cwd: ROOT, stdio: 'inherit' });
if (b.status !== 0) process.exit(1);
fs.rmSync(path.join(ROOT, 'release'), { recursive: true, force: true });
fs.mkdirSync(path.join(outDir, 'src', 'shared'), { recursive: true });
fs.cpSync(path.join(ROOT, 'dist'), path.join(outDir, 'dist'), { recursive: true });
for (const f of ['server.mjs', 'LICENSE', 'CREDITS.md', 'CHANGELOG.md']) fs.copyFileSync(path.join(ROOT, f), path.join(outDir, f));
fs.copyFileSync(path.join(ROOT, 'src', 'shared', 'leaderboard.js'), path.join(outDir, 'src', 'shared', 'leaderboard.js'));
fs.writeFileSync(path.join(outDir, 'package.json'), JSON.stringify({ name: 'dao-den-long', version, private: true, type: 'module',
  scripts: { start: 'node server.mjs' }, engines: { node: '>=22' } }, null, 2) + '\n');
fs.writeFileSync(path.join(outDir, 'CHOI-NGAY.txt'), [
  `Đảo Đèn Lồng v${version} — bản web chạy được`,
  '',
  'Cần: Node.js 22 trở lên (https://nodejs.org) và Chrome / Edge / Firefox mới.',
  '1. Giải nén thư mục này.',
  '2. Mở terminal trong thư mục, chạy:  node server.mjs',
  '3. Trình duyệt tự mở http://localhost:5173 (nếu không, tự mở địa chỉ đó).',
  '',
  'Bảng xếp hạng lưu ở save/leaderboard.json. Xuất:  node server.mjs --export-leaderboard out.json',
  'Không muốn cài Node: phục vụ thư mục dist/ bằng bất kỳ static server nào (điểm khi đó lưu trong trình duyệt).',
  '',
].join('\n'));
// tar trên Windows không mở được đường dẫn có dấu: chạy trong thư mục release với tên tương đối (ASCII)
const z = spawnSync('tar', ['-a', '-c', '-f', `${name}.zip`, name], { cwd: path.join(ROOT, 'release'), stdio: 'inherit' });
if (z.status !== 0) { console.error('tar không tạo được zip (cần bsdtar: có sẵn trên Windows 10+/macOS)'); process.exit(1); }
console.log(`→ ${path.relative(ROOT, zip)} (${(fs.statSync(zip).size / 1024).toFixed(0)} KB)`);
