# Giả định

Mỗi dòng: chỗ chưa quy định → cách hiểu đã chọn → lý do → cách kiểm chứng. Khi ticket sau làm rõ, cập nhật cột Trạng thái (giữ lịch sử, không xóa).

| ID | Phase | Chưa quy định | Giả định | Lý do | Kiểm chứng | Trạng thái |
|---|---|---|---|---|---|---|
| A0-1 | CP0 | Bước thời gian mô phỏng | Cố định 1/60 s/tick, dùng chung web + headless | Tất định, so sánh được output | `tests/core.test.js` | Tạm, chờ Test Contract |
| A0-2 | CP0 | Tốc độ di chuyển | 4 đơn vị/giây | Giá trị khởi điểm | `tests/core.test.js` | Tạm, chờ PRD-0 |
