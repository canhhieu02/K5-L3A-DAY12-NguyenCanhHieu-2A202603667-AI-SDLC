# Changelog

Định dạng theo [Keep a Changelog](https://keepachangelog.com/vi/1.1.0/). Phiên bản = phiên bản Test Contract.

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

Xem [docs/phases/phase-2.md](docs/phases/phase-2.md): số chuẩn, 3 Đêm, lướt/rơi/bục nhảy/gió, Gió Lạc, Bùa Gió, tạm dừng, snapshot/scenario/sự kiện v1.1.

## [1.0] — Phase 1, PRD-0

Xem [docs/phases/phase-1.md](docs/phases/phase-1.md).
