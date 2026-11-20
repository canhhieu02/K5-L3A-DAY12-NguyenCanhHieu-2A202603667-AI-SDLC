# Bằng chứng kiểm chứng

Bằng chứng chỉ sinh từ lệnh chạy thật, không sửa tay. Mỗi phase một thư mục `evidence/phase-N/`.
Môi trường: Windows 11 (Git Bash), Node v22.16.0. Headless thuần Node, không phụ thuộc OS.

## Phase 1 (PRD-0, Test Contract v1.0)

| Yêu cầu | Cách kiểm chứng | Bằng chứng | Kết quả |
|---|---|---|---|
| AC-01…AC-25 (trừ AC-22): contract, tick, di chuyển, nhặt, nạp/thắp, thắng, va chạm, thua (no_flames, dawn), tỏa sáng, safe_radius, tất định, sinh thêm, mã thoát 2 | `npm test` (24 test gọi CLI headless thật) | [phase-1/test.txt](phase-1/test.txt) | Đạt 24/24 |
| Luồng nhặt 5 đom đóm → nạp → thắp L1 | `node src/headless/cli.js … --scenario scenarios/pickup-deposit.scenario.json --inputs scenarios/pickup-deposit.inputs.json` | [phase-1/pickup-deposit.jsonl](phase-1/pickup-deposit.jsonl) | Đạt: nhặt ở tick 10/20/30/40/50, `deposit` + `lantern_lit` tick 81, điểm 150 (đúng kỳ vọng ghi trước trong `scenarios/README.md`) |
| Tất định trên game mặc định (random motes/shades) | Chạy 2 lần seed 2026, 18000 tick, so `cmp` | [phase-1/determinism.txt](phase-1/determinism.txt), [phase-1/default-run1.jsonl](phase-1/default-run1.jsonl) | Đạt (sha256 trùng) |
| Clone sạch chạy được theo README | `git clone` → `npm ci` → `npm test` → headless → build | [phase-1/clean-clone.txt](phase-1/clean-clone.txt) | Đạt |
| AC-22 chơi bản web từ đầu tới thắng/thua, HUD, chơi lại | `npm run dev`, chơi tay | _(ảnh/clip của người học)_ | Chưa kiểm tra |
| Chạy trên macOS/Linux | — | — | Chưa thử trực tiếp; headless chỉ dùng Node chuẩn, web là bản tĩnh |

## CP0

| Yêu cầu | Cách kiểm chứng | Bằng chứng | Kết quả |
|---|---|---|---|
| Môi trường chạy được, test chạy được | `npm test` | [phase-0/test.txt](phase-0/test.txt) | Đạt (3/3, test CP0 đã thay bằng AC Phase 1) |
| Headless khung tất định | Chạy CLI 2 lần | [phase-0/headless.txt](phase-0/headless.txt) | Đạt |
| Bản web build được | `npm run build` | [phase-0/build.txt](phase-0/build.txt) | Đạt |
| Cảnh 3D hiển thị, di chuyển được | `npm run dev`, quan sát | [phase-0/web-move.png](phase-0/web-move.png) | Đạt |
