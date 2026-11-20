# Scenarios headless

Mỗi scenario gồm file đầu vào và kết quả kỳ vọng theo đúng định dạng của Test Contract.
Các tình huống biên được kiểm tra tự động trong `tests/*.test.js` (scenario viết inline).

- `phase2/`, `phase3/`: mỗi scenario có `<tên>.scenario.json`, `<tên>.inputs.json` và `<tên>.expect.json` (kỳ vọng **ghi trước** khi chạy). Chạy và đối chiếu: `node scripts/evidence.mjs scenarios` (Phase 3) hoặc `PHASE=2 node scripts/evidence.mjs scenarios`.
- `pickup-deposit`: ví dụ chạy tay từ Phase 1. `evidence/phase-1/` lưu kết quả với số liệu Phase 1 (5 đom đóm/đèn).

| Scenario | Kỳ vọng (số chuẩn v1.2) |
|---|---|
| `pickup-deposit` | Đi +Z nhặt 10 đom đóm (tick 10, 20, …, 100), dừng ở z = 10 (tick 100), nạp L1 tại z = 12 → `deposit` 10 + `lantern_lit {relight:false}` ở tick 101, điểm 10 × 5 + 100 = 150 (v1.1: 200 với +10/đom đóm) |
| `phase3/refuel-relight` | Đèn hết dầu tắt (tick 60) → thắp lại 5 đom đóm (tick 61) → châm dầu (tick 121) |
| `phase3/drain` | Bóng Mực tìm tới đèn yếu, hút tới khi đèn tắt (tick 275) |
| `phase3/drain-pulse-refuel` | Tỏa Sáng trúng con đang hút (+15), châm lên ≥ 30 → có lại vùng an toàn |
| `phase3/dawn-win`, `phase3/dawn-lose` | Bình minh: Đêm 2 đủ 4/6 → thắng; Đêm 3 chỉ 4/7 → thua |
| `phase3/capacity` | Sức chứa 20 khi đã thắp 5 lần |
