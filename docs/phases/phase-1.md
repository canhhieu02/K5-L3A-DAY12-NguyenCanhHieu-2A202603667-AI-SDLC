# Phase 1 — PRD-0 (Test Contract v1.0)

Nguyên văn PRD-0: [prd-0.md](prd-0.md). Giả định: [../assumptions.md](../assumptions.md). Bằng chứng: [../../evidence/README.md](../../evidence/README.md).

## Tiêu chí nghiệm thu

Mã AC khớp tên test trong [tests/contract.test.js](../../tests/contract.test.js) (chạy `npm test`, gọi CLI headless thật).

| ID | Khi … | Thì … | Kiểm chứng |
|---|---|---|---|
| AC-01 | Đọc `game.contract.json` | `tuning` trùng hệt số game đang dùng (`src/core/tuning.js`) | test |
| AC-02 | Chạy `--ticks 25 --snapshot-every 10` | Snapshot tick 0, 10, 20; dòng cuối `end` với `ticks: 25` | test |
| AC-03 | Sau 120 tick | `time_left_s = 300 − 120/60 = 298` | test |
| AC-04 | `move [0,1]`, 60 tick | Người chơi ở `[0,0,player_speed]` | test |
| AC-05 | `move [0,1]`, `cam_yaw_deg 90` | Đi theo +X (công thức xoay của contract) | test |
| AC-06 | `move [1,1]` | Chuẩn hóa: quãng đường = `player_speed` | test |
| AC-07 | Frame sau không có `move` | `move` giữ giá trị cũ | test |
| AC-08 | Đi về mote cách 5 m | `mote_picked` đúng tick khoảng cách ≤ `pickup_radius` (tick 40), +`per_mote` | test |
| AC-09 | 7 mote tại chỗ | Chỉ mang tối đa `carry_capacity` | test |
| AC-10 | Mang đủ `lantern_cost`, `interact` trong `interact_radius` | `deposit` + `lantern_lit`, +`per_lantern` | test |
| AC-11 | Mang thiếu / ngoài bán kính / giữ nút | Nạp một phần; không nạp; không lặp | test |
| AC-12 | Thắp đèn cuối | `game_over won all_lit`, end `won`, điểm thưởng thời gian + ngọn lửa; đèn đặt sẵn không cộng | test |
| AC-13 | Bóng Mực cách 3 m | Chạm ở tick 40: −1 flame, rơi `floor(carried·ratio)`; lần chạm sau cách đúng `invuln_s` | test |
| AC-14 | Flames về 0 | `game_over lost no_flames` | test |
| AC-15 | `time_left_s: 1` | `game_over lost dawn` ở tick 60 | test |
| AC-16 | `pulse` khi mang ≥ `pulse_cost` | Choáng con trong `pulse_radius`, đẩy `pulse_push_m`, choáng đúng `pulse_stun_s`, +`per_stun` | test |
| AC-17 | `pulse` khi không có ánh sáng / trong hồi chiêu | Không có `pulse` | test |
| AC-18 | Đèn đã thắp, Bóng Mực đuổi | Bóng Mực không vào `safe_radius` | test |
| AC-19 | Chạy 2 lần cùng seed/inputs | Output giống hệt từng byte; khác seed thì khác | test |
| AC-20 | Game mặc định 30 s | `shade_spawned` với id `S3` | test |
| AC-21 | File sai định dạng | Mã thoát 2 + stderr; thiếu tham số → mã khác 0 | test |
| AC-22 | Chơi bản web | Đi, nhảy, camera 3D, nhặt, nạp, tỏa sáng, thắng/thua, HUD, chơi lại (R) | ảnh/clip |

## Kế hoạch đã duyệt
1. Core sim thuần, tất định (`src/core/world.js`) theo mô hình tick của contract.
2. Validate inputs/scenario (`src/core/validate.js`), CLI (`src/headless/cli.js`).
3. Test AC-01…21 gọi CLI thật.
4. Web Three.js chỉ đọc state từ core.

## Đánh giá cuối phase
_(cập nhật trước khi tag)_
