# CLAUDE.md — harness dự án Đảo Đèn Lồng

## Lệnh
- Cài: `npm install` · Test: `npm test` · Headless: `npm run headless -- <args>` · Chơi: `npm run dev`

## Kiến trúc (bắt buộc giữ)
- `src/core/` = logic game thuần, KHÔNG import `three`, DOM, `Math.random`, `Date.now`. Ngẫu nhiên chỉ qua `createRng(seed)`.
- `src/headless/` = Test Contract (CLI). `src/web/` = chỉ hiển thị, đọc state từ core.
- Web và headless dùng cùng `step()` với bước thời gian cố định `TICK_DT`.

## Quy tắc
- Nguồn yêu cầu duy nhất: ticket hiện hành trong `docs/phases/`. Không tự thêm luật; chỗ mơ hồ ghi vào `docs/assumptions.md`.
- Định dạng I/O headless phải khớp nguyên văn Test Contract.
- Mỗi thay đổi hành vi phải có test/scenario; chạy `npm test` trước khi báo xong và dán output thật.
- Không sửa tay file trong `evidence/`; bằng chứng chỉ sinh ra từ lệnh chạy thật.
- Không commit `.env`, key, token.
