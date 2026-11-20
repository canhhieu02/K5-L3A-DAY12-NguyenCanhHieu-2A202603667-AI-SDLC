# Giả định

Chỗ PRD-0 / Test Contract v1.0 chưa quy định → cách hiểu đã chọn. Khi ticket sau làm rõ, cập nhật cột Trạng thái (giữ lịch sử, không xóa).

| ID | Chưa quy định | Giả định | Lý do | Kiểm chứng | Trạng thái |
|---|---|---|---|---|---|
| A0-1 | Bước thời gian | 60 tick/s cố định (contract đã quy định) | — | AC-03 | Đã chốt bởi contract |
| A1-1 | "Ánh sáng" mà tỏa sáng tiêu tốn | Tốn `pulse_cost` = 1 đom đóm đang mang; không mang thì không tỏa sáng được | "tỏa sáng tốn ánh sáng"; đom đóm là ánh sáng | AC-16, AC-17 | Phase 1 |
| A1-2 | "Máu" | Ngọn lửa (`flames`) = 3 | Contract dùng `flames`, sự kiện `no_flames` | AC-13, AC-14 | Phase 1 |
| A1-3 | Đom đóm rơi khi bị chạm | `dropped = floor(carried × 0.5)`, đom đóm rơi **mất hẳn** (không sinh lại trên đất) | Đơn giản, tránh nhặt lại ngay tại chỗ | AC-13 | Phase 1 |
| A1-4 | Đèn nào làm Bóng Mực sợ | Chỉ đèn **đã thắp**; Bóng Mực bị đẩy ra mép `safe_radius` | Đèn chưa thắp chưa có ánh sáng | AC-18 | Phase 1 |
| A1-5 | Hết thời gian | Bình minh tới mà chưa thắp hết đèn = **thua** (`dawn`) | Contract liệt kê `lost / dawn` | AC-15 | Phase 1 |
| A1-6 | Điểm cuối trận | Chỉ khi **thắng**: + `floor(time_left_s) × per_second_left` + `flames × per_flame_left` | Thưởng cho chiến thắng nhanh, an toàn | AC-12 | Phase 1 |
| A1-7 | Rơi khỏi đảo | Không rơi: người chơi bị chặn ở mép đảo bán kính 40 m → `fall_enabled: false`, không có sự kiện `fall` | Giảm phạm vi Phase 1 | đọc code | Phase 1 |
| A1-8 | Nhảy | Nhảy chỉ thay đổi Y (v₀ 7 m/s, g 20 m/s²); mọi khoảng cách đo theo XZ nên nhảy **không** né được Bóng Mực | Contract: khoảng cách đo trên mặt phẳng XZ | AC-07 | Phase 1 |
| A1-9 | Vị trí đèn mặc định | L1…L5 trên vòng tròn 20 m, L1 tại (0,0,20), cách nhau 72° | Đảo tròn, đều | snapshot tick 0 | Phase 1 |
| A1-10 | Sinh đom đóm | Mặc định 25 con ngẫu nhiên (theo seed); cứ 5 s thêm 1 nếu còn < 15 | Đủ thắp 5 đèn (25) + dự phòng | AC-19 | Phase 1 |
| A1-11 | Sinh Bóng Mực | Mặc định 2 con (S1, S2) cách tâm 28–36 m; cứ 30 s thêm 1, tối đa 6 | Áp lực tăng dần | AC-20 | Phase 1 |
| A1-12 | Nạp đèn | Nút `interact` nạp tối đa đủ `lantern_cost` vào đèn **chưa thắp gần nhất** trong `interact_radius` | — | AC-10, AC-11 | Phase 1 |
| A1-13 | Choáng / bất tử / hồi chiêu đếm thế nào | Đổi giây → tick (`round(s × 60)`). Bóng Mực choáng từ tick k+1 tới k+180; chạm tiếp sớm nhất sau 90 tick; tỏa sáng lại sau 60 tick | Đếm nguyên, tất định | AC-13, AC-16, AC-17 | Phase 1 |
| A1-14 | Thứ tự xử lý trong một bước | timer → nút → di chuyển → nhảy → nhặt → nạp → (thắng?) → tỏa sáng → Bóng Mực di chuyển → va chạm → sinh thêm → bình minh | Thắng được xét trước va chạm cùng tick | đọc code | Phase 1 |
| A1-15 | Sai số số thực | "Trong bán kính r" so với `r + 1e-9` | Cộng dồn 0.05 m/tick lệch ~1e-15, tránh trượt 1 tick | AC-08, AC-13 | Phase 1 |
| A1-16 | Đèn trong scenario có id lạ | Bỏ qua, cảnh báo ra stderr (vẫn thoát 0) | Contract chỉ nói L1…L5 | — | Phase 1 |
| A1-17 | Tên trạng thái Bóng Mực | `chase`, `stunned` | Contract chỉ bắt buộc `stunned` | AC-16 | Phase 1 |
