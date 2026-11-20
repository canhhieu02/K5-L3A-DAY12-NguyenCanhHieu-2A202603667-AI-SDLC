# Scenarios headless

Mỗi scenario gồm file đầu vào và kết quả kỳ vọng theo đúng định dạng của Test Contract.
Các tình huống biên được kiểm tra tự động trong `tests/contract.test.js` (scenario viết inline).
File ở đây là ví dụ chạy tay. `evidence/phase-1/` lưu kết quả với số liệu Phase 1 (5 đom đóm/đèn); bản dưới đây dùng số chuẩn TICKET-02.

| Scenario | Kỳ vọng (số chuẩn v1.1) |
|---|---|
| `pickup-deposit` | Đi +Z nhặt 10 đom đóm (tick 10, 20, …, 100), dừng ở z = 10 (tick 100), nạp L1 tại z = 12 → `deposit` 10 + `lantern_lit` ở tick 101, điểm 200 |
