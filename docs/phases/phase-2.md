# Phase 2 — TICKET-02 "Ba hòn đảo" (Test Contract v1.1)

Nguyên văn ticket: [ticket-02.md](ticket-02.md). Giả định: [../assumptions.md](../assumptions.md) (mục A2-xx). Phase trước: [phase-1.md](phase-1.md).

Quy ước: `T.x` = khóa `tuning` trong `game.contract.json` (= `src/core/tuning.js`). Đổi giây → tick bằng `round(s × 60)`. "Kiểm chứng": `test` = test headless trong `tests/` gọi CLI thật; `web` = ảnh/clip trong `evidence/phase-2/`. Cột "Bước" là bước trong kế hoạch bên dưới sẽ làm cho AC đó đạt.

## Kế hoạch

1. Đặc tả này + giả định.
2. Số liệu chuẩn vào `tuning.js` + `game.contract.json` v1.1; test Phase 1 tham số hóa theo tuning, vẫn xanh.
3. Lõi: vật lý (vận tốc, nhảy, lướt, rơi, hồi sinh), thứ tự tick mới, tạm dừng, đom đóm rơi/lịch sinh, Bóng Mực 5 trạng thái, Tỏa Sáng mới, điểm chuẩn hóa, trường snapshot/scenario/sự kiện v1.1.
4. Bản đồ 3 Đêm (địa hình, cầu, dốc, bục nhảy, tháp chuông, gió) + `--night`.
5. Gió Lạc, Bùa Gió.
6. Web: chuỗi 3 Đêm, tạm dừng, cài đặt, âm thanh, HUD, bảng màu, ánh sáng, FPS.
7. Harness: `CLAUDE.md`/`AGENTS.md` + skill cho phạm vi mới.
8. Bằng chứng: clone sạch, tất định, thời gian chạy một Đêm, ảnh web.

## Tiến độ

| Bước | Trạng thái | Test |
|---|---|---|
| 1 | Xong | — |
| 2 | Xong | P2-01; AC-09/16/17/23/24 tham số hóa theo tuning |
| 3 | Xong (Đêm 1 chuẩn hóa luôn vì lịch sinh gắn với điểm sinh) | `tests/phase2-core.test.js`: P2-03, 04, 11–17, 19–28, 31, 40–43, 84, 90, 91; test Phase 1 cập nhật theo luật mới: AC-02 (trường v1.1), AC-08/10/12 (điểm khi nạp), AC-16 (đẩy lùi 15 tick), AC-19/20 (lịch sinh), AC-23 (đẩy ra trong 30 tick) |
| 4 | Xong | `tests/phase2-maps.test.js`: P2-03 (Đêm 2/3), 23 (4.5 m/s), 30 (lịch Đêm 2/3), 50, 52–56. Chạy 21 600 tick Đêm 2/3: ~0.35 s, hai lần chạy giống hệt từng byte |
| 5 | Xong | `tests/phase2-features.test.js`: P2-41 (drifters/charms), 60–65, 70–74 |
| 6 | Xong phần code; chờ chơi thử | `tests/web-palette.test.js`: P2-130, P2-131 + kiểm tra kiến trúc core. Chrome headless mở `?night=1/2/3` không có lỗi console (chỉ kiểm tra khởi động + HUD). P2-80…122, P2-132 (FPS) cần chơi thử trên máy thật — bước 8 |
| 7–8 | Chưa | |

## A. Số liệu chuẩn và contract (Phần 1, Phần 4)

| ID | Khi … | Thì … | Kiểm chứng | Bước |
|---|---|---|---|---|
| P2-01 | Đọc `game.contract.json` | `contract_version` = `"1.1"`; `tuning` trùng `tuning.js` và trùng số chuẩn của ticket (bảng dưới), có thêm `dash_speed`, `dash_duration_s`, `dash_cooldown_s`, `night2_duration_s`, `night3_duration_s` | test | 2 |
| P2-02 | Chạy lại toàn bộ test Phase 1 (AC-01…AC-25) với số chuẩn | Vẫn đạt; test nào gắn cứng số cũ thì được viết lại theo `T.x`, không đổi ý nghĩa | test | 2 |
| P2-03 | `--night 1/2/3` | Dựng đúng bản đồ Đêm đó, `time_left_s` = 300/330/360; giá trị khác → mã thoát ≠ 0 | test | 4 |
| P2-04 | Chạy một Đêm đầy đủ 21 600 tick | Xong ≤ 30 s (đo thời gian thật) | test + evidence | 3–4 |

Số chuẩn khai trong `tuning`:

| Khóa | Giá trị | Khóa | Giá trị |
|---|---|---|---|
| `player_speed` | 6 | `pulse_stun_s` | 2 (120 tick) |
| `carry_capacity` | 10 | `pulse_push_m` | 4 |
| `lantern_cost` | 10 | `pulse_cooldown_s` | 3 |
| `lantern_count_night1` | 5 | `safe_radius` | 6 |
| `pickup_radius` | 1.0 | `shade_speed` | 4 (Đêm 3: 4.5, ngoài tuning) |
| `interact_radius` | 2.0 | `shade_hit_radius` | 1.0 |
| `pulse_cost` | 3 | `fall_enabled` | true |
| `pulse_radius` | 5 | `dash_speed` | 14 |
| `night1_duration_s` | 300 | `dash_duration_s` | 0.2 (12 tick) |
| `night2_duration_s` | 330 | `dash_cooldown_s` | 1.5 (90 tick) |
| `night3_duration_s` | 360 | `flames` / `invuln_s` / `hit_drop_ratio` | 3 / 1.5 / 0.5 |
| `score` | `per_mote` 10, `per_lantern` 100, `per_stun` 5, `per_second_left` 2, `per_flame_left` 50 | | |

## B. Luật lõi chuẩn hóa (Phần 1)

| ID | Khi … | Thì … | Kiểm chứng | Bước |
|---|---|---|---|---|
| P2-10 | `move [0,1]` 60 tick trên đất | Đi đúng 6 m (đạt tốc độ trong ≤ 0.1 s, A2-1) | test | 3 |
| P2-11 | Nhảy khi chạm đất / khi đang trên không | v₀ = 7 m/s, g = −20 m/s², đỉnh 1.225 m ở tick 21, tiếp đất ở tick 42 (A2-31); trên không nhấn nhảy không có tác dụng | test | 3 |
| P2-12 | `dash` (false→true) đang chạy theo hướng d | Event `dash {}`; 12 tick vận tốc ngang 14 m/s theo d (đi 2.8 m); lướt trên không giữ nguyên Y; vẫn bị Bóng Mực chạm | test | 3 |
| P2-13 | `dash` khi đứng yên | Lướt theo hướng đang quay mặt (đầu Đêm: +Z) | test | 3 |
| P2-14 | `dash` lại trước 90 tick kể từ lúc bắt đầu lướt trước | Không lướt, không event; `player.dash_cd_s` giảm dần về 0 | test | 3 |
| P2-15 | Đi qua đom đóm, chênh cao chân Mây – mặt đất đặt đom đóm > 1.5 m | Không nhặt; ≤ 1.5 m và XZ ≤ 1 m thì nhặt | test | 3 |
| P2-16 | Đầu Đêm (mặc định) | 20 đom đóm `random` ở 20 điểm sinh khác nhau; tick 240k sinh thêm 1 ở điểm trống nếu tổng < 30; hết điểm trống thì bỏ lượt | test | 3–4 |
| P2-17 | `interact` gần 2 đèn chưa sáng cách đều | Nạp `min(carried, còn thiếu)` vào đèn id nhỏ hơn; đèn đã sáng bị bỏ qua; ngoài 2.0 m không nạp | test | 3 |
| P2-18 | Bóng Mực ngoài vùng 6 m của đèn đã sáng đuổi Mây đứng trong vùng | Không bao giờ vào trong 6 m | test | 3 |
| P2-19 | Đèn vừa thắp, Bóng Mực đang ở trong 6 m | Bị đẩy ra mép trong ≤ 30 tick; trong lúc đó chạm Mây không gây hit | test | 3 |
| P2-20 | `pulse` khi mang ≥ 3 và hết hồi chiêu | Trừ 3; mục tiêu = Bóng Mực có khoảng cách 3D từ tâm (chân Mây + 0.8 m) ≤ 5 m, chốt ở tick kích hoạt; choáng 120 tick; 15 tick đầu đẩy lùi tổng 4 m ngang (gặp vật cản thì dừng; trùng vị trí → +X); không chết | test | 3 |
| P2-21 | `pulse` trúng Bóng Mực đang choáng | Làm mới choáng 120 tick và đẩy lùi; vẫn +5 điểm | test | 3 |
| P2-22 | `pulse` khi mang < 3 hoặc trong 180 tick hồi chiêu | Không kích hoạt, không event | test | 3 |
| P2-23 | Bóng Mực trong 12 m / ra ngoài 18 m | `wander` → `chase` / `chase` → `wander`; tốc độ 4 m/s (Đêm 3: 4.5) | test | 3 |
| P2-24 | Bóng Mực chạm Mây (XZ ≤ 1 m, chênh cao ≤ 1.5 m), Mây không bất tử | `player_hit {by:"shade"}`: −1 Ngọn Lửa, rơi `floor(carried/2)` thành đom đóm `dropped` ở vành 1.5–2.5 m (TTL 480 tick, nhặt được từ tick sau); bất tử 90 tick; Bóng Mực `recoil` lùi 2 m trong 60 tick | test | 3 |
| P2-25 | Hai Bóng Mực cùng chạm trong một tick | Chỉ 1 hit (con id nhỏ nhất); con kia không làm gì | test | 3 |
| P2-26 | Mây rơi xuống Y < −10 | Đúng 1 `player_hit {by:"fall", flames, dropped:0, lost:n}` bỏ qua bất tử; mất hết đom đóm; 60 tick không nhặt, không bị chạm; rồi hồi sinh ở điểm xuất phát, vận tốc 0, bất tử 90 tick | test | 3–4 |
| P2-27 | Rơi khi còn 1 Ngọn Lửa | `game_over lost no_flames` ngay tick đó, không hồi sinh | test | 3 |
| P2-28 | Cùng tick: thắp đèn cuối + hết giờ / hết Ngọn Lửa + thắp đèn cuối | Thắng `all_lit` / thua `no_flames` (hết Ngọn Lửa luôn ưu tiên) | test | 3 |
| P2-29 | Điểm | +10 mỗi đom đóm **nạp** (không cộng khi nhặt); +100 mỗi đèn; +5 mỗi Bóng Mực trúng Tỏa Sáng; thắng: `floor(giây còn lại)×2 + 50×Ngọn Lửa` | test | 3 |
| P2-30 | Lịch sinh Bóng Mực mặc định | 2 con (S1, S2) tại tick 300, rồi 1 con mỗi 480/420/360 tick (Đêm 1/2/3), tối đa 6/8/10; điểm sinh cách Mây ≥ 15 m, không có điểm hợp lệ thì bỏ lượt; mới sinh ở `spawning` | test | 3–4 |
| P2-31 | Thứ tự xử lý trong tick | Đúng 12 bước của ticket (ví dụ: nhặt trước nạp cùng tick; Gió Lạc cướp trước Bóng Mực hit; thực thể mới sinh không tương tác trong tick sinh) | test | 3 |

## C. Contract v1.1 (Phần 4)

| ID | Khi … | Thì … | Kiểm chứng | Bước |
|---|---|---|---|---|
| P2-40 | Snapshot bất kỳ | Có `night`, `wind {active, dir_deg}`; `player` có `vel`, `grounded`, `invuln`, `dash_cd_s`, `pulse_cd_s`, `charm_s`; có mảng `motes` (`id`, `pos`, `kind`, `ttl_s`), `drifters` (`id`, `pos`, `state`, `stolen`), `charms` (`id`, `available`, `respawn_s`) | test | 3 |
| P2-41 | Scenario có `player.{invuln_ticks, dash_cd_ticks, pulse_cd_ticks, charm_ticks}`, `shades[].{state, state_ticks_left}`, `drifters`, `charms`, `random_drifters`, `wind_enabled` | Dựng đúng; `drifters`, `charms` thay thế danh sách mặc định; sai kiểu → mã thoát 2 | test | 3, 5 |
| P2-42 | Trạng thái Bóng Mực | Chỉ dùng `spawning`, `wander`, `chase`, `recoil`, `stunned` | test | 3 |
| P2-43 | Input `dash`/`pause` | Kích hoạt khi false → true; giữ nút không lặp | test | 3 |

## D. Bản đồ (Phần 2)

| ID | Khi … | Thì … | Kiểm chứng | Bước |
|---|---|---|---|---|
| P2-50 | `--night 1` snapshot tick 0 | Đèn L1…L5 đúng tọa độ ticket; đom đóm nằm trên 24 điểm sinh chuẩn; Mây (0,0,0) | test | 4 |
| P2-51 | Đêm 1 đi ra ngoài bán kính 40 m | Rơi (P2-26) | test | 4 |
| P2-52 | Đêm 2 | 2 đảo r 28 m + cầu x∈[26,44], z∈[−2,2]; bước khỏi cầu thì rơi; đèn L1…L6 đúng tọa độ | test | 4 |
| P2-53 | Đêm 2 chạm bục (20,0,18) / (50,0,−18) | Bắn vy 14, ngang 24 m/s về tâm đảo kia; phím di chuyển không ghi đè; đáp trong đảo đích sau ≈ 1.4 s | test | 4 |
| P2-54 | Đêm 3 địa hình | Tầng 0/1/2 ở Y 0/3/6; vách chặn đi lên, bước ra thì rơi xuống tầng dưới; 2 dốc ở 30°/150° nối tầng 0–1; tháp chuông r 2 m chặn | test | 4 |
| P2-55 | Đêm 3 chạm bục (0,3,13) | vy 12, 8 m/s hướng −Z, đáp lên tầng 2 | test | 4 |
| P2-56 | Đêm 3 gió | Mỗi 30 s một cơn 5 s hướng ngẫu nhiên (theo seed) đẩy Mây 2 m/s; `wind.active`/`dir_deg` đúng; `wind_enabled:false` thì không có gió; web báo trước 2 s (lá bay + âm thanh) | test + web | 4, 6 |

## E. Tính năng mới (Phần 3) — mỗi mục có ≥ 1 scenario headless hoặc bằng chứng web

### E1. Gió Lạc

| ID | Khi … | Thì … | Kiểm chứng | Bước |
|---|---|---|---|---|
| P2-60 | Đêm 2/3 mặc định | Gió Lạc D1, D2… sinh tại tick 1200, 2400, … ở điểm sương ngẫu nhiên, tối đa 2 con cùng lúc; Đêm 1 không có | test | 5 |
| P2-61 | Mây mang ≥ 5 và cách ≤ 15 m | `idle` (2 m/s) → `chase` (7 m/s); điều kiện mất → `idle` | test | 5 |
| P2-62 | Gió Lạc `chase` chạm Mây (XZ ≤ 1.2 m), kể cả khi Mây bất tử | `drifter_steal {drifter_id, amount=min(3,carried), carried}`; chuyển `flee` 7 m/s ra xa Mây 240 tick rồi `removed`, số đã cướp mất theo; không mất Ngọn Lửa; mỗi con cướp tối đa 1 lần | test | 5 |
| P2-63 | Tỏa Sáng trúng Gió Lạc `chase` | Chuyển `flee`, không cướp | test | 5 |
| P2-64 | Tỏa Sáng trúng Gió Lạc `flee` đang mang đồ | `drifter_drop {drifter_id, amount}`; đom đóm rơi `dropped` tại chỗ; biến mất sau 120 tick | test | 5 |
| P2-65 | Gió Lạc đi qua vùng an toàn của đèn | Không bị chặn | test | 5 |

### E2. Bùa Gió

| ID | Khi … | Thì … | Kiểm chứng | Bước |
|---|---|---|---|---|
| P2-70 | Đêm 2 / Đêm 3 mặc định | Bùa C1 (35,0,0) / C1 (30,0,25), C2 (−30,0,25); Đêm 1 không có | test | 5 |
| P2-71 | Nhặt bùa (luật như đom đóm) | `charm_picked {charm_id, charm_ticks:600}`; `charm_s` = 10; `available:false`, `respawn_s` = 45 | test | 5 |
| P2-72 | Trong hiệu lực | Chạy 7.2 m/s; Lướt không hồi chiêu nhưng phải nhấn lại; nhấn khi đang lướt bị bỏ qua; lướt vẫn 14 m/s × 12 tick | test | 5 |
| P2-73 | Nhặt bùa khác khi đang hiệu lực | Làm mới về 600 tick | test | 5 |
| P2-74 | 2700 tick sau khi nhặt | Bùa `available:true` lại | test | 5 |

### E3. Chuỗi 3 Đêm (web)

| ID | Khi … | Thì … | Kiểm chứng | Bước |
|---|---|---|---|---|
| P2-80 | Mở game | Menu chính → giới thiệu Đêm 1 (tên đảo, lời Ông Đăng) → chơi | web | 6 |
| P2-81 | Thắng Đêm 1/2 | Màn kết quả (điểm Đêm) → giới thiệu Đêm kế; Ngọn Lửa hồi đầy | web | 6 |
| P2-82 | Thắng Đêm 3 | Màn Bình Minh với tổng điểm = tổng điểm các Đêm đã thắng | web | 6 |
| P2-83 | Thua một Đêm | Được chơi lại đúng Đêm đó | web | 6 |
| P2-84 | Headless | Mỗi lần chạy là một Đêm (`--night`); scenario `night_start {night}` phát ở tick 1 (A2-25) | test | 3 |

### E4. Tạm dừng

| ID | Khi … | Thì … | Kiểm chứng | Bước |
|---|---|---|---|---|
| P2-90 | Input `pause` false→true khi đang chơi | Event `paused {}`; từ đó `tick` tăng nhưng `sim_tick`, thời gian, hồi chiêu, spawn, TTL đứng yên; snapshot `state:"paused"` | test | 3 |
| P2-91 | `pause` lần nữa | Event `resumed {}`, logic chạy tiếp từ đúng trạng thái cũ | test | 3 |
| P2-92 | Web: Esc/P | Menu Tiếp tục / Chơi lại Đêm / Cài đặt / Về menu; logic dừng hoàn toàn | web | 6 |

### E5. Cài đặt

| ID | Khi … | Thì … | Kiểm chứng | Bước |
|---|---|---|---|---|
| P2-100 | Chỉnh âm lượng và độ nhạy chuột, đóng rồi mở lại game | Giá trị được giữ (localStorage) | web | 6 |

### E6. Âm thanh

| ID | Khi … | Thì … | Kiểm chứng | Bước |
|---|---|---|---|---|
| P2-110 | Chơi | Có nhạc nền đêm và hiệu ứng cho: nhặt, thắp đèn, tỏa sáng, bị đánh, nhảy, lướt, thắng, thua, Bóng Mực xuất hiện, đếm ngược 10 s cuối; âm lượng theo Cài đặt; headless không phát gì | web (clip) | 6 |

### E7. HUD đầy đủ

| ID | Khi … | Thì … | Kiểm chứng | Bước |
|---|---|---|---|---|
| P2-120 | Đang chơi | Ngọn Lửa trên trái; đồng hồ mm:ss trên giữa (≤ 30 s: đỏ `#FF5A5F` + nhấp nháy); đèn k/n và điểm trên phải; thanh đom đóm 10 ô dưới giữa; biểu tượng hồi chiêu Lướt + Tỏa Sáng dưới phải | web | 6 |
| P2-121 | Đứng trong 2 m của đèn chưa sáng | Nhắc "E — Nạp ánh sáng (x/10)" với x = đã nạp | web | 6 |
| P2-122 | Đèn chưa sáng gần nhất ở ngoài màn hình | Mũi tên ở mép màn hình chỉ tới nó | web | 6 |

### E8. Bảng màu và ánh sáng

| ID | Khi … | Thì … | Kiểm chứng | Bước |
|---|---|---|---|---|
| P2-130 | Đọc bảng màu trong code web | Các thành phần liệt kê dùng đúng hex ticket (lệch ≤ 10%/kênh) — gom một chỗ `src/web/palette.js`, test so với bảng | test | 6 |
| P2-131 | Thắp đèn | Cường độ ánh sáng môi trường = `0.15 + 0.55 × (sáng / tổng)` (hàm thuần, có test) | test + web | 6 |
| P2-132 | Bản thường ở 1280×720 | FPS trung bình ≥ 30 (đo trong game, ghi evidence) | web | 6, 8 |

## F. DoD

| Mục DoD | Đáp ứng bởi |
|---|---|
| Bằng chứng game chạy đúng | `evidence/phase-2/` (bước 8) |
| Test ẩn Phase 1 vẫn đạt với số chuẩn | P2-02 |
| Spec có AC cho từng mục Phần 3 | Mục E (E1–E8) |
| AGENTS.md/skill cập nhật | bước 7 |
| ≥ 1 scenario headless mỗi tính năng mới | P2-12, P2-26, P2-53, P2-56, P2-60…74, P2-90 (thư mục `scenarios/`) |
| ≥ 30 FPS | P2-132 |

## Câu hỏi mở cho giảng viên

1. Điểm xuất phát Đêm 2 và Đêm 3 (ticket chỉ nêu Đêm 1). Đêm 3 điểm (0,0,0) nằm trong tháp chuông/tầng 2 → tạm chọn theo A2-16.
2. "Điểm sương" sinh Gió Lạc là điểm nào → tạm dùng điểm sinh Bóng Mực của Đêm đó (A2-18).
3. `player.invuln` là boolean hay số giây → tạm dùng boolean (A2-23).
4. Thời gian trạng thái `spawning` của Bóng Mực → tạm 60 tick (A2-10).
5. Tên trường của phần tử `drifters[]` / `charms[]` trong scenario → tạm theo A2-35.
