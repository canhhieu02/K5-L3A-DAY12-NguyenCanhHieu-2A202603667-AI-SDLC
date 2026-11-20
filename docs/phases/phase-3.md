# Phase 3 — TICKET-03 "Đèn cạn dầu" (Change Request, Test Contract v1.2)

Nguyên văn ticket: [ticket-03.md](ticket-03.md). Quyết định thiết kế: [ADR 0001](../adr/0001-lantern-fuel-and-dawn-win.md). Breaking changes: [CHANGELOG.md](../../CHANGELOG.md). Giả định: [../assumptions.md](../assumptions.md) (mục A3-xx). Phase trước: [phase-2.md](phase-2.md).

Quy ước như Phase 2: `T.x` = khóa `tuning`; "Kiểm chứng": `test` = test headless trong `tests/` gọi CLI thật, `scenario` = `scenarios/phase3/` (kỳ vọng ghi trước), `web` = ảnh trong `evidence/phase-3/`. Dầu tính theo đơn vị nguyên 1/60 (ADR mục 1): hao 1 đơn vị/tick, mỗi Bóng Mực hút 5 đơn vị/tick.

## Kế hoạch và tiến độ

| Bước | Việc | Trạng thái | Kiểm chứng |
|---|---|---|---|
| 1 | Lưu ticket nguyên văn, đọc ảnh hưởng tới luật cũ | Xong | — |
| 2 | Core: dầu đèn, châm/thắp lại, `drain`, luật thắng bình minh, sức chứa, điểm, contract v1.2 | Xong | `tests/phase3-fuel.test.js` |
| 3 | Cập nhật test cũ bị luật mới làm sai (bảng dưới) | Xong | `npm test` |
| 4 | Web: thanh dầu, nhấp nháy 1 Hz, đèn tắt xẹp + rách, HUD sức chứa, chế độ mù màu | Xong phần code + ảnh Chrome headless; chờ chơi tay | `tests/web-palette.test.js` P3-60…62, `evidence/phase-3/web-*.png` |
| 5 | ADR, changelog, giả định, spec, harness (`AGENTS.md`, `CLAUDE.md`, skill) | Xong | — |
| 6 | Scenario mẫu + bằng chứng | Xong phần tự động | `scenarios/phase3/`, `evidence/phase-3/` |

## A. Contract v1.2

| ID | Khi … | Thì … | Kiểm chứng |
|---|---|---|---|
| P3-01 | Đọc `game.contract.json` | `contract_version` = `"1.2"`; `tuning` trùng `tuning.js`; thêm `fuel_max` 100, `fuel_decay_per_s` 1.0, `fuel_per_mote` 10, `relight_cost` 5, `win_ratio` 0.6, `drain_per_s` 5, `low_fuel_threshold` 30, `capacity_max` 20; thời lượng 240/270/300; `score` theo A3-1 | test (AC-01, P3-01) |
| P3-40 | Snapshot | Mỗi đèn có `fuel` (1 chữ số thập phân, đèn tắt 0), `ever_lit`, `relit_count`; `player.capacity` | test (AC-02, P3-10) |
| P3-41 | Trạng thái Bóng Mực | Thuộc `spawning`, `wander`, `chase`, `recoil`, `stunned`, `drain` | test (P2-42) |
| P3-42 | Scenario v1.2 | `lanterns[].{lit, fuel, ever_lit}` (+ `relit_count`, A3-7), `player.successful_lights`, `shades[].target_lantern_id`; `lit: true` không `fuel` → 100; sai kiểu → mã 2 | test |
| P3-43 | Sự kiện | `refuel {lantern_id, amount, fuel}`, `lantern_out {lantern_id}`, `fuel_drain {lantern_id, shade_id, fuel}`, `lantern_lit {lantern_id, relight}`, `game_over.reason` ∈ `dawn_survived`/`dawn`/`no_flames` | test + scenario |

## B. Nhiên liệu đèn (mục 1)

| ID | Khi … | Thì … | Kiểm chứng |
|---|---|---|---|
| P3-10 | Thắp lần đầu / thắp lại | `fuel` = 100, `ever_lit` = true; đèn sáng mất 1 fuel/s (tick 61 sau khi thắp ở tick 1: 99.0); 3600 tick từ 100 còn đúng 40.0 | test |
| P3-11 | `fuel ≤ 0` sau bước 2 | `lantern_out`, `lit: false`, `deposited: 0`, `fuel: 0`, giữ `ever_lit` | test + scenario `refuel-relight`, `drain` |
| P3-12 | E ở đèn sáng chưa đầy dầu | `used = min(carried, ceil((100 − fuel)/10))`, `fuel = min(100, fuel + 10·used)`, −used đom đóm, +5·used điểm, `refuel`; chọn đèn nhận được gần nhất, bằng nhau id nhỏ hơn; đèn đầy không được chọn (A3-5) | test + scenario |
| P3-13 | E ở đèn tắt | Đèn `ever_lit` cần 5 (`lantern_lit {relight:true}`, +40, `relit_count` +1); đèn chưa từng sáng cần 10 (+100) | test + scenario |
| P3-14 | Sức chứa | `min(20, 10 + 2 × successful_lights)`; thắp và thắp lại đều tính; đèn đặt sẵn không tính; nhặt không vượt | test + scenario `capacity` |

## C. Bóng Mực hút dầu (mục 2)

| ID | Khi … | Thì … | Kiểm chứng |
|---|---|---|---|
| P3-20 | Đèn sáng `fuel < 30` / đúng 30 | Mất vùng an toàn / vẫn còn (chặn ở mép, đẩy ra) | test |
| P3-21 | Bóng Mực `drain` | Đứng yên, hút 5/s cộng dồn với hao 1/s; nhiều con cộng dồn; `fuel_drain` mỗi 60 tick hút (A3-6); đèn tắt → `wander` | test + scenario `drain` |
| P3-22 | Mây vào trong 6 m của con `drain` | → `chase` (Mây ở 8 m: vẫn `drain`) | test |
| P3-23 | Tỏa Sáng trúng con `drain` | `stunned`, tổng +15; hết choáng → `wander` | test + scenario `drain-pulse-refuel` |
| P3-24 | Châm lên ≥ 30 khi có Bóng Mực trong 6 m | Các con đó → `wander`, bị đẩy ra mép trong 30 tick, không gây hit; châm mà vẫn < 30 thì không đẩy | test + scenario |
| P3-25 | `wander` | Đi tới đèn yếu gần nhất (bằng nhau id nhỏ), ≤ 2 m thì `drain`; không có đèn yếu → đèn tắt gần nhất (A3-2) | test + scenario `drain` |
| P3-26 | `chase` | Không đổi mục tiêu sang đèn yếu | test |

## D. Luật thắng, điểm (mục 3, 5)

| ID | Khi … | Thì … | Kiểm chứng |
|---|---|---|---|
| P3-30 | Hết giờ, Mây còn sống | Đèn đang sáng ≥ `ceil(0.6 × tổng)` (3/5, 4/6, 5/7) → `won` `dawn_survived`; thiếu → `lost` `dawn` | test + scenario `dawn-win`, `dawn-lose` |
| P3-31 | Thắp đủ mọi đèn trước bình minh | Không kết thúc Đêm; thời lượng 240/270/300 s | test |
| P3-32 | Thắng | + mỗi đèn sáng `50 + floor(fuel)` (dầu nội bộ, A3-11) + 50 mỗi Ngọn Lửa; không thưởng thời gian; thua không thưởng | test + scenario |
| P3-33 | Hết Ngọn Lửa ở tick bình minh, đủ đèn | Thua `no_flames` (luôn trước) | test (P2-28) |
| P3-34 | Điểm trong Đêm | +5/đom đóm nạp (thắp, thắp lại, châm), +100 thắp lần đầu, +40 thắp lại, +5 stun (+15 nếu đang `drain`) | test |

## E. Hiển thị và chế độ mù màu (mục 1 "Hiển thị", 4, 6) — chỉ web, không đổi headless

| ID | Khi … | Thì … | Kiểm chứng |
|---|---|---|---|
| P3-50 | Đèn đang sáng | Thanh dầu trên đèn (đầy = 100); fuel < 30: đèn + thanh nhấp nháy 1 Hz (`blinkOn`), thanh màu cảnh báo | test (P3-61) + web |
| P3-51 | Đèn tắt | Xẹp 20% (scale Y 0.8) + 3 vết rách giấy; phân biệt được không cần màu | web |
| P3-52 | HUD | Thanh đom đóm có số ô = sức chứa, chữ `đang mang/sức chứa`; "Đèn k/n · cần m"; cảnh báo "Đèn … sắp cạn dầu!"; nhắc "E — Châm dầu (x/100)" / "E — Thắp lại (x/5)"; mũi tên chỉ đèn tắt hoặc đèn yếu gần nhất | web |
| P3-53 | Ánh sáng môi trường | Giảm khi đèn tắt (công thức `0.15 + 0.55 × sáng/tổng` của Phase 2) | test (P2-131) + web |
| P3-60 | Bật "Bảng màu dễ phân biệt" | Viền + mắt Bóng Mực `#00B3FF`; cảnh báo UI `#FFFFFF` kèm ⚠; màu khác giữ bảng chuẩn | test + web |
| P3-62 | Đóng rồi mở lại game | Cài đặt mù màu được giữ (localStorage) | test (giả lập localStorage) + chơi tay |

## Test cũ thay đổi (DoD: không skip âm thầm)

Không test nào bị skip hay xóa. Các test dưới đây bị luật mới làm sai và đã được **cập nhật**; lý do cũng ghi ngay trong comment của từng test.

| Test | File | Luật cũ bị thay | Cập nhật |
|---|---|---|---|
| AC-01 | `contract.test.js` | contract v1.1 | Kỳ vọng `"1.2"` |
| P2-01 → P3-01 | `contract.test.js` | Bảng `tuning` v1.1 | Bảng v1.2: thời lượng 240/270/300, 8 khóa mới, `score` mới (A3-1) |
| AC-02 | `contract.test.js` | `player` không có `capacity` | Thêm `capacity: 10` |
| AC-03 | `contract.test.js` | Đêm 1 = 300 s (`time_left_s` 298 ở tick 120) | `T.night1_duration_s − 2` (= 238) |
| AC-10 | `contract.test.js` | `lantern_lit {lantern_id}` | `{lantern_id, relight: false}` |
| AC-12 | `contract.test.js` | Thắp đèn cuối → thắng `all_lit` ngay + thưởng thời gian | Thắp đèn cuối không kết thúc; bình minh (tick 60) thắng `dawn_survived` với thưởng bình minh |
| AC-25 | `contract.test.js` | Dựng tick thắng bằng thắp đèn cuối | Dựng tick bình minh = 10 với 3 đèn sáng; vẫn kiểm event trước snapshot, `end` cuối, thưởng nằm trong snapshot + end |
| P2-17 | `phase2-core.test.js` | "Đèn đã sáng bị bỏ qua" khi nạp | Đèn sáng chưa đầy dầu được châm (`refuel`, A3-5); phần chọn id nhỏ hơn giữ nguyên |
| P2-28 | `phase2-core.test.js` | Thắp đèn cuối đúng tick hết giờ → `all_lit` | Thắp đèn thứ 3 đúng tick bình minh → `dawn_survived`; thêm: mất Ngọn Lửa cuối đúng tick bình minh khi đủ đèn → `no_flames` |
| P2-42 | `phase2-core.test.js` | 5 trạng thái Bóng Mực | Thêm `drain` |
| P2-90 | `phase2-core.test.js` | `time_left_s` 299.833 (Đêm 300 s) | Tính theo `T.night1_duration_s` |
| debug-mode (3 test) | `debug-mode.test.js` | `debugLightAll` → thắng `all_lit` ở tick kế | `debugWinNight`: thắp hết + tua tới bình minh → `dawn_survived` |
| scenario `pause` | `scenarios/phase2/pause.expect.json` | `time_left_s` 299.833 | 239.833 (ghi lý do trong `about`); bằng chứng Phase 2 trong `evidence/phase-2/` giữ nguyên như lúc sinh |

Test Phase 1–2 **không** bị luật mới thay (di chuyển, nhảy, lướt, nhặt, Tỏa Sáng, va chạm, rơi, bản đồ, Gió Lạc, Bùa Gió, tạm dừng, mã thoát…) chạy nguyên văn và vẫn đạt.

## DoD

| Mục DoD | Đáp ứng bởi | Trạng thái |
|---|---|---|
| Bằng chứng game chạy đúng | [evidence/README.md](../../evidence/README.md#phase-3-ticket-03-test-contract-v12), `evidence/phase-3/` | Đạt phần tự động; chơi tay chờ người học |
| ≥ 1 ghi chú quyết định thiết kế về mô hình đèn + luật thắng | [docs/adr/0001-lantern-fuel-and-dawn-win.md](../adr/0001-lantern-fuel-and-dawn-win.md) | Đạt |
| Test cũ bị luật mới làm sai được cập nhật/xóa có lý do, không skip | Bảng "Test cũ thay đổi" + comment trong test; `grep skip tests/` rỗng | Đạt |
| Changelog liệt kê breaking changes | [CHANGELOG.md](../../CHANGELOG.md) (B1–B14) | Đạt |
| Test ẩn Phase 1–2 không bị thay thế vẫn đạt | `npm test` (AC + P2 còn hiệu lực chạy nguyên văn) | Đạt với cách hiểu của mình (rủi ro dưới) |

## Đánh giá cuối phase

- **Đạt (có bằng chứng, commit 19fde37):** `npm test` 101/101 (gồm AC Phase 1 + P2 còn hiệu lực, 19 test P3 mới); 6/6 scenario Phase 3 khớp kỳ vọng ghi trước ngay lần chạy đầu; scenario Phase 2 còn 7/7 sau khi cập nhật `pause` (thời lượng); tất định 3 Đêm; 21 600 tick ≤ 1.1 s; build + 6 ảnh Chrome headless không lỗi console (gồm cảnh dầu đèn và bảng màu dễ phân biệt); clone sạch. Chi tiết: [evidence/README.md](../../evidence/README.md#phase-3-ticket-03-test-contract-v12).
- **Chưa kiểm chứng:** chơi tay trọn Đêm với luật mới (đèn tắt/thắp lại, thắng/thua thật ở bình minh), nhấp nháy 1 Hz khi đang chạy, cài đặt mù màu còn sau khi mở lại trình duyệt (chỉ có test giả lập localStorage), âm thanh mới, FPS.
- **Rủi ro với test ẩn:**
  - A3-1 (tên khóa `score`, bỏ `per_second_left`): nếu máy chấm so nguyên `tuning` với bảng của họ sẽ lệch ở `score`.
  - A3-2 (`wander` đi về đèn tắt gần nhất ở 2 m/s): ảnh hưởng thời điểm Bóng Mực tới đèn yếu (`drain` sớm/muộn) và vị trí Bóng Mực trong game mặc định.
  - A3-5 (đèn sáng lúc bấm E luôn chưa đầy): test ẩn kỳ vọng "đèn 100 không nhận châm" sẽ trượt — nhưng đó là hệ quả đúng của thứ tự tick bắt buộc.
  - A3-6 (nhịp `fuel_drain`), A3-8 (`target_lantern_id`), A3-7 (`ever_lit` mặc định = `lit`).
- **Lỗi AI và cách xử lý:** 2 lỗi trong test tự viết, đều phát hiện nhờ test đỏ và đọc lại luật trước khi sửa (không sửa core): `invuln_ticks: 59` hết ở tick 59 chứ không phải 60 (A2-4); thắp lại L2 nhưng L1 vừa thắp gần hơn và đã hao nên "cướp" lượt E (A3-5) → cho Mây đi lại gần L2 trước. Một test cũ (P2-17) đỏ đúng do luật mới → cập nhật có lý do. Heredoc bash hỏng khi script chứa backtick → chuyển script sửa file sang tệp tạm.

## Câu hỏi mở cho giảng viên

1. Tên khóa `tuning.score` mới và có giữ `per_second_left` không (A3-1).
2. "Đi về đèn tắt gần nhất như trước": bản của mình trước đây `wander` lượn ngẫu nhiên; đã đổi thành đi về đèn tắt gần nhất ở 2 m/s (A3-2). Tốc độ đi tới đèn yếu = 2 m/s (wander) hay 4 m/s?
3. Đèn sáng lúc bấm E luôn đã hao ≥ 1/60 (bước 2 trước bước 5) nên luôn nhận ít nhất 1 đom đóm; luật "đầy dầu không được chọn" gần như không bao giờ xảy ra (A3-5). Có đúng ý không?
4. Nhịp `fuel_drain`: tick hút thứ 60, 120, … của từng con, hay theo `sim_tick % 60` (A3-6)?
5. `target_lantern_id` có nghĩa với trạng thái khác `drain` không (A3-8)?
