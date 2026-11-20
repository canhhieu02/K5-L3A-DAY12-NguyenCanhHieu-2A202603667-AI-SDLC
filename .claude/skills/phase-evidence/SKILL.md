---
name: phase-evidence
description: Sinh và kiểm tra bằng chứng cuối phase cho Đảo Đèn Lồng (test, scenario kỳ vọng, tất định, hiệu năng, ảnh web, clone sạch) và đối chiếu Definition of Done. Dùng trước khi nộp/tag một phase.
---

# Bằng chứng cuối phase

Quy tắc: file trong `evidence/` **chỉ** sinh từ lệnh chạy thật; không sửa tay, không chép output vào kỳ vọng.

1. Commit hết thay đổi code trước (header bằng chứng ghi commit; `clone` lấy HEAD).
2. Chạy `node scripts/evidence.mjs` (hoặc từng phần: `test scenarios determinism perf web clone`). Script thoát khác 0 nếu có phần KHÔNG ĐẠT.
   - `test.txt`: `npm test` (gồm AC Phase 1 → hồi quy).
   - `scenarios.txt` + `<tên>.jsonl`: mỗi scenario trong `scenarios/phase2/` so với `*.expect.json`.
   - `determinism.txt`: 3 Đêm, seed 2026 chạy 2 lần (sha256 trùng) + seed 2027 (khác).
   - `perf.txt`: 21 600 tick mỗi Đêm, yêu cầu ≤ 30 s.
   - `web.txt` + `web-*.png`: `npm run build`, Chrome headless chụp menu và `?night=1..3`, kiểm console không lỗi.
   - `clean-clone.txt`: clone HEAD → `npm ci` → `npm test` → headless 3 Đêm → build.
3. Phần **chỉ người chơi kiểm được** (ghi rõ trong `evidence/README.md`, không giả lập): chơi tay chuỗi 3 Đêm, thắng/thua, tạm dừng, cài đặt lưu sau khi mở lại, âm thanh, HUD ≤ 30 s, mũi tên chỉ đèn, **FPS trung bình ≥ 30 ở 1280×720** (đọc số "TB" góc dưới trái). Ảnh chụp do người học lưu vào `evidence/phase-2/`.
4. Cập nhật bảng Phase 2 trong `evidence/README.md`: Yêu cầu | Cách kiểm chứng | Bằng chứng | Kết quả. Kết quả chỉ ghi "Đạt" khi file bằng chứng nói vậy; chưa kiểm thì ghi "Chưa kiểm chứng".
5. Đối chiếu DoD của ticket (cuối `docs/phases/ticket-02.md`) và viết mục "Đánh giá cuối phase" trong `docs/phases/phase-2.md`: đạt gì (kèm link bằng chứng), chưa kiểm chứng gì, rủi ro với test ẩn (giả định A2-xx dễ lệch), lỗi AI đã gặp.
6. Commit bằng chứng riêng. Không push/tag cho tới khi người dùng duyệt.
