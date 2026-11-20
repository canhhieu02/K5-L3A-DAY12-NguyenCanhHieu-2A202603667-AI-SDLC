---
name: add-rule
description: Thêm hoặc sửa một luật/tính năng gameplay của Đảo Đèn Lồng theo ticket (core + headless + test). Dùng khi ticket yêu cầu luật mới, đổi số liệu, hoặc sửa lỗi hành vi trong src/core.
---

# Thêm / sửa luật game

Làm đúng thứ tự, mỗi bước có bằng chứng. Không bỏ bước 2–3 kể cả khi thay đổi "nhỏ".

1. **Đọc nguồn**: đoạn liên quan trong ticket hiện hành (`docs/phases/ticket-02.md`) và AC trong `docs/phases/phase-2.md`. Ghi ra con số, thứ tự tick, sự kiện, trường snapshot bị ảnh hưởng.
2. **Chỗ mơ hồ** → thêm dòng `A2-xx` vào `docs/assumptions.md` (Chưa quy định | Giả định | Lý do | Kiểm chứng | Trạng thái). Nếu ảnh hưởng chấm tự động, thêm vào "Câu hỏi mở cho giảng viên" trong `phase-2.md`. Không tự thêm luật ngoài ticket.
3. **AC**: thêm/sửa dòng `P2-xx` trong `phase-2.md` (Khi … | Thì … | Kiểm chứng | Bước).
4. **Test đỏ trước**: viết test headless trong `tests/phase2-*.test.js` dùng `runHeadless`, `empty()`, `snapAt`, `ev` từ `tests/helpers.js`. Tính kỳ vọng bằng tay từ số chuẩn (`T.x`, `RULES`), ví dụ 4 m/s = 1/15 m/tick → từ 3 m tới 1 m mất 30 tick. Chạy `npm test` → thấy đỏ đúng lý do.
5. **Sửa core**:
   - Số liệu thuộc `tuning` của contract → `TUNING` **và** `game.contract.json`; số chuẩn khác → `RULES` (`src/core/tuning.js`); bản đồ → `src/core/maps.js`.
   - Hành vi → `src/core/world.js`, đặt đúng **bước** trong 12 bước của `step()` (comment đánh số sẵn).
   - Scenario/inputs mới → `src/core/validate.js` (sai kiểu → mã 2).
   - Không `Math.random`/`Date.now`/`three`/DOM trong core; ngẫu nhiên qua `g.rng()` và để ý thứ tự gọi rng (đổi thứ tự = đổi output tất định).
   - So sánh khoảng cách/độ cao có dung sai `EPS` (A1-15).
6. **Xanh + hồi quy**: `npm test` toàn bộ (gồm AC Phase 1 trong `contract.test.js`). Test cũ đỏ vì ticket đổi luật → sửa test theo luật mới và ghi lý do trong `phase-2.md` (mục Tiến độ); đỏ vì lý do khác → sửa core.
7. **Web** chỉ cần cập nhật nếu có hiển thị/âm thanh mới (`src/web/`), không đặt luật ở đó.
8. **Tài liệu**: README (luật, điều khiển) nếu người chơi thấy khác; tiến độ trong `phase-2.md`.
9. Commit local (không push), message nêu AC và giả định liên quan. Dán output `npm test` thật khi báo cáo.

## Bẫy đã gặp
- Bùa Gió mặc định Đêm 2 ở (35,0,0) giữa cầu, Gió Lạc mặc định Đêm 2/3, gió Đêm 3 → test không kiểm chúng phải tắt (`charms: []`, `random_drifters: false`, `wind_enabled: false`).
- Cộng dồn 0.1 m/tick lệch ~1e-15: mép đất, bán kính, Y < −10 đều cần dung sai.
- Trọng lực dùng vận tốc trung bình trong tick (A2-31): nhảy đỉnh 1.225 m ở tick 21, tiếp đất tick 42.
- Bộ đếm đặt ở tick k hết ở tick k+N; chuyển động "trong N tick" (recoil, đẩy lùi) diễn ra ở các tick k+1…k+N.
