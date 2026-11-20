# Scenarios headless

Mỗi scenario gồm file đầu vào và kết quả kỳ vọng theo đúng định dạng của Test Contract.
Các tình huống biên được kiểm tra tự động trong `tests/contract.test.js` (AC-01…21, scenario viết inline).
File ở đây là ví dụ chạy tay, kết quả lưu trong `evidence/phase-1/`.

| Scenario | Kỳ vọng |
|---|---|
| `pickup-deposit` | Đi +Z nhặt 5 đom đóm (tick 10, 20, 30, 40, 50), dừng ở z = 8 (tick 80), nạp L1 tại z = 10 → `deposit` 5 + `lantern_lit` ở tick 81, điểm 150 |
