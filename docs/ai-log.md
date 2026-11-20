# Nhật ký dùng AI và token

## Tổng quan công cụ
- Agent: Claude Code (Claude Opus 5.5) trong VS Code. Harness: [CLAUDE.md](../CLAUDE.md).

## Nhật ký

| Thời điểm | Phase | Việc giao cho AI | Kết quả / lỗi AI | Cách phát hiện & xử lý | Token/chi phí ước tính |
|---|---|---|---|---|---|
| CP0 | 0 | Đọc tài liệu lab, kiểm tra tiến độ CP0/Phase 1 | Báo đúng hiện trạng | Đối chiếu `git ls-files` | _(ghi theo /cost)_ |
| CP0 | 0 | Dựng khung repo (Node + Three.js + Vite, core/headless/web, test) | Lỗi AI: script `node --test tests/` không chạy trên Node 22 | Chạy thật `npm test` thấy MODULE_NOT_FOUND → đổi sang glob `tests/*.test.js` | |
| CP0 | 0 | Kiểm tra web bằng mắt | Lỗi thiết kế AI: camera bám nhân vật + nền trơn → nhìn như không di chuyển | Người học chơi thử, không thấy chuyển động → thêm lưới mốc + tọa độ trên HUD | |

## Cách tiết kiệm token đã áp dụng
- CLAUDE.md ngắn; chỉ đưa ticket của phase hiện tại vào ngữ cảnh.
