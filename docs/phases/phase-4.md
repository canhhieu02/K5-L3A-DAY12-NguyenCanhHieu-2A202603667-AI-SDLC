# Phase 4 — TICKET-04 "Bình minh: phát hành v1.0.0" (Test Contract v1.3)

Nguyên văn ticket: [ticket-04.md](ticket-04.md). Quyết định: [ADR 0002](../adr/0002-web-benchmark-and-local-server.md). Thay đổi: [CHANGELOG.md](../../CHANGELOG.md) mục 1.3. Giả định: [../assumptions.md](../assumptions.md) (A4-xx). Phase trước: [phase-3.md](phase-3.md) (mọi `P3-xx` còn hiệu lực).

TICKET-04 là yêu cầu phi chức năng + phát hành: **không đổi luật, `tuning` hay đầu ra headless**. Kiểm chứng: `test` = `tests/phase4-release.test.js` (gọi lệnh thật trong `game.contract.json`), `evidence` = `evidence/phase-4/` sinh bằng `node scripts/evidence.mjs`, `web` = ảnh Chrome headless / chơi tay.

## Kế hoạch và tiến độ

| Bước | Việc | Trạng thái | Kiểm chứng |
|---|---|---|---|
| 1 | Lưu ticket, chọn cách đo bench cho bản web (ADR 0002) | Xong | — |
| 2 | Core: `createBenchGame` + cờ `g.bench` (không ảnh hưởng headless) | Xong | P4-10…12 |
| 3 | Bench launcher (Chrome cửa sổ 1280×720, vsync tắt, CDP), số đo thuần | Xong | P4-13, P4-14, `bench.json` |
| 4 | Soak 10 Đêm | Xong | P4-20, P4-21, `soak.json` |
| 5 | Bảng xếp hạng: module thuần + `server.mjs` (run_cmd) + màn hình web | Xong | P4-30…32, `leaderboard.txt` |
| 6 | Dễ tiếp cận: đổi phím, phụ đề/chỉ báo, giảm chuyển động, cỡ chữ | Xong | P4-40…42, ảnh web |
| 7 | Contract v1.3, đóng gói (`prepare`, `npm start`, gói release), README/CHANGELOG/CREDITS | Xong | P4-01, clone sạch |
| 8 | Bằng chứng, retro, tag `phase-4` + Release v1.0.0 + video | Bằng chứng tự động xong; tag/Release/video chờ người học | `evidence/phase-4/` |

## A. Contract v1.3

| ID | Khi … | Thì … | Kiểm chứng |
|---|---|---|---|
| P4-01 | Đọc `game.contract.json` | `contract_version` `"1.3"`; có `bench_cmd`, `soak_cmd`; `run_cmd` = `node server.mjs`; file trong mỗi lệnh tồn tại; `tuning` y như v1.2 | test (AC-01, P3-01, P4-01) |
| P4-02 | Chạy CLI headless v1.0–v1.2 | Đầu ra không đổi (mọi test AC/P2/P3 + 13 scenario chạy nguyên văn) | `npm test`, `scenarios.txt` |

## B. Benchmark (mục 1)

| ID | Khi … | Thì … | Kiểm chứng |
|---|---|---|---|
| P4-10 | `createBenchGame(42)` | Đêm 1; đúng 200 Bóng Mực `wander` + 100 đom đóm trong đảo, rải đều (A4-1); L1–L3 sáng fuel 100, L4–L5 tắt; Mây (0,0,0); tất định theo seed | test |
| P4-11 | Chạy cảnh bench 600 tick + quá giờ | Không sinh, không hit, không nhặt, dầu giữ 100, không `game_over`; ≥ 190/200 Bóng Mực di chuyển (wander/chase thật) | test |
| P4-12 | Game thường | Không có cờ bench; headless vẫn sinh Bóng Mực theo lịch | test |
| P4-13 | Tính số đo | `avg_fps = 1000N/Σdt`, `p1_low_fps` với k = max(1, ceil(0.01N)), `frame_ms_p95` (A4-5) | test |
| P4-14 | Camera | (30,15,0) lúc 0 s, R 30, Y 15, ngược chiều kim đồng hồ nhìn từ trên (A4-4), 15 s/vòng | test |
| P4-15 | `node scripts/bench.mjs --seed 42 --duration 30 --out bench.json` | Cửa sổ Chrome/Edge, vùng vẽ 1280×720, dpr 1, vsync tắt; 3 s khởi động + 30 s đo; ghi đủ 10 khóa ticket; thoát mã 0 | `evidence/phase-4/bench.json`, `bench.txt` |

## C. Soak (mục 2)

| ID | Khi … | Thì … | Kiểm chứng |
|---|---|---|---|
| P4-20 | `soak_cmd --seed 7 --nights 10 --out soak.json` | 10 Đêm xoay vòng 1→2→3, seed 7 + i (A4-2), chạy tới `game_over`/hết giờ; `crashes` 0; `mem_end_mb ≤ 1.2 × mem_start_mb`; kết quả tất định; đúng 6 khóa | test + `soak.json` |
| P4-21 | Input ngẫu nhiên | Đổi hướng mỗi 30 tick; nhảy/lướt/tỏa sáng/tương tác ≈ 5/3/2/10 % (A4-3) | test |

## D. Bảng xếp hạng (mục 3)

| ID | Khi … | Thì … | Kiểm chứng |
|---|---|---|---|
| P4-30 | Nhập tên | 3–12 ký tự `[A-Za-z0-9_]` + chữ tiếng Việt có dấu (A4-7); mục có `name, score, nights_won (0–3), achieved_at (ISO 8601 có múi giờ), seed` | test |
| P4-31 | Thêm mục | Top 10; điểm giảm dần; bằng điểm ai đạt trước đứng trên (A4-8) | test + `leaderboard.txt` |
| P4-32 | Lưu, tắt, mở lại, xuất | Server ghi `save/leaderboard.json`; server mới đọc lại đúng; `node server.mjs --export-leaderboard out.json` → `{"entries": [...]}` đúng thứ tự | test + `leaderboard.txt`, `leaderboard-export.json` |
| P4-33 | Web | Sau Bình Minh hoặc khi thua: form nhập tên (báo lỗi tên sai); menu chính có "Bảng xếp hạng"; dòng vừa lưu được tô sáng | ảnh `web-leaderboard.png` + chơi tay |

## E. Dễ tiếp cận (mục 4) — chỉ web

| ID | Khi … | Thì … | Kiểm chứng |
|---|---|---|---|
| P4-40 | Cài đặt → Phím | Đổi được 9 hành động bắt buộc + xoay camera; trùng phím tô đỏ + thông báo + tiếng; Esc giữ cho menu (A4-13); "Khôi phục mặc định"; lưu `localStorage`; HUD/menu hiện đúng phím đã gán | test + ảnh `web-settings-keys.png` |
| P4-41 | Cỡ chữ | Mọi `font-size` = `calc(≥18px × var(--fs))`; "Chữ lớn" đặt `--fs` 1.25 (lưu) | test + ảnh `web-settings-large.png` |
| P4-42 | Phụ đề / chỉ báo | Bóng Mực xuất hiện (phụ đề + mũi tên ở mép màn hình hoặc ▼ trên đầu nó, 4 s), gió sắp thổi (2 s trước), 10 s cuối (phụ đề + số đếm lớn), đèn fuel < 30 (phụ đề + cảnh báo HUD); thêm: bị đánh, rơi, đèn tắt, Gió Lạc cướp. Bật/tắt trong Cài đặt | test (tĩnh) + ảnh `web-a11y-*.png` + chơi tay |
| P4-43 | Giảm chuyển động | Không rung camera, không chớp màn hình, đồng hồ không nhấp nháy (A4-14); mặc định theo `prefers-reduced-motion` | test (tĩnh) + chơi tay |

## F. Đóng gói & tài liệu (mục 5–7)

| ID | Yêu cầu | Đáp ứng bởi | Kiểm chứng |
|---|---|---|---|
| P4-50 | Clone sạch → ≤ 3 lệnh → chơi | `npm ci` (prepare build `dist/`) → `npm start` | `clean-clone.txt` |
| P4-51 | README đủ mục | Mô tả, ảnh, yêu cầu hệ thống, cài đặt, điều khiển, test, headless, bench, soak, bảng xếp hạng | đọc README |
| P4-52 | CHANGELOG 4 phase, CREDITS, LICENSE | `CHANGELOG.md` (1.0–1.3), `CREDITS.md`, `LICENSE` (MIT) | đọc file |
| P4-53 | Release v1.0.0 | `npm run release` → `release/dao-den-long-v1.0.0-web.zip` (dist + server.mjs, chạy `node server.mjs`) | người học tạo Release |
| P4-54 | Retro + video | [docs/retro.md](../retro.md); video `.mp4` < 5 phút | người học quay |

## Test cũ thay đổi

| Test | File | Lý do | Cập nhật |
|---|---|---|---|
| AC-01 | `contract.test.js` | Contract v1.3 | Kỳ vọng `"1.3"`, kiểm thêm `bench_cmd`, `soak_cmd` |

Không test nào bị skip/xóa. Test khác (AC, P2, P3, web-palette, debug-mode) chạy nguyên văn. Scenario Phase 3 chạy lại trong `evidence/phase-4/scenarios.txt` làm hồi quy.

## DoD

| Mục DoD | Đáp ứng bởi | Trạng thái |
|---|---|---|
| Bằng chứng chạy đúng | [evidence/README.md](../../evidence/README.md#phase-4-ticket-04-test-contract-v13), `evidence/phase-4/` | Xem "Đánh giá cuối phase" |
| Tag `phase-4` + Release v1.0.0 | Người học tạo sau khi duyệt (không push khi chưa duyệt) | Chờ |
| `bench.json`, `soak.json` tự chạy, commit | `evidence/phase-4/bench.json`, `evidence/phase-4/soak.json` | Xem đánh giá |
| Test ẩn Phase 1–3 còn hiệu lực vẫn đạt | `npm test` + scenario Phase 3 | Xem đánh giá |
| Repo public, harness, tài liệu | AGENTS.md, CLAUDE.md, `.claude/skills/`, docs/ | Đạt (repo public do người học kiểm) |

## Đánh giá cuối phase

_(điền sau khi sinh bằng chứng)_

## Câu hỏi mở cho giảng viên

1. Bản web: `peak_mem_mb` lấy tổng bộ nhớ mọi tiến trình trình duyệt (A4-11) hay ghi `null`?
2. Chiều quay camera "ngược chiều kim đồng hồ nhìn từ trên" = +X → −Z (A4-4)?
3. "Đêm thứ i dùng seed 7 + i": i bắt đầu từ 0 hay 1 (A4-2)?
4. Đom đóm bench được đặt cả trong vùng an toàn; Bóng Mực thì không (A4-1) — có đúng ý "rải đều" không?
