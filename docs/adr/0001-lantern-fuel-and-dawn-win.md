# ADR 0001 — Mô hình trạng thái đèn có dầu và luật thắng ở bình minh

- Trạng thái: Chấp nhận (Phase 3, TICKET-03, contract v1.2)
- Ngày: 2026-11-21
- Liên quan: [ticket-03.md](../phases/ticket-03.md), [phase-3.md](../phases/phase-3.md), giả định A3-1…A3-14 trong [assumptions.md](../assumptions.md), [CHANGELOG.md](../../CHANGELOG.md)

## Bối cảnh

Tới Phase 2, đèn có hai trạng thái một chiều: `tắt (deposited < 10)` → `sáng` (mãi mãi). Game kết thúc ngay khi mọi đèn sáng (`all_lit`), Bóng Mực không bao giờ vào vùng 6 m của đèn sáng. TICKET-03 đổi mục tiêu thành "giữ đảo sáng tới bình minh": đèn sáng tiêu hao dầu, có thể tắt, thắp lại rẻ hơn, Bóng Mực hút dầu đèn yếu, và thắng chỉ được xét lúc hết giờ.

## Quyết định

### 1. Đèn là máy trạng thái có dầu

Mỗi đèn giữ: `lit`, `deposited`, `fuelU` (dầu nội bộ), `everLit`, `relitCount`.

Ba "pha" của đèn (pha 2 và 3 cùng `lit: true`, chỉ khác dầu):

| Từ | Sang | Khi | Tác dụng |
|---|---|---|---|
| TẮT (`fuel 0`) | SÁNG mạnh | Nạp đủ `cost` (10; 5 nếu `everLit`) ở bước 5 | `fuel = 100`, `everLit = true`, `lantern_lit {relight}`, thắp lại thì `relitCount + 1`; bước 6 đẩy Bóng Mực trong 6 m ra |
| SÁNG mạnh (`fuel ≥ 30`, có vùng an toàn) | SÁNG yếu | Hao 1/s ở bước 2 xuống dưới 30 | Mất vùng an toàn; Bóng Mực `wander` bắt đầu tìm tới |
| SÁNG yếu (`fuel < 30`) | SÁNG mạnh | Châm dầu lên ≥ 30 ở bước 5 | Bóng Mực đang hút về `wander`; bước 6 đẩy ra mép 6 m trong 30 tick |
| SÁNG (mạnh/yếu) | chính nó | Châm dầu chưa tới ngưỡng / hao / bị hút | `refuel`; `fuel_drain` mỗi 60 tick hút |
| SÁNG yếu | TẮT | `fuel ≤ 0` ngay sau bước 2 (hao + hút) | `lantern_out`, `deposited = 0`, giữ `everLit`; Bóng Mực đang hút về `wander` |

- **Dầu lưu bằng số nguyên** đơn vị 1/60 fuel (`FUEL_UNIT = 60`): hao 1 fuel/s = đúng 1 đơn vị/tick, hút 5/s = 5 đơn vị/tick. Không có sai số cộng dồn; chỉ làm tròn khi xuất (`fuelOut`: 1 chữ số thập phân bằng phép chia số nguyên). Lý do: ticket gợi ý; các mốc 30 (mất vùng) và 0 (tắt) phải chính xác tới tick, và test so `fuel` chính xác (3600 tick từ 100 → đúng 40).
- **"Có vùng an toàn" và "đèn yếu" là hàm suy ra**, không phải trạng thái lưu: `hasSafeZone = lit && fuelU ≥ 30·60`, `isWeak = lit && fuelU < 30·60`. Mọi chỗ trước đây hỏi `L.lit` cho vùng an toàn (chặn ở mép, đẩy ra khi đèn vừa sáng, điểm sinh Bóng Mực, vật cản của đẩy lùi) nay hỏi `hasSafeZone`. Nhờ vậy bước 6 cũ ("Bóng Mực trong vùng đèn sáng bị đẩy ra trong 30 tick") tự xử lý cả hai trường hợp ticket nêu: đèn vừa thắp/thắp lại **và** đèn vừa được châm lên ≥ 30 — không cần nhánh riêng.
- `ever_lit` quyết định chi phí thắp (10 hay 5) và `relight` trong `lantern_lit`. Tắt đèn đặt `deposited = 0` nên tiến độ thắp lại bắt đầu từ 0.
- Chọn đèn khi tương tác: chỉ xét đèn "nhận được" (`!lit || fuelU < 100·60`), gần nhất, bằng nhau id nhỏ hơn — cùng một vòng lặp cho cả nạp lẫn châm, rồi rẽ nhánh theo `lit`.

### 2. Bóng Mực thêm trạng thái `drain`

`wander` → (đèn yếu ≤ 2 m) → `drain` (đứng yên, gắn `drainLantern`) → `chase` (Mây ≤ 6 m) / `stunned` (Tỏa Sáng, +15 thay vì +5) / `wander` (đèn tắt, châm ≥ 30, bị đẩy, cách > 2 m). `wander` có đích: đèn yếu gần nhất, không có thì đèn tắt gần nhất (A3-2). `chase` giữ nguyên, không đổi đích.

### 3. Thứ tự trong tick (vẫn 12 bước của TICKET-02)

Bước 2 thêm cuối: trừ dầu (hao mọi đèn sáng, rồi hút theo id Bóng Mực), ghi `fuel_drain` mỗi 60 tick hút, rồi **ngay sau bước 2** đèn `fuelU ≤ 0` tắt (`lantern_out`) và các con đang hút nó về `wander`. Bước 5 thêm châm dầu. Bước 11 đổi luật thắng (dưới). Đặt việc tắt đèn trước bước 5 nghĩa là đèn vừa tắt có thể được thắp lại ngay trong cùng tick.

### 4. Luật thắng chỉ xét ở bình minh

Bước 11: `flames ≤ 0` → thua `no_flames` (luôn trước); else nếu hết giờ → đếm đèn **đang sáng** (kể cả đèn yếu) so với `ceil(win_ratio × tổng)` → `won/dawn_survived` hoặc `lost/dawn`; else chơi tiếp. Thưởng thắng tính trong `finish`: mỗi đèn sáng `50 + floor(fuel nội bộ)`, mỗi Ngọn Lửa 50; bỏ thưởng thời gian. `all_lit` không còn được phát.

### 5. Sức chứa là hàm suy ra

`capacity = min(capacity_max, carry_capacity + 2 × successfulLights)`; `successfulLights` đếm mọi lần thắp thành công qua tương tác (thắp mới + thắp lại), không đếm đèn đặt sẵn; mỗi Đêm là một `createGame` mới nên tự về 0.

## Phương án đã cân nhắc

- **Dầu số thực + dung sai**: đơn giản hơn nhưng mốc 30/0 lệch tick sau hàng nghìn phép trừ 1/60 (đã gặp lỗi tương tự ở Phase 1–2, A1-15). Bỏ.
- **Lưu `hasZone` như một cờ**: phải đồng bộ ở mọi chỗ đổi dầu; dễ quên. Bỏ, dùng hàm suy ra.
- **Trạng thái đèn dạng enum (`off/lit/low`)**: contract chỉ xuất `lit` + `fuel`, enum chỉ thêm chỗ lệch. Bỏ.
- **Giữ `wander` ngẫu nhiên, chỉ thêm tìm đèn yếu**: ticket ghi "không có thì đi về đèn tắt gần nhất như trước", nên làm theo câu chữ (A3-2, ghi câu hỏi mở).

## Hệ quả

- Đầu ra headless đổi ở nhiều chỗ (xem [CHANGELOG.md](../../CHANGELOG.md) — breaking changes). Test Phase 1–2 bị luật mới làm sai đã cập nhật và ghi lý do (mục "Test cũ thay đổi" trong [phase-3.md](../phases/phase-3.md)).
- Vì dầu hao ở bước 2 trước tương tác ở bước 5, đèn sáng lúc bấm E không bao giờ còn đúng 100 → luôn nhận ít nhất 1 đom đóm (A3-5). Đây là hệ quả trực tiếp của thứ tự tick bắt buộc; đã ghi câu hỏi mở.
- Web chỉ hiển thị: thanh dầu, nhấp nháy 1 Hz khi fuel < 30, đèn tắt xẹp 20% + giấy rách, vùng an toàn ẩn khi đèn yếu, ánh sáng môi trường tự giảm khi đèn tắt (công thức cũ theo số đèn sáng).
