---
name: phase-evidence
description: Sinh và kiểm tra bằng chứng cuối phase cho Đảo Đèn Lồng (test, scenario kỳ vọng, tất định, hiệu năng, ảnh web, clone sạch, bench, soak, bảng xếp hạng) và đối chiếu Definition of Done. Dùng trước khi nộp/tag một phase.
---

# Bằng chứng cuối phase

Quy tắc: file trong `evidence/` **chỉ** sinh từ lệnh chạy thật; không sửa tay, không chép output vào kỳ vọng.

1. Commit hết thay đổi code trước (header bằng chứng ghi commit; `clone` lấy HEAD).
2. Chạy `node scripts/evidence.mjs` (hoặc từng phần: `test scenarios determinism perf web soak leaderboard bench clone`). Mặc định `PHASE=4`; script thoát khác 0 nếu có phần KHÔNG ĐẠT. Thử nghiệm không ghi đè bằng chứng: `EVIDENCE_OUT=<thư mục tạm>`.
   - `test.txt`: `npm test` (gồm AC Phase 1 → hồi quy).
   - `scenarios.txt` + `<tên>.jsonl`: scenario `scenarios/phase<PHASE>/` (Phase 4 chạy lại `phase3/` làm hồi quy) so với `*.expect.json`.
   - `determinism.txt`, `perf.txt`: 3 Đêm tất định; 21 600 tick mỗi Đêm ≤ 30 s.
   - `web.txt` + `web-*.png`: build + Chrome headless (Phase 4: menu, Đêm 1, cảnh bench, Cài đặt/phím, chữ lớn, bảng xếp hạng, phụ đề `?demo=a11y`).
   - `soak.txt` + `soak.json`: đúng `soak_cmd` của contract, `--seed 7 --nights 10`.
   - `leaderboard.txt` + `leaderboard-export.json`: `run_cmd` thật → POST tên hợp lệ/sai → tắt → mở lại → `--export-leaderboard`.
   - `bench.txt` + `bench.json`: đúng `bench_cmd`, `--seed 42 --duration 30` — **mở cửa sổ Chrome ~35 s, không dùng máy trong lúc đo** (FPS bị ảnh hưởng).
   - `clean-clone.txt`: clone HEAD → `npm ci` (prepare build) → `npm test` → headless → `npm start` trả trang → soak → export.
3. Phần **chỉ người chơi kiểm được** (ghi rõ trong `evidence/README.md`, không giả lập): chơi tay, âm thanh, đổi phím rồi chơi bằng phím mới, phụ đề khi Bóng Mực xuất hiện/gió/10 s cuối, Giảm chuyển động (không rung/chớp khi bị đánh), lưu tên sau Bình Minh/khi thua rồi mở lại game. Ảnh do người học lưu vào `evidence/phase-N/`.
4. Cập nhật bảng phase hiện hành trong `evidence/README.md`: Yêu cầu | Cách kiểm chứng | Bằng chứng | Kết quả. Kết quả chỉ ghi "Đạt" khi file bằng chứng nói vậy; chưa kiểm thì ghi "Chưa kiểm chứng".
5. Đối chiếu DoD của ticket (cuối `docs/phases/ticket-0N.md`) và viết mục "Đánh giá cuối phase" trong `docs/phases/phase-N.md`: đạt gì (kèm link bằng chứng), chưa kiểm chứng gì, rủi ro với test ẩn / máy chấm, lỗi AI đã gặp.
6. Commit bằng chứng riêng. Không push/tag/Release cho tới khi người dùng duyệt.
