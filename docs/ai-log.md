# Nhật ký dùng AI và token

## Tổng quan công cụ
- Agent: Claude Code (Claude Opus 5.5) trong VS Code. Harness: [CLAUDE.md](../CLAUDE.md).

## Nhật ký

| Thời điểm | Phase | Việc giao cho AI | Kết quả / lỗi AI | Cách phát hiện & xử lý | Token/chi phí ước tính |
|---|---|---|---|---|---|
| CP0 | 0 | Đọc tài liệu lab, kiểm tra tiến độ CP0/Phase 1 | Báo đúng hiện trạng | Đối chiếu `git ls-files` | _(ghi theo /cost)_ |
| CP0 | 0 | Dựng khung repo (Node + Three.js + Vite, core/headless/web, test) | Lỗi AI: script `node --test tests/` không chạy trên Node 22 | Chạy thật `npm test` thấy MODULE_NOT_FOUND → đổi sang glob `tests/*.test.js` | |
| CP0 | 0 | Kiểm tra web bằng mắt | Lỗi thiết kế AI: camera bám nhân vật + nền trơn → nhìn như không di chuyển | Người học chơi thử, không thấy chuyển động → thêm lưới mốc + tọa độ trên HUD | |

| Phase 1 | 1 | Đưa nguyên văn PRD-0; AI viết tiêu chí AC-01…22 + giả định, rồi core/CLI/test/web | 20/21 test đạt lần đầu | — | |
| Phase 1 | 1 | Lỗi AI: so sánh `d <= r` trượt 1 tick do sai số cộng dồn (0.05 m/tick → 1.0000000001 m) | Test AC-13 đỏ; in snapshot tick 40/41 thấy nguyên nhân | Thêm dung sai 1e-9 cho mọi phép "trong bán kính" (A1-15), test khẳng định đúng tick 40 | |
| Phase 1 | 1 | Lỗi AI: bản web gán đè hàm `readInput`, gọi trong render làm Q/E xoay camera 2 lần/khung | Tự review diff trước khi chạy | Viết lại: tính hướng mặt trong vòng lặp tick | |

| Phase 1 | 1 | Đối chiếu 7 câu trả lời của GV với code | Phát hiện lệch ở safe_radius với bóng đang choáng | Viết AC-23 tái hiện (đỏ) → sửa `world.js` → 24/24 xanh | |
| Phase 1 | 1 | Lỗi AI: test AC-23 bản đầu đỏ **sai lý do** (đèn đặt ngoài interact_radius nên không thắp) | Đọc lại số liệu trước khi sửa code | Dời đèn, thêm assert trạng thái trước khi thắp để test chỉ đỏ đúng chỗ | |
| Phase 1 | 1 | Lỗi AI: dùng `sed` đánh dấu cả 17 giả định "đã hỏi GV" trong khi chỉ hỏi 7 chủ đề | Tự rà kết quả lệnh | Sửa lại chỉ đánh dấu các dòng thực sự đã hỏi | |

## Token / chi phí

Dùng gói **Claude Pro** (thuê bao, không trả theo token), nên Claude Code không hiện số token hay số tiền chính xác. Số đo lấy từ bảng *Account & Usage* của tiện ích VS Code.

| Mốc | Phạm vi | Hạn mức phiên (5 giờ) | Hạn mức tuần | Ghi chú |
|---|---|---|---|---|
| Sau khi tag `phase-1` | CP0 + Phase 1, 1 phiên Claude Code (Opus) | 32% | 11% | Chi phí tiền thêm: 0 (nằm trong gói) |

Bảng *"What's contributing to your limits usage"* (24 giờ qua, ước tính):
- 77%: *"Start fresh when you switch tasks"*. Cả CP0 và Phase 1 chạy trong **một** cuộc hội thoại dài, nên mỗi lượt gửi lại toàn bộ ngữ cảnh cũ.
- 17%: ngữ cảnh lớn (file dài như PRD-0, test, world.js được đọc hoặc viết nhiều lần).
- 11%: chưa compact trước khi tạm nghỉ.

**Bài học cho Phase 2 trở đi:** chạy `/clear` khi sang phase mới (ngữ cảnh cần thiết đã nằm trong repo: CLAUDE.md, docs/phases, docs/assumptions.md); dùng `/compact` khi hội thoại dài; chỉ đưa ticket mới vào ngữ cảnh, không dán lại PRD cũ.

## Cách tiết kiệm token đã áp dụng
- CLAUDE.md ngắn; chỉ đưa ticket của phase hiện tại vào ngữ cảnh.
