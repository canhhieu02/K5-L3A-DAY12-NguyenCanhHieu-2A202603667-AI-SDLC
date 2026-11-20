# CLAUDE.md — harness dự án Đảo Đèn Lồng

Hướng dẫn đầy đủ (lệnh, kiến trúc, mô hình tick, quy tắc, skill) nằm trong AGENTS.md, dùng chung cho mọi agent:

@AGENTS.md

## Tóm tắt bắt buộc (Phase 2, contract v1.1)
- Nguồn yêu cầu duy nhất: ticket hiện hành `docs/phases/ticket-02.md` + spec `docs/phases/phase-2.md`. Không tự thêm luật; chỗ mơ hồ ghi vào `docs/assumptions.md`.
- `src/core/` = logic thuần, KHÔNG import `three`, DOM, `Math.random`, `Date.now`. Ngẫu nhiên chỉ qua `createRng(seed)`. Web và headless dùng cùng `step()` với `TICK_DT`.
- Thứ tự 12 bước trong một tick là bắt buộc (xem AGENTS.md).
- Định dạng I/O headless phải khớp nguyên văn Test Contract v1.1.
- Mỗi thay đổi hành vi phải có test/scenario; chạy `npm test` trước khi báo xong và dán output thật.
- Không sửa tay file trong `evidence/`; bằng chứng chỉ sinh từ `node scripts/evidence.mjs`.
- Chỉ commit local; chờ người dùng duyệt rồi mới push/tag. Không commit `.env`, key, token.
