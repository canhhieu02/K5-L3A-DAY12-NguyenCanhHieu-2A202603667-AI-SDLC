# CLAUDE.md — harness dự án Đảo Đèn Lồng

Hướng dẫn đầy đủ (lệnh, kiến trúc, mô hình tick, quy tắc, skill) nằm trong AGENTS.md, dùng chung cho mọi agent:

@AGENTS.md

## Tóm tắt bắt buộc (Phase 4, contract v1.3 — luật game vẫn v1.2)
- Nguồn yêu cầu: ticket hiện hành `docs/phases/ticket-04.md` (bench, soak, bảng xếp hạng, dễ tiếp cận, phát hành) + spec `docs/phases/phase-4.md`, quyết định `docs/adr/0002-*.md`; luật game theo `ticket-03.md`/`phase-3.md`, `docs/adr/0001-*.md`. Không tự thêm luật; chỗ mơ hồ ghi vào `docs/assumptions.md` (A4-xx).
- Phase 4 **không được đổi** luật, `tuning`, đầu ra headless. Cờ `g.bench` chỉ dùng cho cảnh bench; bench mở cửa sổ Chrome thật (đừng chạy song song việc khác khi đo).
- Đổi luật/đầu ra headless → cập nhật `CHANGELOG.md` (breaking changes) và bảng "Test cũ thay đổi" trong `phase-3.md`; không skip test cũ.
- `src/core/` = logic thuần, KHÔNG import `three`, DOM, `Math.random`, `Date.now`. Ngẫu nhiên chỉ qua `createRng(seed)`. Web và headless dùng cùng `step()` với `TICK_DT`.
- Thứ tự 12 bước trong một tick là bắt buộc (xem AGENTS.md).
- Định dạng I/O headless phải khớp nguyên văn Test Contract v1.2 (dầu đèn số nguyên 1/60, xuất `fuel` 1 chữ số thập phân).
- Mỗi thay đổi hành vi phải có test/scenario; chạy `npm test` trước khi báo xong và dán output thật.
- Không sửa tay file trong `evidence/`; bằng chứng chỉ sinh từ `node scripts/evidence.mjs`.
- Chỉ commit local; chờ người dùng duyệt rồi mới push/tag. Không commit `.env`, key, token.
