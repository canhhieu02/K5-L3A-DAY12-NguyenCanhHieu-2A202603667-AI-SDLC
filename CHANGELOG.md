# Changelog

Định dạng theo [Keep a Changelog](https://keepachangelog.com/vi/1.1.0/). Phiên bản = phiên bản Test Contract.

## [Chưa phát hành] — Đồ họa (sau tag `phase-4`)

Chỉ lớp web; luật, bản đồ chuẩn (`groundAt`), `tuning`, đầu ra headless không đổi (115/115 test).

- Mây dựng lại: mặt, tóc, má hồng, tay chân có khớp, áo + thắt lưng, nón lá có vành và nan, khăn đỏ bay, đèn lồng cầm tay; hoạt ảnh bước đi theo tốc độ, co chân khi nhảy, ngó quanh khi đứng yên.
- `src/web/decor.js`: vách đá gồ ghề + chóp đá dưới đảo (mép trên khớp đúng bán kính chơi), thảm cỏ nhiều sắc (lệch < 10% màu cỏ chuẩn), núi xa nhô khỏi biển mây, mây bồng bềnh; cây theo Đêm (Đảo Bến cây tán tròn, Đảo Cau cây cau, Đảo Chuông cây thông), bụi, đá, khóm cỏ, hoa — đặt theo seed cố định, tránh đèn/điểm sinh/bục nhảy/bùa, không va chạm. Vẽ bằng InstancedMesh (ít draw call).
- Cảnh bench không dựng phần trang trí này (TICKET-04: phần sáng tạo thêm phải tắt trong bench).

## [1.3] — Phase 4, TICKET-04 "Bình minh: phát hành v1.0.0" (bản phát hành v1.0.0)

Spec + AC: [docs/phases/phase-4.md](docs/phases/phase-4.md). Quyết định đo hiệu năng bản web: [ADR 0002](docs/adr/0002-web-benchmark-and-local-server.md).

**Luật, số liệu `tuning` và đầu ra headless (`cli.js`) không đổi** so với v1.2 — mọi scenario Phase 3 và test AC/P2/P3 còn hiệu lực chạy nguyên văn.

### Thay đổi contract

| # | Thay đổi | Trước (v1.2) | Sau (v1.3) |
|---|---|---|---|
| C1 | `contract_version` | `"1.2"` | `"1.3"` |
| C2 | `run_cmd` | `npm run dev` (vite dev server) | `node server.mjs` — phục vụ bản build, lưu bảng xếp hạng ra đĩa, nhận `--export-leaderboard out.json` (`npm run dev` vẫn chơi được) |
| C3 | Khóa mới | — | `bench_cmd: "node scripts/bench.mjs"`, `soak_cmd: "node --expose-gc src/headless/soak.js"` |
| C4 | Node | ≥ 20 | ≥ 22 cho bench (WebSocket có sẵn để điều khiển Chrome); headless vẫn chạy trên Node 20 |

### Added

- **Benchmark** `node scripts/bench.mjs --seed 42 --duration 30 --out bench.json`: mở Chrome/Edge cửa sổ, vùng vẽ đúng 1280×720, tắt vsync; cảnh chuẩn `createBenchGame` (200 Bóng Mực `wander`, 100 đom đóm, L1–L3 fuel 100; tắt sinh thêm, sát thương, nhặt, hao dầu, kết thúc Đêm); camera bay vòng R 30 m, Y 15 m, 15 s/vòng; 3 s khởi động; số đo theo định nghĩa ticket.
- **Soak** `node --expose-gc src/headless/soak.js --seed 7 --nights 10 --out soak.json`: 10 Đêm xoay vòng trong một tiến trình, input ngẫu nhiên theo seed, đo RSS.
- **Bảng xếp hạng cục bộ**: nhập tên sau Bình Minh hoặc sau khi thua; top 10 (điểm giảm dần, bằng điểm ai đạt trước đứng trên); lưu `save/leaderboard.json`; màn hình từ menu chính; xuất `node server.mjs --export-leaderboard out.json`. Tên nhận cả chữ tiếng Việt có dấu.
- **Dễ tiếp cận**: đổi phím mọi hành động (báo trùng phím, "Khôi phục mặc định", được lưu); phụ đề + chỉ báo hình ảnh (Bóng Mực xuất hiện kèm mũi tên ở mép màn hình, gió sắp thổi, 10 s cuối có số đếm lớn, đèn fuel < 30, bị đánh, đèn tắt…); Giảm chuyển động (tắt rung camera, chớp màn hình, đồng hồ nhấp nháy; mặc định theo `prefers-reduced-motion`); mọi chữ UI ≥ 18 px, tùy chọn Chữ lớn ×1.25.
- Rung camera + chớp đỏ khi Mây bị đánh (chỉ web; tắt bằng Giảm chuyển động).
- `npm start`, `npm run bench`, `npm run soak`, `npm run release` (gói `release/dao-den-long-v1.0.0-web.zip`), `prepare` tự build `dist/` khi `npm ci`.
- Test `tests/phase4-release.test.js` (P4-01…P4-42); bằng chứng `evidence/phase-4/` (bench.json, soak.json, leaderboard-export.json, ảnh web, clone sạch).

### Changed

- Đổi phím thay cho phím cứng: Tỏa Sáng chỉ còn một phím (mặc định F; J cũ có thể gán lại), tạm dừng = Esc (cố định) hoặc phím gán (mặc định P).
- Cỡ chữ HUD/menu: các chữ 11–16 px trước đây nâng lên ≥ 18 px; ô hồi chiêu rộng hơn.
- `vite.config.js`: `base: './'` để `dist/` chạy ở thư mục bất kỳ; API bảng xếp hạng có cả ở `npm run dev`/`preview`.
- `scripts/evidence.mjs`: mặc định Phase 4, thêm bước `bench`, `soak`, `leaderboard`; clone sạch kiểm đúng 2 lệnh README (`npm ci`, `npm start`).

## [1.2] — Phase 3, TICKET-03 "Đèn cạn dầu"

Quyết định thiết kế: [docs/adr/0001-lantern-fuel-and-dawn-win.md](docs/adr/0001-lantern-fuel-and-dawn-win.md). Spec + AC: [docs/phases/phase-3.md](docs/phases/phase-3.md).

### ⚠ Breaking changes (đầu ra headless / contract)

| # | Thay đổi | Trước (v1.1) | Sau (v1.2) |
|---|---|---|---|
| B1 | `contract_version` | `"1.1"` | `"1.2"` |
| B2 | Thời lượng Đêm 1/2/3 (`night*_duration_s`, `time_left_s` lúc đầu) | 300 / 330 / 360 s | 240 / 270 / 300 s |
| B3 | Luật thắng | Thắng ngay khi mọi đèn sáng, `reason: "all_lit"` | Chỉ xét ở bình minh: đủ `ceil(0.6 × tổng)` đèn đang sáng → `won` / `dawn_survived`, thiếu → `lost` / `dawn`. `all_lit` **không còn** được phát |
| B4 | Đèn đã sáng | Không nhận thêm đom đóm, sáng mãi | Có `fuel` (100 khi thắp, −1/s), châm dầu bằng E, hết dầu thì tắt (`lantern_out`), thắp lại tốn 5 |
| B5 | Vùng an toàn 6 m | Mọi đèn đã sáng | Chỉ đèn sáng có `fuel ≥ 30` |
| B6 | Trạng thái Bóng Mực | `spawning`, `wander`, `chase`, `recoil`, `stunned` | thêm `drain` (đứng hút dầu đèn yếu) |
| B7 | `wander` | Lượn ngẫu nhiên | Đi tới đèn yếu gần nhất, không có thì đèn tắt gần nhất (A3-2) — vị trí Bóng Mực và chuỗi `rng` trong game mặc định khác v1.1 |
| B8 | Điểm | +10/đom đóm nạp, +100/đèn, +5/stun; thắng: `floor(giây còn) × 2 + 50 × Ngọn Lửa` | +5/đom đóm nạp (cả châm dầu), +100 thắp lần đầu, +40 thắp lại, stun +5 (đang drain: +15); thắng: mỗi đèn sáng `50 + floor(fuel)`, `50 × Ngọn Lửa`; bỏ thưởng thời gian |
| B9 | `tuning.score` | `per_mote 10, per_lantern 100, per_stun 5, per_second_left 2, per_flame_left 50` | `per_mote 5, per_lantern 100, per_relight 40, per_stun 5, per_stun_drain 15, per_lantern_dawn 50, per_flame_left 50` (bỏ `per_second_left`, A3-1) |
| B10 | Sức chứa | Cố định 10 | `min(20, 10 + 2 × successful_lights)` |
| B11 | Sự kiện `lantern_lit` | `{lantern_id}` | `{lantern_id, relight}` |
| B12 | Snapshot đèn | `{id, pos, lit, deposited}` | thêm `fuel` (1 chữ số thập phân, đèn tắt = 0), `ever_lit`, `relit_count` |
| B13 | Snapshot `player` | không có `capacity` | thêm `capacity` |
| B14 | Tương tác E | Chỉ đèn chưa sáng | Đèn chưa sáng **hoặc** sáng chưa đầy dầu (gần nhất, bằng nhau id nhỏ) — đèn đặt sẵn `lit: true` cạnh Mây giờ nhận châm dầu thay vì bị bỏ qua |

### Added

- `tuning`: `fuel_max`, `fuel_decay_per_s`, `fuel_per_mote`, `relight_cost`, `win_ratio`, `drain_per_s`, `low_fuel_threshold`, `capacity_max`.
- Sự kiện: `refuel {lantern_id, amount, fuel}`, `lantern_out {lantern_id}`, `fuel_drain {lantern_id, shade_id, fuel}` (mỗi 60 tick hút), `game_over.reason: "dawn_survived"`.
- Scenario: `lanterns[].{fuel, ever_lit, relit_count}`, `player.successful_lights`, `shades[].target_lantern_id`; `lit: true` không kèm `fuel` → 100. Sai kiểu → mã thoát 2.
- Web: thanh dầu trên đèn sáng, nhấp nháy 1 Hz khi fuel < 30, đèn tắt xẹp 20% + giấy rách, HUD `đang mang/sức chứa`, "Đèn k/n · cần m", cảnh báo đèn sắp cạn, nhắc "E — Châm dầu" / "Thắp lại", âm thanh châm dầu/đèn tắt/hút; cài đặt **Bảng màu dễ phân biệt** (lưu được: viền + mắt Bóng Mực `#00B3FF`, cảnh báo `#FFFFFF` kèm ⚠). `?demo=fuel`, `?cb=1` để chụp bằng chứng.
- Scenario mẫu `scenarios/phase3/` (6, kỳ vọng ghi trước), test `tests/phase3-fuel.test.js`.

### Changed

- Web, chế độ thử: "Thắng Đêm này" thắp hết đèn và tua tới bình minh (`debugWinNight` thay `debugLightAll`).
- `scripts/evidence.mjs` theo `PHASE` (mặc định 3), tất định chạy trọn Đêm v1.2 (14 400 / 16 200 / 18 000 tick), chụp thêm ảnh demo dầu đèn.

### Removed

- `game_over.reason: "all_lit"`, `tuning.score.per_second_left`, hàm `debugLightAll`.

## [1.1] — Phase 2, TICKET-02 "Ba hòn đảo"

Chi tiết + AC: [docs/phases/phase-2.md](docs/phases/phase-2.md).

### Added
- Số chuẩn của ticket vào `tuning` (tốc độ, bán kính, thời gian…); thứ tự 12 bước trong một tick bắt buộc.
- Đêm 2 "Đảo Cau" (2 đảo + cầu + bục nhảy) và Đêm 3 "Đảo Chuông" (3 tầng, dốc, tháp chuông, gió); chuỗi 3 Đêm, cộng điểm các Đêm thắng.
- Lướt, rơi khỏi đảo + hồi sinh, bục nhảy, gió mạnh mỗi 30 s; Gió Lạc cướp đom đóm; Bùa Gió tăng tốc; tạm dừng.
- Snapshot/scenario/sự kiện v1.1 (`dash`, `charm_picked`, `drifter_steal`, `drifter_drop`, `paused`, `resumed`…); bảng màu chuẩn; âm thanh WebAudio; menu, cài đặt, chế độ thử.
- `AGENTS.md`, 3 skill, `scripts/evidence.mjs`, scenario mẫu có kỳ vọng ghi trước.

### Changed (so với v1.0)
- `contract_version` `"1.1"`; số liệu Phase 1 tự chọn được thay bằng số chuẩn (test Phase 1 tham số hóa theo `T.x`).

## [1.0] — Phase 1, PRD-0

Chi tiết + AC: [docs/phases/phase-1.md](docs/phases/phase-1.md).

### Added
- Game 3D góc nhìn thứ ba (three.js + Vite): Mây di chuyển, nhảy, nhặt đom đóm, nạp đèn để thắp, Tỏa Sáng làm choáng Bóng Mực, vùng an toàn quanh đèn, 3 Ngọn Lửa; Đêm 1 thắng khi thắp đủ đèn.
- Core thuần tất định (`src/core`, rng theo seed) dùng chung cho web và headless; CLI headless Test Contract v1.0 (JSONL snapshot/event/end, scenario, inputs, mã thoát 1/2).
- `game.contract.json`, test AC-01…AC-25, giả định A1-xx.
